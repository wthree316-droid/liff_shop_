import re
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator

class OrderItemPayload(BaseModel):
    product_id: str
    quantity_or_weight: float = Field(gt=0, description="กรัม หรือ จำนวนชิ้น")
    selected_variant: Optional[str] = None

class CustomerPayload(BaseModel):
    name: str = Field(min_length=1)
    phone: str = Field(min_length=10, max_length=10)
    address: str = Field(min_length=5)
    note: Optional[str] = None

    @field_validator("phone")
    @classmethod
    def validate_thai_phone(cls, v: str) -> str:
        clean_phone = v.strip()
        if not re.match(r"^0[0-9]{9}$", clean_phone):
            raise ValueError("เบอร์โทรศัพท์ต้องมี 10 หลักและขึ้นต้นด้วย 0")
        return clean_phone

class CreateOrderRequest(BaseModel):
    line_user_id: Optional[str] = None
    customer: CustomerPayload
    items: List[OrderItemPayload] = Field(min_length=1)
    promo_code: Optional[str] = None

class OrderSummaryResponse(BaseModel):
    order_id: str
    subtotal: float
    discount_amount: float = 0.0
    shipping_fee: float
    grand_total: float
    applied_promo_code: Optional[str] = None
    status: str
    message: str