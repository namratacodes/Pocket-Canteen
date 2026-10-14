from datetime import date
from app.modules.forecast.engine import ForecastEngine
from tests.p5.conftest import TODAY, TZ
from tests.testkit import auth


def test_short_history_returns_empty_structures_not_errors(world):
    out = ForecastEngine().build(world.orders, world.lines, world.catalog, TZ, date(2026, 10, 11))      # 30 days < 45
    assert out == {"sheet": {}, "forecastReport": {}}


def test_empty_orders_return_empty(world):
    assert ForecastEngine().build(world.orders.iloc[0:0], world.lines.iloc[0:0], world.catalog, TZ, TODAY) == {"sheet": {}, "forecastReport": {}}


def test_sheet_is_keyed_by_canteen_with_the_frozen_row_shape(built, long_world):
    assert set(built["sheet"]) == set(long_world.catalog.canteen_id.unique())
    s = next(iter(built["sheet"].values())); assert s["date"] == TODAY.isoformat() and {"menu_item_id", "dp", "p10", "p50", "p90"} <= set(s["rows"][0])


def test_module_registers_the_forecast_port():
    from app.config import get_settings
    from app.modules.forecast import module
    from app.ports import container
    module.register(get_settings()); assert container.get("forecast").build


def test_route_maps_to_camel_case_with_named_dayparts(client, long_world):
    cid = long_world.catalog.canteen_id.iloc[0]
    r = client.get(f"/forecast/{cid}/prep-sheet", headers=auth("staff", cid)); assert r.status_code == 200
    b = r.json(); row = b["rows"][0]
    assert b["date"] == TODAY.isoformat() and set(row) == {"menuItemId", "name", "daypart", "prepMin", "expected", "prepMax"}
    assert row["daypart"] in ("breakfast", "lunch", "tea", "evening") and row["prepMin"] <= row["expected"] <= row["prepMax"] and row["name"]
    assert len(b["rows"]) == 12 * 4


def test_scoping_and_missing_forecast(client, long_world):
    a, b = sorted(long_world.catalog.canteen_id.unique())
    assert client.get(f"/forecast/{a}/prep-sheet").status_code == 401
    assert client.get(f"/forecast/{a}/prep-sheet", headers=auth("student")).status_code == 403
    assert client.get(f"/forecast/{a}/prep-sheet", headers=auth("staff", b)).status_code == 404
    assert client.get(f"/forecast/{b}/prep-sheet", headers=auth("admin")).status_code == 200
    assert client.get("/forecast/unknown/prep-sheet", headers=auth("admin")).status_code == 404
