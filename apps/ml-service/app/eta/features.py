"""Feature definitions. The SAME functions feed training and serving. Never fork them."""
import math
from datetime import date
import numpy as np
from app.campus import BELLS, calendar_state

STATIONS = ["fryer", "griddle", "wok", "beverage", "main_counter"]
FEATURES = ["n_lines", "n_units", "base_sum", "weighted_sum", "max_item_base", "n_stations",
            "st_fryer", "st_griddle", "st_wok", "st_beverage", "st_main_counter",
            "queue_depth", "strain_seconds", "strain_per_order", "completions_15m",
            "minute_sin", "minute_cos", "dow", "is_weekend", "since_bell", "to_bell", "cal_state", "canteen_idx"]
MONOTONE = {"base_sum": 1, "weighted_sum": 1, "queue_depth": 1, "strain_seconds": 1}   # more work never means a faster order


def order_features(items: list[dict]) -> dict:
    """items: [{qty, basePrepSeconds, weight, station}] exactly as the backend sends them."""
    st = {s: 0.0 for s in STATIONS}
    for i in items:
        st[i["station"] if i["station"] in st else "main_counter"] += i["basePrepSeconds"] * i["weight"] * i["qty"]
    f = {"n_lines": len(items), "n_units": sum(i["qty"] for i in items),
         "base_sum": sum(i["basePrepSeconds"] * i["qty"] for i in items),
         "weighted_sum": sum(i["basePrepSeconds"] * i["weight"] * i["qty"] for i in items),
         "max_item_base": max(i["basePrepSeconds"] for i in items), "n_stations": sum(1 for v in st.values() if v > 0)}
    f.update({f"st_{s}": st[s] for s in STATIONS})
    return f


def time_features(minute_of_day: int, dow: int, cal_state: int) -> dict:
    ang = 2 * math.pi * minute_of_day / 1440
    return {"minute_sin": math.sin(ang), "minute_cos": math.cos(ang), "dow": dow, "is_weekend": int(dow >= 5),
            "since_bell": min((minute_of_day - b) % 1440 for b in BELLS),
            "to_bell": min((b - minute_of_day) % 1440 for b in BELLS), "cal_state": cal_state}


def vectorized_time_features(local_ts) -> dict:
    """Same maths as time_features, for a whole pandas Series of tz-aware campus-local timestamps."""
    mod = local_ts.dt.hour * 60 + local_ts.dt.minute
    ang = 2 * np.pi * mod / 1440
    return {"minute_sin": np.sin(ang), "minute_cos": np.cos(ang), "dow": local_ts.dt.dayofweek,
            "is_weekend": (local_ts.dt.dayofweek >= 5).astype(int),
            "since_bell": np.min([(mod - b) % 1440 for b in BELLS], axis=0),
            "to_bell": np.min([(b - mod) % 1440 for b in BELLS], axis=0),
            "cal_state": [calendar_state(d) for d in local_ts.dt.date]}


def online_vector(items: list[dict], queue_depth: float, strain_seconds: float, completions_15m: float,
                  canteen_idx: float, now_local) -> np.ndarray:
    """THE single definition of the serving-time feature vector (1 x len(FEATURES), float32).
    Serving calls this. The training dataset builder is tested against it. `now_local` is a tz-aware datetime in campus time.
    Pass float('nan') for completions_15m / canteen_idx when unknown."""
    f = order_features(items)
    f.update(time_features(now_local.hour * 60 + now_local.minute, now_local.weekday(), calendar_state(now_local.date())))
    f.update(queue_depth=queue_depth, strain_seconds=strain_seconds, strain_per_order=strain_seconds / max(queue_depth, 1),
             completions_15m=completions_15m, canteen_idx=canteen_idx)
    return np.array([[f[k] for k in FEATURES]], dtype="float32")
