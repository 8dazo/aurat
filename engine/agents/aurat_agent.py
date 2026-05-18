"""
aurat_agent.py — Browser-use orchestrator for auto-apply.

Connects browser-use to Electron's Chromium via CDP so the
browser preview shows the agent working live inside the app.
"""

from __future__ import annotations

import logging
import os

from browser_use import Agent, Browser, BrowserConfig, Controller
from browser_use.browser.context import BrowserContext, BrowserContextConfig
from browser_use.browser.views import BrowserError as BUBrowserError, TabInfo
from playwright.async_api import async_playwright

from agents.base import BaseAgent
from agents.detector import detect_ats_platform_url
from agents.step_monitor import StepMonitor
from agents.context_compressor import ContextCompressor
from llm.openrouter import get_agent_llm
from utils.stealth import (
    attach_agent_view,
    detach_agent_view,
    get_electron_cdp_url,
)

logger = logging.getLogger(__name__)

_BLOCKED_URL_SUBSTRS = ("localhost:3000", "127.0.0.1:3000")


def _is_blocked_url(url: str) -> bool:
    return any(s in url for s in _BLOCKED_URL_SUBSTRS)


class FilteredBrowserContext(BrowserContext):
    """BrowserContext that hides localhost UI pages from the agent.

    When connected via CDP to Electron's Chromium, the agent sees all pages
    including the Aurat UI (localhost:3000). This subclass filters those pages
    out of tab listings and remaps tab indices so the agent never sees or
    interacts with internal UI pages.
    """

    async def get_tabs_info(self) -> list[TabInfo]:
        tabs = await super().get_tabs_info()
        return [t for t in tabs if not _is_blocked_url(t.url)]

    async def switch_to_tab(self, page_id: int) -> None:
        all_tabs = await super().get_tabs_info()
        filtered = [t for t in all_tabs if not _is_blocked_url(t.url)]
        if page_id >= len(filtered):
            raise BUBrowserError(f"Tab index {page_id} out of range")
        target = filtered[page_id]
        real_id = next(i for i, t in enumerate(all_tabs) if t.url == target.url)
        await super().switch_to_tab(real_id)


_MEMORY = None


def _get_memory():
    global _MEMORY
    if _MEMORY is None:
        try:
            from memory.collections import MemoryCollections

            _MEMORY = MemoryCollections()
        except ImportError:
            _MEMORY = None
    return _MEMORY


_ATS_CONTEXT = {
    "greenhouse": (
        "You're on a Greenhouse ATS page. "
        "Look for the application form with fields like First Name, Last Name, Email, Phone, Resume/CV upload. "
        "Greenhouse forms are typically single-page with standard fields."
    ),
    "lever": (
        "You're on a Lever ATS page. "
        "Look for the application form. Lever forms may have custom dropdowns (React-Select style). "
        "Click dropdown fields to open them, then select the matching option."
    ),
    "workday": (
        "You're on a Workday ATS page. "
        "These have multi-step forms with 'Next' buttons. "
        "Complete each step carefully. Click 'Next' to proceed through all steps before submitting."
    ),
    "ashby": (
        "You're on an Ashby ATS page. "
        "Look for the application form. Ashby forms are typically clean single-page forms."
    ),
    "icims": (
        "You're on an iCIMS ATS page. "
        "Look for the application form. iCIMS may have multiple sections. "
        "Fill all required fields before submitting."
    ),
    "generic": (
        "You're on a job application page. "
        "Find and fill the application form. "
        "Look for Apply Now or Apply buttons if on a job description page first."
    ),
}

# Define the shared browser-use action controller
controller = Controller()


@controller.action(
    "Look up a memorized answer to a custom question from past applications"
)
async def lookup_answer(question: str) -> str:
    """
    Look up past answers semantically from the candidate's custom Q&A memory.
    Use this for any multi-choice or open-text custom question on the form.
    """
    mem = _get_memory()
    if mem:
        try:
            answer = await mem.best_qna_answer(question, min_score=0.35)
            if answer:
                logger.info(
                    "Semantic QnA match found: '%s' -> '%s'", question[:50], answer[:50]
                )
                return f"Answer found in memory: {answer}"
        except Exception as e:
            logger.warning("Failed live lookup_answer: %s", e)
    return "No exact match found in memory. Please use base candidate profile fields or ask candidate by outputting PAUSE_QUESTION: <the question text>."


async def _build_task_prompt(
    job_url: str,
    profile: dict,
    ats_type: str = "generic",
) -> str:
    ats_hint = _ATS_CONTEXT.get(ats_type, _ATS_CONTEXT["generic"])

    personal = profile.get("personal_info", {})
    links = profile.get("links", {})
    skills_list = []
    for cat in profile.get("skills", []):
        skills_list.extend(cat.get("skills", []))
    skills_str = ", ".join(skills_list[:20])

    experience_strs = []
    for exp in profile.get("experience", [])[:5]:
        experience_strs.append(
            f"  - {exp.get('title', '')} at {exp.get('company', '')}: {exp.get('description', '')}"
        )

    education_strs = []
    for edu in profile.get("education", [])[:3]:
        education_strs.append(
            f"  - {edu.get('degree', '')} in {edu.get('field', '')} from {edu.get('institution', '')}"
        )

    # 1. Semantic QnA Injection at prompt-build time
    qna_section = ""
    mem = _get_memory()
    if mem:
        try:
            job_title = profile.get("_current_job_title", "")
            company = profile.get("_current_company", "")
            search_query = f"{job_title} {company} application questions"
            relevant_results = await mem.search_qna(search_query, top_k=10)
            if relevant_results:
                qna_lines = []
                for res in relevant_results:
                    q = res.metadata.get("question")
                    a = res.metadata.get("answer")
                    if q and a:
                        qna_lines.append(f"  Q: {q}\n  A: {a}")
                if qna_lines:
                    qna_section = (
                        "\nHighly relevant answers to custom questions:\n"
                        + "\n".join(qna_lines)
                    )
        except Exception as e:
            logger.warning("Failed semantic QnA injection: %s", e)

    # Fallback to flat profile memory if semantic was empty or failed
    if not qna_section:
        custom_qna = profile.get("custom_qna_memory", {})
        if custom_qna:
            qna_lines = [
                f"  Q: {q}\n  A: {a}" for q, a in list(custom_qna.items())[:20]
            ]
            qna_section = "\nKnown answers to custom questions:\n" + "\n".join(
                qna_lines
            )

    traits = profile.get("inferred_traits", {})

    return f"""You are an expert job application form filler. {ats_hint}

Your task: Navigate to {job_url} and fill out the job application form completely and accurately.

Candidate Profile:
- Name: {personal.get("first_name", "")} {personal.get("last_name", "")}
- Email: {personal.get("email", "")}
- Phone: {personal.get("phone", "")}
- Location: {personal.get("location", "")}
- LinkedIn: {links.get("linkedin", "")}
- GitHub: {links.get("github", "")}
- Portfolio: {links.get("portfolio", "")}
- Years of Experience: {traits.get("years_of_experience", "N/A")}
- Requires Sponsorship: {traits.get("requires_sponsorship", "N/A")}
- Willing to Relocate: {traits.get("willing_to_relocate", "N/A")}

Skills: {skills_str}

Experience:
{chr(10).join(experience_strs)}

Education:
{chr(10).join(education_strs)}
{qna_section}

TASK CHECKLIST — complete items in order:
[ ] 1. Navigate to job URL and confirm the page loaded successfully.
[ ] 2. Find and click "Apply", "Apply Now", or "Start Application" if you are on a job description page first.
[ ] 3. Fill: First Name → "{personal.get("first_name", "")}"
[ ] 4. Fill: Last Name → "{personal.get("last_name", "")}"
[ ] 5. Fill: Email → "{personal.get("email", "")}"
[ ] 6. Fill: Phone → "{personal.get("phone", "")}"
[ ] 7. Upload: Resume/CV → use the file at path "{profile.get("resume_path", "")}" (strictly select and upload this file).
[ ] 8. Answer all custom questions honestly and accurately based on candidate profile info.
[ ] 9. Review all fields for accuracy.
[ ] 10. Click the "Submit", "Submit Application", or "Submit Form" button.

CRITICAL RULES:
- Do NOT fill a field you have already successfully filled.
- If you see a field you already filled, SKIP it and move to the next unchecked item.
- Do not repeat the same action or click the same element if it doesn't advance the state. If stuck, try scrolling or focus/unfocus.
- NEVER switch to tabs with localhost or 127.0.0.1 URLs — these are internal app pages, not the job site.
- NEVER click buttons like "Take Control", "Pause", or "Resume" on internal app pages — they control the agent, not the job form.
- ONLY interact with the external job application website (the page you navigated to).
- If you accidentally switch to a localhost tab, switch back to the job site tab immediately.
- For custom questions, use the 'lookup_answer' tool to search memory first before pausing!
- If you still encounter a custom question you cannot answer from the profile or memory lookup, output exactly: "PAUSE_QUESTION: <the question text>" to ask the user.
"""


async def _navigate_agent_page(cdp_url: str, job_url: str) -> None:
    """Use Playwright to find and navigate the agent WebContentsView to the job URL.

    This ensures browser-use connects to the correct page (the agent view)
    instead of the main Electron UI page.
    """
    pw = await async_playwright().start()
    try:
        browser = await pw.chromium.connect_over_cdp(cdp_url)
        contexts = browser.contexts
        if not contexts:
            raise RuntimeError("No browser contexts found in Electron")

        ctx = contexts[0]
        pages = ctx.pages
        agent_page = None
        for p in pages:
            url = p.url or ""
            if "localhost:3000" not in url and "127.0.0.1:3000" not in url:
                agent_page = p
                break

        if agent_page is None:
            agent_page = await ctx.new_page()

        logger.info("Navigating agent page from %s to %s", agent_page.url, job_url)
        try:
            await agent_page.goto(job_url, wait_until="domcontentloaded", timeout=30000)
        except Exception as e:
            err_str = str(e)
            if "ERR_ABORTED" in err_str or "net::" in err_str:
                await agent_page.wait_for_timeout(3000)
                if agent_page.url and agent_page.url not in ("about:blank", ""):
                    try:
                        await agent_page.wait_for_load_state(
                            "domcontentloaded", timeout=15000
                        )
                    except Exception:
                        pass
            else:
                raise

        logger.info("Agent page now at: %s", agent_page.url)
    finally:
        await pw.stop()


class AuratAgent(BaseAgent):
    def __init__(self, profile: dict):
        super().__init__(profile)
        self.ats_type: str = "generic"

    async def run(self, page=None):
        """Connect to Electron's Chromium via CDP and run the application."""
        job_url = self.profile.get("_current_job_url", "")
        if not job_url:
            self.log_step("navigate", "error", "No job URL provided")
            from api.ws import manager

            await manager.broadcast_status("Idle")
            return

        self.log_step("navigate", "running", "Connecting to browser...")
        from api.ws import manager

        await manager.broadcast_status("Running")

        # 1. Ask Electron to create/reuse a WebContentsView for the agent
        try:
            await attach_agent_view()
        except Exception as e:
            logger.warning("Could not attach agent view (may already exist): %s", e)

        # 2. Get CDP WebSocket URL from Electron (with retry)
        try:
            cdp_url = await get_electron_cdp_url()
        except Exception as e:
            logger.exception("Failed to get Electron CDP URL: %s", e)
            await manager.broadcast_log("browser", "error", f"electron_cdp_failed: {e}")
            await manager.broadcast_status("Idle")
            return

        # 3. Navigate the agent WebContentsView to the job URL before browser-use connects
        try:
            await _navigate_agent_page(cdp_url, job_url)
        except Exception as e:
            logger.warning("Pre-navigation failed (browser-use will handle it): %s", e)

        # 4. Connect browser-use to Electron's Chromium via CDP
        await manager.broadcast_log("browser", "navigated", f"page_url={job_url}")
        cdp_port = os.environ.get("ELECTRON_CDP_PORT", "9222")
        browser = None

        # Setup step monitor and compressor for loop/stall and token optimization
        step_monitor = StepMonitor(max_steps=40)
        context_compressor = ContextCompressor(max_keep=5)

        run_failed = False
        final_url = job_url

        try:
            browser = Browser(
                config=BrowserConfig(
                    cdp_url=f"http://127.0.0.1:{cdp_port}",
                )
            )

            ats_type = self.profile.get("_current_ats_type", "") or self.ats_type
            if not ats_type or ats_type == "generic":
                ats_type = detect_ats_platform_url(job_url)

            self.log_step("detect", "completed", f"platform={ats_type}")

            task_prompt = await _build_task_prompt(job_url, self.profile, ats_type)

            llm = get_agent_llm()

            async def on_step(state, model_output, step_num):
                nonlocal final_url
                from api.ws import manager as ws_manager

                try:
                    current_url = ""
                    if state and hasattr(state, "url") and state.url:
                        current_url = state.url
                        final_url = current_url

                    step_name = f"Step {step_num}"
                    action_names = []
                    if model_output and hasattr(model_output, "action"):
                        for action in model_output.action:
                            action_names.append(type(action).__name__)

                    if action_names:
                        step_name += f": {', '.join(action_names)}"
                    if current_url:
                        step_name += f" → {current_url}"
                        await ws_manager.broadcast_log(
                            "browser", "navigated", f"page_url={current_url}"
                        )

                    # Core Loop & Stall Detection
                    action_key = StepMonitor.action_key_from_model_output(model_output)
                    step_monitor.record(
                        action_key=action_key,
                        current_url=current_url,
                        new_field_filled=any(
                            act in action_names
                            for act in (
                                "InputText",
                                "SelectDropdownOption",
                                "UploadFile",
                            )
                        ),
                    )

                    if step_monitor.is_stuck():
                        stuck_reason = step_monitor.stuck_description()
                        logger.warning(
                            "StepMonitor stuck condition met: %s", stuck_reason
                        )
                        await ws_manager.broadcast_log(
                            "agent", "warning", f"Self-Correction: {stuck_reason}"
                        )
                        # Provide corrective context
                        task_prompt_update = (
                            f"\n[CRITICAL NOTE: You are currently looping or stuck: {stuck_reason}. "
                            "Please try a different selector, use TAB key, scroll, or proceed to the next step. "
                            "Do not repeat the previous failing action.]"
                        )
                        # browser-use lets us inject step context via message_context dynamically
                        agent.message_context = task_prompt_update

                    # Token progressive compression
                    compressed_history = context_compressor.get_summary(self.steps_log)
                    if compressed_history:
                        agent.message_context = (
                            (agent.message_context or "") + "\n" + compressed_history
                        )

                    # Intercept custom question pauses
                    if (
                        model_output
                        and hasattr(model_output, "text")
                        and model_output.text
                    ):
                        text = model_output.text
                        if "PAUSE_QUESTION:" in text:
                            import re

                            match = re.search(r"PAUSE_QUESTION:\s*(.*)", text)
                            if match:
                                question = match.group(1).strip()
                                logger.info(
                                    "Custom question detected from agent output: %s",
                                    question,
                                )
                                from agents.answer_resolver import AnswerResolver

                                resolver = AnswerResolver(self.profile)
                                resolved_ans = await resolver.resolve(question)
                                if resolved_ans:
                                    logger.info(
                                        "Successfully auto-resolved question: '%s' -> '%s'",
                                        question,
                                        resolved_ans,
                                    )
                                    agent.message_context = (
                                        (agent.message_context or "")
                                        + f"\n[Auto-resolved question: {question} -> {resolved_ans}. Please use this answer.]"
                                    )
                                else:
                                    await self.pause(f"Custom question: {question}")
                                    await ws_manager.broadcast_status(
                                        "Paused", f"Custom question: {question}"
                                    )

                    self.log_step("agent", "running", step_name)
                except Exception as ex:
                    logger.warning("on_step hook exception: %s", ex)

            agent = Agent(
                task=task_prompt,
                llm=llm,
                browser=browser,
                browser_context=FilteredBrowserContext(
                    browser=browser,
                    config=BrowserContextConfig(disable_security=True),
                ),
                controller=controller,
                register_new_step_callback=on_step,
                use_vision=False,
                max_actions_per_step=6,
                max_failures=3,
            )

            self.log_step("detect_fields", "running", "Agent processing page...")

            result = await agent.run(max_steps=40)

            self.log_step("done", "completed", "Application process finished")
            await manager.broadcast_status("Idle")

            if self.custom_questions:
                await self._enrich_profile()

            # NEW: Freeze the view so it stays open for the user to review
            await manager.broadcast_log("browser", "completed", f"page_url={final_url}")
            return result

        except Exception as e:
            run_failed = True
            error_msg = f"{type(e).__name__}: {e}"
            logger.exception("Agent run failed: %s", e)
            self.log_step("agent", "error", error_msg)
            await manager.broadcast_status("Idle")
        finally:
            try:
                if browser:
                    await browser.close()
            except Exception:
                pass

            # Keep browser alive on success as requested. Only detach on error/failure.
            if run_failed:
                try:
                    await detach_agent_view()
                except Exception:
                    pass
            else:
                # Freeze the view to keep the last page rendered!
                try:
                    import httpx

                    info_port = 18733
                    async with httpx.AsyncClient() as client:
                        await client.get(
                            f"http://127.0.0.1:{info_port}/freeze-view",
                            timeout=httpx.Timeout(timeout=5.0),
                        )
                except Exception as ex:
                    logger.warning("Failed to call freeze/detach fallback: %s", ex)

    async def _enrich_profile(self):
        try:
            from memory.profile_builder import ProfileBuilder
            from db.crud import (
                get_profile as db_get_profile,
                save_profile as db_save_profile,
            )

            builder = ProfileBuilder()
            job_url = self.profile.get("_current_job_url", "")
            company = self.profile.get("_current_company", "")
            await builder.extract_and_save_facts(
                self.custom_questions, job_url=job_url, company=company
            )
            profile = await db_get_profile() or self.profile
            enriched = await builder.enrich_profile(profile, job_url=job_url)
            await db_save_profile(enriched)
            logger.info("Profile enriched after job application")
        except Exception as e:
            logger.warning("Post-run profile enrichment failed: %s", e)

    async def detect_form_fields(self, page=None):
        raise NotImplementedError(
            "browser-use agent handles field detection internally"
        )

    async def fill_field(self, page=None, field=None, value=None):
        raise NotImplementedError("browser-use agent handles field filling internally")

    async def submit(self, page=None):
        raise NotImplementedError("browser-use agent handles submission internally")
