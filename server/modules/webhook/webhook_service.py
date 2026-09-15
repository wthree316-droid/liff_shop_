import uuid
import httpx
from typing import Optional, Dict, Any, List, cast
from core.database import supabase
from core.config import settings

LINE_DATA_API_BASE = "https://api-data.line.me/v2/bot/message"
LINE_API_BASE = "https://api.line.me/v2/bot"

async def download_line_image(message_id: str) -> bytes:
    """ดาวน์โหลดไฟล์ภาพจาก LINE Data Server"""
    url = f"{LINE_DATA_API_BASE}/{message_id}/content"
    headers = {"Authorization": f"Bearer {settings.LINE_CHANNEL_ACCESS_TOKEN}"}

    async with httpx.AsyncClient() as client:
        res = await client.get(url, headers=headers)
        if res.status_code != 200:
            raise Exception(f"Failed to fetch image from LINE: {res.status_code}")
        return res.content

def upload_slip_to_storage(image_bytes: bytes, order_id: str) -> str:
    """อัปโหลดสลิปเข้า Storage Bucket 'slips' โดยตรง"""
    filename = f"{order_id}_{uuid.uuid4().hex[:8]}.jpg"
    
    supabase.storage.from_("slips").upload(
        path=filename,
        file=image_bytes,
        file_options={"content-type": "image/jpeg"}
    )
    return supabase.storage.from_("slips").get_public_url(filename)

def find_pending_order(line_user_id: str) -> Optional[Dict[str, Any]]:
    """ค้นหาออเดอร์ล่าสุดของลูกค้ารายนี้ที่รอชำระเงินอยู่"""
    res = (
        supabase.table("orders")
        .select("*")
        .eq("line_user_id", line_user_id)
        .eq("status", "AWAITING_PAYMENT")
        .order("created_at", desc=True)
        .limit(1)
        .execute()
    )
    orders = cast(List[Dict[str, Any]], res.data or [])
    return orders[0] if orders else None

def update_order_slip(order_id: str, slip_url: str):
    """ผูกรูปสลิปและปรับสถานะออเดอร์เป็น PAYMENT_SUBMITTED"""
    supabase.table("orders").update({
        "status": "PAYMENT_SUBMITTED",
        "slip_image_url": slip_url
    }).eq("id", order_id).execute()

async def send_reply_message(reply_token: str, text: str):
    """ส่งข้อความตอบกลับหาลูกค้าผ่าน Reply Token"""
    url = f"{LINE_API_BASE}/message/reply"
    headers = {
        "Authorization": f"Bearer {settings.LINE_CHANNEL_ACCESS_TOKEN}",
        "Content-Type": "application/json"
    }
    payload = {
        "replyToken": reply_token,
        "messages": [{"type": "text", "text": text}]
    }
    async with httpx.AsyncClient() as client:
        await client.post(url, headers=headers, json=payload)

async def link_user_rich_menu(user_id: str, menu_id: str):
    """ผูก Rich Menu พิเศษเฉพาะบุคคล"""
    url = f"{LINE_API_BASE}/user/{user_id}/richmenu/{menu_id}"
    headers = {"Authorization": f"Bearer {settings.LINE_CHANNEL_ACCESS_TOKEN}"}
    async with httpx.AsyncClient() as client:
        await client.post(url, headers=headers)

async def unlink_user_rich_menu(user_id: str):
    """ปลด Rich Menu พิเศษ เพื่อกลับไปใช้เมนูลูกค้า (Default)"""
    url = f"{LINE_API_BASE}/user/{user_id}/richmenu"
    headers = {"Authorization": f"Bearer {settings.LINE_CHANNEL_ACCESS_TOKEN}"}
    async with httpx.AsyncClient() as client:
        await client.delete(url, headers=headers)