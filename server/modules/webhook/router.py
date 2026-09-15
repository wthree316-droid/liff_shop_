import base64
import hashlib
import hmac
from typing import Optional
from fastapi import APIRouter, Request, Header, HTTPException, BackgroundTasks, status
from core.config import settings
from modules.webhook.webhook_service import (
    download_line_image,
    upload_slip_to_storage,
    find_pending_order,
    update_order_slip,
    send_reply_message
)
from modules.webhook.automation.bot_router import dispatch_text_message
from modules.webhook.notifications.order_alerts import notify_admins_new_slip

router = APIRouter(prefix="/webhook", tags=["LINE Webhook"])

def verify_line_signature(body: bytes, signature: Optional[str]) -> bool:
    if not settings.LINE_CHANNEL_SECRET or not signature:
        return False
    hash_calc = hmac.new(
        settings.LINE_CHANNEL_SECRET.encode("utf-8"),
        body,
        hashlib.sha256
    ).digest()
    return hmac.compare_digest(base64.b64encode(hash_calc).decode("utf-8"), signature)

async def handle_slip_event(event: dict):
    user_id = event.get("source", {}).get("userId")
    message = event.get("message", {})
    message_id = message.get("id")
    reply_token = event.get("replyToken")

    if not user_id or not message_id or not reply_token:
        return

    order = find_pending_order(user_id)
    if not order:
        await send_reply_message(
            reply_token,
            "ได้รับรูปภาพแล้วครับ แต่ไม่พบรายการสั่งซื้อที่รอชำระเงินอยู่ในระบบ หากต้องการสั่งซื้อสามารถกดเลือกสินค้าผ่านเมนูหน้าร้านได้เลยครับ 🍵"
        )
        return

    try:
        image_bytes = await download_line_image(message_id)
        order_id = str(order["id"])
        grand_total = float(order.get("grand_total", 0.0))

        slip_url = upload_slip_to_storage(image_bytes, order_id)
        update_order_slip(order_id, slip_url)

        order_id_short = order_id[:8]
        reply_text = (
            f"ได้รับหลักฐานการโอนเงินสำหรับคำสั่งซื้อ #{order_id_short} เรียบร้อยแล้วครับ! ✨\n\n"
            f"ยอดชำระ: ฿{grand_total:.2f}\n"
            "ทางร้านจะรีบตรวจสอบยอดเงินและเตรียมจัดส่งสินค้าให้โดยเร็วที่สุดครับ ขอบคุณครับ 🍵"
        )
        await send_reply_message(reply_token, reply_text)

        # ส่ง Push Notification ไปสะกิดแอดมินทันที
        await notify_admins_new_slip(order_id, grand_total, slip_url)
    except Exception as e:
        print(f"Error handling slip message: {e}")
        await send_reply_message(
            reply_token,
            "เกิดข้อผิดพลาดในการบันทึกรูปสลิป กรุณาลองส่งใหม่อีกครั้ง หรือติดต่อแอดมินครับ"
        )

async def handle_text_event(event: dict):
    user_id = event.get("source", {}).get("userId")
    reply_token = event.get("replyToken")
    text = event.get("message", {}).get("text", "")

    if user_id and reply_token and text:
        await dispatch_text_message(user_id, reply_token, text)

@router.post("/line", status_code=status.HTTP_200_OK)
async def line_webhook(
    request: Request,
    background_tasks: BackgroundTasks,
    x_line_signature: str = Header(None)
):
    body = await request.body()

    if not x_line_signature or not verify_line_signature(body, x_line_signature):
        raise HTTPException(status_code=400, detail="Invalid LINE Signature")

    payload = await request.json()
    events = payload.get("events", [])

    for event in events:
        if event.get("type") == "message":
            msg_type = event.get("message", {}).get("type")
            if msg_type == "image":
                background_tasks.add_task(handle_slip_event, event)
            elif msg_type == "text":
                background_tasks.add_task(handle_text_event, event)

    return {"status": "success"}