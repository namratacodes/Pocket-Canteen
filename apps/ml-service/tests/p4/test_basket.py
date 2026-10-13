import pandas as pd
from app.modules.menu.basket import mine_rules, recommend
from tests.p4.conftest import NOW


def baskets(pairs: dict[tuple, int], singles: dict[str, int] | None = None):
    o, l, k = [], [], 0
    for items, n in list(pairs.items()) + [((s,), n) for s, n in (singles or {}).items()]:
        for _ in range(n):
            k += 1; o.append(dict(order_id=f"o{k}", canteen_id="c1", status="completed", placed_at=NOW - pd.Timedelta(days=2)))
            l += [dict(order_id=f"o{k}", menu_item_id=i, quantity=1) for i in items]
    return pd.DataFrame(o), pd.DataFrame(l)


def test_support_confidence_and_lift_are_computed_exactly():
    o, l = baskets({("A", "B"): 80}, {"A": 20, "B": 100, "C": 300})              # 500 orders
    r = {(x["ifItemId"], x["thenItemId"]): x for x in mine_rules(o, l, "c1", NOW.to_pydatetime())}
    ab = r[("A", "B")]
    assert ab["support"] == 0.16 and ab["confidence"] == 0.8 and ab["lift"] == round(0.8 / (180 / 500), 2)


def test_independent_items_are_not_reported():
    o, l = baskets({("A", "B"): 25}, {"A": 225, "B": 225, "C": 25})              # A,B co-occur exactly as often as chance
    assert not [x for x in mine_rules(o, l, "c1", NOW.to_pydatetime()) if {x["ifItemId"], x["thenItemId"]} == {"A", "B"}]


def test_too_few_orders_means_no_rules_at_all():
    o, l = baskets({("A", "B"): 50}); assert mine_rules(o, l, "c1", NOW.to_pydatetime()) == []


def test_rules_only_use_completed_orders_of_that_canteen_inside_the_window():
    o, l = baskets({("A", "B"): 300}); o.loc[o.index[:300], "status"] = "cancelled"
    assert mine_rules(o, l, "c1", NOW.to_pydatetime()) == []
    o2, l2 = baskets({("A", "B"): 300}); assert mine_rules(o2, l2, "other", NOW.to_pydatetime()) == []


def test_recommend_excludes_cart_items_orders_by_confidence_and_caps_at_k():
    rules = [{"ifItemId": "A", "thenItemId": x, "support": .1, "confidence": c, "lift": 2.0} for x, c in (("B", .5), ("C", .9), ("D", .3), ("E", .6))]
    rules.append({"ifItemId": "A", "thenItemId": "Z", "support": .1, "confidence": .99, "lift": 3.0})
    assert [r["thenItemId"] for r in recommend(rules, ["A", "Z"], k=3)] == ["C", "E", "B"]
    assert recommend(rules, ["Q"]) == []


def test_every_planted_combo_is_rediscovered_on_the_simulated_campus(built, world):
    names = world.catalog.name.to_dict(); cid = world.catalog.canteen_id.iloc[0]
    found = {(names[r["ifItemId"]], names[r["thenItemId"]]) for r in built["rules"][cid]}
    assert {("Samosa", "Tea"), ("Veg Burger", "French Fries"), ("Grilled Sandwich", "Cold Coffee")} <= found
    assert all(r["lift"] >= 1.2 and r["confidence"] >= 0.25 for r in built["rules"][cid])
