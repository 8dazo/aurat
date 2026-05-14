"""
aurat_agent.py — Browser-use orchestrator for auto-apply.

Replaces the entire universal.py state machine with a browser-use Agent
driven by an OpenRouter LLM via CloakBrowser for stealthy web navigation.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
from typing import Optional

from browser_use import Agent, Browser, BrowserConfig

from agents.base import BaseAgent
from agents.detector import detect_ats_platform_url
from llm.openrouter import get_llm

logger = logging.getLogger(__name__)

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


def _build_task_prompt(
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

    qna_section = ""
    custom_qna = profile.get("custom_qna_memory", {})
    if custom_qna:
        qna_lines = [f"  Q: {q}\n  A: {a}" for q, a in list(custom_qna.items())[:20]]
        qna_section = "\nKnown answers to custom questions:\n" + "\n".join(qna_lines)

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

Instructions:
1. Navigate to the job URL
2. Click the "Apply" or "Apply Now" button if on a job description page
3. Fill out every field in the application form using the candidate profile above
4. For dropdown menus, find and select the option that best matches the profile
5. For custom questions not covered by the profile, answer honestly based on the candidate info
6. Upload the resume file if available
7. Review all filled fields for accuracy
8. Submit the application

If you encounter a custom question you cannot answer from the profile, type "PAUSE_QUESTION: <the question text>" and I will provide the answer.

Complete the entire application process end-to-end."""


_CLOAK_HEADLESS = os.environ.get("AURAT_HEADLESS", "false").lower() in (
    "true",
    "1",
    "yes",
)


class AuratAgent(BaseAgent):
    def __init__(self, profile: dict):
        super().__init__(profile)
        self.cloak_browser = None
        self._agent_task: asyncio.Task | None = None
        self.ats_type: str = "generic"

    async def run(self, page=None):
        """
        Launch CloakBrowser, create browser-use Agent, and run the application.

        The `page` parameter is ignored — browser-use manages its own browser session.
        """
        job_url = self.profile.get("_current_job_url", "")
        if not job_url:
            self.log_step("navigate", "error", "No job URL provided")
            from api.ws import manager

            await manager.broadcast_status("Idle")
            return

        try:
            from cloakbrowser import launch_async
        except ImportError:
            logger.error("cloakbrowser not installed")
            self.log_step(
                "navigate",
                "error",
                "cloakbrowser not installed — run: pip install cloakbrowser",
            )
            from api.ws import manager

            await manager.broadcast_status("Idle")
            return

        self.log_step("navigate", "running", "Launching stealth browser...")
        from api.ws import manager

        await manager.broadcast_status("Running")

        try:
            self.cloak_browser = await launch_async(
                headless=_CLOAK_HEADLESS,
                humanize=True,
                args=[
                    "--remote-debugging-port=9242",
                    "--remote-debugging-address=127.0.0.1",
                    "--no-first-run",
                    "--no-default-browser-check",
                ],
            )
        except Exception as e:
            logger.exception("Failed to launch CloakBrowser: %s", e)
            self.log_step("navigate", "error", f"Browser launch failed: {e}")
            await manager.broadcast_status("Idle")
            return

        try:
            session = Browser(config=BrowserConfig(cdp_url="http://127.0.0.1:9242"))

            ats_type = self.profile.get("_current_ats_type", "") or self.ats_type
            if not ats_type or ats_type == "generic":
                ats_type = detect_ats_platform_url(job_url)

            self.log_step("detect", "completed", f"platform={ats_type}")

            task_prompt = _build_task_prompt(job_url, self.profile, ats_type)

            llm = get_llm()

            # Broadcast agent step progress to UI
            async def on_step(state, model_output, step_num):
                try:
                    current_url = ""
                    if state and hasattr(state, "url") and state.url:
                        current_url = state.url
                    step_name = f"Step {step_num}"
                    action_names = []
                    if model_output and hasattr(model_output, "action"):
                        for action in model_output.action:
                            action_names.append(type(action).__name__)
                    if action_names:
                        step_name += f": {', '.join(action_names)}"
                    if current_url:
                        step_name += f" → {current_url}"
                    self.log_step("agent", "running", step_name)
                except Exception:
                    pass

            agent = Agent(
                task=task_prompt,
                llm=llm,
                browser=session,
                register_new_step_callback=on_step,
            )

            self.log_step("detect_fields", "running", "Agent processing page...")

            result = await agent.run()

            self.log_step("done", "completed", "Application process finished")
            await manager.broadcast_status("Idle")

            if self.custom_questions:
                await self._enrich_profile()

            return result

        except Exception as e:
            logger.exception("Agent run failed: %s", e)
            self.log_step("agent", "error", str(e))
            await manager.broadcast_status("Idle")
        finally:
            try:
                if self.cloak_browser:
                    await self.cloak_browser.close()
            except Exception:
                pass

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
