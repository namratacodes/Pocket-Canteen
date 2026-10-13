import os
import pytest

from synthetic.catalog import offline_catalog
from synthetic.simulate import simulate


def test_load_then_read_back_then_reset():
    db_url = os.getenv("TEST_DATABASE_URL")
    if not db_url:
        pytest.skip("TEST_DATABASE_URL not set (needs backend Postgres schema)")

    import psycopg
    from app.modules.datasets.sources import PostgresSource
    from synthetic.db_loader import load, reset_synthetic

    conn = psycopg.connect(db_url, autocommit=True)
    try:
        cat = offline_catalog()
        orders, lines = simulate(cat, days=2, seed=42)

        # 1. Reset first to ensure clean state
        reset_synthetic(conn)

        # 2. Load synthetic data
        res = load(conn, orders, lines, n_students=50, seed=1)
        assert res["orders"] == len(orders)
        assert res["order_items"] == len(lines)

        # 3. Read back via PostgresSource
        source = PostgresSource(db_url)
        db_orders = source.orders()
        db_lines = source.lines()
        assert len(db_orders) >= len(orders)
        assert len(db_lines) >= len(lines)

        # 4. Reset synthetic data
        reset_synthetic(conn)

        # Verify trigger is re-enabled and synthetic orders deleted
        cur = conn.execute("SELECT COUNT(*) FROM orders WHERE order_uid LIKE 'PKT-SYN-%'")
        assert cur.fetchone()[0] == 0

        # Check trigger status is 'O' (enabled)
        cur = conn.execute(
            "SELECT tgenabled FROM pg_trigger WHERE tgname = 'trg_status_log_append_only'"
        )
        row = cur.fetchone()
        if row:
            assert row[0] == "O"
    finally:
        conn.close()
