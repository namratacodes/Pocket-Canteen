import logging
from fastapi import FastAPI
from app.config import get_settings
from app.modules.types import ApiJob, MlModule
from app.ports import container
from .predictor import Predictor
from .registry_reader import current_version, load_version
from .routes import router

log = logging.getLogger("ml.etaserve")


def reload_model_if_changed(app: FastAPI) -> None:
    """Compares the promoted version with the loaded one; swaps the predictor object atomically (requests in flight keep the old one)."""
    s = get_settings(); wanted = current_version(s.artifact_dir)
    loaded = getattr(app.state, "predictor", None)
    if wanted is None or (loaded is not None and loaded.version == wanted): return
    try:
        model, meta = load_version(s.artifact_dir, wanted)
        new = Predictor(model, meta, s.campus_tz)
        if loaded is not None: new.velocity = loaded.velocity
        app.state.predictor = new; log.info("loaded ETA model %s", wanted)
    except Exception as e:
        log.warning("could not load ETA model %s: %s", wanted, e)       # keep serving the previous one


def refresh_velocity(app: FastAPI) -> None:
    p = getattr(app.state, "predictor", None)
    if p is not None and container.has("source"): p.velocity = container.get("source").velocity()


def _startup(app: FastAPI) -> None:
    app.state.predictor = None
    reload_model_if_changed(app)


module = MlModule(name="etaserve", router=router, on_startup=_startup,
                  api_jobs=[ApiJob("reload-model", 15, reload_model_if_changed),
                            ApiJob("refresh-velocity", get_settings().velocity_refresh_seconds, refresh_velocity)])
