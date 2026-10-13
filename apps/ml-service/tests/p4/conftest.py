import pandas as pd
import pytest
from fastapi.testclient import TestClient
from app.main import create_app
from app.modules.menu import module
from app.modules.menu.engine import MenuEngine

NOW = pd.Timestamp("2026-10-11 00:00", tz="UTC")


def tiny_world(sales: dict[str, int], prices: dict[str, int], category: dict[str, str] | None = None):
    """One canteen, hand-made sales so every quadrant outcome is known in advance."""
    names = list(prices); cat = pd.DataFrame({"menu_item_id": [f"id-{n}" for n in names], "canteen_id": "c1", "name": names,
        "price_paise": [prices[n] for n in names], "category": [(category or {}).get(n, "Snacks") for n in names],
        "base_prep_seconds": 100.0, "weight": 1.0, "station": "fryer"}).set_index("menu_item_id", drop=False)
    orders, lines, k = [], [], 0
    for n, q in sales.items():
        for _ in range(q):
            k += 1; orders.append(dict(order_id=f"o{k}", canteen_id="c1", status="completed", placed_at=NOW - pd.Timedelta(days=3), ready_at=NOW,
                                       left_queue_at=NOW, actual_prep_seconds=300, estimated_prep_seconds=300, eta_source="fallback", total_paise=prices[n]))
            lines.append(dict(order_id=f"o{k}", menu_item_id=f"id-{n}", quantity=1, price_paise=prices[n]))
    return pd.DataFrame(orders), pd.DataFrame(lines), cat


@pytest.fixture(scope="session")
def built(world):
    return MenuEngine().build(world.orders, world.lines, world.catalog, world.orders.placed_at.max().to_pydatetime())


@pytest.fixture()
def client(world, built):
    with TestClient(create_app([module])) as c:
        c.app.state.store.replace({"generatedAt": "2026-10-11T00:00:00+00:00", "names": world.catalog.name.to_dict(), **built,
                                   "sheet": {}, "forecastReport": {}})
        c.app.state.store.reload_if_changed(); yield c
