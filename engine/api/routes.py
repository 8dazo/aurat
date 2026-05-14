from __future__ import annotations

import asyncio
import base64
import json
import logging
import os

import httpx
from fastapi import APIRouter, HTTPException, UploadFile, WebSocket, WebSocketDisconnect

from agents.aurat_agent import AuratAgent
from agents.detector import analyze_page_url  # noqa: F401 used by detect endpoint
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

router = APIRouter()
logger = logging.getLogger(__name__)

_active_agent: AuratAgent | None = None
_agent_task: asyncio.Task | None = None

_RESUME_DIR = os.environ.get("AURAT_RESUME_DIR", os.path.expanduser("~/.aurat"))


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------


@router.get("/health")
async def health():
    return {"status": "ok", "service": "aurat-engine"}


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


@router.get("/resume/status")
async def resume_status():
    """Check if a saved resume file exists without requiring a new upload."""
    save_path = os.path.join(_RESUME_DIR, "resume.pdf")
    if os.path.exists(save_path):
        size_kb = round(os.path.getsize(save_path) / 1024, 1)
        return {
            "saved": True,
            "path": save_path,
            "filename": "resume.pdf",
            "size_kb": size_kb,
        }
    try:
        profile = await db_get_profile()
        if (
            profile
            and profile.get("resume_path")
            and os.path.exists(profile["resume_path"])
        ):
            p = profile["resume_path"]
            return {
                "saved": True,
                "path": p,
                "filename": os.path.basename(p),
                "size_kb": round(os.path.getsize(p) / 1024, 1),
            }
    except Exception:
        pass
    return {"saved": False, "path": None, "filename": None, "size_kb": 0}


@router.post("/resume/save")
async def save_resume_to_disk(body: dict):
    """
    Save the raw PDF (base64-encoded) to disk so the agent
    can pass the file path to browser-use for file-picker inputs.
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
    save_path = os.path.join(_RESUME_DIR, "resume.pdf")
    with open(save_path, "wb") as f:
        f.write(pdf_bytes)

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


@router.post("/event")
async def handle_event(body: dict):
    event = body.get("event", "")
    if event == "view_crashed" and _active_agent:
        logger.warning("Received view_crashed event — pausing agent")
        await _active_agent.pause(
            "Browser view crashed — you can resume after reloading"
        )
        await manager.broadcast_status("Paused", "Browser view crashed")
    return {"status": "ok", "event": event}


@router.post("/apply/detect")
async def detect_apply_page(body: dict):
    """
    Detect the ATS platform from the URL (no browser needed).
    Returns platform and default page_type for the UI banner.
    """
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


# ---------------------------------------------------------------------------
# Apply — start agent
# ---------------------------------------------------------------------------


@router.post("/apply")
async def start_application(body: ApplicationStartRequest):
    global _active_agent, _agent_task
    if not body.job_url or not body.profile:
        raise HTTPException(400, "job_url and profile required")

    if _active_agent and not _active_agent.paused:
        raise HTTPException(409, "An application is already running")

    profile_data = body.profile if isinstance(body.profile, dict) else {}

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

    if _active_agent:
        _active_agent.on_step = lambda step, status, detail="": asyncio.ensure_future(
            manager.broadcast_log(step, status, detail)
        )

    job_url = body.job_url
    job_title = body.job_title
    job_company = body.job_company

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

    async def run_agent():
        global _active_agent, _agent_task
        agent = _active_agent

        try:
            if agent is None:
                logger.error("run_agent: agent is None")
                await manager.broadcast_status("Idle")
                return
            await agent.run()
            final_steps = agent.steps_log
            final_questions = agent.custom_questions

            if history_id:
                await db_update_history_status(history_id, "completed", final_steps)

            await manager.broadcast_status("Idle")

        except Exception as e:
            error_msg = f"{type(e).__name__}: {e}"
            logger.exception("Agent run failed: %s", e)
            await manager.broadcast_log("agent", "error", error_msg)
            if history_id:
                steps = agent.steps_log if agent else []
                await db_update_history_status(history_id, "failed", steps)
            await manager.broadcast_status("Idle")
        finally:
            _active_agent = None
            _agent_task = None

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
# Memory API
# ---------------------------------------------------------------------------


@router.get("/memory/status")
async def memory_status():
    """Return document counts per memory collection."""
    try:
        from memory.collections import MemoryCollections

        mem = MemoryCollections()
        return await mem.status()
    except Exception as e:
        raise HTTPException(500, f"Memory status failed: {e}")


@router.get("/memory/search")
async def memory_search(q: str, collection: str = "qna_memory", top_k: int = 5):
    """Hybrid BM25+vector search over a memory collection."""
    if not q:
        raise HTTPException(400, "q required")
    try:
        from memory.collections import MemoryCollections

        mem = MemoryCollections()
        results = await mem._store.search(collection, q, top_k=top_k, rerank=False)
        return [
            {
                "doc_id": r.doc_id,
                "content": r.content[:300],
                "metadata": r.metadata,
                "score": r.score,
            }
            for r in results
        ]
    except Exception as e:
        raise HTTPException(500, f"Memory search failed: {e}")


@router.get("/memory/facts")
async def memory_facts(min_confidence: int = 50):
    """Return extracted profile facts with confidence scores."""
    try:
        from memory.collections import MemoryCollections

        mem = MemoryCollections()
        return await mem.get_all_facts(min_confidence=min_confidence)
    except Exception as e:
        raise HTTPException(500, f"Memory facts failed: {e}")


@router.post("/memory/enrich")
async def memory_enrich():
    """Manually trigger profile enrichment from high-confidence facts."""
    try:
        from memory.profile_builder import ProfileBuilder

        profile = await db_get_profile()
        if not profile:
            raise HTTPException(404, "No profile found")
        builder = ProfileBuilder()
        enriched = await builder.enrich_profile(profile)
        await db_save_profile(enriched)
        return {"status": "enriched", "profile": enriched}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Enrichment failed: {e}")


@router.get("/memory/gaps")
async def memory_gaps(job_context: str = ""):
    """Find profile gaps and return questions to ask the user."""
    try:
        from memory.profile_builder import ProfileBuilder

        profile = await db_get_profile() or {}
        builder = ProfileBuilder()
        gaps = await builder.find_gaps_and_questions(profile, job_context=job_context)
        return {"gaps": gaps}
    except Exception as e:
        raise HTTPException(500, f"Gap analysis failed: {e}")


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
