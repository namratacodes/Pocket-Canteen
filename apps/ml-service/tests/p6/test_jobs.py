import json
from pathlib import Path
import pandas as pd
import pytest
from app.config import get_settings
from app.intelligence.store import IntelStore
from app.modules.ops import jobs
from app.ports import container
from tests.testkit import FakeForecast, FakeMenuIntel, FakeTrainer, FrameSource


def setup_ports(world, menu=True, forecast=True, trainer=True):
    src = FrameSource(world); container.register("source", src)
    fakes = dict(menu=FakeMenuIntel(), forecast=FakeForecast(), trainer=FakeTrainer())
    if menu: container.register("menu_intel", fakes["menu"])
    if forecast: container.register("forecast", fakes["forecast"])
    if trainer: container.register("trainer", fakes["trainer"])
    return src, fakes


def test_refresh_writes_the_frozen_intelligence_schema(world):
    src, fakes = setup_ports(world); s = get_settings(); store = IntelStore(s.artifact_dir)
    r = jobs.refresh_intelligence(s, store)
    d = json.loads((Path(s.artifact_dir) / "intelligence.json").read_text())
    assert set(d) == {"generatedAt", "names", "matrix", "rules", "sheet", "forecastReport"} and d["names"] == world.catalog.name.to_dict()
    assert set(d["matrix"]) == set(world.catalog.canteen_id.unique()) and d["forecastReport"] == {"fake": True}
    assert r["skipped"] == [] and r["menu"] and r["forecast"]
    assert fakes["menu"].calls[0][1] == len(world.orders) and fakes["forecast"].calls[0][0] == "build"


def test_missing_optional_ports_are_skipped_and_reported(world):
    setup_ports(world, menu=False, forecast=False); s = get_settings()
    r = jobs.refresh_intelligence(s, IntelStore(s.artifact_dir))
    assert r["skipped"] == ["menu_intel", "forecast"] and not r["menu"] and not r["forecast"]
    assert json.loads((Path(s.artifact_dir) / "intelligence.json").read_text())["matrix"] == {}


def test_missing_source_port_is_a_clear_error():
    with pytest.raises(LookupError, match="source"): jobs.refresh_intelligence(get_settings(), IntelStore(get_settings().artifact_dir))


def test_written_file_is_atomic_and_readable_by_the_api_store(world):
    setup_ports(world); s = get_settings(); jobs.refresh_intelligence(s, IntelStore(s.artifact_dir))
    reader = IntelStore(s.artifact_dir); assert reader.data["generatedAt"] and not list(Path(s.artifact_dir).glob("*.tmp"))


def with_online(world, error_s, n):
    o = world.orders.copy(); idx = o.index[-n:]
    o.loc[idx, "eta_source"] = "ml"; o.loc[idx, "estimated_prep_seconds"] = o.loc[idx, "actual_prep_seconds"] + error_s
    from tests.testkit.world import World
    return World(o, world.lines, world.catalog)


def test_online_mae_measures_only_ml_estimates_in_the_last_week(world):
    w = with_online(world, 400, 300); r = jobs.online_mae(FrameSource(w))
    assert r["n"] == 300 and r["mae_s"] == pytest.approx(400) and r["bias_s"] == pytest.approx(400)
    assert jobs.online_mae(FrameSource(world))["n"] == 0                          # all fallback: nothing to judge


def test_drift_needs_enough_evidence(world):
    setup_ports(with_online(world, 400, 50)); src = container.get("source")
    r = jobs.drift_check_and_retrain(get_settings(), src)
    assert r["action"] == "skipped" and container.get("trainer").calls == []


def test_good_model_is_left_alone(world):
    setup_ports(with_online(world, 30, 300)); r = jobs.drift_check_and_retrain(get_settings())
    assert r["action"] == "none" and container.get("trainer").calls == []


def test_bad_model_triggers_the_guarded_retrain_with_the_configured_window(world):
    setup_ports(with_online(world, 400, 300)); FakeTrainer.result = {"action": "promoted", "version": "v9"}
    s = get_settings(); r = jobs.drift_check_and_retrain(s)
    assert container.get("trainer").calls == [("retrain_if_better", s.retrain_window_days)]
    assert r["action"] == "promoted" and r["version"] == "v9" and r["online_mae_s"] == pytest.approx(400)
    FakeTrainer.result = {"action": "kept_current"}
