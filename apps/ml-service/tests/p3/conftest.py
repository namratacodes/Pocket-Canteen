import pytest
from fastapi.testclient import TestClient
from app.config import get_settings
from app.main import create_app
from app.modules.etaserve import module
from tests.testkit import make_eta_artifacts


@pytest.fixture()
def ids(world):
    return sorted(world.orders.canteen_id.unique())


@pytest.fixture()
def client(ids):
    make_eta_artifacts(get_settings().artifact_dir, ids)
    with TestClient(create_app([module])) as c:
        yield c


def body(canteen_id, **kw):
    b = {"canteenId": canteen_id, "items": [{"menuItemId": "x", "qty": 1, "basePrepSeconds": 120, "weight": 1.2, "station": "beverage", "futureField": 1}],
         "queueDepth": 3, "strainSeconds": 900, "now": "2026-10-12T13:20:00+05:30", "alsoNew": True}
    b.update(kw); return b
