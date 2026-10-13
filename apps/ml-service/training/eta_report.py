"""python -m training.eta_report [version] : writes reports/eta_<version>.md from the registry (no database needed)."""
import json, sys
from pathlib import Path
from app.config import get_settings


def render(meta: dict) -> str:
    m = meta["metrics"]; rows = []
    for k, label in (("fallback_formula", "Backend fallback formula"), ("ridge", "Ridge regression"), ("xgboost", "XGBoost")):
        x = m[k]; rows.append(f"| {label} | {x['mae_s']:.0f} s ({x['mae_s']/60:.2f} min) | {x['median_ae_s']:.0f} s | {x['p90_ae_s']:.0f} s | {x['within_2min_pct']:.1f}% | {x['bias_s']:+.0f} s |")
    q = "\n".join(f"| {k} | {v['n']} | {v['mae_xgb_s']:.0f} s | {v['mae_fallback_s']:.0f} s |" for k, v in m.get("by_queue_depth", {}).items())
    imp = ", ".join(f"`{k}` {v*100:.0f}%" for k, v in sorted(m.get("feature_importance", {}).items(), key=lambda x: -x[1])[:6])
    sp = m.get("split", {})
    return (f"# ETA model evaluation: {meta['version']}\n\nTrained {meta['trainedAt']}. Rows train/val/test: {sp.get('rows')}. "
            f"Test window {sp.get('test')}.\n\n| Model | MAE | Median | p90 | Within 2 min | Bias |\n|---|---|---|---|---|---|\n" + "\n".join(rows) +
            f"\n\n## Error by queue depth\n\n| Orders ahead | n | XGBoost MAE | Fallback MAE |\n|---|---|---|---|\n{q}\n\n## Feature importance\n\n{imp}\n")


if __name__ == "__main__":
    s = get_settings(); base = Path(s.artifact_dir) / "eta"
    version = sys.argv[1] if len(sys.argv) > 1 else json.loads((base / "current.json").read_text())["version"]
    meta = json.loads((base / version / "meta.json").read_text())
    out = Path("reports"); out.mkdir(exist_ok=True); (out / f"eta_{version}.md").write_text(render(meta)); print("wrote", out / f"eta_{version}.md")
