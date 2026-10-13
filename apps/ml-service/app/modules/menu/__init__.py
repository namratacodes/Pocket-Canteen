from app.modules.types import MlModule
from app.ports import container
from .engine import MenuEngine
from .routes import router


def _register(settings) -> None:
    container.register("menu_intel", MenuEngine())


module = MlModule(name="menu", register=_register, router=router)
