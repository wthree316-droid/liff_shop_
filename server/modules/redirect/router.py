from fastapi import APIRouter, HTTPException, status
from fastapi.responses import RedirectResponse
from core.database import supabase
from typing import cast, List, Dict, Any

router = APIRouter(prefix="/r", tags=["Redirect Proxy"])

KEY_MAPPING = {
    "group": "url_group",
    "facebook": "url_facebook",
    "maps": "url_maps"
}

FALLBACK_URLS = {
    "group": "https://line.me",
    "facebook": "https://facebook.com",
    "maps": "https://maps.google.com"
}

@router.get("/{slug}")
async def redirect_to_target(slug: str):
    db_key = KEY_MAPPING.get(slug)
    if not db_key:
        raise HTTPException(status_code=404, detail="Link not found")

    res = supabase.table("store_settings").select("value").eq("key", db_key).execute()
    rows = cast(List[Dict[str, Any]], res.data or [])
    
    target_url = ""
    if rows and rows[0].get("value"):
        target_url = str(rows[0]["value"]).strip()
        
    if not target_url:
        target_url = FALLBACK_URLS.get(slug, "")

    if not target_url:
        raise HTTPException(status_code=404, detail="Target URL not configured")

    if not target_url.startswith(("http://", "https://")):
        target_url = f"https://{target_url}"

    return RedirectResponse(url=target_url, status_code=status.HTTP_307_TEMPORARY_REDIRECT)