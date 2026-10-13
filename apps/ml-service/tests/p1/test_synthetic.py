from datetime import date
from zoneinfo import ZoneInfo
import numpy as np
import pandas as pd
import pytest

from app.frames import check_frames
from synthetic.catalog import COLUMNS, offline_catalog
from synthetic.simulate import simulate


@pytest.fixture(scope="module")
def sim_data():
    cat = offline_catalog()
    orders, lines = simulate(cat, days=30, seed=42, end_day=date(2026, 10, 10))
    return cat, orders, lines


def test_offline_catalog_ids_are_deterministic_and_complete():
    cat1 = offline_catalog()
    cat2 = offline_catalog()
    assert len(cat1) == 60  # 5 canteens * 12 items
    assert list(cat1.columns) == COLUMNS
    assert cat1.menu_item_id.is_unique
    assert cat1.equals(cat2)


def test_output_is_a_valid_canonical_dataset(sim_data):
    cat, orders, lines = sim_data
    cat_indexed = cat.set_index("menu_item_id", drop=False)
    check_frames(orders, lines, cat_indexed)
    assert len(orders) > 2000
    assert len(lines) >= len(orders)


def test_same_seed_same_data():
    cat = offline_catalog()
    o1, l1 = simulate(cat, days=5, seed=123, end_day=date(2026, 10, 10))
    o2, l2 = simulate(cat, days=5, seed=123, end_day=date(2026, 10, 10))
    pd.testing.assert_frame_equal(o1, o2)
    pd.testing.assert_frame_equal(l1, l2)


def test_timestamps_and_backend_constraints(sim_data):
    _, orders, _ = sim_data
    assert (orders.ready_at > orders.placed_at).all()
    assert (orders.completed_at > orders.ready_at).all()
    assert (orders.created_at < orders.placed_at).all()
    assert orders.order_id.is_unique
    assert (orders.total_paise > 0).all()
    assert orders.token_no.str.len().max() <= 10
    assert (orders.estimated_prep_seconds >= 60).all()
    assert (orders.eta_source == "fallback").all()
    assert (orders.status == "completed").all()


def test_peaks_lunch_and_tea_are_busier_than_mid_morning(sim_data):
    _, orders, _ = sim_data
    local_ts = orders.placed_at.dt.tz_convert("Asia/Kolkata")
    hours = local_ts.dt.hour
    lunch_count = (hours == 13).sum()
    tea_count = (hours == 16).sum()
    mid_morning_count = (hours == 10).sum()
    assert lunch_count > 2.5 * mid_morning_count
    assert tea_count > 2.0 * mid_morning_count


def test_sunday_is_quiet(sim_data):
    _, orders, _ = sim_data
    local_ts = orders.placed_at.dt.tz_convert("Asia/Kolkata")
    dows = local_ts.dt.dayofweek
    orders_per_dow = orders.groupby(dows).size()
    weekday_mean = orders_per_dow[orders_per_dow.index < 5].mean()
    sunday_orders = orders_per_dow.get(6, 0)
    assert sunday_orders < 0.3 * weekday_mean


def test_queue_makes_orders_slower(sim_data):
    _, orders, _ = sim_data
    local_ts = orders.placed_at.dt.tz_convert("Asia/Kolkata")
    hours = local_ts.dt.hour
    lunch_rush_prep = orders[hours == 13].actual_prep_seconds.median()
    morning_prep = orders[hours == 9].actual_prep_seconds.median()
    assert lunch_rush_prep > morning_prep


def test_planted_combo_exists_in_the_data(sim_data):
    cat, orders, lines = sim_data
    samosa_ids = set(cat[cat.name == "Samosa"].menu_item_id)
    tea_ids = set(cat[cat.name == "Tea"].menu_item_id)

    order_items = lines.groupby("order_id").menu_item_id.apply(set)
    samosa_orders = [items for items in order_items if items & samosa_ids]
    assert len(samosa_orders) > 50

    tea_with_samosa = sum(1 for items in samosa_orders if items & tea_ids)
    samosa_tea_ratio = tea_with_samosa / len(samosa_orders)
    # Planted affinity is 0.45; test threshold > 0.35
    assert samosa_tea_ratio > 0.35
