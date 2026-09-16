from typing import Any, Dict, Optional, List, cast
from fastapi import HTTPException
from core.database import supabase
from modules.order.schemas import CreateOrderRequest
from modules.setting.setting_service import fetch_all_settings
from modules.promotion.promotion_service import validate_and_calculate_discount

def calculate_item_price(price_tiers: Optional[list], weight: float, price_per_unit: float) -> tuple[float, float]:
    if price_tiers:
        for tier in price_tiers:
            if float(tier.get("weight", 0)) == weight:
                pkg_price = float(tier.get("price", 0.0))
                unit_price = round(pkg_price / weight, 2) if weight > 0 else pkg_price
                return pkg_price, unit_price

    line_price = round(weight * price_per_unit, 2)
    return line_price, price_per_unit

def process_order(request: CreateOrderRequest):
    product_ids = [item.product_id for item in request.items]

    settings = fetch_all_settings()
    default_shipping = settings.get("shipping_fee", 40.0)
    free_shipping_limit = settings.get("free_shipping_threshold", 500.0)
    min_order_amount = settings.get("min_order_amount", 100.0)
    cod_deposit_fee = float(settings.get("cod_deposit_fee", 80.0)) # มัดจำค่าส่งไป-กลับ

    # 1. ตรวจสอบสินค้า
    db_products_res = supabase.table("products").select("*").in_("id", product_ids).execute()
    raw_products = cast(List[Dict[str, Any]], db_products_res.data or [])
    db_products: Dict[str, Dict[str, Any]] = {p["id"]: p for p in raw_products}

    for pid in product_ids:
        if pid not in db_products or not db_products[pid]["is_available"]:
            raise HTTPException(status_code=400, detail=f"สินค้า ID {pid} ไม่มีจำหน่ายหรือสินค้าหมด")

    calculated_items: List[Dict[str, Any]] = []
    subtotal = 0.0

    # 2. คำนวณราคาสินค้า
    for item in request.items:
        prod = db_products[item.product_id]
        qty_weight = float(item.quantity_or_weight)
        item_count = getattr(item, "count", 1) or 1

        if prod["type"] == "BY_WEIGHT":
            tiers = prod.get("price_tiers") or []
            item_price, unit_price = calculate_item_price(tiers, qty_weight, float(prod["price_per_unit"]))
            line_price = round(item_price * item_count, 2)
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

    if subtotal < min_order_amount:
        raise HTTPException(
            status_code=400,
            detail=f"ยอดสั่งซื้อขั้นต่ำของทางร้านคือ ฿{min_order_amount:.2f} (ยอดปัจจุบัน ฿{subtotal:.2f})"
        )

    # 3. ส่วนลดโปรโมชั่น
    discount_amount, applied_code = validate_and_calculate_discount(request.promo_code, subtotal)
    net_subtotal = max(0.0, subtotal - discount_amount)

    # 4. แยกการคิดยอดเงินตามรูปแบบชำระเงิน
    is_cod = request.payment_method == "COD"

    if is_cod:
        # COD: คิดค่าส่งเต็ม (ไม่ได้รับสิทธิ์ส่งฟรี)
        shipping_fee = default_shipping
        grand_total = round(net_subtotal + shipping_fee, 2)
        deposit_amount = cod_deposit_fee  # โอนเฉพาะค่ามัดจำส่งไปกลับ
        remaining_cod_amount = grand_total # ยอดที่ต้องเตรียมจ่ายให้คนส่งพัสดุ
        status_text = "รอยืนยันสลิปมัดจำค่าจัดส่ง"
    else:
        # TRANSFER: คิดส่งฟรีตามเงื่อนไขปกติ
        shipping_fee = 0.0 if net_subtotal >= free_shipping_limit else default_shipping
        grand_total = round(net_subtotal + shipping_fee, 2)
        deposit_amount = grand_total     # โอนยอดเต็มบิลทันที
        remaining_cod_amount = 0.0
        status_text = "รอชำระเงิน"

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
        "payment_method": request.payment_method,
        "deposit_amount": deposit_amount,
        "status": "AWAITING_PAYMENT"
    }).execute()

    inserted_order = cast(List[Dict[str, Any]], order_insert.data)[0]
    order_id = str(inserted_order["id"])

    # 6. บันทึกลง order_items
    for c_item in calculated_items:
        c_item["order_id"] = order_id

    supabase.table("order_items").insert(calculated_items).execute()

    return {
        "order_id": order_id,
        "subtotal": subtotal,
        "discount_amount": discount_amount,
        "shipping_fee": shipping_fee,
        "grand_total": grand_total,
        "payment_method": request.payment_method,
        "deposit_amount": deposit_amount,
        "remaining_cod_amount": remaining_cod_amount,
        "applied_promo_code": applied_code,
        "status": "AWAITING_PAYMENT",
        "message": f"สร้างคำสั่งซื้อสำเร็จ ({status_text})",
        "items": calculated_items
    }