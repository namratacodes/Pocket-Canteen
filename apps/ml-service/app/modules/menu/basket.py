"""Market-basket pair rules: support, confidence, lift. Pure counting, no heavy dependency (12-item menus)."""
from collections import Counter
from datetime import datetime, timedelta
from itertools import combinations
import pandas as pd


def mine_rules(orders, lines, canteen_id: str, as_of: datetime, window_days: int = 60,
               min_support: float = 0.01, min_confidence: float = 0.25, min_lift: float = 1.2) -> list[dict]:
    o = orders[(orders.canteen_id == canteen_id) & (orders.placed_at >= as_of - timedelta(days=window_days)) & (orders.status == "completed")]
    baskets = lines[lines.order_id.isin(o.order_id)].groupby("order_id").menu_item_id.apply(lambda s: sorted(set(s)))
    n = len(baskets)
    if n < 200: return []                                                  # too little evidence to say anything
    single, pair = Counter(), Counter()
    for b in baskets:
        single.update(b); pair.update(combinations(b, 2))
    rules = []
    for (a, b), cnt in pair.items():
        support = cnt / n
        if support < min_support: continue
        for x, y in ((a, b), (b, a)):
            confidence = cnt / single[x]; lift = confidence / (single[y] / n)
            if confidence >= min_confidence and lift >= min_lift:
                rules.append({"ifItemId": x, "thenItemId": y, "support": round(support, 4), "confidence": round(confidence, 3), "lift": round(lift, 2)})
    return sorted(rules, key=lambda r: (-r["lift"], -r["confidence"]))


def recommend(rules: list[dict], cart_item_ids: list[str], k: int = 3) -> list[dict]:
    cart, best = set(cart_item_ids), {}
    for r in rules:
        if r["ifItemId"] in cart and r["thenItemId"] not in cart:
            cur = best.get(r["thenItemId"])
            if cur is None or (r["confidence"], r["lift"]) > (cur["confidence"], cur["lift"]): best[r["thenItemId"]] = r
    return sorted(best.values(), key=lambda r: (-r["confidence"], -r["lift"]))[:k]
