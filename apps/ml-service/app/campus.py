"""Campus calendar: bell times, dayparts, academic calendar state. Shared by synthetic data, training and serving."""
import csv
from datetime import date
from functools import lru_cache
from pathlib import Path

CALENDAR_CSV = Path("data/academic_calendar.csv")      # rows: date,state  (0 regular, 1 exam week, 2 holiday/fest)
BELLS = [9 * 60, 10 * 60 + 45, 12 * 60 + 45, 15 * 60 + 45, 17 * 60 + 30]   # lecture-end bells, minutes after midnight
DAYPARTS = ["breakfast", "lunch", "tea", "evening"]


def daypart(minute_of_day: int) -> int:
    return 0 if minute_of_day < 11 * 60 else 1 if minute_of_day < 15 * 60 else 2 if minute_of_day < 18 * 60 else 3


@lru_cache
def _overrides() -> dict[date, int]:
    if not CALENDAR_CSV.exists():
        return {}
    with CALENDAR_CSV.open() as f:
        return {date.fromisoformat(r["date"]): int(r["state"]) for r in csv.DictReader(f)}


def reload_calendar() -> None:
    _overrides.cache_clear()


def calendar_state(d: date) -> int:
    """CSV override if present, else Sunday = holiday (2), otherwise regular (0)."""
    return _overrides().get(d, 2 if d.weekday() == 6 else 0)
