from datetime import date, timezone
from pathlib import Path
import pandas as pd
import pytest

from app.config import Settings
from app.frames import check_frames
from app.modules.datasets import module
from app.modules.datasets.sources import LazySource, ParquetSource
from app.ports import container
from synthetic.catalog import offline_catalog
from synthetic.simulate import simulate


@pytest.fixture()
def parquet_data(tmp_path):
    cat = offline_catalog()
    orders, lines = simulate(cat, days=10, seed=42, end_day=date(2026, 10, 10))
    cat.to_parquet(tmp_path / "catalog.parquet")
    orders.to_parquet(tmp_path / "orders.parquet")
    lines.to_parquet(tmp_path / "order_items.parquet")
    return tmp_path, cat, orders, lines


def test_parquet_source_returns_canonical_frames(parquet_data):
    folder, _, _, _ = parquet_data
    src = ParquetSource(str(folder))
    orders = src.orders()
    lines = src.lines()
    catalog = src.catalog()
    check_frames(orders, lines, catalog)
    assert src.velocity() == {}


def test_since_filter_keeps_lines_consistent(parquet_data):
    folder, _, orders, _ = parquet_data
    src = ParquetSource(str(folder))
    cutoff = orders.placed_at.median()
    filtered_orders = src.orders(since=cutoff)
    filtered_lines = src.lines(since=cutoff)

    assert len(filtered_orders) < len(orders)
    assert (filtered_orders.placed_at >= cutoff).all()
    assert set(filtered_lines.order_id).issubset(set(filtered_orders.order_id))


def test_module_registers_a_lazy_source_without_touching_the_database():
    settings = Settings(
        data_source="postgres",
        ml_database_url="postgresql://nonexistent:5432/bogus_db",
    )
    # Registration should not raise any network/connection error
    module.register(settings)
    assert container.has("source")
    source = container.get("source")
    assert isinstance(source, LazySource)
    assert source._real is None  # Connection has not been initialized yet


def test_lazy_source_uses_parquet_when_configured(parquet_data):
    folder, _, orders, _ = parquet_data
    settings = Settings(
        data_source="parquet",
        parquet_dir=str(folder),
    )
    lazy = LazySource(settings)
    assert lazy._real is None
    loaded_orders = lazy.orders()
    assert isinstance(lazy._real, ParquetSource)
    assert len(loaded_orders) == len(orders)
