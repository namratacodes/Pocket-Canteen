from fastapi.testclient import TestClient
from app.config import get_settings
from app.main import create_app
from app.modules.etaserve import module, refresh_velocity, reload_model_if_changed
from app.ports import container
from tests.testkit import FrameSource, auth, make_eta_artifacts
from tests.p3.conftest import body


def test_no_model_means_503_everywhere_the_backend_can_see(tmp_path):
    with TestClient(create_app([module])) as c:
        assert c.get("/ready").status_code == 503 and c.get("/health").status_code == 200
        assert c.post("/predict-eta", json=body("c")).status_code == 503


def test_ready_reports_the_loaded_version(client):
    assert client.get("/ready").json() == {"status": "ready", "modelVersion": "testkit-1"}


def test_hot_reload_picks_up_a_newly_promoted_version(client, ids):
    make_eta_artifacts(get_settings().artifact_dir, ids, version="testkit-2")
    reload_model_if_changed(client.app)
    assert client.get("/ready").json()["modelVersion"] == "testkit-2"
    assert client.post("/predict-eta", json=body(ids[0])).json()["modelVersion"] == "testkit-2"


def test_a_broken_new_version_keeps_the_old_model_serving(client, ids):
    import json
    from pathlib import Path
    art = Path(get_settings().artifact_dir) / "eta"; (art / "broken").mkdir(); (art / "broken" / "meta.json").write_text("{}")
    (art / "current.json").write_text(json.dumps({"version": "broken"}))
    reload_model_if_changed(client.app)
    assert client.get("/ready").json()["modelVersion"] == "testkit-1"


def test_model_with_different_features_is_refused(client, ids):
    import json
    from pathlib import Path
    make_eta_artifacts(get_settings().artifact_dir, ids, version="stale-features")
    meta = Path(get_settings().artifact_dir) / "eta" / "stale-features" / "meta.json"
    m = json.loads(meta.read_text()); m["features"] = m["features"][:-1]; meta.write_text(json.dumps(m))
    reload_model_if_changed(client.app)
    assert client.get("/ready").json()["modelVersion"] == "testkit-1"


def test_velocity_job_feeds_the_feature_and_survives_a_model_swap(client, ids, world):
    container.register("source", FrameSource(world, velocity={ids[0]: 7.0}))
    refresh_velocity(client.app)
    assert client.app.state.predictor.velocity == {ids[0]: 7.0}
    make_eta_artifacts(get_settings().artifact_dir, ids, version="testkit-3"); reload_model_if_changed(client.app)
    assert client.app.state.predictor.velocity == {ids[0]: 7.0}


def test_velocity_job_is_a_noop_without_the_source_port(client):
    refresh_velocity(client.app)                               # must not raise


def test_model_info_is_staff_or_admin_only(client):
    assert client.get("/eta/model").status_code == 401
    assert client.get("/eta/model", headers=auth("student")).status_code == 403
    r = client.get("/eta/model", headers=auth("staff", "c1")); assert r.status_code == 200 and r.json()["version"] == "testkit-1"
    assert client.get("/eta/model", headers=auth("admin")).json()["baselineFallbackMetrics"]["mae_s"] == 300.0
