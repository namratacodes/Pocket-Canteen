"""The `menu_intel` port implementation: matrix + combo rules for every canteen in the catalog."""
from datetime import datetime
from .basket import mine_rules
from .matrix import menu_matrix


class MenuEngine:
    def build(self, orders, lines, catalog, as_of: datetime) -> dict:
        out = {"matrix": {}, "rules": {}}
        for cid in catalog.canteen_id.unique():
            out["matrix"][cid] = menu_matrix(orders, lines, catalog, cid, as_of)
            out["rules"][cid] = mine_rules(orders, lines, cid, as_of)
        return out
