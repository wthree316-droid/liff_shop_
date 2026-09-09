from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple, cast
from fastapi import HTTPException
from core.database import supabase

def get_active_promotions() -> List[Dict[str, Any]]:
    res = supabase.table("promotions").select("*").eq("is_active", True).execute()
    promos = cast(List[Dict[str, Any]], res.data or [])
    
    now = datetime.now(timezone.utc)
    valid_promos: List[Dict[str, Any]] = []
    for p in promos:
        if p.get("expires_at"):
            exp = datetime.fromisoformat(str(p["expires_at"]).replace("Z", "+00:00"))
            if now > exp:
                continue
        valid_promos.append(p)
    return valid_promos


def validate_and_calculate_discount(code: Optional[str], subtotal: float) -> Tuple[float, Optional[str]]:
    if not code:
        return 0.0, None
    
    clean_code = code.strip().upper()
    res = supabase.table("promotions").select("*").eq("code", clean_code).eq("is_active", True).execute()
    promos = cast(List[Dict[str, Any]], res.data or [])
    
    if not promos:
        raise HTTPException(status_code=400, detail="รหัสโปรโมชั่นไม่ถูกต้องหรือถูกปิดใช้งาน")
    
    promo = promos[0]
    
    if promo.get("expires_at"):
        exp = datetime.fromisoformat(str(promo["expires_at"]).replace("Z", "+00:00"))
        if datetime.now(timezone.utc) > exp:
            raise HTTPException(status_code=400, detail="รหัสโปรโมชั่นนี้หมดอายุแล้ว")
            
    min_order = float(promo.get("min_order_amount") or 0)
    if subtotal < min_order:
        raise HTTPException(status_code=400, detail=f"โค้ดนี้ใช้ได้เมื่อสั่งซื้อขั้นต่ำ {min_order:.2f} บาทขึ้นไป")
        
    discount_val = float(promo["discount_value"])
    if promo["discount_type"] == "FIXED_AMOUNT":
        discount = discount_val
    elif promo["discount_type"] == "PERCENTAGE":
        discount = (subtotal * discount_val) / 100.0
        if promo.get("max_discount_amount"):
            discount = min(discount, float(promo["max_discount_amount"]))
    else:
        discount = 0.0

    return round(min(discount, subtotal), 2), clean_code