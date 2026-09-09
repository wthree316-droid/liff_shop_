import os
from typing import List, Dict, Any, Optional, cast
from fastapi import HTTPException
from core.database import supabase
from modules.admin.schemas import (
    AdminCreateProductRequest,
    AdminUpdateProductRequest,
    AdminCreatePromoRequest
)

# --- STORAGE HELPERS ---
def delete_storage_image_by_url(image_url: Optional[str], bucket_name: str = "products"):
    """แยกชื่อไฟล์จาก Public URL แล้วสั่งลบออกจาก Supabase Storage Bucket"""
    if not image_url:
        return
    try:
        filename = image_url.split("/")[-1]
        if filename:
            supabase.storage.from_(bucket_name).remove([filename])
    except Exception as e:
        print(f"Warning: Failed to delete old image from storage: {e}")

# --- ORDERS ---
VALID_TRANSITIONS = {
    "AWAITING_PAYMENT": ["PAYMENT_SUBMITTED", "CANCELLED"],
    "PAYMENT_SUBMITTED": ["CONFIRMED", "CANCELLED"],
    "CONFIRMED": ["SHIPPED", "CANCELLED"],
    "SHIPPED": [],
    "CANCELLED": []
}

def fetch_orders(status_filter: Optional[str] = None) -> List[Dict[str, Any]]:
    query = supabase.table("orders").select("*").order("created_at", desc=True)
    if status_filter:
        query = query.eq("status", status_filter)
    res = query.execute()
    orders = cast(List[Dict[str, Any]], res.data or [])
    return [
        {
            "id": o["id"],
            "line_user_id": o.get("line_user_id"),
            "customer_name": o.get("customer_name", ""),
            "customer_phone": o.get("customer_phone", ""),
            "shipping_address": o.get("shipping_address", ""),
            "customer_note": o.get("customer_note", ""),
            "subtotal": float(o.get("subtotal", 0.0)),
            "discount_amount": float(o.get("discount_amount", 0.0)),
            "shipping_fee": float(o.get("shipping_fee", 0.0)),
            "grand_total": float(o.get("grand_total", 0.0)),
            "status": o.get("status", ""),
            "tracking_number": o.get("tracking_number"),
            "slip_image_url": o.get("slip_image_url"),
            "created_at": o.get("created_at", "")
        } for o in orders
    ]

def update_order_status(order_id: str, new_status: str, tracking_number: Optional[str] = None) -> Dict[str, Any]:
    res = supabase.table("orders").select("status").eq("id", order_id).execute()
    data = cast(List[Dict[str, Any]], res.data or [])
    if not data:
        raise HTTPException(status_code=404, detail="ไม่พบคำสั่งซื้อ")
    
    current_status = data[0]["status"]
    if new_status not in VALID_TRANSITIONS.get(current_status, []):
        raise HTTPException(status_code=400, detail=f"ไม่อนุญาตให้เปลี่ยนสถานะจาก '{current_status}' ไปเป็น '{new_status}'")

    payload: Dict[str, Any] = {"status": new_status}
    if tracking_number:
        payload["tracking_number"] = tracking_number.strip()

    update_res = supabase.table("orders").update(payload).eq("id", order_id).execute()
    return cast(List[Dict[str, Any]], update_res.data or [])[0]

# --- PRODUCTS ---
def fetch_all_products_admin() -> List[Dict[str, Any]]:
    res = supabase.table("products").select("*").order("created_at", desc=True).execute()
    return cast(List[Dict[str, Any]], res.data or [])

def create_product_admin(data: AdminCreateProductRequest) -> Dict[str, Any]:
    existing = supabase.table("products").select("id").eq("id", data.id).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail=f"รหัสสินค้า '{data.id}' มีอยู่ในระบบแล้ว")
    
    payload = data.model_dump(mode="json")
    res = supabase.table("products").insert(payload).execute()
    rows = cast(List[Dict[str, Any]], res.data or [])
    if not rows:
        raise HTTPException(status_code=500, detail="ไม่สามารถบันทึกสินค้าได้")
    return rows[0]

def update_product_admin(product_id: str, data: AdminUpdateProductRequest) -> Dict[str, Any]:
    update_data = {k: v for k, v in data.model_dump(mode="json").items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail="ไม่มีข้อมูลที่ต้องการอัปเดต")
    
    # หากมีการเปลี่ยน image_url ใหม่ ให้ค้นหาภาพเดิมแล้วลบทิ้ง
    if "image_url" in update_data:
        curr_res = supabase.table("products").select("image_url").eq("id", product_id).execute()
        curr_rows = cast(List[Dict[str, Any]], curr_res.data or [])
        if curr_rows and curr_rows[0].get("image_url"):
            old_url = str(curr_rows[0]["image_url"])
            if old_url != update_data.get("image_url"):
                delete_storage_image_by_url(old_url, "products")

    res = supabase.table("products").update(update_data).eq("id", product_id).execute()
    rows = cast(List[Dict[str, Any]], res.data or [])
    if not rows:
        raise HTTPException(status_code=404, detail="ไม่พบสินค้า")
    return rows[0]

def toggle_product_availability(product_id: str) -> Dict[str, Any]:
    current = supabase.table("products").select("is_available").eq("id", product_id).execute()
    rows = cast(List[Dict[str, Any]], current.data or [])
    if not rows:
        raise HTTPException(status_code=404, detail="ไม่พบสินค้า")
    new_val = not rows[0].get("is_available", True)
    res = supabase.table("products").update({"is_available": new_val}).eq("id", product_id).execute()
    return cast(List[Dict[str, Any]], res.data or [])[0]

def delete_product_admin(product_id: str) -> Dict[str, Any]:
    # ดึงข้อมูลภาพของสินค้าก่อน เพื่อเตรียมลบออกจาก Storage
    prod_res = supabase.table("products").select("image_url").eq("id", product_id).execute()
    prod_rows = cast(List[Dict[str, Any]], prod_res.data or [])
    if prod_rows and prod_rows[0].get("image_url"):
        delete_storage_image_by_url(str(prod_rows[0]["image_url"]), "products")

    # ตรวจสอบว่าสินค้ามีใน order_items หรือไม่ เพื่อป้องกัน Foreign Key Error
    items = supabase.table("order_items").select("id").eq("product_id", product_id).limit(1).execute()
    if items.data:
        # หากมีประวัติคำสั่งซื้อ ให้ใช้วิธีปิดการขายแทนการลบแถว
        supabase.table("products").update({"is_available": False}).eq("id", product_id).execute()
        return {"status": "soft_deleted", "message": "สินค้ามีประวัติสั่งซื้อ จึงปิดการขายแทนการลบ"}
    
    res = supabase.table("products").delete().eq("id", product_id).execute()
    return {"status": "deleted", "id": product_id}

# --- PROMOTIONS ---
def fetch_all_promotions_admin() -> List[Dict[str, Any]]:
    res = supabase.table("promotions").select("*").order("created_at", desc=True).execute()
    return cast(List[Dict[str, Any]], res.data or [])

def create_promotion_admin(data: AdminCreatePromoRequest) -> Dict[str, Any]:
    code_upper = data.code.strip().upper()
    existing = supabase.table("promotions").select("id").eq("code", code_upper).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail=f"โค้ดโปรโมชั่น '{code_upper}' มีอยู่ในระบบแล้ว")
    
    payload = data.model_dump(mode="json")
    payload["code"] = code_upper
    res = supabase.table("promotions").insert(payload).execute()
    rows = cast(List[Dict[str, Any]], res.data or [])
    if not rows:
        raise HTTPException(status_code=500, detail="ไม่สามารถบันทึกโปรโมชั่นได้")
    return rows[0]

def toggle_promotion_active(promo_id: str) -> Dict[str, Any]:
    current = supabase.table("promotions").select("is_active").eq("id", promo_id).execute()
    rows = cast(List[Dict[str, Any]], current.data or [])
    if not rows:
        raise HTTPException(status_code=404, detail="ไม่พบโปรโมชั่น")
    new_val = not rows[0].get("is_active", True)
    res = supabase.table("promotions").update({"is_active": new_val}).eq("id", promo_id).execute()
    return cast(List[Dict[str, Any]], res.data or [])[0]

def delete_promotion_admin(promo_id: str) -> Dict[str, Any]:
    # ลบรูปแบนเนอร์ออกจาก Storage ก่อนลบข้อมูลโปรโมชั่น
    prod_res = supabase.table("promotions").select("banner_image_url").eq("id", promo_id).execute()
    prod_rows = cast(List[Dict[str, Any]], prod_res.data or [])
    if prod_rows and prod_rows[0].get("banner_image_url"):
        delete_storage_image_by_url(str(prod_rows[0]["banner_image_url"]), "promotions")

    res = supabase.table("promotions").delete().eq("id", promo_id).execute()
    return {"status": "deleted", "id": promo_id}