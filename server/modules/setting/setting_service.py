from typing import Any, Dict, List, cast
from fastapi import HTTPException
from core.database import supabase
from core.storage import delete_storage_image_by_url
from modules.setting.schemas import UpdateSettingRequest

def parse_setting_val(val: Any) -> Any:
    if val is None:
        return ""
    val_str = str(val).strip().strip('"')
    try:
        if "." in val_str:
            return float(val_str)
        return int(val_str)
    except ValueError:
        return val_str

def fetch_all_settings() -> Dict[str, Any]:
    res = supabase.table("store_settings").select("key, value").execute()
    rows = cast(List[Dict[str, Any]], res.data or [])
    return {str(row["key"]): parse_setting_val(row["value"]) for row in rows}

def fetch_settings_details() -> List[Dict[str, Any]]:
    res = supabase.table("store_settings").select("*").execute()
    rows = cast(List[Dict[str, Any]], res.data or [])
    for r in rows:
        r["value"] = parse_setting_val(r["value"])
    return rows

def update_setting_value(key: str, data: UpdateSettingRequest) -> Dict[str, Any]:
    val_to_save = str(data.value).strip() if data.value is not None else ""

    # ตรวจสอบและลบรูป QR Code เก่าเมื่อมีการอัปเดต payment_qr_url
    if key == "payment_qr_url":
        old_res = supabase.table("store_settings").select("value").eq("key", key).execute()
        old_rows = cast(List[Dict[str, Any]], old_res.data or [])
        if old_rows and old_rows[0].get("value"):
            old_url = str(old_rows[0]["value"]).strip().strip('"')
            if old_url and old_url != val_to_save:
                # ลบรูปเก่าออกจาก bucket products (หรือ bucket ที่ใช้อัปโหลด)
                delete_storage_image_by_url(old_url, "products")

    res = supabase.table("store_settings").update({"value": val_to_save}).eq("key", key).execute()
    rows = cast(List[Dict[str, Any]], res.data or [])
    if not rows:
        raise HTTPException(status_code=404, detail=f"ไม่พบคีย์การตั้งค่า '{key}'")
    row = rows[0]
    row["value"] = parse_setting_val(row["value"])
    return row