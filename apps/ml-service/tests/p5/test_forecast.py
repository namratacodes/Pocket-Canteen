from datetime import date, timedelta
import numpy as np
import pandas as pd
from app.modules.forecast.forecast import FEATURES, QUANTILES, build_panel, predict_day, train_forecast
from tests.p5.conftest import TODAY, TZ


def test_panel_is_dense_one_row_per_item_day_daypart(panel, long_world):
    n_items = len(long_world.catalog); n_days = panel.day.nunique()
    assert len(panel) == n_items * n_days * 4 and not panel.duplicated(["menu_item_id", "day", "dp"]).any()
    assert panel.day.max() == TODAY


def test_lags_use_only_the_past(panel):
    """For any series, lag1 on day d must equal qty on day d-1, and lag7 qty on d-7. The target day's own qty never feeds a feature."""
    one = panel[(panel.menu_item_id == panel.menu_item_id.iloc[0]) & (panel.dp == 1)].sort_values("day").reset_index(drop=True)
    assert (one.lag1.iloc[1:].to_numpy() == one.qty.iloc[:-1].to_numpy()).all()
    assert (one.lag7.iloc[7:].to_numpy() == one.qty.iloc[:-7].to_numpy()).all()
    assert one.roll7.iloc[8] == one.qty.iloc[1:8].mean()


def test_target_day_quantity_is_a_placeholder_not_a_leak(long_world):
    w = long_world; p = build_panel(w.orders, w.lines, w.catalog, TZ, TODAY)
    assert (p[p.day == TODAY].qty == 0).all()
    again = build_panel(w.orders, w.lines, w.catalog, TZ, TODAY + timedelta(days=1))
    a = p[p.day == TODAY].set_index(["menu_item_id", "dp"]); b = again[again.day == TODAY].set_index(["menu_item_id", "dp"])
    assert (a[["lag1", "lag7", "roll7", "roll28"]].fillna(-1) == b.loc[a.index, ["lag1", "lag7", "roll7", "roll28"]].fillna(-1)).all().all()


def test_predictions_are_ordered_non_negative_integers(long_world, panel):
    models, _ = train_forecast(panel, TODAY); s = predict_day(models, panel, TODAY)
    assert (s.p10 <= s.p50).all() and (s.p50 <= s.p90).all() and (s.p10 >= 0).all() and s[["p10", "p50", "p90"]].dtypes.apply(lambda t: np.issubdtype(t, np.integer)).all()
    assert len(s) == len(long_world.catalog) * 4


def test_report_has_the_backtest_the_docs_promise(built):
    r = built["forecastReport"]
    assert {"wape", "interval_p10_p90_coverage_pct", "waste_backtest", "rows"} <= set(r)
    assert {"seasonal_naive_lag7", "dow_4wk_mean", "xgb_p50"} <= set(r["wape"])
    assert {"naive_lag7_x1.10", "dow_4wk_mean_x1.10", "xgb_p50_x1.10", "xgb_p90"} <= set(r["waste_backtest"])
    assert all({"waste_pct", "unmet_demand_pct"} <= set(v) for v in r["waste_backtest"].values())


def test_model_beats_the_naive_baselines_and_the_interval_is_honest(built):
    r = built["forecastReport"]
    assert r["wape"]["xgb_p50"] < r["wape"]["seasonal_naive_lag7"]
    assert 60 <= r["interval_p10_p90_coverage_pct"] <= 95
    assert r["waste_backtest"]["xgb_p90"]["unmet_demand_pct"] < r["waste_backtest"]["xgb_p50_x1.10"]["unmet_demand_pct"]


def test_sunday_forecasts_are_lower_than_a_weekday(long_world):
    """Calendar state is a feature: a holiday (Sunday) must forecast far less demand than a normal weekday."""
    w = long_world; last = date(2026, 10, 10)
    sunday = next(last + timedelta(days=i) for i in range(1, 8) if (last + timedelta(days=i)).weekday() == 6)
    monday = sunday + timedelta(days=1)
    tot = {}
    for d in (sunday, monday):
        p = build_panel(w.orders, w.lines, w.catalog, TZ, d); m, _ = train_forecast(p, d); tot[d.weekday()] = predict_day(m, p, d).p50.sum()
    assert tot[6] < 0.6 * tot[0]
