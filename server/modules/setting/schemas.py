from typing import Dict, Optional
from pydantic import BaseModel, Field

class StoreSettingItem(BaseModel):
    key: str
    value: float = Field(..., ge=0)
    description: Optional[str] = None

class StoreSettingsResponse(BaseModel):
    settings: Dict[str, float]

class UpdateSettingRequest(BaseModel):
    value: float = Field(..., ge=0)