"""
aurat_agent.py — Browser-use orchestrator for auto-apply.

Connects browser-use to Electron's built-in Chromium via CDP so the
browser preview shows the agent working live inside the app.
Uses CloakBrowser's stealth Chromium binary for anti-detection,
connecting to it via CDP (like the stapply pattern).
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import socket
import subprocess
import tempfile
from typing import Optional

import httpx
from browser_use import Agent, Browser, BrowserConfig

from agents.base import BaseAgent
from agents.detector import detect_ats_platform_url
from llm.openrouter import get_agent_llm

logger = logging.getLogger(__name__)

_MEMORY = None

CDP_PORT = int(os.environ.get("AURAT_CDP_PORT", "9222"))


def _get_memory():
    global _MEMORY
    if _MEMORY is None:
        try:
            from memory.collections import MemoryCollections

            _MEMORY = MemoryCollections()
        except ImportError:
            _MEMORY = None
    return _MEMORY


def _find_available_port(start_port: int = 9222) -> int:
    """Find an available port starting from start_port."""
    for port in range(start_port, start_port + 100):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(("127.0.0.1", port))
                return port
        except OSError:
            continue
    raise RuntimeError("No available ports found for Chrome debugging")


def _get_stealth_binary_path() -> str:
    """Get CloakBrowser's stealth Chromium binary path."""
    from cloakbrowser import ensure_binary

    return ensure_binary()


def _get_stealth_args() -> list[str]:
    """Get CloakBrowser's default stealth fingerprint args."""
    from cloakbrowser import get_default_stealth_args

    return get_default_stealth_args()


def _inject_stealth_js() -> str:
    """Return stealth JS to inject into every page (replaces the old stealth.py)."""
    return """
// Remove navigator.webdriver
Object.defineProperty(navigator, 'webdriver', { get: () => undefined });

// Mock chrome.runtime
if (!window.chrome) {
    window.chrome = { runtime: {} };
}

// Override permissions.query
const originalQuery = window.navigator.permissions.query.bind(window.navigator.permissions);
window.navigator.permissions.query = (parameters) => (
    parameters.name === 'notifications'
        ? Promise.resolve({ state: Notification.permission })
        : originalQuery(parameters)
);

// Mock plugins
Object.defineProperty(navigator, 'plugins', {
    get: () => [1, 2, 3, 4, 5],
});

// Mock languages
Object.defineProperty(navigator, 'languages', {
    get: () => ['en-US', 'en'],
});
"""


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


_CLOAK_HEADLESS = os.environ.get("AURAT_HEADLESS", "true").lower() in (
    "true",
    "1",
    "yes",
)


class AuratAgent(BaseAgent):
    def __init__(self, profile: dict):
        super().__init__(profile)
        self.chrome_process: subprocess.Popen | None = None
        self.cdp_port: int = CDP_PORT
        self.user_data_dir: str | None = None
        self._agent_task: asyncio.Task | None = None
        self.ats_type: str = "generic"

    async def _start_stealth_chrome(self) -> int:
        """Launch CloakBrowser's stealth Chromium with CDP.

        Returns the CDP port number.
        """
        port = _find_available_port(self.cdp_port)
        self.cdp_port = port

        # Kill existing Chrome on this port
        try:
            result = subprocess.run(
                ["ps", "aux"], capture_output=True, text=True, timeout=5
            )
            for line in result.stdout.split("\n"):
                if f"remote-debugging-port={port}" in line and "Chrom" in line:
                    parts = line.split()
                    if len(parts) > 1:
                        try:
                            subprocess.run(
                                ["kill", str(int(parts[1]))],
                                capture_output=True,
                                timeout=3,
                            )
                        except (ValueError, subprocess.TimeoutExpired):
                            pass
            await asyncio.sleep(1)
        except Exception:
            pass

        binary_path = _get_stealth_binary_path()
        stealth_args = _get_stealth_args()
        self.user_data_dir = tempfile.mkdtemp(prefix="aurat_chrome_")

        cmd = [
            binary_path,
            f"--remote-debugging-port={port}",
            "--remote-allow-origins=*",
            f"--user-data-dir={self.user_data_dir}",
            "--no-first-run",
            "--no-default-browser-check",
            "--disable-extensions",
            "--window-size=1280,900",
            "--force-device-scale-factor=1",
            "--disable-dev-shm-usage",
        ]

        if _CLOAK_HEADLESS:
            cmd.append("--headless=new")

        cmd.extend(stealth_args)
        cmd.append("about:blank")

        logger.info("Launching stealth Chrome on CDP port %d", port)

        self.chrome_process = subprocess.Popen(
            cmd,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )

        # Wait for CDP to be ready
        for attempt in range(30):
            try:
                async with httpx.AsyncClient() as client:
                    resp = await client.get(
                        f"http://127.0.0.1:{port}/json/version",
                        timeout=httpx.Timeout(timeout=2.0),
                    )
                    if resp.status_code == 200:
                        data = resp.json()
                        logger.info(
                            "Chrome CDP ready on port %d: %s",
                            port,
                            data.get("Browser", "unknown"),
                        )
                        return port
            except (httpx.ConnectError, httpx.TimeoutException):
                await asyncio.sleep(1)

        if self.chrome_process.poll() is not None:
            raise RuntimeError(
                f"Chrome process exited with code {self.chrome_process.returncode}"
            )

        raise RuntimeError(f"Chrome CDP not ready on port {port} after 30s")

    async def _stop_stealth_chrome(self):
        """Terminate Chrome and clean up."""
        if self.chrome_process and self.chrome_process.poll() is None:
            self.chrome_process.terminate()
            try:
                self.chrome_process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self.chrome_process.kill()
            self.chrome_process = None

        if self.user_data_dir:
            try:
                import shutil

                shutil.rmtree(self.user_data_dir, ignore_errors=True)
                self.user_data_dir = None
            except Exception:
                pass

    async def _notify_electron_attach(self):
        try:
            async with httpx.AsyncClient() as client:
                await client.get(
                    "http://127.0.0.1:18733/attach-agent-view",
                    timeout=httpx.Timeout(timeout=15.0),
                )
        except Exception:
            pass

    async def _notify_electron_detach(self):
        try:
            async with httpx.AsyncClient() as client:
                await client.get(
                    "http://127.0.0.1:18733/detach-agent-view",
                    timeout=httpx.Timeout(timeout=5.0),
                )
        except Exception:
            pass

    async def run(self, page=None):
        """Launch stealth Chrome, connect browser-use via CDP, and run the application."""
        job_url = self.profile.get("_current_job_url", "")
        if not job_url:
            self.log_step("navigate", "error", "No job URL provided")
            from api.ws import manager

            await manager.broadcast_status("Idle")
            return

        self.log_step("navigate", "running", "Launching stealth browser...")
        from api.ws import manager

        await manager.broadcast_status("Running")

        # 1. Start stealth Chrome with CDP
        try:
            port = await self._start_stealth_chrome()
        except Exception as e:
            logger.exception("Failed to start stealth Chrome: %s", e)
            self.log_step("navigate", "error", f"Browser launch failed: {e}")
            await manager.broadcast_status("Idle")
            return

        # 2. Tell Electron to show the browser preview
        await self._notify_electron_attach()

        cdp_url = f"http://127.0.0.1:{port}"

        try:
            # 3. Connect browser-use to Chrome via CDP
            browser = Browser(config=BrowserConfig(cdp_url=cdp_url))

            ats_type = self.profile.get("_current_ats_type", "") or self.ats_type
            if not ats_type or ats_type == "generic":
                ats_type = detect_ats_platform_url(job_url)

            self.log_step("detect", "completed", f"platform={ats_type}")

            task_prompt = _build_task_prompt(job_url, self.profile, ats_type)

            # Broadcast job URL so Electron preview can navigate
            await manager.broadcast_log("browser", "navigated", f"page_url={job_url}")

            llm = get_agent_llm()

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
                        await manager.broadcast_log(
                            "browser", "navigated", f"page_url={current_url}"
                        )
                    self.log_step("agent", "running", step_name)
                except Exception:
                    pass

            agent = Agent(
                task=task_prompt,
                llm=llm,
                browser=browser,
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
            await self._notify_electron_detach()
            await self._stop_stealth_chrome()

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
