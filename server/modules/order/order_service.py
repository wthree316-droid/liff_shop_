from typing import Any, Dict, Optional, List, cast
from fastapi import HTTPException
from core.database import supabase
from modules.order.schemas import CreateOrderRequest
from modules.setting.setting_service import fetch_all_settings
from modules.promotion.promotion_service import validate_and_calculate_discount

def find_package_tier_price(price_tiers: Optional[list], weight: float, fallback_price: float) -> float:
    """ค้นหาราคาเหมาตายตัวตามบล็อกขนาดที่กำหนด"""
    if not price_tiers:
        return fallback_price
    
    # ค้นหาบล็อกที่มีค่าน้ำหนักตรงกัน
    for tier in price_tiers:
        if float(tier.get("weight", 0)) == weight:
            return float(tier.get("price", fallback_price))
            
    # กรณีไม่เจอบล็อกที่กำหนด ให้ใช้ราคาเริ่มต้น
    return fallback_price

def process_order(request: CreateOrderRequest):
    product_ids = [item.product_id for item in request.items]

    settings = fetch_all_settings()
    default_shipping = settings.get("shipping_fee", 40.0)
    free_shipping_limit = settings.get("free_shipping_threshold", 500.0)
    min_order_amount = settings.get("min_order_amount", 100.0)  # ยอดสั่งซื้อขั้นต่ำ (บาท)

    # 1. ตรวจสอบสินค้าจากตาราง products
    db_products_res = supabase.table("products").select("*").in_("id", product_ids).execute()
    raw_products = cast(List[Dict[str, Any]], db_products_res.data or [])
    db_products: Dict[str, Dict[str, Any]] = {p["id"]: p for p in raw_products}

    for pid in product_ids:
        if pid not in db_products or not db_products[pid]["is_available"]:
            raise HTTPException(status_code=400, detail=f"สินค้า ID {pid} ไม่มีจำหน่ายหรือสินค้าหมด")

    calculated_items: List[Dict[str, Any]] = []
    subtotal = 0.0

    # 2. คำนวณราคาแต่ละรายการตามบล็อกราคาเหมา * จำนวนแพ็กเกจ
    for item in request.items:
        prod = db_products[item.product_id]
        qty_weight = float(item.quantity_or_weight)
        item_count = getattr(item, "count", 1) or 1

        if prod["type"] == "BY_WEIGHT":
            tiers = prod.get("price_tiers") or []
            package_price = find_package_tier_price(tiers, qty_weight, float(prod["price_per_unit"]))
            line_price = round(package_price * item_count, 2)
            unit_price = round(package_price / qty_weight, 2) if qty_weight > 0 else package_price
        else:
            unit_price = float(prod["price_per_unit"])
            line_price = round(qty_weight * unit_price * item_count, 2)

        subtotal += line_price
        calculated_items.append({
            "product_id": prod["id"],
            "product_name": prod["name"],
            "selected_variant": item.selected_variant,
            "quantity_or_weight": qty_weight,    
            "package_count": item_count,
            "unit_price_applied": unit_price,
            "line_total": line_price
        })

    subtotal = round(subtotal, 2)

    # ดักยอดสั่งซื้อขั้นต่ำของร้าน
    if subtotal < min_order_amount:
        raise HTTPException(
            status_code=400,
            detail=f"ยอดสั่งซื้อขั้นต่ำของทางร้านคือ ฿{min_order_amount:.2f} (ยอดปัจจุบัน ฿{subtotal:.2f})"
        )
    
    # 3. คำนวณส่วนลดโปรโมชั่น
    discount_amount, applied_code = validate_and_calculate_discount(request.promo_code, subtotal)
    net_subtotal = max(0.0, subtotal - discount_amount)

    # 4. คำนวณค่าจัดส่ง
    shipping_fee = 0.0 if net_subtotal >= free_shipping_limit else default_shipping
    grand_total = round(net_subtotal + shipping_fee, 2)

    # 5. บันทึกลงตาราง orders
    order_insert = supabase.table("orders").insert({
        "line_user_id": request.line_user_id,
        "customer_name": request.customer.name,
        "customer_phone": request.customer.phone,
        "shipping_address": request.customer.address,
        "customer_note": request.customer.note,
        "subtotal": subtotal,
        "discount_amount": discount_amount,
        "applied_promo_code": applied_code,
        "shipping_fee": shipping_fee,
        "grand_total": grand_total,
        "status": "AWAITING_PAYMENT"
    }).execute()

    inserted_order = cast(List[Dict[str, Any]], order_insert.data)[0]
    order_id = str(inserted_order["id"])

    # 6. บันทึกลงตาราง order_items
    for c_item in calculated_items:
        c_item["order_id"] = order_id
    
    supabase.table("order_items").insert(calculated_items).execute()

    return {
        "order_id": order_id,
        "subtotal": subtotal,
        "discount_amount": discount_amount,
        "shipping_fee": shipping_fee,
        "grand_total": grand_total,
        "applied_promo_code": applied_code,
        "status": "AWAITING_PAYMENT",
        "message": "สร้างคำสั่งซื้อสำเร็จ รอชำระเงิน",
        "items": calculated_items
    }