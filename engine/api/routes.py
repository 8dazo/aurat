from __future__ import annotations

import asyncio
import base64
import json
import logging
import os

import httpx
from fastapi import APIRouter, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from playwright.async_api import Page as PlaywrightPage

from agents.greenhouse import GreenhouseAgent
from agents.universal import AutoApplyAgent
from agents.detector import analyze_page
from api.ws import manager
from db.crud import (
    get_history as db_get_history,
    get_history_by_id as db_get_history_by_id,
    get_profile as db_get_profile,
    get_qna_memory as db_get_qna,
    save_history as db_save_history,
    save_profile as db_save_profile,
    save_qna_memory as db_save_qna,
    save_resume_path as db_save_resume_path,
    update_history_status as db_update_history_status,
)
from db.jobs_client import get_job_by_url, get_job_filters, get_jobs
from models.application import ApplicationStartRequest, ManualAnswerRequest
from parsers.jd_analyzer import analyze_jd
from parsers.llm_structured import extract_profile
from parsers.pdf_extract import extract_text_from_pdf
from utils.stealth import (
    check_browser_installed,
    connect_to_electron,
    get_electron_cdp_url,
    install_browser,
)

router = APIRouter()
logger = logging.getLogger(__name__)

_active_agent: AutoApplyAgent | GreenhouseAgent | None = None
_agent_task: asyncio.Task | None = None
_active_page: PlaywrightPage | None = None

# Default resume storage directory
_RESUME_DIR = os.path.expanduser("~/.aurat")


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@router.get("/health")
async def health():
    browser_info = await check_browser_installed()
    return {"status": "ok", "service": "aurat-engine", "browser": browser_info}


@router.post("/install-browser")
async def install_chromium():
    result = await install_browser()
    return result


# ---------------------------------------------------------------------------
# Resume — extract + save PDF to disk
# ---------------------------------------------------------------------------

@router.post("/extract")
async def extract_resume(file: UploadFile):
    if file.content_type and file.content_type != "application/pdf":
        raise HTTPException(400, "PDF only")
    pdf_bytes = await file.read()
    if len(pdf_bytes) > 10 * 1024 * 1024:
        raise HTTPException(400, "Max 10MB")
    try:
        text = extract_text_from_pdf(pdf_bytes)
    except ValueError as e:
        raise HTTPException(422, str(e))
    try:
        profile = await extract_profile(text)
        return profile.model_dump()
    except Exception as e:
        raise HTTPException(422, f"Extraction failed: {e}")


@router.post("/extract-base64")
async def extract_resume_base64(body: dict):
    data = body.get("data", "")
    filename = body.get("filename", "resume.pdf")
    try:
        pdf_bytes = base64.b64decode(data)
    except Exception:
        raise HTTPException(400, "Invalid base64 data")
    if len(pdf_bytes) > 10 * 1024 * 1024:
        raise HTTPException(400, "Max 10MB")
    try:
        text = extract_text_from_pdf(pdf_bytes)
    except ValueError as e:
        raise HTTPException(422, str(e))
    try:
        profile = await extract_profile(text)
        return profile.model_dump()
    except Exception as e:
        raise HTTPException(422, f"Extraction failed: {e}")


@router.post("/resume/save")
async def save_resume_to_disk(body: dict):
    """
    Save the raw PDF (base64-encoded) to ~/.aurat/resume.pdf so the agent
    can pass the file path directly to Playwright's set_files() for file-picker inputs.
    Also persists the path in the master_profile DB blob.
    """
    data = body.get("data", "")
    filename = body.get("filename", "resume.pdf")
    try:
        pdf_bytes = base64.b64decode(data)
    except Exception:
        raise HTTPException(400, "Invalid base64 data")
    if len(pdf_bytes) > 10 * 1024 * 1024:
        raise HTTPException(400, "Max 10MB")

    os.makedirs(_RESUME_DIR, exist_ok=True)
    # Always save as resume.pdf for simplicity; we keep the original name in metadata
    save_path = os.path.join(_RESUME_DIR, "resume.pdf")
    with open(save_path, "wb") as f:
        f.write(pdf_bytes)

    # Persist path to profile
    try:
        await db_save_resume_path(save_path)
    except Exception as e:
        logger.warning("Could not persist resume_path to DB: %s", e)

    return {"status": "saved", "path": save_path, "filename": filename}


# ---------------------------------------------------------------------------
# Job analysis
# ---------------------------------------------------------------------------

@router.post("/analyze")
async def analyze_job(body: dict):
    profile = body.get("profile")
    job_url = body.get("job_url")
    if not profile or not job_url:
        raise HTTPException(400, "profile and job_url required")
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(job_url, timeout=30.0, follow_redirects=True)
            jd_text = resp.text
    except Exception as e:
        raise HTTPException(422, f"Failed to fetch job URL: {e}")
    try:
        result = await analyze_jd(json.dumps(profile), jd_text)
        return result.model_dump()
    except Exception as e:
        raise HTTPException(422, f"Analysis failed: {e}")


# ---------------------------------------------------------------------------
# Jobs
# ---------------------------------------------------------------------------

@router.get("/jobs")
async def list_jobs(
    search: str | None = None,
    atsType: str | None = None,
    location: str | None = None,
    postedWithin: str | None = None,
    page: int = 1,
    pageSize: int = 50,
):
    params = {"page": str(page), "pageSize": str(pageSize)}
    if search:
        params["search"] = search
    if atsType:
        params["atsType"] = atsType
    if location:
        params["location"] = location
    if postedWithin:
        params["postedWithin"] = postedWithin
    try:
        return await get_jobs(params)
    except Exception as e:
        raise HTTPException(502, f"Job Data Guide API error: {e}")


@router.get("/jobs/filters")
async def job_filters():
    try:
        return await get_job_filters()
    except Exception as e:
        raise HTTPException(502, f"Job Data Guide API error: {e}")


@router.get("/jobs/{url:path}")
async def job_detail(url: str):
    try:
        return await get_job_by_url(url)
    except Exception as e:
        raise HTTPException(502, f"Job Data Guide API error: {e}")


# ---------------------------------------------------------------------------
# Apply — detect (pre-flight, no agent started)
# ---------------------------------------------------------------------------

@router.post("/apply/detect")
async def detect_apply_page(body: dict):
    """
    Navigate to a job URL inside the Electron browser and return page context
    (platform, page_type, visible_field_count) WITHOUT starting the full agent.
    Used by the UI to display a smart banner before the user hits Start.
    """
    job_url = body.get("job_url", "")
    if not job_url:
        raise HTTPException(400, "job_url required")

    try:
        cdp_url = await get_electron_cdp_url()
        pw, browser, context, page = await connect_to_electron(cdp_url)
        await page.goto(job_url, wait_until="domcontentloaded", timeout=30000)
        ctx = await analyze_page(page)
        try:
            await pw.stop()
        except Exception:
            pass
        # Also clean up agent view
        try:
            async with httpx.AsyncClient() as client:
                await client.get("http://127.0.0.1:18733/detach-agent-view", timeout=5.0)
        except Exception:
            pass
        return {
            "platform": ctx.platform,
            "page_type": ctx.page_type,
            "visible_field_count": ctx.visible_field_count,
            "form_count": ctx.form_count,
            "snapshot_url": ctx.snapshot_url,
        }
    except Exception as e:
        raise HTTPException(422, f"Page detection failed: {e}")


# ---------------------------------------------------------------------------
# Apply — start agent
# ---------------------------------------------------------------------------

@router.post("/apply")
async def start_application(body: ApplicationStartRequest):
    global _active_agent, _agent_task, _active_page
    if not body.job_url or not body.profile:
        raise HTTPException(400, "job_url and profile required")

    if _active_agent and not _active_agent.paused:
        raise HTTPException(409, "An application is already running")

    profile_data = body.profile if isinstance(body.profile, dict) else {}

    # Use AutoApplyAgent for all platforms (falls back internally to greenhouse signals)
    _active_agent = AutoApplyAgent(profile_data)
    _active_agent.ats_type = body.ats_type or "generic"
    _active_page = None

    job_url = body.job_url
    job_title = body.job_title
    job_company = body.job_company

    async def run_agent():
        global _active_agent, _active_page

        logger.info("run_agent: connecting to Electron CDP…")
        try:
            cdp_url = await get_electron_cdp_url()
        except Exception as e:
            logger.exception("run_agent: CDP URL failed: %s", e)
            await manager.broadcast_log("browser", "error", f"electron_cdp_failed: {e}")
            await manager.broadcast_status("Idle")
            _active_agent = None
            _agent_task = None
            return

        try:
            pw, browser, context, page = await connect_to_electron(cdp_url)
        except Exception as e:
            logger.exception("run_agent: Electron connect failed: %s", e)
            await manager.broadcast_log("browser", "error", f"browser_connect_failed: {e}")
            await manager.broadcast_status("Idle")
            _active_agent = None
            _agent_task = None
            return

        _active_page = page

        # ── Save history row early so we have an ID ──────────────────
        history_entry = await db_save_history(
            {
                "job_url": job_url,
                "snapshot_url": job_url,
                "ats_platform": body.ats_type or "generic",
                "job_title": job_title,
                "company": job_company,
                "match_score": None,
                "status": "running",
                "steps_log": [],
                "custom_questions": [],
            }
        )
        history_id = history_entry.get("id") if isinstance(history_entry, dict) else None

        try:
            await page.goto("about:blank")
            await manager.broadcast_log("browser", "started", "page_url=about:blank")
            logger.info("run_agent: navigating to %s", job_url)
            await manager.broadcast_log("navigation", "running", f"Navigating to {job_url}")
            await page.goto(job_url, wait_until="networkidle", timeout=30000)
            logger.info("run_agent: page loaded")
            current_url = page.url
            await manager.broadcast_log("browser", "navigated", f"page_url={current_url}")
            await manager.broadcast_log("navigation", "completed", "Page loaded")

            if _active_agent:
                _active_agent.on_step = lambda step, status, detail="": (
                    asyncio.ensure_future(manager.broadcast_log(step, status, detail))
                )
            await manager.broadcast_status("Running")

            if _active_agent:
                await _active_agent.run(page)

            # Capture final snapshot URL
            final_url = page.url or job_url
            final_steps = _active_agent.steps_log if _active_agent else []
            final_questions = _active_agent.custom_questions if _active_agent else []

            if history_id:
                await db_update_history_status(history_id, "completed", final_steps)

            await manager.broadcast_status("Idle")

        except Exception as e:
            error_msg = f"{type(e).__name__}: {e}"
            logger.exception("Agent run failed: %s", e)
            await manager.broadcast_log("agent", "error", error_msg)
            if history_id:
                steps = _active_agent.steps_log if _active_agent else []
                await db_update_history_status(history_id, "failed", steps)
            await manager.broadcast_status("Idle")
        finally:
            _active_agent = None
            _agent_task = None
            _active_page = None
            try:
                await pw.stop()
            except Exception:
                pass
            try:
                async with httpx.AsyncClient() as client:
                    await client.get(
                        "http://127.0.0.1:18733/detach-agent-view", timeout=5.0
                    )
            except Exception:
                pass

    _agent_task = asyncio.create_task(run_agent())
    return {
        "status": "started",
        "job_url": job_url,
        "job_title": job_title,
        "job_company": job_company,
    }


# ---------------------------------------------------------------------------
# Agent control
# ---------------------------------------------------------------------------

@router.post("/pause")
async def pause_application():
    if not _active_agent:
        raise HTTPException(404, "No active application")
    await _active_agent.pause("User requested pause")
    await manager.broadcast_status("Paused", "User requested pause")
    return {"status": "Paused"}


@router.post("/resume")
async def resume_application():
    if not _active_agent:
        raise HTTPException(404, "No active application")
    await _active_agent.resume()
    await manager.broadcast_status("Running")
    return {"status": "Running"}


@router.post("/answer")
async def submit_answer(body: ManualAnswerRequest):
    if _active_agent:
        await _active_agent.answer_question(body.question, body.answer)
        await _active_agent.resume()
    return {"status": "answered"}


# ---------------------------------------------------------------------------
# DB routes
# ---------------------------------------------------------------------------

@router.get("/db/profile")
async def db_get_profile_route():
    return await db_get_profile()


@router.post("/db/profile")
async def db_save_profile_route(body: dict):
    return await db_save_profile(body)


@router.get("/db/history")
async def db_get_history_route(filters: str | None = None):
    parsed = json.loads(filters) if filters else None
    return await db_get_history(parsed)


@router.get("/db/history/{entry_id}")
async def db_get_history_entry_route(entry_id: int):
    result = await db_get_history_by_id(entry_id)
    if not result:
        raise HTTPException(404, "History entry not found")
    return result


@router.post("/db/history")
async def db_save_history_route(body: dict):
    return await db_save_history(body)


@router.get("/db/qna/{question_hash}")
async def db_get_qna_route(question_hash: str):
    result = await db_get_qna(question_hash)
    return result if result else {"answer": None}


@router.post("/db/qna")
async def db_save_qna_route(body: dict):
    return await db_save_qna(
        body.get("questionHash", ""),
        body.get("question", ""),
        body.get("answer", ""),
        body.get("appId", 0),
    )


# ---------------------------------------------------------------------------
# WebSocket
# ---------------------------------------------------------------------------

@router.websocket("/ws/logs")
async def logs_ws(websocket: WebSocket):
    await manager.connect_log(websocket)
    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        await manager.disconnect_log(websocket)
