"""Discrete-event simulation of campus canteens. Produces orders whose prep time genuinely depends on the kitchen state."""
import csv, heapq, math, uuid
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo
import numpy as np
import pandas as pd
from app import campus
from . import world as W


def _uuid(rng) -> str:
    return str(uuid.UUID(int=(int(rng.integers(0, 2**63)) << 64) | int(rng.integers(0, 2**63)), version=4))


def exam_state(d: date) -> int:
    return 2 if d.weekday() == 6 else 1 if (d.toordinal() // 7) % W.EXAM_WEEK_EVERY == W.EXAM_WEEK_EVERY - 1 else 0


def write_calendar(days: list[date], path=campus.CALENDAR_CSV) -> None:
    """Writes a synthetic academic calendar ONLY if none exists. A real, hand-maintained calendar is never overwritten."""
    if path.exists(): return
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="") as f:
        w = csv.writer(f); w.writerow(["date", "state"])
        for d in days: w.writerow([d.isoformat(), exam_state(d)])
    campus.reload_calendar()


def _cart(rng, items: pd.DataFrame, minute: float) -> dict[str, int]:
    dp = campus.daypart(int(minute))
    w = np.array([W.POPULARITY[n][dp] for n in items.name], float); w /= w.sum()
    names = items.name.tolist()
    first = names[rng.choice(len(names), p=w)]
    chosen = [first]
    for partner, p in W.AFFINITY.get(first, []):
        if rng.random() < p: chosen.append(partner)
    if rng.random() < W.EXTRA_ITEM_PROB:
        extra = names[rng.choice(len(names), p=w)]
        if extra not in chosen: chosen.append(extra)
    return {n: int(rng.choice(W.QTY_CHOICES, p=W.QTY_PROBS)) for n in chosen}


def simulate(catalog: pd.DataFrame, days: int = 60, seed: int = 42, end_day: date | None = None, scale: float = 1.0,
             tz: str = "Asia/Kolkata") -> tuple[pd.DataFrame, pd.DataFrame]:
    rng = np.random.default_rng(seed)
    zone = ZoneInfo(tz)
    end_day = end_day or (datetime.now(zone).date() - timedelta(days=1))
    all_days = [end_day - timedelta(days=days - 1 - k) for k in range(days)]
    write_calendar(all_days)
    orders, lines = [], []
    for prefix, (base_vol, slot_mult) in W.CANTEEN_PROFILES.items():
        items = catalog[catalog.canteen_prefix == prefix].set_index("name", drop=False)
        if items.empty: continue
        canteen_id = items.canteen_id.iloc[0]
        lookup = {r.name: r for r in items.itertuples()}          # plain dict: pandas .loc inside the hot loop is ~100x slower
        for d in all_days:
            cs = campus.calendar_state(d)
            vol = base_vol * scale * W.DOW_FACTOR[d.weekday()] * W.CAL_FACTOR[cs]
            n = int(rng.poisson(vol * rng.lognormal(0, .08)))
            comp = rng.choice(len(W.ARRIVAL_MIX), size=n, p=[m[0] for m in W.ARRIVAL_MIX])
            sd_mult = 1.25 if cs == 1 else 1.0
            minutes = np.sort(np.clip([rng.normal(W.ARRIVAL_MIX[c][1], W.ARRIVAL_MIX[c][2] * sd_mult) for c in comp], 8 * 60, 21 * 60 + 30))
            slots = {s: [0.0] * max(1, round(v * slot_mult)) for s, v in W.BASE_SLOTS.items()}
            last_start: dict[tuple, float] = {}
            active: list[float] = []                       # finish times of orders still in the kitchen
            midnight = datetime(d.year, d.month, d.day, tzinfo=zone)
            for tok, m in enumerate(minutes, start=1):
                placed_s = m * 60 + rng.uniform(0, 59)
                while active and active[0] <= placed_s: heapq.heappop(active)
                depth = len(active)
                cart = _cart(rng, items, m)
                fatigue = min(1.5, 1 + 0.012 * max(0, depth - 6))
                t0 = placed_s + rng.lognormal(math.log(25), .4)           # cook notices the ticket
                finish, first_start = t0, None
                for name, qty in cart.items():
                    it = lookup[name]
                    pool = slots[it.station]; i = int(np.argmin(pool)); start = max(t0, pool[i])
                    svc = it.base_prep_seconds * (1 + .5 * (it.weight - 1)) * (1 + .55 * (qty - 1)) * rng.lognormal(0, .22) * fatigue
                    if it.batchable and start - last_start.get((it.station, name), -1e9) < 120: svc *= .7     # batching
                    last_start[(it.station, name)] = start; pool[i] = start + svc
                    finish = max(finish, pool[i]); first_start = start if first_start is None else min(first_start, start)
                ready_s = finish + rng.uniform(20, 45) + rng.lognormal(math.log(15), .6)      # packing + staff click lag
                heapq.heappush(active, ready_s)
                oid = _uuid(rng)
                base_sum = sum(lookup[n].base_prep_seconds * q for n, q in cart.items())
                ts = lambda s: (midnight + timedelta(seconds=float(s))).astimezone(timezone.utc)
                orders.append(dict(order_id=oid, canteen_id=canteen_id, token_no=f"{prefix}-{tok}", status="completed",
                                   created_at=ts(placed_s - rng.uniform(20, 90)), placed_at=ts(placed_s), prep_start_at=ts(first_start),
                                   ready_at=ts(ready_s), completed_at=ts(ready_s + rng.lognormal(math.log(90), .6)),
                                   total_paise=int(sum(lookup[n].price_paise * q for n, q in cart.items())),
                                   estimated_prep_seconds=int(max(60, round(base_sum + 120 * depth))), eta_source="fallback"))
                for n, q in cart.items():
                    lines.append(dict(order_id=oid, menu_item_id=lookup[n].menu_item_id, quantity=q, price_paise=int(lookup[n].price_paise)))
    o, l = pd.DataFrame(orders), pd.DataFrame(lines)
    o["left_queue_at"] = o.ready_at
    o["actual_prep_seconds"] = (o.ready_at - o.placed_at).dt.total_seconds().round().astype(int)
    return o, l
