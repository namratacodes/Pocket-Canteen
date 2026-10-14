"""Heavy background work. Runs in the WORKER process only. Talks to other phases exclusively through ports:
   source (phase 1) | trainer (phase 2) | menu_intel (phase 4) | forecast (phase 5). A missing optional port is skipped and reported."""
import logging
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from app.ports import container

log = logging.getLogger("ml.ops")
MIN_ONLINE_SAMPLES = 200


def refresh_intelligence(settings, store, source=None) -> dict:
    """Rebuilds everything the staff dashboard and student checkout read, and writes intelligence.json atomically.
    Schema of that file (frozen):
      {generatedAt, names{menuItemId:name}, matrix{canteenId:{...}}, rules{canteenId:[...]}, sheet{canteenId:{date,rows}}, forecastReport{...}}"""
    source = source or container.get("source")
    orders, lines, catalog = source.orders(), source.lines(), source.catalog()
    as_of = datetime.now(timezone.utc)
    out = {"generatedAt": as_of.isoformat(), "names": catalog.name.to_dict(), "matrix": {}, "rules": {}, "sheet": {}, "forecastReport": {}}
    skipped = []
    if container.has("menu_intel"):
        part = container.get("menu_intel").build(orders, lines, catalog, as_of); out["matrix"], out["rules"] = part["matrix"], part["rules"]
    else: skipped.append("menu_intel")
    if container.has("forecast"):
        today = datetime.now(ZoneInfo(settings.campus_tz)).date()
        part = container.get("forecast").build(orders, lines, catalog, settings.campus_tz, today); out["sheet"], out["forecastReport"] = part["sheet"], part["forecastReport"]
    else: skipped.append("forecast")
    store.replace(out)
    return {"canteens": len(catalog.canteen_id.unique()), "menu": bool(out["matrix"]), "forecast": bool(out["sheet"]), "skipped": skipped}


def online_mae(source, days: int = 7) -> dict:
    """Accuracy of the estimates the backend actually showed students (orders.eta_source = 'ml'), over the last `days` before the newest order."""
    o = source.orders()
    if o.empty: return {"n": 0}
    since = o.placed_at.max() - timedelta(days=days)
    m = o[(o.eta_source == "ml") & o.actual_prep_seconds.notna() & (o.placed_at >= since)]
    if m.empty: return {"n": 0}
    err = m.estimated_prep_seconds - m.actual_prep_seconds
    return {"n": int(len(m)), "mae_s": float(err.abs().mean()), "bias_s": float(err.mean())}


def drift_check_and_retrain(settings, source=None) -> dict:
    """Retrain only when the ML estimates are measurably bad AND there is enough evidence. The trainer promotes a challenger only if it wins."""
    source = source or container.get("source")
    stats = online_mae(source)
    if stats["n"] < MIN_ONLINE_SAMPLES: return {"action": "skipped", "reason": f"only {stats['n']} ml-estimated orders in 7 days", **stats}
    if stats["mae_s"] <= settings.retrain_mae_threshold_seconds: return {"action": "none", **stats}
    result = container.get("trainer").retrain_if_better(source, window_days=settings.retrain_window_days, min_improvement=0.02)
    return {**result, "online_mae_s": stats["mae_s"], "online_n": stats["n"]}
