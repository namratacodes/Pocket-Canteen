from app.modules.types import MlModule
from app.ports import container
from .engine import ForecastEngine
from .routes import router


def _register(settings) -> None:
    container.register("forecast", ForecastEngine())


module = MlModule(name="forecast", register=_register, router=router)
