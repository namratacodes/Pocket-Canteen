from .config import get_settings
from .modules.registry import load_modules


def load_and_register(modules=None):
    """Used by the API process and the worker process. Loads every present module and lets it register its ports."""
    s = get_settings()
    modules = load_modules() if modules is None else modules
    for m in modules:
        if m.register: m.register(s)
    return modules
