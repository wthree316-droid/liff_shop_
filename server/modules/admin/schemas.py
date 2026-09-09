from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

# --- Orders ---
class UpdateOrderStatusRequest(BaseModel):
    status: str = Field(
        pattern="^(PAYMENT_SUBMITTED|CONFIRMED|SHIPPED|CANCELLED)$",
        description="สถานะคำสั่งซื้อ"
    )
    tracking_number: Optional[str] = Field(default=None)

class OrderSummaryResponse(BaseModel):
    id: str
    line_user_id: Optional[str] = None
    customer_name: str
    customer_phone: str
    shipping_address: str
    customer_note: Optional[str] = ""
    subtotal: float
    discount_amount: float
    shipping_fee: float
    grand_total: float
    status: str
    tracking_number: Optional[str] = None
    slip_image_url: Optional[str] = None
    created_at: str

# --- Products (Sync ตรงกับ DB จริง) ---
class AdminCreateProductRequest(BaseModel):
    id: str = Field(..., description="Product slug เช่น tea-04")
    category_id: str = Field(..., description="cat_weight, cat_gear, cat_pack")
    type: str = Field(..., pattern="^(BY_WEIGHT|PER_PIECE)$")
    name: str
    price_per_unit: float = Field(..., ge=0)
    variants: Optional[List[str]] = Field(default_factory=list)
    image_url: Optional[str] = ""
    is_available: bool = True
    price_tiers: Optional[List[Dict[str, Any]]] = Field(default_factory=list)


class AdminUpdateProductRequest(BaseModel):
    category_id: Optional[str] = None
    type: Optional[str] = None
    name: Optional[str] = None
    price_per_unit: Optional[float] = None
    variants: Optional[List[str]] = Field(default_factory=list)
    image_url: Optional[str] = None
    is_available: Optional[bool] = None
    price_tiers: Optional[List[Dict[str, Any]]] = Field(default_factory=list)


# --- Promotions (Sync ตรงกับ DB จริง) ---
class AdminCreatePromoRequest(BaseModel):
    code: str = Field(..., min_length=3)
    title: str = Field(...)
    discount_type: str = Field(..., pattern="^(PERCENTAGE|FIXED_AMOUNT)$")
    discount_value: float = Field(..., gt=0)
    min_order_amount: float = Field(0.0, ge=0)
    max_discount_amount: Optional[float] = None
    description: Optional[str] = ""
    banner_image_url: Optional[str] = ""
    is_active: bool = True

