"""Next-day demand forecast per (canteen, item, daypart) with p10/p50/p90 prep ranges."""
from datetime import date, timedelta
import numpy as np
import pandas as pd
import xgboost as xgb
from app.campus import calendar_state, daypart

QUANTILES = (0.1, 0.5, 0.9)
FEATURES = ["lag1", "lag7", "lag14", "roll7", "roll14", "roll28", "roll_dow4", "dow", "cal", "dp", "item_idx", "can_idx", "price"]
MIN_HISTORY_DAYS = 29                                                       # roll28 + lag needs about a month


def build_panel(orders, lines, catalog, tz: str, target_day: date) -> pd.DataFrame:
    """Dense panel through `target_day` (inclusive). The target day carries qty=0 as a placeholder, never used as a feature."""
    o = orders[(orders.status == "completed") & orders.placed_at.notna()].copy()
    local = o.placed_at.dt.tz_convert(tz)
    o["day"] = local.dt.date
    o["dp"] = [daypart(h * 60 + m) for h, m in zip(local.dt.hour, local.dt.minute)]
    sold = lines.merge(o[["order_id", "day", "dp"]], on="order_id").groupby(["menu_item_id", "day", "dp"]).quantity.sum()
    first = o.day.min()
    days = [first + timedelta(days=i) for i in range((target_day - first).days + 1)]
    items = catalog.reset_index(drop=True)
    idx = pd.MultiIndex.from_product([items.menu_item_id, days, range(4)], names=["menu_item_id", "day", "dp"])
    p = sold.reindex(idx, fill_value=0).rename("qty").reset_index()
    p.loc[p.day == target_day, "qty"] = 0
    p = p.merge(items[["menu_item_id", "canteen_id", "price_paise"]], on="menu_item_id")
    p = p.sort_values(["menu_item_id", "dp", "day"])
    g = p.groupby(["menu_item_id", "dp"]).qty
    p["lag1"], p["lag7"], p["lag14"] = g.shift(1), g.shift(7), g.shift(14)
    for w in (7, 14, 28): p[f"roll{w}"] = g.transform(lambda q, w=w: q.shift(1).rolling(w, min_periods=3).mean())
    p["roll_dow4"] = g.transform(lambda q: (q.shift(7) + q.shift(14) + q.shift(21) + q.shift(28)) / 4)
    p["dow"] = [d.weekday() for d in p.day]; p["cal"] = [calendar_state(d) for d in p.day]
    ids = {m: i for i, m in enumerate(sorted(items.menu_item_id))}; cans = {c: i for i, c in enumerate(sorted(items.canteen_id.unique()))}
    p["item_idx"], p["can_idx"], p["price"] = p.menu_item_id.map(ids), p.canteen_id.map(cans), p.price_paise
    return p


def train_forecast(panel: pd.DataFrame, target_day: date, test_days: int = 14, val_days: int = 14, seed: int = 7):
    p = panel[panel.day < target_day].dropna(subset=["lag14", "roll28", "roll_dow4"])
    days = sorted(p.day.unique())
    te_d, va_d = days[-test_days:], days[-(test_days + val_days):-test_days]
    tr, va, te = p[p.day < va_d[0]], p[p.day.isin(va_d)], p[p.day.isin(te_d)]
    models = {}
    for q in QUANTILES:
        m = xgb.XGBRegressor(objective="reg:quantileerror", quantile_alpha=q, n_estimators=600, learning_rate=.04, max_depth=4, min_child_weight=5,
                             subsample=.8, colsample_bytree=.8, early_stopping_rounds=40, n_jobs=4, random_state=seed)
        m.fit(tr[FEATURES], tr.qty, eval_set=[(va[FEATURES], va.qty)], verbose=False); models[q] = m
    pr = {q: np.maximum(models[q].predict(te[FEATURES]), 0) for q in QUANTILES}
    wape = lambda pred: float(np.abs(pred - te.qty).sum() / max(te.qty.sum(), 1))
    def waste(prep):
        prep = np.ceil(prep); sold = te.qty.to_numpy()
        return {"waste_pct": float(np.maximum(prep - sold, 0).sum() / max(prep.sum(), 1) * 100), "unmet_demand_pct": float(np.maximum(sold - prep, 0).sum() / max(sold.sum(), 1) * 100)}
    report = {"rows": [len(tr), len(va), len(te)], "wape": {"seasonal_naive_lag7": wape(te.lag7), "dow_4wk_mean": wape(te.roll_dow4), "xgb_p50": wape(pr[0.5])},
              "interval_p10_p90_coverage_pct": float(((te.qty >= pr[0.1]) & (te.qty <= pr[0.9])).mean() * 100),
              "waste_backtest": {"naive_lag7_x1.10": waste(te.lag7.to_numpy() * 1.1), "dow_4wk_mean_x1.10": waste(te.roll_dow4.to_numpy() * 1.1),
                                 "xgb_p50_x1.10": waste(pr[0.5] * 1.1), "xgb_p90": waste(pr[0.9])}}
    return models, report


def predict_day(models, panel: pd.DataFrame, day: date) -> pd.DataFrame:
    x = panel[panel.day == day].dropna(subset=["lag14", "roll28", "roll_dow4"]).copy()
    for q in QUANTILES: x[f"p{int(q * 100)}"] = np.ceil(np.maximum(models[q].predict(x[FEATURES]), 0)).astype(int)
    x["p10"], x["p90"] = np.minimum(x.p10, x.p50), np.maximum(x.p90, x.p50)       # keep quantiles ordered
    return x[["menu_item_id", "canteen_id", "dp", "p10", "p50", "p90"]]
