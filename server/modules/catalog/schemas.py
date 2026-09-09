from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class ProductResponse(BaseModel):
    id: str
    category_id: str
    type: str
    name: str
    price_per_unit: float
    variants: List[str]
    image_url: Optional[str] = None
    is_available: bool
    price_tiers: Optional[List[Dict[str, Any]]] = None

