from typing import Any, Dict, List, cast
from core.database import supabase

def get_available_products() -> List[Dict[str, Any]]:
    response = supabase.table("products").select("*").eq("is_available", True).execute()
    return cast(List[Dict[str, Any]], response.data or [])

