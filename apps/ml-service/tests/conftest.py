import os
os.environ.setdefault("DATA_SOURCE", "parquet")
os.environ.setdefault("JWT_ACCESS_SECRET", "test-access-secret-0123456789abcdef")
import pytest
from app.config import get_settings
from app.ports import container
from tests.testkit import make_world


@pytest.fixture(autouse=True)
def _clean(monkeypatch, tmp_path):
    """Every test gets an empty port container and its own artifact directory."""
    container.reset(); get_settings.cache_clear()
    monkeypatch.setenv("ARTIFACT_DIR", str(tmp_path / "artifacts"))
    yield
    container.reset(); get_settings.cache_clear()


@pytest.fixture(scope="session")
def world():
    """30 days, 2 canteens, ~3.5k orders (about 3 s). Session scoped: never mutate it."""
    return make_world(days=30, seed=1, scale=0.5)


@pytest.fixture(scope="session")
def long_world():
    """70 days, 2 canteens (about 8k orders). Only for forecasting tests, which need at least 45 days."""
    return make_world(days=70, seed=2, scale=0.5)
