import pytest
from app.config import get_settings
from app.modules.etatrain.dataset import build_dataset
from app.modules.etatrain.train import train

TZ = "Asia/Kolkata"


@pytest.fixture(scope="session")
def built(world):
    data, ids = build_dataset(world.orders, world.lines, world.catalog, TZ)
    return data, ids


@pytest.fixture(scope="session")
def trained(built):
    return train(built[0], test_days=4, val_days=3)
