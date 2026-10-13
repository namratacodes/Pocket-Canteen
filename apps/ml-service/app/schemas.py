from datetime import datetime
from pydantic import BaseModel, ConfigDict, Field


class EtaItem(BaseModel):
    model_config = ConfigDict(extra="ignore")
    menuItemId: str
    qty: int = Field(ge=1, le=100)
    basePrepSeconds: float = Field(gt=0, le=7200)
    weight: float = Field(gt=0, le=10)
    station: str = "main_counter"


class EtaRequest(BaseModel):
    """Frozen by the backend (platform module). Unknown extra fields are ignored so the backend can add some safely."""
    model_config = ConfigDict(extra="ignore")
    canteenId: str
    items: list[EtaItem] = Field(min_length=1, max_length=50)
    queueDepth: int = Field(ge=0, le=1000)
    strainSeconds: float = Field(ge=0)
    now: datetime


class EtaResponse(BaseModel):
    etaSeconds: int
    modelVersion: str
