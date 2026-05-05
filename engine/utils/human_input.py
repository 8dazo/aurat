import asyncio
import random

from playwright.async_api import Page


async def human_type(
    page: Page, selector: str, text: str, min_delay: int = 50, max_delay: int = 150
):
    await page.click(selector)
    for char in text:
        await page.keyboard.type(char, delay=random.randint(min_delay, max_delay))
        if random.random() < 0.05:
            await asyncio.sleep(random.uniform(0.3, 0.8))


async def human_click(page: Page, selector: str):
    box = await page.locator(selector).bounding_box()
    if box is None:
        await page.click(selector)
        return
    target_x = box["x"] + box["width"] / 2
    target_y = box["y"] + box["height"] / 2
    await _bezier_move(page, target_x, target_y, steps=random.randint(5, 15))
    await page.mouse.click(target_x, target_y)


async def human_delay(min_s: float = 0.5, max_s: float = 2.0):
    await asyncio.sleep(random.uniform(min_s, max_s))


async def _bezier_move(page: Page, target_x: float, target_y: float, steps: int = 10):
    current = await page.evaluate(
        "() => ({x: window.mouseX || 0, y: window.mouseY || 0})"
    )
    cx, cy = current["x"], current["y"]
    for i in range(1, steps + 1):
        t = i / steps
        nx = (
            cx
            + (target_x - cx) * t
            + random.gauss(0, max(5, abs(target_x - cx) * 0.05))
        )
        ny = (
            cy
            + (target_y - cy) * t
            + random.gauss(0, max(5, abs(target_y - cy) * 0.05))
        )
        await page.mouse.move(nx, ny)
        await asyncio.sleep(random.uniform(0.005, 0.02))
