"""Builds the supervised ETA dataset with POINT-IN-TIME kitchen features (no leakage)."""
import numpy as np
import pandas as pd
from app.eta.features import FEATURES, STATIONS, vectorized_time_features
from app.frames import check_frames

EPOCH = pd.Timestamp("1970-01-01", tz="UTC")
MIN_LABEL_S, MAX_LABEL_S = 30, 7200


def _seconds(ts: pd.Series) -> np.ndarray:
    """Never use astype('int64'): the unit differs between pandas versions (this silently corrupted queue features once)."""
    return ((ts - EPOCH).dt.total_seconds()).to_numpy()


def build_dataset(orders: pd.DataFrame, lines: pd.DataFrame, catalog: pd.DataFrame, tz: str, canteen_ids: list[str] | None = None):
    check_frames(orders, lines, catalog)
    c = catalog[["base_prep_seconds", "weight", "station"]]
    l = lines.join(c, on="menu_item_id").dropna(subset=["base_prep_seconds"])
    l["w"] = l.base_prep_seconds * l.weight * l.quantity
    l["b"] = l.base_prep_seconds * l.quantity
    for s in STATIONS: l[f"st_{s}"] = np.where(l.station == s, l.w, 0.0)
    g = l.groupby("order_id")
    of = pd.DataFrame({"n_lines": g.size(), "n_units": g.quantity.sum(), "base_sum": g.b.sum(), "weighted_sum": g.w.sum(),
                       "max_item_base": g.base_prep_seconds.max(), **{f"st_{s}": g[f"st_{s}"].sum() for s in STATIONS}})
    of["n_stations"] = (of[[f"st_{s}" for s in STATIONS]] > 0).sum(axis=1)
    d = orders.join(of, on="order_id").dropna(subset=["weighted_sum"])
    d = d[d.placed_at.notna()].copy()
    d["placed_ts"], d["ready_ts"] = _seconds(d.placed_at), _seconds(d.ready_at)
    d["left_ts"] = _seconds(d.left_queue_at.fillna(d.ready_at))
    canteen_ids = canteen_ids or sorted(d.canteen_id.unique())
    parts = []
    for cid, x in d.groupby("canteen_id"):
        x = x.sort_values("placed_ts").copy()
        t, p_sorted = x.placed_ts.to_numpy(), np.sort(x.placed_ts.to_numpy())
        w_by_placed = x.weighted_sum.to_numpy()                                   # x is sorted by placed_ts
        cum_p = np.concatenate([[0], np.cumsum(w_by_placed)])
        has_left = x.left_ts.notna().to_numpy()
        lo = np.argsort(x.left_ts.to_numpy()[has_left]); l_sorted = x.left_ts.to_numpy()[has_left][lo]
        cum_l = np.concatenate([[0], np.cumsum(x.weighted_sum.to_numpy()[has_left][lo])])
        r_ok = x.ready_ts.notna().to_numpy(); r_sorted = np.sort(x.ready_ts.to_numpy()[r_ok])
        n_placed = np.searchsorted(p_sorted, t, side="left")                       # placed strictly before this order
        n_left = np.searchsorted(l_sorted, t, side="right")                        # already ready/cancelled by then
        x["queue_depth"] = n_placed - n_left
        x["strain_seconds"] = cum_p[n_placed] - cum_l[n_left]
        x["completions_15m"] = n_left_ready(r_sorted, t)
        x["canteen_idx"] = canteen_ids.index(cid) if cid in canteen_ids else np.nan
        parts.append(x)
    d = pd.concat(parts)
    local = d.placed_at.dt.tz_convert(tz)
    for k, v in vectorized_time_features(local).items(): d[k] = np.asarray(v)
    d["strain_per_order"] = d.strain_seconds / d.queue_depth.clip(lower=1)
    d["fallback_pred"] = d.base_sum + 120 * d.queue_depth                          # the backend's deterministic formula
    d["day"] = local.dt.date
    d = d.sort_values("placed_ts").reset_index(drop=True)
    labelled = d[d.ready_at.notna() & d.actual_prep_seconds.between(MIN_LABEL_S, MAX_LABEL_S)]
    return labelled, canteen_ids


def n_left_ready(r_sorted: np.ndarray, t: np.ndarray) -> np.ndarray:
    return np.searchsorted(r_sorted, t, side="right") - np.searchsorted(r_sorted, t - 900, side="right")
