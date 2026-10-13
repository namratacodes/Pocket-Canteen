"""Menu catalog for the generator: offline (CSV + deterministic ids) or from the live DB (real ids, real prep metadata)."""
import uuid
from pathlib import Path
import pandas as pd
from .world import CANTEEN_PROFILES

NS = uuid.UUID("6f1c3a52-0f6b-4d0e-9a53-2f4a5c1d7e10")
COLUMNS = ["menu_item_id", "canteen_id", "canteen_prefix", "name", "price_paise", "category",
           "base_prep_seconds", "weight", "station", "batchable"]


def offline_catalog(csv_path: str = "data/menu_catalog.csv") -> pd.DataFrame:
    base = pd.read_csv(csv_path)
    rows = []
    for prefix in CANTEEN_PROFILES:
        for r in base.itertuples():
            rows.append(dict(menu_item_id=str(uuid.uuid5(NS, f"{prefix}:{r.name}")), canteen_id=str(uuid.uuid5(NS, f"canteen:{prefix}")),
                             canteen_prefix=prefix, name=r.name, price_paise=int(r.price_paise), category=r.category,
                             base_prep_seconds=float(r.base_prep_seconds), weight=float(r.weight), station=r.station,
                             batchable=bool(r.batchable)))
    return pd.DataFrame(rows, columns=COLUMNS)


def db_catalog(conn, csv_path: str = "data/menu_catalog.csv") -> pd.DataFrame:
    """Reads canteens + menu + prep metadata through the OWNER connection. `batchable` comes from the CSV by item name
    (the backend seed leaves it false); it only drives hidden kitchen behaviour, never a model feature."""
    batch = pd.read_csv(csv_path).set_index("name").batchable.astype(bool).to_dict()
    cur = conn.execute("""
        SELECT mi.id::text, mi.canteen_id::text, c.token_prefix, mi.name, (mi.price * 100)::int, mi.category,
               COALESCE(p.base_prep_seconds, 180), COALESCE(p.prep_complexity_weight, 1)::float, COALESCE(p.cooking_station, 'main_counter')
        FROM menu_items mi JOIN canteens c ON c.id = mi.canteen_id
        LEFT JOIN menu_item_prep_metadata p ON p.menu_item_id = mi.id""")
    df = pd.DataFrame(cur.fetchall(), columns=["menu_item_id", "canteen_id", "canteen_prefix", "name", "price_paise", "category",
                                                "base_prep_seconds", "weight", "station"])
    if df.empty:
        raise SystemExit("No menu items in the database. Run the backend seeds first (npm run seed in apps/backend).")
    df["batchable"] = df.name.map(batch).fillna(False).astype(bool)
    return df[COLUMNS]
