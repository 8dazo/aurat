import httpx
import os
import urllib.parse

JOB_DATA_BASE = os.environ.get("JOB_DATA_API_BASE", "https://job-listing.aurat.ai")


async def get_jobs(params: dict | None = None) -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"{JOB_DATA_BASE}/api/jobs", params=params or {}, timeout=30.0
        )
        resp.raise_for_status()
        return resp.json()


async def get_job_by_url(url: str) -> dict:
    async with httpx.AsyncClient() as client:
        encoded = urllib.parse.quote(url, safe="")
        resp = await client.get(f"{JOB_DATA_BASE}/api/jobs/{encoded}", timeout=30.0)
        resp.raise_for_status()
        return resp.json()


async def get_job_filters() -> dict:
    async with httpx.AsyncClient() as client:
        resp = await client.get(f"{JOB_DATA_BASE}/api/jobs/filters", timeout=30.0)
        resp.raise_for_status()
        return resp.json()
