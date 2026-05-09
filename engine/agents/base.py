from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Callable

from playwright.async_api import Page


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
        # Platform context set before run()
        self.resume_path: str | None = profile.get("resume_path")
        self.ats_type: str = "generic"
        self.page_context: dict = {}

    @abstractmethod
    async def detect_form_fields(self, page: Page) -> list[dict]:
        pass

    @abstractmethod
    async def fill_field(self, page: Page, field: dict, value: str):
        pass

    @abstractmethod
    async def submit(self, page: Page):
        pass

    @abstractmethod
    async def run(self, page: Page):
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
