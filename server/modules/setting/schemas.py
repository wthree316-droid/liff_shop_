from typing import Dict, Optional, Any, Union
from pydantic import BaseModel

class StoreSettingItem(BaseModel):
    key: str
    value: Any
    description: Optional[str] = None

class StoreSettingsResponse(BaseModel):
    settings: Dict[str, Any]

class UpdateSettingRequest(BaseModel):
    value: Union[float, str]