# Browser-Use Simplification Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the custom Playwright-based auto-apply engine with browser-use + CloakBrowser + OpenRouter, and clean up all cruft across engine, UI, and desktop.

**Architecture:** A thin orchestration wrapper (`AuratAgent`) launches CloakBrowser for stealth, creates a browser-use Agent with OpenRouter LLM, and intercepts custom questions for QnA memory lookup before pausing for user input. The UI is cleaned up with shared constants, extracted hooks, and an OpenRouter settings page.

**Tech Stack:** Python (FastAPI, browser-use, cloakbrowser, langchain-openai), TypeScript/React/Next.js (UI), Electron (desktop shell)

---

## Task 1: Delete dead engine files

**Files:**
- Delete: `engine/agents/greenhouse.py`
- Delete: `engine/agents/universal.py`
- Delete: `engine/utils/human_input.py`
- Delete: `engine/utils/stealth.py`
- Delete: `engine/utils/agent_browser.py`
- Delete: `engine/models/job.py`
- Delete: `engine/notebooks/05_greenhouse_agent.py`
- Delete: `engine/.browser_use_inspect/` (entire directory)
- Delete: All `__pycache__/` directories under `engine/`

**Step 1: Delete files**

```bash
cd engine
rm agents/greenhouse.py agents/universal.py utils/human_input.py utils/stealth.py utils/agent_browser.py models/job.py
rm notebooks/05_greenhouse_agent.py
rm -rf .browser_use_inspect/
find . -type d -name __pycache__ -exec rm -rf {} +
```

**Step 2: Verify no remaining imports reference deleted files**

```bash
cd engine
grep -r "from agents.greenhouse" --include="*.py" .
grep -r "from agents.universal" --include="*.py" .
grep -r "from utils.human_input" --include="*.py" .
grep -r "from utils.stealth" --include="*.py" .
grep -r "from utils.agent_browser" --include="*.py" .
grep -r "from models.job" --include="*.py" .
```

Expected: Only `routes.py` should reference `agents.universal`. We'll handle that in Task 4.

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: delete dead engine code (greenhouse, universal, human_input, stealth, agent_browser, job model)"
```

---

## Task 2: Delete dead UI files and unused dependencies

**Files:**
- Delete: `ui/components/ManualIntervention.tsx`
- Delete: `ui/components/PlaywrightSetup.tsx`
- Delete: `ui/components/ui/tabs.tsx`
- Delete: `ui/public/vercel.svg`, `next.svg`, `globe.svg`, `file.svg`, `window.svg`
- Delete: `ui/generated/prisma/` (entire directory)
- Modify: `ui/package.json` — remove `@neondatabase/serverless`, `@prisma/adapter-neon`, `@prisma/client`, `next-themes`; move `shadcn` to devDependencies

**Step 1: Delete files**

```bash
cd ui
rm components/ManualIntervention.tsx components/PlaywrightSetup.tsx components/ui/tabs.tsx
rm public/vercel.svg public/next.svg public/globe.svg public/file.svg public/window.svg
rm -rf generated/prisma/
```

**Step 2: Update package.json**

Remove these from `dependencies`:
- `@neondatabase/serverless`
- `@prisma/adapter-neon`
- `@prisma/client`
- `next-themes`

Move `shadcn` from `dependencies` to `devDependencies`.

**Step 3: Remove `next-themes` usage from code**

In `ui/components/ui/sonner.tsx` (or wherever `useTheme` from `next-themes` is imported), remove the theme import and hardcode theme values or remove theme-aware logic.

**Step 4: Run `npm install` to update lockfile**

```bash
cd ui && npm install
```

**Step 5: Commit**

```bash
git add -A
git commit -m "chore: delete dead UI components, unused deps, and template assets"
```

---

## Task 3: Create `llm/openrouter.py` — OpenRouter LLM client

**Files:**
- Create: `engine/llm/openrouter.py`

**Step 1: Create the OpenRouter client module**

This module wraps `ChatOpenAI` from langchain-openai, configured for OpenRouter. It provides two interfaces:
- `get_llm()` — returns a `ChatOpenAI` instance for browser-use agent
- `extract_structured()` — structured extraction (used by memory/profile enrichment)
- `complete()` — plain text completion (used by hybrid store reranker)

```python
import os
import json
import asyncio
from typing import Optional

from langchain_openai import ChatOpenAI
from pydantic import BaseModel

OPENROUTER_API_KEY = os.environ.get("OPENROUTER_API_KEY", "")
OPENROUTER_BASE_URL = os.environ.get("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
OPENROUTER_MODEL = os.environ.get("OPENROUTER_MODEL", "liquid/lfm-2.5-1.2b-thinking:free")


def get_llm(
    model: Optional[str] = None,
    api_key: Optional[str] = None,
    temperature: float = 0,
    **kwargs,
) -> ChatOpenAI:
    return ChatOpenAI(
        base_url=OPENROUTER_BASE_URL,
        api_key=api_key or OPENROUTER_API_KEY,
        model=model or OPENROUTER_MODEL,
        temperature=temperature,
        default_headers={
            "HTTP-Referer": "https://aurat.ai",
            "X-Title": "Aurat Auto-Apply Agent",
        },
        **kwargs,
    )


async def extract_structured(
    prompt: str,
    schema: type[BaseModel],
    text: str = "",
    model: Optional[str] = None,
) -> BaseModel:
    llm = get_llm(model=model, temperature=0)
    full_prompt = f"{prompt}\n\n{text}" if text else prompt
    schema_json = json.dumps(schema.model_json_schema(), indent=2)
    structured_prompt = (
        f"{full_prompt}\n\n"
        f"Respond with ONLY valid JSON matching this schema. No markdown fences.\n"
        f"Schema:\n{schema_json}"
    )
    response = await asyncio.to_thread(
        lambda: llm.invoke(structured_prompt)
    )
    raw = response.content if hasattr(response, "content") else str(response)
    if "```json" in raw:
        json_str = raw.split("```json")[-1].split("```")[0]
    elif "```" in raw:
        json_str = raw.split("```")[1].split("```")[0]
    else:
        json_str = raw
    return schema.model_validate_json(json_str.strip())


async def complete(
    prompt: str,
    max_tokens: int = 200,
    model: Optional[str] = None,
) -> str:
    llm = get_llm(model=model, temperature=0, max_tokens=max_tokens)
    response = await asyncio.to_thread(
        lambda: llm.invoke(prompt)
    )
    return response.content if hasattr(response, "content") else str(response)
```

**Step 2: Commit**

```bash
git add engine/llm/openrouter.py
git commit -m "feat: add OpenRouter LLM client module"
```

---

## Task 4: Create `agents/aurat_agent.py` — browser-use orchestrator

**Files:**
- Create: `engine/agents/aurat_agent.py`

This is the core replacement for `universal.py`. It:
1. Launches CloakBrowser with CDP on port 9242
2. Pre-detects ATS platform via URL patterns (no DOM)
3. Creates a browser-use Agent with OpenRouter LLM and a detailed task prompt
4. Intercepts agent step events and broadcasts to WebSocket
5. Checks hybrid QnA memory for custom questions before pausing
6. Supports pause/resume/answer from the UI
7. Post-run profile enrichment

```python
"""
aurat_agent.py — Browser-use orchestrator for auto-apply.

Replaces the entire universal.py state machine with a browser-use Agent
driven by an OpenRouter LLM via CloakBrowser for stealthy web navigation.
"""

from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import os
import re
from typing import Optional

from browser_use import Agent, BrowserSession

from agents.base import BaseAgent
from agents.detector import detect_ats_platform_url
from llm.openrouter import get_llm
from api.ws import manager

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
    "greenhouse": "You're on a Greenhouse ATS page. Look for the application form with fields like First Name, Last Name, Email, Phone, Resume/CV upload.",
    "lever": "You're on a Lever ATS page. Look for the application form.",
    "workday": "You're on a Workday ATS page. These have multi-step forms with 'Next' buttons. Complete each step carefully.",
    "ashby": "You're on an Ashby ATS page. Look for the application form.",
    "icims": "You're on an iCIMS ATS page. Look for the application form.",
    "generic": "You're on a job application page. Find and fill the application form.",
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
- Name: {personal.get('first_name', '')} {personal.get('last_name', '')}
- Email: {personal.get('email', '')}
- Phone: {personal.get('phone', '')}
- Location: {personal.get('location', '')}
- LinkedIn: {links.get('linkedin', '')}
- GitHub: {links.get('github', '')}
- Portfolio: {links.get('portfolio', '')}
- Years of Experience: {traits.get('years_of_experience', 'N/A')}
- Requires Sponsorship: {traits.get('requires_sponsorship', 'N/A')}
- Willing to Relocate: {traits.get('willing_to_relocate', 'N/A')}

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
            await manager.broadcast_status("Idle")
            return

        try:
            from cloakbrowser import launch_async
        except ImportError:
            logger.error("cloakbrowser not installed")
            self.log_step("navigate", "error", "cloakbrowser not installed")
            await manager.broadcast_status("Idle")
            return

        self.log_step("navigate", "running", "Launching stealth browser...")
        await manager.broadcast_status("Running")

        try:
            self.cloak_browser = await launch_async(
                headless=False,
                humanize=True,
                args=["--remote-debugging-port=9242", "--remote-debugging-address=127.0.0.1"],
            )
        except Exception as e:
            logger.exception("Failed to launch CloakBrowser: %s", e)
            self.log_step("navigate", "error", f"Browser launch failed: {e}")
            await manager.broadcast_status("Idle")
            return

        try:
            session = BrowserSession(cdp_url="http://127.0.0.1:9242")

            ats_type = self.profile.get("_current_ats_type", "") or self.ats_type
            if not ats_type or ats_type == "generic":
                ats_type = detect_ats_platform_url(job_url)

            self.log_step("detect", "completed", f"platform={ats_type}")

            task_prompt = _build_task_prompt(job_url, self.profile, ats_type)

            await manager.broadcast_log("browser", "started", "page_url=about:blank")

            llm = get_llm()

            agent = Agent(
                task=task_prompt,
                llm=llm,
                browser_session=session,
            )

            self.log_step("detect_fields", "running", "Agent processing page...")

            result = await agent.run()

            self.log_step("done", "completed", "Application process finished")
            await manager.broadcast_status("Idle")

            if self.custom_questions:
                await self._enrich_profile()

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
            try:
                async with __import__("httpx").AsyncClient() as client:
                    await client.get("http://127.0.0.1:18733/detach-agent-view", timeout=5.0)
            except Exception:
                pass

    async def _enrich_profile(self):
        try:
            from memory.profile_builder import ProfileBuilder
            from db.crud import get_profile as db_get_profile, save_profile as db_save_profile

            builder = ProfileBuilder()
            job_url = self.profile.get("_current_job_url", "")
            company = self.profile.get("_current_company", "")
            await builder.extract_and_save_facts(self.custom_questions, job_url=job_url, company=company)
            profile = await db_get_profile() or self.profile
            enriched = await builder.enrich_profile(profile, job_url=job_url)
            await db_save_profile(enriched)
            logger.info("Profile enriched after job application")
        except Exception as e:
            logger.warning("Post-run profile enrichment failed: %s", e)

    async def detect_form_fields(self, page=None):
        raise NotImplementedError("browser-use agent handles field detection internally")

    async def fill_field(self, page=None, field=None, value=None):
        raise NotImplementedError("browser-use agent handles field filling internally")

    async def submit(self, page=None):
        raise NotImplementedError("browser-use agent handles submission internally")
```

**Step 1: Create the file**

Write the code above to `engine/agents/aurat_agent.py`.

**Step 2: Commit**

```bash
git add engine/agents/aurat_agent.py
git commit -m "feat: add AuratAgent — browser-use orchestrator replacing universal.py"
```

---

## Task 5: Refactor `agents/base.py` — simplify for browser-use

**Files:**
- Modify: `engine/agents/base.py`

Remove Playwright dependency and abstract methods that browser-use handles internally. Keep only `pause`, `resume`, `answer_question`, `log_step`, and `run`.

```python
from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Callable


class BaseAgent(ABC):
    def __init__(self, profile: dict):
        self.profile = profile
        self.paused = False
        self.pause_reason: str | None = None
        self.steps_log: list[dict] = []
        self.custom_questions: list[dict] = []
        self.on_step: (
            Callable[[str, str, str], None] | Callable[[str, str, str], object] | None
        ) = None
        self.resume_path: str | None = profile.get("resume_path")
        self.ats_type: str = "generic"
        self.page_context: dict = {}

    @abstractmethod
    async def run(self, page=None):
        pass

    async def pause(self, reason: str = ""):
        self.paused = True
        self.pause_reason = reason

    async def resume(self):
        self.paused = False
        self.pause_reason = None

    async def answer_question(self, question: str, answer: str):
        self.custom_questions.append({"question": question, "answer": answer})

    def log_step(self, step: str, status: str, detail: str = ""):
        self.steps_log.append({"step": step, "status": status, "detail": detail})
        if self.on_step:
            self.on_step(step, status, detail)
```

**Step 1: Replace the file content**

**Step 2: Commit**

```bash
git add engine/agents/base.py
git commit -m "refactor: simplify BaseAgent for browser-use (remove Playwright, detect, fill, submit)"
```

---

## Task 6: Refactor `agents/detector.py` — URL-only ATS detection

**Files:**
- Modify: `engine/agents/detector.py`

Replace the full Playwright-based detection with URL-pattern-only detection. Remove `Page` import, `APPLY_BUTTON_SELECTORS`, `multi_step_selectors`, and DOM-based detection. Keep `_ATS_SIGNALS` URL patterns only. Add `detect_ats_platform_url(url: str)` function.

```python
"""
detector.py — Lightweight ATS platform detection from URL patterns.

Identifies which ATS platform a page belongs to based on URL patterns only.
No Playwright/DOM dependency — works without a browser instance.
"""

from __future__ import annotations

import re
from dataclasses import dataclass
from typing import Literal

ATS_PLATFORM = Literal["greenhouse", "lever", "workday", "ashby", "icims", "generic"]

_ATS_URL_PATTERNS: dict[str, list[str]] = {
    "greenhouse": [r"greenhouse\.io", r"grnh\.se"],
    "lever": [r"jobs\.lever\.co", r"lever\.co/apply"],
    "workday": [r"myworkdayjobs\.com", r"wd\d+\.myworkdayjobs"],
    "ashby": [r"jobs\.ashbyhq\.com", r"ashbyhq\.com"],
    "icims": [r"careers\.\S+\.icims\.com", r"icims\.com"],
}


@dataclass
class PageContext:
    platform: ATS_PLATFORM = "generic"
    page_type: str = "form"
    visible_field_count: int = 0
    form_count: int = 0
    snapshot_url: str = ""


def detect_ats_platform_url(url: str) -> ATS_PLATFORM:
    """Classify the ATS platform from URL only."""
    for platform, patterns in _ATS_URL_PATTERNS.items():
        for pat in patterns:
            if re.search(pat, url, re.IGNORECASE):
                return platform  # type: ignore[return-value]
    return "generic"


def analyze_page_url(url: str) -> PageContext:
    """Full pre-flight analysis from URL only (no browser needed)."""
    platform = detect_ats_platform_url(url)
    return PageContext(
        platform=platform,
        page_type="form",
        visible_field_count=0,
        form_count=0,
        snapshot_url=url,
    )
```

**Step 1: Replace the file content**

**Step 2: Commit**

```bash
git add engine/agents/detector.py
git commit -m "refactor: simplify detector to URL-only ATS detection (no Playwright)"
```

---

## Task 7: Refactor `api/routes.py` — switch to AuratAgent + remove Playwright

**Files:**
- Modify: `engine/api/routes.py`

Key changes:
- Remove `PlaywrightPage` import
- Remove `GreenhouseAgent` import
- Remove `connect_to_electron`, `get_electron_cdp_url`, `check_browser_installed`, `install_browser` imports
- Remove `/install-browser` and `/health` Playwright browser check (replace with CloakBrowser check)
- Update `/apply` to use `AuratAgent`
- Update `/apply/detect` to use `analyze_page_url` (no browser needed)
- Remove `_active_page` global
- Fix type annotation to `AuratAgent | None`
- Add `/browser/status` endpoint for CloakBrowser

The updated routes should:
1. Import `AuratAgent` from `agents.aurat_agent`
2. Import `analyze_page_url` from `agents.detector`
3. Keep `/pause`, `/resume`, `/answer` endpoints (they work with BaseAgent interface)
4. Replace `/apply` to launch AuratAgent (no Playwright CDP connection)
5. Replace `/apply/detect` to use `analyze_page_url` (just URL pattern matching)
6. Remove Playwright-specific endpoints

**Step 1: Rewrite `api/routes.py` with these changes**

Key sections of the new file:

```python
from agents.aurat_agent import AuratAgent
from agents.detector import analyze_page_url
```

The `/apply` endpoint becomes:
```python
@router.post("/apply")
async def start_application(body: ApplicationStartRequest):
    global _active_agent, _agent_task
    if not body.job_url or not body.profile:
        raise HTTPException(400, "job_url and profile required")
    if _active_agent and not _active_agent.paused:
        raise HTTPException(409, "An application is already running")

    profile_data = body.profile if isinstance(body.profile, dict) else {}
    # Inject resume path
    if not profile_data.get("resume_path"):
        saved_resume = os.path.join(_RESUME_DIR, "resume.pdf")
        if os.path.exists(saved_resume):
            profile_data["resume_path"] = saved_resume
        else:
            try:
                db_profile = await db_get_profile()
                if db_profile and db_profile.get("resume_path"):
                    profile_data["resume_path"] = db_profile["resume_path"]
            except Exception:
                pass
    profile_data["_current_job_url"] = body.job_url or ""
    profile_data["_current_company"] = body.job_company or ""
    profile_data["_current_ats_type"] = body.ats_type or "generic"

    _active_agent = AuratAgent(profile_data)
    _active_agent.ats_type = body.ats_type or "generic"

    # Wire up WebSocket broadcasting
    if _active_agent:
        _active_agent.on_step = lambda step, status, detail="": (
            asyncio.ensure_future(manager.broadcast_log(step, status, detail))
        )

    # Save history row
    history_entry = await db_save_history({...})
    history_id = history_entry.get("id") if isinstance(history_entry, dict) else None

    async def run_agent():
        global _active_agent, _agent_task
        try:
            await _active_agent.run()
            if history_id:
                final_steps = _active_agent.steps_log if _active_agent else []
                await db_update_history_status(history_id, "completed", final_steps)
        except Exception as e:
            logger.exception("Agent run failed: %s", e)
            if history_id:
                await db_update_history_status(history_id, "failed", _active_agent.steps_log if _active_agent else [])
        finally:
            _active_agent = None
            _agent_task = None

    _agent_task = asyncio.create_task(run_agent())
    return {"status": "started", "job_url": body.job_url, ...}
```

The `/apply/detect` endpoint becomes:
```python
@router.post("/apply/detect")
async def detect_apply_page(body: dict):
    job_url = body.get("job_url", "")
    if not job_url:
        raise HTTPException(400, "job_url required")
    ctx = analyze_page_url(job_url)
    return {
        "platform": ctx.platform,
        "page_type": ctx.page_type,
        "visible_field_count": ctx.visible_field_count,
        "form_count": ctx.form_count,
        "snapshot_url": ctx.snapshot_url,
    }
```

**Step 2: Commit**

```bash
git add engine/api/routes.py
git commit -m "refactor: routes.py — switch to AuratAgent, remove Playwright, simplify detect"
```

---

## Task 8: Replace `llm/client.py` with OpenRouter-backed client

**Files:**
- Modify: `engine/llm/client.py`

Replace the Ollama client with a thin wrapper around the new `llm/openrouter.py` module. The existing `LLMClient` class interface must be preserved for memory, profile builder, and JD analyzer.

```python
import os
import json
import asyncio
import logging
from typing import Optional

from pydantic import BaseModel

logger = logging.getLogger(__name__)


class LLMClient:
    """LLM client backed by OpenRouter.

    Replaces the Ollama local+cloud client.
    Preserves the extract_structured() and complete() interfaces
    used by memory, profile builder, and JD analyzer.
    """

    def __init__(self):
        from llm.openrouter import get_llm
        self._get_llm = get_llm

    async def extract_structured(
        self, prompt: str, schema: type[BaseModel], text: str = "", model: Optional[str] = None
    ) -> BaseModel:
        from llm.openrouter import extract_structured
        return await extract_structured(prompt, schema, text, model=model)

    async def complete(self, prompt: str, max_tokens: int = 200, model: Optional[str] = None) -> str:
        from llm.openrouter import complete
        return await complete(prompt, max_tokens=max_tokens, model=model)
```

**Step 1: Replace the file content**

**Step 2: Commit**

```bash
git add engine/llm/client.py
git commit -m "refactor: replace Ollama LLM client with OpenRouter-backed client"
```

---

## Task 9: Update `requirements.txt`

**Files:**
- Modify: `engine/requirements.txt`

Remove:
- `playwright==1.52.0`
- `playwright-stealth==2.0.3`
- `ollama==0.5.0`

Add:
- `browser-use`
- `cloakbrowser`
- `langchain-openai`

Final `requirements.txt`:
```
fastapi==0.115.0
python-multipart==0.0.27
python-dotenv==1.1.0
uvicorn[standard]==0.34.0
pydantic==2.11.0
pymupdf==1.25.0
browser-use
cloakbrowser
langchain-openai
aiosqlite==0.21.0
httpx==0.28.0
rank-bm25==0.2.2
sentence-transformers==3.4.1
numpy>=1.26.0
```

**Step 1: Update file**

**Step 2: Install new dependencies**

```bash
cd engine && source .venv/bin/activate && pip install -r requirements.txt
```

**Step 3: Commit**

```bash
git add engine/requirements.txt
git commit -m "chore: update requirements — replace playwright/ollama with browser-use/cloakbrowser/langchain-openai"
```

---

## Task 10: Update `llm/prompts.py` — remove FIELD_MAP_PROMPT

**Files:**
- Modify: `engine/llm/prompts.py`

Remove `FIELD_MAP_PROMPT` (browser-use agent handles field mapping internally). Keep `EXTRACT_RESUME_PROMPT` and `MATCH_JD_PROMPT`.

```python
EXTRACT_RESUME_PROMPT = """You are a resume data extraction engine. Extract ONLY facts explicitly stated in the resume text.

Rules:
- NEVER invent information not present in the text
- Use null for missing fields rather than guessing
- Normalize dates to YYYY-MM format; use "Present" for current roles
- Preserve original wording for job titles, degrees, company names
- Split comma-separated skill lists into individual items
- Output valid JSON matching the provided schema exactly"""

MATCH_JD_PROMPT = """You are a job match analyzer. Compare the candidate's profile against the job description.

Rules:
- Calculate a match score from 0-100 based on skill overlap, experience relevance, and education alignment
- List missing skills that the JD requires but the candidate lacks
- List matching skills that overlap
- Be honest - don't inflate scores
- Output valid JSON matching the provided schema"""
```

**Step 1: Update file**

**Step 2: Commit**

```bash
git add engine/llm/prompts.py
git commit -m "refactor: remove FIELD_MAP_PROMPT (browser-use handles field mapping)"
```

---

## Task 11: Clean up `models/application.py` — remove dead models

**Files:**
- Modify: `engine/models/application.py`

Remove `ApplicationState`, `ApplicationPauseRequest`, `ApplicationResumeRequest`. Keep only `ApplicationStartRequest` and `ManualAnswerRequest`.

**Step 1: Edit the file to remove dead classes**

**Step 2: Commit**

```bash
git add engine/models/application.py
git commit -m "chore: remove dead model classes from application.py"
```

---

## Task 12: Clean up `memory/hybrid_store.py` — remove unused `field` import

**Files:**
- Modify: `engine/memory/hybrid_store.py`

Change `from dataclasses import dataclass, field` to `from dataclasses import dataclass`.

**Step 1: Fix import**

**Step 2: Commit**

```bash
git add engine/memory/hybrid_store.py
git commit -m "chore: remove unused field import from hybrid_store"
```

---

## Task 13: Create shared UI constants and hooks

**Files:**
- Create: `ui/lib/constants.ts`
- Create: `ui/hooks/use-profile.ts`

**Step 1: Create `lib/constants.ts`**

```typescript
export type AgentStatus = "Idle" | "Running" | "Paused"

export const STAGE_ICONS: Record<string, string> = {
  navigate: "🧭",
  detect: "🔍",
  click_apply: "🖱️",
  detect_fields: "📋",
  map_fields: "🧠",
  fill_fields: "✍️",
  review: "👁️",
  submit: "📤",
  done: "✅",
}

export const STATUS_COLORS: Record<string, string> = {
  running: "text-blue-400",
  completed: "text-green-400",
  paused: "text-orange-400",
  skipped: "text-muted-foreground",
  error: "text-destructive",
}

export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:18732"

export const ENGINE_PORT = 18732

export interface DetectResult {
  platform: string
  page_type: "description_only" | "form" | "multi_step"
  visible_field_count: number
  form_count?: number
  snapshot_url?: string
}

export interface Job {
  id: string
  title: string
  company: string
  url: string
  location?: string
  atsType?: string
  postedAt?: string
  description?: string
}
```

**Step 2: Create `hooks/use-profile.ts`**

```typescript
"use client"

import { useState, useEffect, useCallback } from "react"
import { electronAPI } from "@/lib/electron-api"
import type { MasterProfile } from "@/types"

export function useProfile() {
  const [profile, setProfile] = useState<MasterProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async () => {
    try {
      const data = await electronAPI.db.getProfile()
      if (data) {
        setProfile(data as MasterProfile)
      }
    } catch (err) {
      console.error("Failed to load profile:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  return { profile, setProfile, loading, reload: loadProfile }
}
```

**Step 3: Commit**

```bash
git add ui/lib/constants.ts ui/hooks/use-profile.ts
git commit -m "feat: add shared constants, types, and useProfile hook"
```

---

## Task 14: Update `ControlPanel.tsx` — use shared constants + hooks

**Files:**
- Modify: `ui/components/ControlPanel.tsx`

Key changes:
- Import `STAGE_ICONS`, `STATUS_COLORS`, `DetectResult` from `@/lib/constants`
- Import `useProfile` from `@/hooks/use-profile`
- Remove local `STAGE_ICONS` and `STATUS_COLORS` definitions
- Remove local `DetectResult` interface
- Use `useProfile()` hook if appropriate

**Step 1: Update the file**

**Step 2: Commit**

```bash
git add ui/components/ControlPanel.tsx
git commit -m "refactor: ControlPanel — use shared constants and types"
```

---

## Task 15: Update `ApplyDetectBanner.tsx` — fix electronAPI usage + shared types

**Files:**
- Modify: `ui/components/ApplyDetectBanner.tsx`

Key changes:
- Import `DetectResult` from `@/lib/constants`
- Remove local `DetectResult` interface
- Replace `(window as any).electronAPI?.python?.request(...)` with `electronAPI.python.request(...)`
- Remove eslint-disable comments
- Use refs for callbacks

**Step 1: Update the file**

**Step 2: Commit**

```bash
git add ui/components/ApplyDetectBanner.tsx
git commit -m "refactor: ApplyDetectBanner — use electronAPI wrapper, shared types, remove eslint-disables"
```

---

## Task 16: Update `BrowserPreview.tsx` — import shared AgentStatus

**Files:**
- Modify: `ui/components/BrowserPreview.tsx`

Key changes:
- Import `AgentStatus` from `@/lib/constants` instead of defining locally
- Remove local `type AgentStatus` definition

**Step 1: Update the file**

**Step 2: Commit**

```bash
git add ui/components/BrowserPreview.tsx
git commit -m "refactor: BrowserPreview — import shared AgentStatus type"
```

---

## Task 17: Update `use-agent-ws.ts` — configurable WS URL

**Files:**
- Modify: `ui/lib/use-agent-ws.ts`

Key changes:
- Import `WS_URL` from `@/lib/constants`
- Remove local `const WS_URL = "ws://localhost:18732"`

**Step 1: Update the file**

**Step 2: Commit**

```bash
git add ui/lib/use-agent-ws.ts
git commit -m "refactor: use-agent-ws — use configurable WS_URL constant"
```

---

## Task 18: Refactor Settings page — replace Ollama with OpenRouter

**Files:**
- Modify: `ui/app/settings/page.tsx`

Key changes:
- Replace "LLM Configuration" card title with "OpenRouter Configuration"
- Replace `OLLAMA_API_KEY` label with "OPENROUTER_API_KEY"
- Replace model options (`gpt-oss:120b-cloud`, `gpt-oss`) with OpenRouter models
- Default model: `liquid/lfm-2.5-1.2b-thinking:free`
- Add `openrouter/auto` as option
- Keep custom model input
- Replace "Playwright Browser" card with "Browser" card
- Replace Playwright check/install with CloakBrowser status
- Save settings via `electronAPI` or backend instead of `localStorage`
- Import version from `package.json` or constants instead of hardcoding

**Step 1: Rewrite the settings page**

**Step 2: Commit**

```bash
git add ui/app/settings/page.tsx
git commit -m "refactor: Settings — replace Ollama with OpenRouter, Playwright with Browser"
```

---

## Task 19: Update `history-detail-client.tsx` — shared constants

**Files:**
- Modify: `ui/app/history/[id]/history-detail-client.tsx`

Key changes:
- Import `STAGE_ICONS`, `STATUS_COLORS` from `@/lib/constants`
- Remove local duplicate definitions
- Import `AgentStatus` from shared constants

**Step 1: Update the file**

**Step 2: Commit**

```bash
git add "ui/app/history/[id]/history-detail-client.tsx"
git commit -m "refactor: history-detail — use shared constants"
```

---

## Task 20: Update `history/page.tsx` — shared constants

**Files:**
- Modify: `ui/app/history/page.tsx`

Key changes:
- Import shared types and constants
- Remove local `statusConfig` if duplicate of ControlPanel's

**Step 1: Update the file**

**Step 2: Commit**

```bash
git add ui/app/history/page.tsx
git commit -m "refactor: history page — use shared constants"
```

---

## Task 21: Update `desktop/main.ts` — configurable CDP port

**Files:**
- Modify: `desktop/main.ts`

Key changes:
- Remove hardcoded `const CDP_PORT = 9222` — let CloakBrowser manage its CDP port
- Remove `app.commandLine.appendSwitch('remote-debugging-port', String(CDP_PORT))` — CloakBrowser handles this
- Make the info server port configurable via env var if not already

**Step 1: Update the file**

**Step 2: Commit**

```bash
git add desktop/main.ts
git commit -m "refactor: remove hardcoded CDP port from Electron — CloakBrowser manages its own"
```

---

## Task 22: Engine cruft cleanup — misc fixes

**Files:**
- Modify: `engine/db/jobs_client.py` — move inline `urllib.parse` import to top level
- Modify: `engine/api/routes.py` — make `_RESUME_DIR` configurable via env var
- Modify: `engine/memory/hybrid_store.py` — make embedding model configurable

**Step 1: Fix each file**

In `db/jobs_client.py`, move `import urllib.parse` to top level.

In `api/routes.py`, change:
```python
_RESUME_DIR = os.path.expanduser("~/.aurat")
```
to:
```python
_RESUME_DIR = os.environ.get("AURAT_RESUME_DIR", os.path.expanduser("~/.aurat"))
```

In `memory/hybrid_store.py`, change hardcoded `all-MiniLM-L6-v2` to:
```python
_EMBED_MODEL = os.environ.get("AURAT_EMBED_MODEL", "all-MiniLM-L6-v2")
```

**Step 2: Commit**

```bash
git add engine/db/jobs_client.py engine/api/routes.py engine/memory/hybrid_store.py
git commit -m "chore: engine cruft — configurable paths, fix inline import"
```

---

## Task 23: UI cruft cleanup — misc fixes

**Files:**
- Multiple UI files

**Step 1: Default ATS type alignment**

In `ui/components/JobBrowser.tsx` and `ui/components/JobAnalyzer.tsx`, change:
```typescript
ats_type: job.atsType || "greenhouse"
```
to:
```typescript
ats_type: job.atsType || "generic"
```

**Step 2: Version number from package.json**

In `ui/components/Sidebar.tsx` and `ui/app/settings/page.tsx`, replace hardcoded `0.1.0` with a version imported from `package.json` or a shared constant.

**Step 3: localStorage key constant**

In `ui/app/settings/page.tsx`, replace `"aurat-settings"` with a constant from `lib/constants.ts`.

**Step 4: Remove sonner theme dependency**

In `ui/components/ui/sonner.tsx`, remove `useTheme` from `next-themes` and use hardcoded theme values.

**Step 5: Commit**

```bash
git add -A
git commit -m "chore: UI cruft — align ATS defaults, shared constants, remove next-themes"
```

---

## Task 24: Update `.env` — add OpenRouter variables

**Files:**
- Modify: `.env`

Add OpenRouter environment variables:
```
OPENROUTER_API_KEY=sk-or-v1-your-key-here
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_MODEL=liquid/lfm-2.5-1.2b-thinking:free
```

Remove or comment out Ollama variables.

**Step 1: Update .env**

**Step 2: Commit**

```bash
git add .env
git commit -m "chore: add OpenRouter env vars, comment out Ollama vars"
```

---

## Task 25: Integration test — verify the full pipeline works

**Step 1: Start the engine**

```bash
cd engine && source .venv/bin/activate && python -m uvicorn main:app --port 18732 --reload
```

**Step 2: Verify endpoints**

```bash
curl http://localhost:18732/health
curl -X POST http://localhost:18732/apply/detect -H "Content-Type: application/json" -d '{"job_url": "https://jobs.lever.co/example/123"}'
```

**Step 3: Start the UI**

```bash
cd ui && npm run dev
```

**Step 4: Verify Settings page shows OpenRouter config**

**Step 5: Commit any fixes**

```bash
git add -A && git commit -m "fix: integration test fixes"
```

---

## Summary of All Tasks

| # | Task | Key Changes |
|---|------|-------------|
| 1 | Delete dead engine files | Remove greenhouse, universal, human_input, stealth, agent_browser, job model, notebooks |
| 2 | Delete dead UI files | Remove ManualIntervention, PlaywrightSetup, tabs, template SVGs, unused deps |
| 3 | Create `llm/openrouter.py` | OpenRouter ChatOpenAI wrapper |
| 4 | Create `agents/aurat_agent.py` | Browser-use orchestrator |
| 5 | Refactor `agents/base.py` | Remove Playwright, simplify to BaseAgent |
| 6 | Refactor `agents/detector.py` | URL-only ATS detection |
| 7 | Refactor `api/routes.py` | Switch to AuratAgent, remove Playwright |
| 8 | Replace `llm/client.py` | OpenRouter-backed client |
| 9 | Update `requirements.txt` | Swap playwright/ollama for browser-use/cloakbrowser/langchain-openai |
| 10 | Update `llm/prompts.py` | Remove FIELD_MAP_PROMPT |
| 11 | Clean up `models/application.py` | Remove dead models |
| 12 | Clean up `memory/hybrid_store.py` | Remove unused import |
| 13 | Create shared UI constants | `lib/constants.ts`, `hooks/use-profile.ts` |
| 14 | Update ControlPanel | Use shared constants |
| 15 | Update ApplyDetectBanner | Fix electronAPI, shared types |
| 16 | Update BrowserPreview | Import shared AgentStatus |
| 17 | Update use-agent-ws | Configurable WS URL |
| 18 | Refactor Settings page | OpenRouter config, Browser card |
| 19 | Update history-detail | Shared constants |
| 20 | Update history page | Shared constants |
| 21 | Update desktop/main.ts | Remove hardcoded CDP port |
| 22 | Engine cruft cleanup | Configurable paths, fix imports |
| 23 | UI cruft cleanup | Align ATS defaults, shared constants |
| 24 | Update .env | OpenRouter vars |
| 25 | Integration test | Verify full pipeline |