"""The three canonical DataFrames every phase exchanges. Money is integer paise. All datetimes are UTC-aware."""
import pandas as pd

ORDER_COLS = ["order_id", "canteen_id", "status", "placed_at", "ready_at", "left_queue_at",
              "actual_prep_seconds", "estimated_prep_seconds", "eta_source", "total_paise"]
LINE_COLS = ["order_id", "menu_item_id", "quantity", "price_paise"]
CATALOG_COLS = ["menu_item_id", "canteen_id", "name", "price_paise", "category", "base_prep_seconds", "weight", "station"]
DATETIME_COLS = ["placed_at", "ready_at", "left_queue_at"]


def check_frames(orders: pd.DataFrame, lines: pd.DataFrame, catalog: pd.DataFrame) -> None:
    """Raises ValueError describing the first contract violation. Cheap enough to call at the start of every builder."""
    for name, df, cols in (("orders", orders, ORDER_COLS), ("lines", lines, LINE_COLS), ("catalog", catalog, CATALOG_COLS)):
        missing = [c for c in cols if c not in df.columns]
        if missing: raise ValueError(f"{name} frame is missing columns {missing}")
    for c in DATETIME_COLS:
        if str(orders[c].dtype).split(",")[-1].strip(" ]") not in ("UTC", "utc") and getattr(orders[c].dt, "tz", None) is None:
            raise ValueError(f"orders.{c} must be timezone-aware UTC")
    if not orders.order_id.is_unique: raise ValueError("orders.order_id must be unique")
    if not catalog.menu_item_id.is_unique: raise ValueError("catalog.menu_item_id must be unique")
    unknown = set(lines.menu_item_id) - set(catalog.menu_item_id)
    if unknown: raise ValueError(f"{len(unknown)} line items reference menu items missing from the catalog")
