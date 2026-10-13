import numpy as np
import pandas as pd
from app.eta.features import FEATURES, online_vector
from app.modules.etatrain.dataset import build_dataset

TZ = "Asia/Kolkata"


def test_every_feature_is_present_and_finite(built):
    d, _ = built
    assert set(FEATURES) <= set(d.columns)
    assert np.isfinite(d[FEATURES].drop(columns=["completions_15m"]).to_numpy(dtype=float)).all()


def test_queue_features_are_point_in_time(world, built):
    """Recompute queue depth the slow, obviously-correct way for sampled orders and compare."""
    d, _ = built; o = world.orders
    for _, r in d.sample(60, random_state=3).iterrows():
        same = o[o.canteen_id == r.canteen_id]
        ahead = same[(same.placed_at < r.placed_at) & (same.left_queue_at > r.placed_at)]
        assert r.queue_depth == len(ahead)
        done = same[(same.ready_at <= r.placed_at) & (same.ready_at > r.placed_at - pd.Timedelta(minutes=15))]
        assert r.completions_15m == len(done)


def test_dataset_rows_equal_the_online_vector(world, built):
    """Training/serving parity: the training row must equal online_vector(...) built from what the backend would send."""
    d, ids = built; cat, lines = world.catalog, world.lines
    by = {k: g for k, g in lines.groupby("order_id")}
    from zoneinfo import ZoneInfo
    for _, r in d.sample(150, random_state=1).iterrows():
        items = [{"qty": int(x.quantity), "basePrepSeconds": float(cat.loc[x.menu_item_id].base_prep_seconds),
                  "weight": float(cat.loc[x.menu_item_id].weight), "station": cat.loc[x.menu_item_id].station} for x in by[r.order_id].itertuples()]
        v = online_vector(items, r.queue_depth, r.strain_seconds, r.completions_15m, r.canteen_idx, r.placed_at.tz_convert(ZoneInfo(TZ)))[0]
        np.testing.assert_allclose(v, r[FEATURES].astype("float32").to_numpy(), rtol=1e-4, atol=1e-3)


def test_nothing_after_placement_leaks_into_features(world):
    """Delete all orders placed AFTER a given order: its features must not change."""
    o, l, c = world.orders, world.lines, world.catalog
    d_full, ids = build_dataset(o, l, c, TZ)
    probe = d_full.iloc[len(d_full) // 2]
    o2 = o[o.placed_at <= probe.placed_at]; l2 = l[l.order_id.isin(o2.order_id)]
    d2, _ = build_dataset(o2, l2, c, TZ, ids)
    again = d2[d2.order_id == probe.order_id].iloc[0]
    for f in ("queue_depth", "strain_seconds", "completions_15m"): assert again[f] == probe[f]


def test_labels_outside_the_sane_range_are_dropped(world):
    o = world.orders.copy(); o.loc[o.index[:5], "actual_prep_seconds"] = 99999
    d, _ = build_dataset(o, world.lines, world.catalog, TZ)
    assert len(d) == len(o) - 5 and d.actual_prep_seconds.max() <= 7200


def test_cancelled_orders_leave_the_queue_but_are_never_labels(world):
    o = world.orders.copy(); victim = o.index[10]
    o.loc[victim, ["status", "ready_at", "actual_prep_seconds"]] = ["cancelled", pd.NaT, None]
    o.loc[victim, "left_queue_at"] = o.loc[victim, "placed_at"] + pd.Timedelta(minutes=2)
    d, _ = build_dataset(o, world.lines, world.catalog, TZ)
    assert o.loc[victim, "order_id"] not in set(d.order_id)
