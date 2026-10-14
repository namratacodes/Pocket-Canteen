from datetime import date
import pytest
from fastapi.testclient import TestClient
from app.main import create_app
from app.modules.forecast import module
from app.modules.forecast.engine import ForecastEngine

TZ = "Asia/Kolkata"
TODAY = date(2026, 10, 11)                         # the day after the last simulated day (long_world ends 2026-10-10)


@pytest.fixture(scope="session")
def built(long_world):
    w = long_world
    return ForecastEngine().build(w.orders, w.lines, w.catalog, TZ, TODAY)


@pytest.fixture(scope="session")
def panel(long_world):
    from app.modules.forecast.forecast import build_panel
    w = long_world; return build_panel(w.orders, w.lines, w.catalog, TZ, TODAY)


@pytest.fixture()
def client(long_world, built):
    with TestClient(create_app([module])) as c:
        c.app.state.store.replace({"generatedAt": "2026-10-11T02:30:00+00:00", "names": long_world.catalog.name.to_dict(),
                                   "matrix": {}, "rules": {}, **built})
        c.app.state.store.reload_if_changed(); yield c
