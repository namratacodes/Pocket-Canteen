"""MERGE CHECK. Meaningful only after all six phases are in the same tree (skipped otherwise). Owned by nobody: never edit it.
Exercises the REAL ports end to end: parquet source -> trainer -> model registry -> serving API, and source -> menu/forecast -> store -> routes."""
import pytest
from fastapi.testclient import TestClient
from app.modules.registry import MODULE_NAMES, load_modules

pytestmark = pytest.mark.skipif(len(load_modules()) < len(MODULE_NAMES), reason="needs all six phases merged")


@pytest.fixture()
def system(long_world, tmp_path, monkeypatch):
    from app.config import get_settings
    folder = tmp_path / "data"; folder.mkdir()
    long_world.orders.to_parquet(folder / "orders.parquet"); long_world.lines.to_parquet(folder / "order_items.parquet"); long_world.catalog.to_parquet(folder / "catalog.parquet")
    monkeypatch.setenv("DATA_SOURCE", "parquet"); monkeypatch.setenv("PARQUET_DIR", str(folder)); get_settings.cache_clear()
    from app.main import create_app
    app = create_app(); return app, get_settings()


def test_full_pipeline_through_the_real_ports(system, long_world):
    from app.intelligence.store import IntelStore
    from app.modules.ops import jobs
    from app.ports import container
    from tests.testkit import auth
    app, s = system
    version = container.get("trainer").train_and_register(container.get("source"))          # phase 2 reading phase 1
    out = jobs.refresh_intelligence(s, IntelStore(s.artifact_dir))                            # phase 6 driving phases 4 and 5
    assert out["menu"] and out["forecast"] and out["skipped"] == []
    cid = sorted(long_world.catalog.canteen_id.unique())[0]
    with TestClient(app) as c:                                                                # phase 3 loads what phase 2 promoted
        assert c.get("/ready").json() == {"status": "ready", "modelVersion": version}
        item = {"menuItemId": "x", "qty": 2, "basePrepSeconds": 240, "weight": 1.3, "station": "griddle"}
        r = c.post("/predict-eta", json={"canteenId": cid, "items": [item], "queueDepth": 4, "strainSeconds": 1200, "now": "2026-10-12T13:20:00+05:30"})
        assert r.status_code == 200 and r.json()["modelVersion"] == version and 60 <= r.json()["etaSeconds"] <= 7200
        c.app.state.store.reload_if_changed()
        mi = c.get(f"/menu-intelligence/{cid}", headers=auth("staff", cid)); assert mi.status_code == 200 and mi.json()["items"] and mi.json()["combos"]
        fc = c.get(f"/forecast/{cid}/prep-sheet", headers=auth("staff", cid)); assert fc.status_code == 200 and len(fc.json()["rows"]) == 48
        assert c.get("/eta/model", headers=auth("admin")).json()["version"] == version


def test_drift_loop_promotes_through_the_real_trainer(system, long_world):
    """Online MAE is bad -> ops asks the trainer -> trainer registers (and maybe promotes) -> serving can hot-reload it."""
    import pandas as pd
    from app.modules.etaserve import reload_model_if_changed
    from app.modules.ops import jobs
    from app.ports import container
    from tests.testkit import FrameSource
    from tests.testkit.world import World
    app, s = system
    first = container.get("trainer").train_and_register(container.get("source"))
    o = long_world.orders.copy(); idx = o.index[-400:]; o.loc[idx, "eta_source"] = "ml"; o.loc[idx, "estimated_prep_seconds"] = o.loc[idx, "actual_prep_seconds"] + 500
    r = jobs.drift_check_and_retrain(s, FrameSource(World(o, long_world.lines, long_world.catalog)))
    assert r["action"] in ("promoted", "kept_current") and r["online_mae_s"] > s.retrain_mae_threshold_seconds and "holdout_mae_old_s" in r
    with TestClient(app) as c:
        reload_model_if_changed(c.app); assert c.get("/ready").json()["modelVersion"] in (first, r["version"])
