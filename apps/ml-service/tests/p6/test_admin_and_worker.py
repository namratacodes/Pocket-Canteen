import json
from pathlib import Path
import pytest
from fastapi.testclient import TestClient
from app.config import get_settings
from app.main import create_app
from app.modules.ops import module, routes
from app.ports import container
from tests.testkit import FakeForecast, FakeMenuIntel, FakeTrainer, FrameSource, auth


@pytest.fixture()
def spawned(monkeypatch):
    calls = []; monkeypatch.setattr(routes, "spawn_worker", lambda job: calls.append(job)); return calls


def test_admin_endpoints_start_jobs_in_the_worker_process(spawned):
    with TestClient(create_app([module])) as c:
        assert c.post("/admin/refresh-intelligence", headers=auth("admin")).status_code == 202
        assert c.post("/admin/retrain", headers=auth("admin")).json() == {"status": "started"}
    assert spawned == ["refresh", "retrain"]


def test_only_admins_may_start_jobs(spawned):
    with TestClient(create_app([module])) as c:
        for path in ("/admin/refresh-intelligence", "/admin/retrain"):
            assert c.post(path).status_code == 401
            assert c.post(path, headers=auth("student")).status_code == 403
            assert c.post(path, headers=auth("staff", "c1")).status_code == 403
    assert spawned == []


def test_worker_run_once_refresh_end_to_end_with_fake_ports(world):
    from app.worker import run_once
    container.register("source", FrameSource(world)); container.register("menu_intel", FakeMenuIntel()); container.register("forecast", FakeForecast())
    r = run_once("refresh", bootstrap=False); assert r["menu"] and r["forecast"]
    assert json.loads((Path(get_settings().artifact_dir) / "intelligence.json").read_text())["names"]


def test_worker_run_once_retrain_and_unknown_job(world):
    from app.worker import run_once
    container.register("source", FrameSource(world)); container.register("trainer", FakeTrainer())
    assert run_once("retrain", bootstrap=False) == {"version": "fake-version"}
    with pytest.raises(SystemExit): run_once("nonsense", bootstrap=False)


def test_worker_drift_job_runs_through_ports(world):
    from app.worker import run_once
    container.register("source", FrameSource(world)); container.register("trainer", FakeTrainer())
    assert run_once("drift", bootstrap=False)["action"] == "skipped"


def test_bootstrap_true_registers_the_ports_of_every_present_module(world, monkeypatch):
    """Production path: run_once() must call load_and_register() before using any port."""
    import app.worker as worker
    seen = []; monkeypatch.setattr(worker, "load_and_register", lambda: seen.append(1) or container.register("source", FrameSource(world)) or container.register("trainer", FakeTrainer()))
    assert worker.run_once("retrain") == {"version": "fake-version"} and seen == [1]
