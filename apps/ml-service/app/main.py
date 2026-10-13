"""API process assembly. Requests only: nothing CPU heavy ever runs here. Modules plug in through MlModule."""
import logging
from contextlib import asynccontextmanager
from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .bootstrap import load_and_register
from .config import get_settings
from .intelligence.store import IntelStore

log = logging.getLogger("ml")


def create_app(modules=None) -> FastAPI:
    """Production: create_app() loads every existing module. Tests: create_app([my_module])."""
    s = get_settings()
    mods = load_and_register(modules)

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        app.state.settings, app.state.store = s, IntelStore(s.artifact_dir)
        sched = BackgroundScheduler(timezone=s.campus_tz)
        for m in mods:
            if m.on_startup: m.on_startup(app)
            for j in m.api_jobs:
                sched.add_job(lambda j=j: _safe(j, app), "interval", seconds=j.seconds, id=f"{m.name}.{j.name}")
        sched.add_job(app.state.store.reload_if_changed, "interval", seconds=15, id="store.reload")
        sched.start()
        yield
        sched.shutdown(wait=False)

    app = FastAPI(title="Pocket Canteen ML Service", lifespan=lifespan)
    app.add_middleware(CORSMiddleware, allow_origins=[o.strip() for o in s.cors_origins.split(",")],
                       allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
    for m in mods:
        if m.router: app.include_router(m.router)
    return app


def _safe(job, app) -> None:
    try: job.fn(app)
    except Exception as e: log.warning("api job %s failed: %s", job.name, e)


_app = None


def __getattr__(name):
    """`uvicorn app.main:app` works, but merely importing this module (tests) does not build the app or register any port."""
    global _app
    if name == "app":
        if _app is None: _app = create_app()
        return _app
    raise AttributeError(name)
