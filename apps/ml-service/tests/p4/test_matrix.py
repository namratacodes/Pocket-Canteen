import pytest
from app.modules.menu.matrix import ADVICE, menu_matrix
from tests.p4.conftest import NOW, tiny_world


def run(sales, prices, **kw):
    o, l, c = tiny_world(sales, prices, **kw); m = menu_matrix(o, l, c, "c1", NOW.to_pydatetime())
    return {r["name"]: r for r in m["items"]}, m


def test_each_quadrant_is_assigned_by_the_documented_rules():
    # 4 items: fair share 25%, popular if >= 17.5%. cost ratio (Snacks default 0.45): margin = 55% of price.
    rows, m = run({"Star": 40, "Plow": 40, "Puzzle": 10, "Dog": 10}, {"Star": 10000, "Plow": 1000, "Puzzle": 10000, "Dog": 1000})
    assert {n: r["quadrant"] for n, r in rows.items()} == {"Star": "star", "Plow": "plowhorse", "Puzzle": "puzzle", "Dog": "dog"}
    assert m["thresholds"]["popularityMixPct"] == pytest.approx(17.5)


def test_item_with_no_sales_is_never_popular():
    rows, _ = run({"A": 50, "B": 50, "C": 0}, {"A": 5000, "B": 5000, "C": 5000})
    assert rows["C"]["unitsSold"] == 0 and rows["C"]["quadrant"] in ("puzzle", "dog")


def test_mix_adds_up_and_margin_math_is_in_paise():
    rows, _ = run({"A": 30, "B": 70}, {"A": 2000, "B": 4000}, category={"A": "Beverages", "B": "Meals"})      # cost 30% and 55%
    assert sum(r["mixPct"] for r in rows.values()) == pytest.approx(100, abs=0.1)
    assert rows["A"]["costPaise"] == 600 and rows["A"]["contributionMarginPaise"] == 1400
    assert rows["B"]["costPaise"] == 2200 and rows["B"]["contributionMarginPaise"] == 1800


def test_unknown_category_uses_the_default_cost_ratio():
    rows, _ = run({"A": 10}, {"A": 10000}, category={"A": "Mystery"}); assert rows["A"]["costPaise"] == 4500


def test_window_excludes_old_sales_and_non_completed_orders():
    o, l, c = tiny_world({"A": 10, "B": 10}, {"A": 1000, "B": 1000})
    o.loc[o.index[:10], "placed_at"] = NOW - pd_days(100); o.loc[o.index[10:12], "status"] = "cancelled"
    rows = {r["name"]: r for r in menu_matrix(o, l, c, "c1", NOW.to_pydatetime(), window_days=30)["items"]}
    assert rows["A"]["unitsSold"] == 0 and rows["B"]["unitsSold"] == 8


def pd_days(n):
    import pandas as pd
    return pd.Timedelta(days=n)


def test_unknown_canteen_returns_an_empty_result():
    o, l, c = tiny_world({"A": 5}, {"A": 1000})
    assert menu_matrix(o, l, c, "nope", NOW.to_pydatetime()) == {"items": [], "thresholds": {}}


def test_every_item_carries_actionable_advice_and_items_sorted_by_units():
    rows, m = run({"A": 5, "B": 20, "C": 10}, {"A": 1000, "B": 1000, "C": 1000})
    assert all(r["advice"] == ADVICE[r["quadrant"]] for r in rows.values())
    assert [r["unitsSold"] for r in m["items"]] == sorted((r["unitsSold"] for r in m["items"]), reverse=True)


def test_on_the_simulated_campus_fast_cheap_items_are_plowhorses(built, world):
    names = world.catalog.name.to_dict(); cid = world.catalog.canteen_id.iloc[0]
    q = {r["name"]: r["quadrant"] for r in built["matrix"][cid]["items"]}
    assert q["Tea"] == "plowhorse" and q["Veg Fried Rice"] != "dog"
