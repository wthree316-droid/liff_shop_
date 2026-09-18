from typing import Optional, List, Dict, Any, cast
from core.database import supabase
from modules.webhook.automation.templates import make_shipping_info_msg

def handle_faq_query(text: str) -> Optional[str]:
    """ตรวจจับและตอบคำถามที่พบบ่อย (FAQ)"""
    msg = text.strip()

    if "ค่าส่ง" in msg or "ส่งฟรี" in msg:
        res = supabase.table("store_settings").select("key, value").execute()
        rows = cast(List[Dict[str, Any]], res.data or [])
        settings_map = {str(r["key"]): float(r["value"]) for r in rows}
        shipping_fee = settings_map.get("shipping_fee", 40.0)
        free_limit = settings_map.get("free_shipping_threshold", 500.0)
        return make_shipping_info_msg(shipping_fee, free_limit)

    return None