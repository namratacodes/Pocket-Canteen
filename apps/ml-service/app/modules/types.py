from dataclasses import dataclass, field
from typing import Callable
from fastapi import APIRouter, FastAPI
from app.config import Settings


@dataclass
class ApiJob:
    """Light periodic task run inside the API process (never anything CPU heavy)."""
    name: str
    seconds: int
    fn: Callable[[FastAPI], None]


@dataclass
class MlModule:
    name: str
    register: Callable[[Settings], None] | None = None        # called first: register your port implementation(s) with the container
    router: APIRouter | None = None                           # your routes
    api_jobs: list[ApiJob] = field(default_factory=list)
    on_startup: Callable[[FastAPI], None] | None = None       # called once at API start, after all modules registered
