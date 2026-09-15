from typing import Optional, List, Dict, Any, cast
from core.database import supabase
from modules.webhook.automation.templates import MSG_UNKNOWN_ORDER

STATUS_MAP = {
    "AWAITING_PAYMENT": "รอการชำระเงิน (ยังไม่ได้รับสลิป)",
    "PAYMENT_SUBMITTED": "ได้รับสลิปแล้ว กำลังรอร้านตรวจสอบยอดเงิน",
    "CONFIRMED": "ยืนยันยอดเงินแล้ว กำลังจัดเตรียมสินค้า",
    "SHIPPED": "จัดส่งเรียบร้อยแล้ว",
    "CANCELLED": "คำสั่งซื้อถูกยกเลิก"
}

def handle_order_tracking(user_id: str) -> str:
    """ตรวจสอบสถานะออเดอร์ล่าสุดของลูกค้า"""
    res = (
        supabase.table("orders")
        .select("*")
        .eq("line_user_id", user_id)
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    orders = cast(List[Dict[str, Any]], res.data or [])
    if not orders:
        return MSG_UNKNOWN_ORDER

    o = orders[0]
    status_text = STATUS_MAP.get(o["status"], o["status"])
    if o["status"] == "SHIPPED":
        tracking = o.get("tracking_number") or "ไม่มีเลขพัสดุ"
        status_text = f"จัดส่งเรียบร้อยแล้ว 📦 เลขพัสดุ: {tracking}"

    return (
        f"📦 ออเดอร์ล่าสุด #{str(o['id'])[:8]}\n"
        f"สถานะ: {status_text}\n"
        f"ยอดชำระ: ฿{float(o.get('grand_total', 0.0)):.2f}"
    )