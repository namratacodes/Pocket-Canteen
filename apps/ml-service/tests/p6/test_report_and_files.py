import json
from pathlib import Path
from scripts.make_report import render
from tests.testkit import make_eta_artifacts


def test_final_report_renders_from_registry_and_intelligence(tmp_path):
    make_eta_artifacts(str(tmp_path), ["c1"]); meta = json.loads((tmp_path / "eta" / "testkit-1" / "meta.json").read_text())
    intel = {"forecastReport": {"wape": {"seasonal_naive_lag7": .59, "xgb_p50": .44}, "interval_p10_p90_coverage_pct": 83.4,
             "waste_backtest": {"xgb_p50_x1.10": {"waste_pct": 25.7, "unmet_demand_pct": 18.5}}}}
    t = render(meta, intel)
    assert "Backend fallback formula" in t and "XGBoost" in t and "83.4%" in t and "Limitations" in t


def test_report_survives_missing_pieces():
    t = render(None, None); assert "No model has been promoted yet" in t and "Not available" in t


def test_deployment_files_are_consistent_with_the_contract():
    assert "libgomp1" in Path("Dockerfile").read_text() and "scripts/start.sh" in Path("Dockerfile").read_text()
    start = Path("scripts/start.sh").read_text(); assert "app.worker" in start and "uvicorn app.main:app" in start and "--workers 1" in start
    assert "eta_source" in Path("ops/monitoring.sql").read_text()
