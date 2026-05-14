"""
screencast.py — Stream CDP screencast frames to the frontend via SSE.

Uses Chrome DevTools Protocol to capture page screenshots from the
stealth browser and stream them as base64 JPEG frames to Electron's
browser preview via Server-Sent Events.
"""

from __future__ import annotations

import asyncio
import base64
import json
import logging
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

CDP_PORT = 9222


async def get_page_ws_url(port: int = CDP_PORT) -> Optional[str]:
    """Get the WebSocket debugger URL for the first page tab."""
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(f"http://127.0.0.1:{port}/json/list", timeout=5.0)
            if resp.status_code == 200:
                tabs = resp.json()
                # Prefer non-blank pages
                for tab in tabs:
                    url = tab.get("url", "")
                    if url and url != "about:blank" and not url.startswith("chrome"):
                        return tab.get("webSocketDebuggerUrl")
                # Fallback to first tab
                if tabs:
                    return tabs[0].get("webSocketDebuggerUrl")
    except Exception as e:
        logger.debug("Could not get CDP page list: %s", e)
    return None


async def start_screencast(port: int = CDP_PORT) -> Optional[str]:
    """Start CDP screencast and return the WebSocket URL for the page."""
    ws_url = await get_page_ws_url(port)
    if not ws_url:
        logger.warning("No CDP page found on port %d", port)
        return None
    return ws_url
