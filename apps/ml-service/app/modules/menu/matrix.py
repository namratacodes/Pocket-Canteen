"""Menu engineering matrix (Kasavana-Smith). Popularity vs contribution margin over a trailing window."""
from datetime import datetime, timedelta
import pandas as pd

COST_RATIOS_CSV = "data/item_cost_assumptions.csv"
DEFAULT_COST_RATIO = 0.45
ADVICE = {"star": "Keep prominent and never run out of stock.",
          "plowhorse": "Popular but thin margin: re-engineer the recipe or nudge the price.",
          "puzzle": "Profitable but under-ordered: promote it or place it next to a popular item.",
          "dog": "Low volume and low margin: consider replacing it."}


def cost_ratios(path: str = COST_RATIOS_CSV) -> dict[str, float]:
    try: return pd.read_csv(path).set_index("category").cost_ratio.to_dict()
    except FileNotFoundError: return {}


def menu_matrix(orders, lines, catalog, canteen_id: str, as_of: datetime, window_days: int = 30) -> dict:
    items = catalog[catalog.canteen_id == canteen_id].copy()
    if items.empty: return {"items": [], "thresholds": {}}
    ratios = cost_ratios()
    items["cost_paise"] = (items.price_paise * items.category.map(ratios).fillna(DEFAULT_COST_RATIO)).round().astype(int)
    items["cm_paise"] = items.price_paise - items.cost_paise
    since = as_of - timedelta(days=window_days)
    o = orders[(orders.canteen_id == canteen_id) & (orders.placed_at >= since) & (orders.status == "completed")]
    units = lines[lines.order_id.isin(o.order_id)].groupby("menu_item_id").quantity.sum()
    items["units"] = items.menu_item_id.map(units).fillna(0).astype(int)
    total = max(int(items.units.sum()), 1)
    items["mix_pct"] = items.units / total * 100
    pop_threshold = 0.7 * (100 / len(items))                               # the classic "70% rule"
    avg_cm = float((items.cm_paise * items.units).sum() / total)           # sales-weighted average margin
    items["quadrant"] = [("star" if cm >= avg_cm else "plowhorse") if mix >= pop_threshold else ("puzzle" if cm >= avg_cm else "dog")
                         for mix, cm in zip(items.mix_pct, items.cm_paise)]
    rows = [{"menuItemId": r.menu_item_id, "name": r.name, "category": r.category, "unitsSold": int(r.units), "mixPct": round(r.mix_pct, 2),
             "pricePaise": int(r.price_paise), "costPaise": int(r.cost_paise), "contributionMarginPaise": int(r.cm_paise),
             "quadrant": r.quadrant, "advice": ADVICE[r.quadrant]} for r in items.sort_values("units", ascending=False).itertuples()]
    return {"windowDays": window_days, "items": rows,
            "thresholds": {"popularityMixPct": round(pop_threshold, 2), "avgContributionMarginPaise": round(avg_cm)}}
