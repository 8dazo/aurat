from fastapi import APIRouter, UploadFile, HTTPException, WebSocket, WebSocketDisconnect
from parsers.pdf_extract import extract_text_from_pdf
from parsers.llm_structured import extract_profile
from parsers.jd_analyzer import analyze_jd, MatchResult
from models.profile import MasterProfile
from db.jobs_client import get_jobs, get_job_by_url, get_job_filters
from agents.greenhouse import GreenhouseAgent
from utils.stealth import create_stealth_browser
from api.ws import manager
from utils.screencast import ScreencastStreamer
import httpx
import json
import asyncio

router = APIRouter()

_active_agent: GreenhouseAgent | None = None
_agent_task: asyncio.Task | None = None


@router.get("/health")
async def health():
    return {"status": "ok"}


@router.post("/extract")
async def extract_resume(file: UploadFile):
    if file.content_type != "application/pdf":
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


@router.get("/jobs")
async def list_jobs(
    search: str | None = None,
    atsType: str | None = None,
    location: str | None = None,
    postedWithin: str | None = None,
    page: int = 1,
    pageSize: int = 50,
):
    params = {"page": page, "pageSize": pageSize}
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


@router.post("/apply")
async def start_application(body: dict):
    global _active_agent, _agent_task
    job_url = body.get("job_url")
    profile = body.get("profile")
    ats_type = body.get("ats_type", "greenhouse")
    if not job_url or not profile:
        raise HTTPException(400, "job_url and profile required")

    if _active_agent and not _active_agent.paused:
        raise HTTPException(409, "An application is already running")

    _active_agent = GreenhouseAgent(profile)

    async def run_agent():
        pw, browser, context = await create_stealth_browser()
        streamer = ScreencastStreamer()
        try:
            page = await context.new_page()
            await page.goto(job_url, wait_until="networkidle", timeout=30000)
            await streamer.start(
                page, lambda frame: manager.broadcast_screencast(frame)
            )
            await _active_agent.run(
                page, on_step=lambda step: manager.broadcast_log(json.dumps(step))
            )
        finally:
            await streamer.stop()
            await browser.close()
            await pw.stop()

    _agent_task = asyncio.create_task(run_agent())
    return {"status": "started", "job_url": job_url}


@router.post("/pause")
async def pause_application():
    if not _active_agent:
        raise HTTPException(404, "No active application")
    await _active_agent.pause("User requested pause")
    return {"status": "paused"}


@router.post("/resume")
async def resume_application():
    if not _active_agent:
        raise HTTPException(404, "No active application")
    await _active_agent.resume()
    return {"status": "running"}


@router.post("/answer")
async def submit_answer(body: dict):
    question = body.get("question", "")
    answer = body.get("answer", "")
    if _active_agent:
        await _active_agent.answer_question(question, answer)
        await _active_agent.resume()
    return {"status": "answered"}


@router.websocket("/ws/screencast")
async def screencast_ws(websocket: WebSocket):
    await manager.connect_screencast(websocket)
    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        await manager.disconnect_screencast(websocket)


@router.websocket("/ws/logs")
async def logs_ws(websocket: WebSocket):
    await manager.connect_log(websocket)
    try:
        while True:
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        await manager.disconnect_log(websocket)
