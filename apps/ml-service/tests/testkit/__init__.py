"""Test kit shared by every phase. Read-only. Gives you realistic frames, an in-memory DataSource, a toy ETA model artifact,
auth headers and recording fakes for the ports owned by OTHER phases."""
import json
from datetime import datetime
from pathlib import Path
import jwt
import numpy as np
import pandas as pd
import xgboost as xgb
from app.config import get_settings
from app.eta.features import FEATURES
from app.frames import check_frames
from .world import World, make_world


class FrameSource:
    """In-memory DataSource. Use instead of phase 1's real sources in tests."""
    def __init__(self, world: World, velocity: dict | None = None):
        check_frames(world.orders, world.lines, world.catalog); self.w, self._v = world, velocity or {}
    def orders(self, since: datetime | None = None):
        o = self.w.orders; return o if since is None else o[o.placed_at >= since]
    def lines(self, since: datetime | None = None):
        return self.w.lines[self.w.lines.order_id.isin(self.orders(since).order_id)]
    def catalog(self): return self.w.catalog
    def velocity(self): return dict(self._v)


def auth(role: str, canteen_id: str | None = None, sub: str = "u1") -> dict:
    """Authorization header exactly like the backend's access token (HS256, payload {sub, role, canteenId})."""
    tok = jwt.encode({"sub": sub, "role": role, "canteenId": canteen_id}, get_settings().jwt_access_secret, algorithm="HS256")
    return {"Authorization": f"Bearer {tok}"}


def make_eta_artifacts(artifact_dir: str, canteen_ids: list[str], version: str = "testkit-1") -> str:
    """Writes a VALID model registry (layout in the contract) holding a toy model: eta ~ 1.1*base_sum + 90*queue_depth.
    Lets phases that only READ the registry run without phase 2."""
    rng = np.random.default_rng(0); n = 3000
    X = pd.DataFrame({f: rng.uniform(0, 1, n) for f in FEATURES})
    X["base_sum"] = rng.uniform(60, 900, n); X["weighted_sum"] = X.base_sum * rng.uniform(1, 1.5, n); X["queue_depth"] = rng.integers(0, 20, n).astype(float)
    X["strain_seconds"] = X.queue_depth * rng.uniform(200, 500, n); X["canteen_idx"] = rng.integers(0, max(1, len(canteen_ids)), n).astype(float)
    y = 1.1 * X.base_sum + 90 * X.queue_depth + rng.normal(0, 20, n)
    m = xgb.XGBRegressor(n_estimators=60, max_depth=4, learning_rate=.2, monotone_constraints=tuple(1 if f in ("base_sum", "queue_depth") else 0 for f in FEATURES))
    m.fit(X[FEATURES], y)
    folder = Path(artifact_dir) / "eta" / version; folder.mkdir(parents=True, exist_ok=True)
    m.save_model(folder / "model.json")
    metric = {"n": 1, "mae_s": 20.0, "median_ae_s": 15.0, "p90_ae_s": 40.0, "within_2min_pct": 99.0, "bias_s": 0.0}
    (folder / "meta.json").write_text(json.dumps({"version": version, "trainedAt": "2026-10-10T00:00:00+00:00", "features": FEATURES,
        "canteenIds": canteen_ids, "xgboost": xgb.__version__, "metrics": {"xgboost": metric, "ridge": metric, "fallback_formula": {**metric, "mae_s": 300.0}}}))
    (Path(artifact_dir) / "eta" / "current.json").write_text(json.dumps({"version": version}))
    return version


class _Recorder:
    def __init__(self): self.calls: list[tuple] = []


class FakeTrainer(_Recorder):
    result = {"action": "kept_current"}
    def train_and_register(self, source, *, promote=True): self.calls.append(("train_and_register", promote)); return "fake-version"
    def retrain_if_better(self, source, *, window_days, min_improvement=0.02): self.calls.append(("retrain_if_better", window_days)); return dict(self.result)


class FakeMenuIntel(_Recorder):
    def build(self, orders, lines, catalog, as_of):
        self.calls.append(("build", len(orders)))
        return {"matrix": {c: {"windowDays": 30, "items": [], "thresholds": {}} for c in catalog.canteen_id.unique()}, "rules": {c: [] for c in catalog.canteen_id.unique()}}


class FakeForecast(_Recorder):
    def build(self, orders, lines, catalog, tz, today):
        self.calls.append(("build", str(today)))
        return {"sheet": {c: {"date": str(today), "rows": []} for c in catalog.canteen_id.unique()}, "forecastReport": {"fake": True}}
