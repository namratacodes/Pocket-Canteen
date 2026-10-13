"""Train, evaluate and register an ETA model version. Time-based split only."""
import json, time
from datetime import datetime, timezone
from pathlib import Path
import numpy as np
import pandas as pd
import xgboost as xgb
from sklearn.linear_model import Ridge
from app.eta.features import FEATURES, MONOTONE

TARGET = "actual_prep_seconds"


def metrics(pred: np.ndarray, y: np.ndarray) -> dict:
    e = np.abs(pred - y)
    return {"n": int(len(y)), "mae_s": float(e.mean()), "median_ae_s": float(np.median(e)), "p90_ae_s": float(np.percentile(e, 90)),
            "within_2min_pct": float((e <= 120).mean() * 100), "bias_s": float(np.mean(pred - y))}


MIN_DAYS = 6


def time_split(d: pd.DataFrame, test_days=14, val_days=7):
    """Chronological split by campus day. Shrinks the test/validation windows on short histories (but never below 1 day each)."""
    days = sorted(d.day.unique())
    if len(days) < MIN_DAYS: raise ValueError(f"need at least {MIN_DAYS} distinct days of orders to train, got {len(days)}")
    test_days, val_days = min(test_days, max(1, len(days) // 4)), min(val_days, max(1, len(days) // 6))
    te, va = days[-test_days:], days[-(test_days + val_days):-test_days]
    return d[d.day < va[0]], d[d.day.isin(va)], d[d.day.isin(te)]


def train(d: pd.DataFrame, test_days=14, val_days=7, seed=7):
    tr, va, te = time_split(d, test_days, val_days)
    model = xgb.XGBRegressor(objective="reg:absoluteerror", n_estimators=2000, learning_rate=.04, max_depth=6, min_child_weight=5,
                             subsample=.8, colsample_bytree=.8, reg_lambda=2, tree_method="hist", n_jobs=4, random_state=seed,
                             monotone_constraints=tuple(MONOTONE.get(f, 0) for f in FEATURES), early_stopping_rounds=60)
    model.fit(tr[FEATURES], tr[TARGET], eval_set=[(va[FEATURES], va[TARGET])], verbose=False)
    ridge = Ridge(alpha=1.0).fit(tr[FEATURES].fillna(0), tr[TARGET])
    y = te[TARGET].to_numpy()
    report = {"xgboost": metrics(model.predict(te[FEATURES]), y), "ridge": metrics(ridge.predict(te[FEATURES].fillna(0)), y),
              "fallback_formula": metrics(te.fallback_pred.to_numpy(), y), "best_iteration": int(model.best_iteration),
              "split": {"train": [str(tr.day.min()), str(tr.day.max())], "val": [str(va.day.min()), str(va.day.max())],
                        "test": [str(te.day.min()), str(te.day.max())], "rows": [len(tr), len(va), len(te)]}}
    te = te.assign(pred=model.predict(te[FEATURES]))
    bucket = pd.cut(te.queue_depth, [-1, 0, 3, 7, 12, 10**6], labels=["0", "1-3", "4-7", "8-12", "13+"])
    report["by_queue_depth"] = {str(k): {"n": int(len(x)), "mae_xgb_s": float(np.abs(x.pred - x[TARGET]).mean()),
                                         "mae_fallback_s": float(np.abs(x.fallback_pred - x[TARGET]).mean())}
                                for k, x in te.groupby(bucket, observed=True)}
    gain = pd.Series(model.get_booster().get_score(importance_type="gain")); report["feature_importance"] = (gain / gain.sum()).round(4).to_dict()
    return model, report


def register(model, report, canteen_ids, artifact_dir: str, version: str | None = None) -> str:
    version = version or datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S-%f")       # microseconds: two trainings in one second must not collide
    folder = Path(artifact_dir) / "eta" / version; folder.mkdir(parents=True, exist_ok=True)
    model.save_model(folder / "model.json")
    meta = {"version": version, "trainedAt": datetime.now(timezone.utc).isoformat(), "features": FEATURES, "canteenIds": canteen_ids,
            "xgboost": xgb.__version__, "metrics": report}
    (folder / "meta.json").write_text(json.dumps(meta, indent=2, default=str))
    return version


def promote(artifact_dir: str, version: str) -> None:
    p = Path(artifact_dir) / "eta" / "current.json"; tmp = p.with_suffix(".tmp")
    tmp.write_text(json.dumps({"version": version})); tmp.replace(p)          # atomic pointer swap


def load_current(artifact_dir: str):
    base = Path(artifact_dir) / "eta"
    version = json.loads((base / "current.json").read_text())["version"]
    meta = json.loads((base / version / "meta.json").read_text())
    model = xgb.XGBRegressor(); model.load_model(base / version / "model.json"); model.set_params(n_jobs=1)
    return model, meta
