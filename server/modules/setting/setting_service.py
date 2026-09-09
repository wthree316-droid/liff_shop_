from typing import Any, Dict, List, cast
from fastapi import HTTPException
from core.database import supabase
from modules.setting.schemas import UpdateSettingRequest

def fetch_all_settings() -> Dict[str, float]:
    res = supabase.table("store_settings").select("key, value").execute()
    rows = cast(List[Dict[str, Any]], res.data or [])
    return {str(row["key"]): float(row["value"]) for row in rows}

def fetch_settings_details() -> List[Dict[str, Any]]:
    res = supabase.table("store_settings").select("*").execute()
    return cast(List[Dict[str, Any]], res.data or [])

def update_setting_value(key: str, data: UpdateSettingRequest) -> Dict[str, Any]:
    res = supabase.table("store_settings").update({"value": data.value}).eq("key", key).execute()
    rows = cast(List[Dict[str, Any]], res.data or [])
    if not rows:
        raise HTTPException(status_code=404, detail=f"ไม่พบคีย์การตั้งค่า '{key}'")
    return rows[0]