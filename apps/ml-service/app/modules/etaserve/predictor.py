"""Online inference. No database access on the request path."""
from datetime import datetime
from zoneinfo import ZoneInfo
import numpy as np
from app.eta.features import FEATURES, online_vector

NAN = float("nan")


class Predictor:
    def __init__(self, model, meta: dict, tz: str):
        if meta["features"] != FEATURES:
            raise ValueError("model was trained with a different feature list than this service expects")
        self.model, self.meta, self.tz, self.version = model, meta, ZoneInfo(tz), meta["version"]
        self.canteen_idx = {c: i for i, c in enumerate(meta["canteenIds"])}
        self.velocity: dict[str, float] = {}               # canteen_id -> orders finished in the last 15 minutes (refreshed by an API job)

    def vector(self, canteen_id: str, items, queue_depth: float, strain_seconds: float, now: datetime) -> np.ndarray:
        dicts = [{"qty": i.qty, "basePrepSeconds": i.basePrepSeconds, "weight": i.weight, "station": i.station} for i in items]
        return online_vector(dicts, queue_depth, strain_seconds, self.velocity.get(canteen_id, NAN),
                             self.canteen_idx.get(canteen_id, NAN), now.astimezone(self.tz))

    def predict_seconds(self, canteen_id, items, queue_depth, strain_seconds, now) -> int:
        y = float(self.model.predict(self.vector(canteen_id, items, queue_depth, strain_seconds, now))[0])
        return int(min(7200, max(60, round(y))))
