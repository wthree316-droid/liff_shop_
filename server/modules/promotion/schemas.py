from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

# สำหรับส่งไปแสดงเป็นการ์ดปัดเลื่อนบนหน้าเว็บ
class PromotionBannerResponse(BaseModel):
    id: str
    code: str
    title: str
    description: Optional[str] = None
    banner_image_url: Optional[str] = None
    discount_type: str
    discount_value: float
    min_order_amount: float
    expires_at: Optional[datetime] = None
