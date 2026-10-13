from app.modules.types import MlModule
from app.ports import container
from .trainer import Trainer


def _register(settings) -> None:
    container.register("trainer", Trainer(settings))


module = MlModule(name="etatrain", register=_register)
