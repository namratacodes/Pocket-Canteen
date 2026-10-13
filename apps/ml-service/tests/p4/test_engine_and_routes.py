from tests.testkit import auth


def test_engine_covers_every_canteen_with_the_frozen_shapes(built, world):
    for cid in world.catalog.canteen_id.unique():
        m = built["matrix"][cid]
        assert {"windowDays", "items", "thresholds"} <= set(m) and {"popularityMixPct", "avgContributionMarginPaise"} <= set(m["thresholds"])
        assert {"menuItemId", "name", "category", "unitsSold", "mixPct", "pricePaise", "costPaise", "contributionMarginPaise", "quadrant", "advice"} <= set(m["items"][0])
        assert built["rules"][cid] == [] or {"ifItemId", "thenItemId", "support", "confidence", "lift"} <= set(built["rules"][cid][0])


def test_module_registers_the_menu_intel_port():
    from app.config import get_settings
    from app.modules.menu import module
    from app.ports import container
    module.register(get_settings()); assert container.get("menu_intel").build


def test_staff_sees_own_canteen_with_names_on_combos(client, world):
    cid = world.catalog.canteen_id.iloc[0]
    r = client.get(f"/menu-intelligence/{cid}", headers=auth("staff", cid)); assert r.status_code == 200
    b = r.json(); assert b["canteenId"] == cid and b["items"] and b["combos"] and b["combos"][0]["thenName"]


def test_scoping_matches_the_backend_rules(client, world):
    a, b = sorted(world.catalog.canteen_id.unique())
    assert client.get(f"/menu-intelligence/{a}").status_code == 401
    assert client.get(f"/menu-intelligence/{a}", headers=auth("student")).status_code == 403
    assert client.get(f"/menu-intelligence/{a}", headers=auth("staff", b)).status_code == 404
    assert client.get(f"/menu-intelligence/{b}", headers=auth("admin")).status_code == 200
    assert client.get("/menu-intelligence/unknown-canteen", headers=auth("admin")).status_code == 404


def test_students_get_combo_suggestions_for_their_cart(client, world):
    cid = world.catalog.canteen_id.iloc[0]
    samosa = world.catalog[(world.catalog.canteen_id == cid) & (world.catalog.name == "Samosa")].menu_item_id.iloc[0]
    r = client.get(f"/menu-intelligence/{cid}/combos", params={"itemIds": samosa}, headers=auth("student")).json()["data"]
    assert r and r[0]["name"] == "Tea" and r[0]["because"] == "Samosa" and 0 < r[0]["confidence"] <= 1
    assert client.get(f"/menu-intelligence/{cid}/combos", params={"itemIds": "nothing"}, headers=auth("student")).json() == {"data": []}
    assert client.get(f"/menu-intelligence/{cid}/combos", params={"itemIds": samosa}).status_code == 401
