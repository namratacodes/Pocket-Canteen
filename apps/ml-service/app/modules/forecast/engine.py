"""The `forecast` port implementation."""
from datetime import date
from .forecast import build_panel, predict_day, train_forecast

MIN_HISTORY_DAYS = 45                       # lags/rolling windows need about a month, plus 14 validation and 14 test days


class ForecastEngine:
    def build(self, orders, lines, catalog, tz: str, today: date) -> dict:
        empty = {"sheet": {}, "forecastReport": {}}
        done = orders[orders.status == "completed"]
        if done.empty or (done.placed_at.max() - done.placed_at.min()).days < MIN_HISTORY_DAYS: return empty
        panel = build_panel(orders, lines, catalog, tz, today)
        models, report = train_forecast(panel, today)
        sheet = predict_day(models, panel, today)
        return {"forecastReport": report,
                "sheet": {cid: {"date": today.isoformat(), "rows": g.drop(columns="canteen_id").to_dict("records")} for cid, g in sheet.groupby("canteen_id")}}
