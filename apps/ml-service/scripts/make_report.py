"""python scripts/make_report.py : writes reports/final_report.md from the registry and intelligence.json (no database needed)."""
import json
from pathlib import Path
from app.config import get_settings


def render(meta: dict | None, intel: dict | None) -> str:
    out = ["# Pocket Canteen ML evaluation report\n"]
    if meta:
        m = meta["metrics"]; out += [f"## ETA model `{meta['version']}` (trained {meta['trainedAt']})\n", "| Model | MAE | Median | p90 | Within 2 min | Bias |", "|---|---|---|---|---|---|"]
        for k, label in (("fallback_formula", "Backend fallback formula"), ("ridge", "Ridge regression"), ("xgboost", "XGBoost")):
            if k in m: x = m[k]; out.append(f"| {label} | {x['mae_s']:.0f} s ({x['mae_s']/60:.2f} min) | {x['median_ae_s']:.0f} s | {x['p90_ae_s']:.0f} s | {x['within_2min_pct']:.1f}% | {x['bias_s']:+.0f} s |")
        if m.get("by_queue_depth"):
            out += ["", "Error by queue depth:", "", "| Orders ahead | n | XGBoost MAE | Fallback MAE |", "|---|---|---|---|"]
            out += [f"| {k} | {v['n']} | {v['mae_xgb_s']:.0f} s | {v['mae_fallback_s']:.0f} s |" for k, v in m["by_queue_depth"].items()]
    else: out.append("## ETA model\n\nNo model has been promoted yet.")
    fr = (intel or {}).get("forecastReport")
    if fr:
        out += ["", "## Demand forecast\n", "| Method | WAPE |", "|---|---|"] + [f"| {k} | {v:.3f} |" for k, v in fr["wape"].items()]
        out += ["", f"p10 to p90 interval coverage: {fr['interval_p10_p90_coverage_pct']:.1f}%", "", "Waste backtest (simulated unless run on real data):", "",
                "| Policy | Waste | Unmet demand |", "|---|---|---|"] + [f"| {k} | {v['waste_pct']:.1f}% | {v['unmet_demand_pct']:.1f}% |" for k, v in fr["waste_backtest"].items()]
    else: out.append("\n## Demand forecast\n\nNot available (needs about 45 days of history).")
    out += ["", "## Limitations", "", "- Synthetic data accuracy is not production accuracy; re-run on real orders.", "- Prep metadata history is not kept; current values are used for old orders.",
            "- Sales are not demand when items sell out.", "- Latency must be measured from the backend host (`scripts/bench_latency.py`)."]
    return "\n".join(out) + "\n"


if __name__ == "__main__":
    s = get_settings(); base = Path(s.artifact_dir)
    ptr = base / "eta" / "current.json"
    meta = json.loads((base / "eta" / json.loads(ptr.read_text())["version"] / "meta.json").read_text()) if ptr.exists() else None
    ip = base / "intelligence.json"; intel = json.loads(ip.read_text()) if ip.exists() else None
    Path("reports").mkdir(exist_ok=True); Path("reports/final_report.md").write_text(render(meta, intel)); print("wrote reports/final_report.md")
