from app.modules.types import MlModule
from app.ports import container
from .sources import LazySource


def _register(settings) -> None:
    container.register("source", LazySource(settings))


module = MlModule(name="datasets", register=_register)
