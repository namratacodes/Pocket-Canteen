"""Reads the ETA model registry written by the training phase. Layout (frozen contract):
   <ARTIFACT_DIR>/eta/current.json            {"version": "<v>"}
   <ARTIFACT_DIR>/eta/<v>/model.json          XGBoost native format
   <ARTIFACT_DIR>/eta/<v>/meta.json           {version, trainedAt, features, canteenIds, xgboost, metrics{xgboost, ridge, fallback_formula, ...}}"""
import json
from pathlib import Path
import xgboost as xgb


def current_version(artifact_dir: str) -> str | None:
    p = Path(artifact_dir) / "eta" / "current.json"
    try: return json.loads(p.read_text())["version"]
    except (FileNotFoundError, KeyError, json.JSONDecodeError): return None


def load_version(artifact_dir: str, version: str):
    base = Path(artifact_dir) / "eta" / version
    meta = json.loads((base / "meta.json").read_text())
    model = xgb.XGBRegressor(); model.load_model(base / "model.json"); model.set_params(n_jobs=1)     # one thread: lowest latency for 1 row
    return model, meta
