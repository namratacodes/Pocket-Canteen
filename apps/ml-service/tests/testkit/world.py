"""Compact deterministic campus simulator FOR TESTS ONLY (phase 1 owns the production generator). Produces the canonical frames."""
import heapq, math, uuid
from dataclasses import dataclass
from datetime import date, datetime, timedelta, timezone
from zoneinfo import ZoneInfo
import numpy as np
import pandas as pd
from app import campus

NS = uuid.UUID("7a3b9c10-2d44-4f5e-8a61-0b1c2d3e4f50")
PROFILES = {"A": (230, 1.0), "B": (170, 0.9), "C": (130, 0.8)}                 # prefix -> (weekday orders/day, kitchen capacity)
SLOTS = {"griddle": 4, "fryer": 2, "wok": 2, "beverage": 3, "main_counter": 3}
MIX = [(.12, 540, 40), (.10, 660, 45), (.40, 795, 35), (.28, 990, 40), (.10, 1170, 60)]    # weight, mean minute, sd
DOW = [1, 1, 1, 1, 1, .45, .12]
CALF = {0: 1.0, 1: .8, 2: .25}
POP = {"Samosa": [2, 2, 5, 3], "Tea": [4, 2, 6, 3], "Coffee": [3, 2, 3, 2], "Cold Coffee": [1, 3, 3, 3], "Veg Sandwich": [3, 3, 2, 2],
       "Grilled Sandwich": [1, 3, 3, 2], "Masala Dosa": [3, 5, 1, 1], "Veg Burger": [1, 4, 3, 3], "Chicken Burger": [.5, 3, 2, 3],
       "Veg Fried Rice": [.2, 5, 1, 3], "Maggi": [1, 2, 2, 4], "French Fries": [1, 2, 3, 3]}
AFF = {"Samosa": [("Tea", .45)], "Grilled Sandwich": [("Cold Coffee", .35)], "Veg Burger": [("French Fries", .40)],
       "Chicken Burger": [("French Fries", .40)], "Maggi": [("Cold Coffee", .25)], "Masala Dosa": [("Coffee", .30)]}


@dataclass
class World:
    orders: pd.DataFrame
    lines: pd.DataFrame
    catalog: pd.DataFrame            # indexed by menu_item_id (canonical catalog frame)


def make_catalog(prefixes=("A", "B")) -> pd.DataFrame:
    base = pd.read_csv("data/menu_catalog.csv")
    rows = [dict(menu_item_id=str(uuid.uuid5(NS, f"{p}:{r.name}")), canteen_id=str(uuid.uuid5(NS, f"canteen:{p}")), name=r.name,
                 price_paise=int(r.price_paise), category=r.category, base_prep_seconds=float(r.base_prep_seconds), weight=float(r.weight),
                 station=r.station, batchable=bool(r.batchable), prefix=p) for p in prefixes for r in base.itertuples()]
    return pd.DataFrame(rows)


def make_world(days=30, seed=1, scale=0.5, end_day=date(2026, 10, 10), prefixes=("A", "B"), tz="Asia/Kolkata") -> World:
    rng = np.random.default_rng(seed); zone = ZoneInfo(tz)
    cat = make_catalog(prefixes); orders, lines = [], []
    for p in prefixes:
        base_vol, slot_mult = PROFILES[p]
        items = cat[cat.prefix == p]; look = {r.name: r for r in items.itertuples()}; names = list(look)
        for k in range(days):
            d = end_day - timedelta(days=days - 1 - k); cs = campus.calendar_state(d)
            n = int(rng.poisson(base_vol * scale * DOW[d.weekday()] * CALF[cs]))
            comp = rng.choice(len(MIX), size=n, p=[m[0] for m in MIX])
            mins = np.sort(np.clip([rng.normal(MIX[c][1], MIX[c][2]) for c in comp], 480, 1290))
            slots = {s: [0.0] * max(1, round(v * slot_mult)) for s, v in SLOTS.items()}; active = []
            midnight = datetime(d.year, d.month, d.day, tzinfo=zone)
            for tok, m in enumerate(mins, 1):
                placed = m * 60 + rng.uniform(0, 59)
                while active and active[0] <= placed: heapq.heappop(active)
                depth = len(active); dp = campus.daypart(int(m))
                w = np.array([POP[n_][dp] for n_ in names], float); w /= w.sum()
                first = names[rng.choice(len(names), p=w)]; cart = {first: 1}
                for partner, pr in AFF.get(first, []):
                    if rng.random() < pr: cart[partner] = 1
                if rng.random() < .22: cart.setdefault(names[rng.choice(len(names), p=w)], 1)
                cart = {n_: int(rng.choice([1, 2, 3], p=[.82, .15, .03])) for n_ in cart}
                fat = min(1.5, 1 + .012 * max(0, depth - 6)); t0 = placed + rng.lognormal(math.log(25), .4); fin = t0
                for n_, q in cart.items():
                    it = look[n_]; pool = slots[it.station]; i = int(np.argmin(pool)); st = max(t0, pool[i])
                    pool[i] = st + it.base_prep_seconds * (1 + .5 * (it.weight - 1)) * (1 + .55 * (q - 1)) * rng.lognormal(0, .22) * fat
                    fin = max(fin, pool[i])
                ready = fin + rng.uniform(20, 45) + rng.lognormal(math.log(15), .6); heapq.heappush(active, ready)
                oid = str(uuid.UUID(int=int(rng.integers(0, 2**62)) << 64 | int(rng.integers(0, 2**62)), version=4))
                ts = lambda s_: (midnight + timedelta(seconds=float(s_))).astimezone(timezone.utc)
                bs = sum(look[n_].base_prep_seconds * q for n_, q in cart.items())
                orders.append(dict(order_id=oid, canteen_id=items.canteen_id.iloc[0], status="completed", placed_at=ts(placed), ready_at=ts(ready),
                                   left_queue_at=ts(ready), actual_prep_seconds=int(round(ready - placed)), estimated_prep_seconds=int(max(60, bs + 120 * depth)),
                                   eta_source="fallback", total_paise=int(sum(look[n_].price_paise * q for n_, q in cart.items()))))
                for n_, q in cart.items():
                    lines.append(dict(order_id=oid, menu_item_id=look[n_].menu_item_id, quantity=q, price_paise=int(look[n_].price_paise)))
    from app.frames import CATALOG_COLS
    return World(pd.DataFrame(orders), pd.DataFrame(lines), cat[CATALOG_COLS].set_index("menu_item_id", drop=False))
