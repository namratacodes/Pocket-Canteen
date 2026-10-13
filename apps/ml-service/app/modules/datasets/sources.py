"""DataSource implementations (the `source` port). Everything downstream sees only the canonical frames of app/frames.py."""
from __future__ import annotations
from pathlib import Path
import pandas as pd
from app.frames import ORDER_COLS


class ParquetSource:
    """Reads the files written by `python -m synthetic.cli` (orders.parquet, order_items.parquet, catalog.parquet)."""
    def __init__(self, folder: str): self.p = Path(folder)

    def orders(self, since=None) -> pd.DataFrame:
        o = pd.read_parquet(self.p / "orders.parquet")[ORDER_COLS]
        return o if since is None else o[o.placed_at >= since]

    def lines(self, since=None) -> pd.DataFrame:
        l = pd.read_parquet(self.p / "order_items.parquet")[["order_id", "menu_item_id", "quantity", "price_paise"]]
        return l[l.order_id.isin(self.orders(since).order_id)]

    def catalog(self) -> pd.DataFrame:
        return pd.read_parquet(self.p / "catalog.parquet").set_index("menu_item_id", drop=False)

    def velocity(self) -> dict[str, float]:
        return {}                                      # no live clock in files


class PostgresSource:
    """Uses the READ-ONLY role. Needs SELECT on orders, order_items, menu_items, menu_item_prep_metadata, order_status_log only."""
    def __init__(self, url: str):
        import psycopg
        self.conn = psycopg.connect(url, autocommit=True)

    def _q(self, sql, params=()):
        cur = self.conn.execute(sql, params)
        return pd.DataFrame(cur.fetchall(), columns=[d.name for d in cur.description])

    def orders(self, since=None) -> pd.DataFrame:
        o = self._q("""
            SELECT o.id::text AS order_id, o.canteen_id::text AS canteen_id, o.status::text AS status, o.placed_at, o.ready_at,
                   o.actual_prep_seconds, o.estimated_prep_seconds, o.eta_source, (o.total_amount * 100)::int AS total_paise,
                   COALESCE(o.ready_at, c.cancelled_at) AS left_queue_at
            FROM orders o
            LEFT JOIN (SELECT order_id, MIN(changed_at) AS cancelled_at FROM order_status_log WHERE to_status = 'cancelled' GROUP BY 1) c
                   ON c.order_id = o.id
            WHERE o.placed_at IS NOT NULL AND (%s::timestamptz IS NULL OR o.placed_at >= %s)""", (since, since))
        for c in ("placed_at", "ready_at", "left_queue_at"): o[c] = pd.to_datetime(o[c], utc=True)
        return o[ORDER_COLS]

    def lines(self, since=None) -> pd.DataFrame:
        return self._q("""
            SELECT oi.order_id::text AS order_id, oi.menu_item_id::text AS menu_item_id, oi.quantity,
                   (oi.price_at_order_time * 100)::int AS price_paise
            FROM order_items oi JOIN orders o ON o.id = oi.order_id
            WHERE o.placed_at IS NOT NULL AND (%s::timestamptz IS NULL OR o.placed_at >= %s)""", (since, since))

    def velocity(self) -> dict[str, float]:
        """Orders that became ready in the last 15 minutes, per canteen (the live `completions_15m` feature)."""
        df = self._q("SELECT canteen_id::text AS canteen_id, COUNT(*)::int AS n FROM orders WHERE ready_at >= now() - interval '15 minutes' GROUP BY 1")
        return {r.canteen_id: float(r.n) for r in df.itertuples()}

    def catalog(self) -> pd.DataFrame:
        c = self._q("""
            SELECT mi.id::text AS menu_item_id, mi.canteen_id::text AS canteen_id, mi.name, (mi.price * 100)::int AS price_paise, mi.category,
                   COALESCE(p.base_prep_seconds, 180)::float AS base_prep_seconds, COALESCE(p.prep_complexity_weight, 1)::float AS weight,
                   COALESCE(p.cooking_station, 'main_counter') AS station
            FROM menu_items mi LEFT JOIN menu_item_prep_metadata p ON p.menu_item_id = mi.id""")
        return c.set_index("menu_item_id", drop=False)


class LazySource:
    """Builds the real source on first use, so importing or registering costs nothing and a missing database cannot crash startup."""
    def __init__(self, settings): self.s, self._real = settings, None

    def _src(self):
        if self._real is None:
            self._real = ParquetSource(self.s.parquet_dir) if self.s.data_source == "parquet" else PostgresSource(self.s.ml_database_url)
        return self._real

    def orders(self, since=None): return self._src().orders(since)
    def lines(self, since=None): return self._src().lines(since)
    def catalog(self): return self._src().catalog()
    def velocity(self): return self._src().velocity()
