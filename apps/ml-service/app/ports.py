"""The ONLY way phases call each other. A phase that implements a port registers it in its module's register(); a phase that
consumes a port calls container.get('<key>') at CALL time (never at import time)."""
from __future__ import annotations
from datetime import date, datetime
from typing import Protocol
import pandas as pd


class DataSource(Protocol):                       # implemented by phase 1 (datasets), key 'source'
    def orders(self, since: datetime | None = None) -> pd.DataFrame: ...      # canonical orders frame (app/frames.py)
    def lines(self, since: datetime | None = None) -> pd.DataFrame: ...       # canonical lines frame for those orders
    def catalog(self) -> pd.DataFrame: ...                                    # canonical catalog frame, indexed by menu_item_id
    def velocity(self) -> dict[str, float]: ...                               # canteen_id -> orders that became ready in the last 15 min ({} if unknown)


class EtaTrainer(Protocol):                       # implemented by phase 2 (etatrain), key 'trainer'
    def train_and_register(self, source: DataSource, *, promote: bool = True) -> str: ...      # returns the new version string
    def retrain_if_better(self, source: DataSource, *, window_days: int, min_improvement: float = 0.02) -> dict: ...
    # retrain_if_better returns {"action": "promoted"|"kept_current"|"skipped", "version"?: str, "holdout_mae_old_s"?: float, "holdout_mae_new_s"?: float}


class MenuIntelligence(Protocol):                 # implemented by phase 4 (menu), key 'menu_intel'
    def build(self, orders: pd.DataFrame, lines: pd.DataFrame, catalog: pd.DataFrame, as_of: datetime) -> dict: ...
    # returns {"matrix": {canteenId: {...}}, "rules": {canteenId: [...]}}   (shapes frozen in the contract, intelligence.json)


class ForecastEngine(Protocol):                   # implemented by phase 5 (forecast), key 'forecast'
    def build(self, orders: pd.DataFrame, lines: pd.DataFrame, catalog: pd.DataFrame, tz: str, today: date) -> dict: ...
    # returns {"sheet": {canteenId: {...}}, "forecastReport": {...}}; {"sheet": {}, "forecastReport": {}} when history is too short


class Container:
    def __init__(self): self._m: dict[str, object] = {}
    def register(self, key: str, impl: object) -> None: self._m[key] = impl
    def has(self, key: str) -> bool: return key in self._m
    def get(self, key: str):
        if key not in self._m: raise LookupError(f"port '{key}' is not registered (is the phase that implements it present?)")
        return self._m[key]
    def reset(self) -> None: self._m.clear()


container = Container()
