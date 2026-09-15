import httpx
from typing import List, Dict, Any, Union
from core.config import settings

LINE_PUSH_URL = "https://api.line.me/v2/bot/message/push"

async def send_push_message(to_user_id: str, messages: List[Dict[str, Any]]) -> bool:
    """ส่ง Push Message หาผู้ใช้ปลายทางโดยตรง (ไม่ต้องพึ่ง Reply Token)"""
    if not settings.LINE_CHANNEL_ACCESS_TOKEN or not to_user_id:
        return False

    headers = {
        "Authorization": f"Bearer {settings.LINE_CHANNEL_ACCESS_TOKEN}",
        "Content-Type": "application/json"
    }
    payload = {
        "to": to_user_id,
        "messages": messages
    }
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.post(LINE_PUSH_URL, headers=headers, json=payload)
            return resp.status_code == 200
    except Exception as e:
        print(f"Error sending push message: {e}")
        return False