from typing import Optional
from core.database import supabase
from modules.webhook.automation.templates import MSG_BREW_GUIDE, make_shipping_info_msg

def handle_faq_query(text: str) -> Optional[str]:
    """ตรวจจับและตอบคำถามที่พบบ่อย (FAQ)"""
    msg = text.strip()

    if "วิธีชง" in msg or "ชงชา" in msg:
        return MSG_BREW_GUIDE

    if "ค่าส่ง" in msg or "ส่งฟรี" in msg:
        res = supabase.table("store_settings").select("key, value").execute()
        settings_map = {r["key"]: float(r["value"]) for r in (res.data or [])}
        shipping_fee = settings_map.get("shipping_fee", 40.0)
        free_limit = settings_map.get("free_shipping_threshold", 500.0)
        return make_shipping_info_msg(shipping_fee, free_limit)

    return None