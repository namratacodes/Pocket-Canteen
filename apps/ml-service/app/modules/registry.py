import importlib
from .types import MlModule

# Fixed list. A module whose folder does not exist yet is silently skipped, so every phase runs alone.
MODULE_NAMES = ["datasets", "etatrain", "etaserve", "menu", "forecast", "ops"]


def load_modules() -> list[MlModule]:
    out = []
    for name in MODULE_NAMES:
        try:
            out.append(importlib.import_module(f"app.modules.{name}").module)
        except ModuleNotFoundError as e:
            if e.name == f"app.modules.{name}": continue
            raise
    return out
