import json
import numpy as np
from app.config import get_settings
from app.eta.features import FEATURES
from app.modules.etatrain.train import load_current, promote, register, time_split


def test_split_is_chronological_and_disjoint(built):
    d, _ = built; tr, va, te = time_split(d, 4, 3)
    assert tr.day.max() < va.day.min() <= va.day.max() < te.day.min()
    assert len(tr) + len(va) + len(te) <= len(d)


def test_model_clearly_beats_the_fallback_formula(trained):
    _, r = trained
    assert r["xgboost"]["mae_s"] < 0.6 * r["fallback_formula"]["mae_s"] and r["xgboost"]["mae_s"] < 150 and abs(r["xgboost"]["bias_s"]) < 60
    assert r["xgboost"]["mae_s"] < r["ridge"]["mae_s"]


def test_report_has_everything_the_docs_promise(trained):
    _, r = trained
    assert {"xgboost", "ridge", "fallback_formula", "by_queue_depth", "feature_importance", "split", "best_iteration"} <= set(r)
    assert r["feature_importance"] and abs(sum(r["feature_importance"].values()) - 1) < 0.01


def test_prediction_never_decreases_when_the_kitchen_gets_busier(trained, built):
    m, _ = trained; d, _ = built; x = d[FEATURES].iloc[[100]].copy()
    lo = x.assign(queue_depth=0.0, strain_seconds=0.0, strain_per_order=0.0); hi = x.assign(queue_depth=15.0, strain_seconds=9000.0, strain_per_order=600.0)
    assert m.predict(hi)[0] >= m.predict(lo)[0]


def test_registry_layout_is_the_contract(trained, built, tmp_path):
    m, r = trained; _, ids = built
    v = register(m, r, ids, str(tmp_path)); promote(str(tmp_path), v)
    folder = tmp_path / "eta" / v
    meta = json.loads((folder / "meta.json").read_text())
    assert meta["version"] == v and meta["features"] == FEATURES and meta["canteenIds"] == ids and "xgboost" in meta["metrics"]
    assert (folder / "model.json").exists() and json.loads((tmp_path / "eta" / "current.json").read_text()) == {"version": v}
    model, meta2 = load_current(str(tmp_path)); assert meta2["version"] == v
    assert np.isfinite(model.predict(np.zeros((1, len(FEATURES)), dtype="float32"))).all()


def test_promote_is_atomic_and_rollback_is_one_write(trained, built, tmp_path):
    m, r = trained; _, ids = built
    v1 = register(m, r, ids, str(tmp_path), version="v1"); v2 = register(m, r, ids, str(tmp_path), version="v2")
    promote(str(tmp_path), v1); promote(str(tmp_path), v2); assert not list((tmp_path / "eta").glob("*.tmp"))
    assert load_current(str(tmp_path))[1]["version"] == "v2"
    promote(str(tmp_path), "v1"); assert load_current(str(tmp_path))[1]["version"] == "v1"


def test_split_adapts_to_short_histories_and_refuses_tiny_ones(world):
    import pytest
    from app.modules.etatrain.dataset import build_dataset
    from app.modules.etatrain.train import time_split
    d, _ = build_dataset(world.orders, world.lines, world.catalog, "Asia/Kolkata")
    few = d[d.day.isin(sorted(d.day.unique())[:8])]
    tr, va, te = time_split(few, 14, 7)
    assert len(tr) and len(va) and len(te) and tr.day.max() < va.day.min() < te.day.min()
    with pytest.raises(ValueError): time_split(d[d.day.isin(sorted(d.day.unique())[:4])])


def test_versions_never_collide(trained, built, tmp_path):
    m, r = trained; _, ids = built
    assert len({register(m, r, ids, str(tmp_path)) for _ in range(5)}) == 5
