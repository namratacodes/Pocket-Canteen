"""python -m synthetic.cli --days 60 --seed 42 [--to-db] [--reset] [--out-dir data/synthetic]"""
import argparse, os
from pathlib import Path
import pandas as pd
from .catalog import db_catalog, offline_catalog
from .simulate import simulate


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--days", type=int, default=60); ap.add_argument("--seed", type=int, default=42)
    ap.add_argument("--scale", type=float, default=1.0, help="multiplies daily order volume")
    ap.add_argument("--out-dir", default="data/synthetic"); ap.add_argument("--to-db", action="store_true")
    ap.add_argument("--reset", action="store_true", help="delete previous synthetic rows first (with --to-db)")
    ap.add_argument("--min-orders", type=int, default=5000)
    a = ap.parse_args()
    if os.getenv("NODE_ENV") == "production": raise SystemExit("Refusing to generate synthetic data in production.")
    conn = None
    if a.to_db:
        import psycopg
        conn = psycopg.connect(os.environ["SEED_DATABASE_URL"], autocommit=True)
        catalog = db_catalog(conn)
    else:
        catalog = offline_catalog()
    orders, lines = simulate(catalog, days=a.days, seed=a.seed, scale=a.scale)
    if len(orders) < a.min_orders: raise SystemExit(f"Only {len(orders)} orders; raise --days or --scale (minimum {a.min_orders}).")
    out = Path(a.out_dir); out.mkdir(parents=True, exist_ok=True)
    orders.to_parquet(out / "orders.parquet"); lines.to_parquet(out / "order_items.parquet"); catalog.to_parquet(out / "catalog.parquet")
    print(f"generated {len(orders)} orders, {len(lines)} lines -> {out}")
    if conn:
        from .db_loader import load, reset_synthetic
        if a.reset: reset_synthetic(conn)
        print("loaded into Postgres:", load(conn, orders, lines))


if __name__ == "__main__":
    main()
