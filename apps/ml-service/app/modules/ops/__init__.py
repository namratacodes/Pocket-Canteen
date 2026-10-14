from app.modules.types import MlModule
from .routes import router

module = MlModule(name="ops", router=router)
