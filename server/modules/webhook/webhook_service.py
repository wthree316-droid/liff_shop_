import uuid
import httpx
from typing import Optional, Dict, Any, List, cast
from core.database import supabase
from core.config import settings

LINE_DATA_API_BASE = "https://api-data.line.me/v2/bot/message"
LINE_API_BASE = "https://api.line.me/v2/bot"

# ==========================================
# 1. จัดการรูปภาพและสลิปโอนเงิน (Slip Processing)
# ==========================================
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

# ==========================================
# 2. ควบคุม Dynamic Rich Menu (Persona Switcher)
# ==========================================
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

# ==========================================
# 3. ตรวจจับและตอบกลับข้อความ (Text & FAQ Bot)
# ==========================================
async def process_text_message(user_id: str, reply_token: str, text: str):
    msg = text.strip()
    admin_list = [uid.strip() for uid in settings.ADMIN_LINE_USER_IDS.split(",") if uid.strip()]
    is_admin = user_id in admin_list

    # --- ส่วนคำสั่งแอดมิน (Admin Commands) ---
    if is_admin:
        if msg in ["#admin", "admin", "#admin_menu"]:
            if settings.LINE_ADMIN_RICH_MENU_ID:
                await link_user_rich_menu(user_id, settings.LINE_ADMIN_RICH_MENU_ID)
                await send_reply_message(reply_token, "🛠️ สลับแถบเมนูด้านล่างเป็น [โหมดผู้ดูแลระบบ] เรียบร้อยครับ")
                return

        if msg == "#switch_to_customer":
            await unlink_user_rich_menu(user_id)
            await send_reply_message(reply_token, "🍵 สลับแถบเมนูกลับเป็น [โหมดลูกค้า] เรียบร้อยครับ")
            return

        if msg == "#admin_pending_orders":
            res = supabase.table("orders").select("id, customer_name, grand_total, status").in_("status", ["PAYMENT_SUBMITTED", "CONFIRMED"]).execute()
            rows = cast(List[Dict[str, Any]], res.data or [])
            if not rows:
                await send_reply_message(reply_token, "📦 ตอนนี้ไม่มีออเดอร์ค้างส่งหรือรอตรวจสลิปครับ")
            else:
                summary_lines = [f"• #{r['id'][:6]} ({r['customer_name']}) - ฿{float(r['grand_total']):.2f} [{r['status']}]" for r in rows]
                await send_reply_message(reply_token, "📋 ออเดอร์ที่ต้องจัดการ:\n" + "\n".join(summary_lines))
            return

    # --- ส่วนลูกค้าทั่วไป (Customer FAQ & Tracking) ---
    if "เช็กสถานะ" in msg or "สถานะออเดอร์" in msg or "พัสดุ" in msg:
        # ค้นหาออเดอร์ล่าสุดของลูกค้า
        res = supabase.table("orders").select("*").eq("line_user_id", user_id).order("created_at", desc=True).limit(1).execute()
        orders = cast(List[Dict[str, Any]], res.data or [])
        if not orders:
            await send_reply_message(reply_token, "ยังไม่พบประวัติการสั่งซื้อของคุณลูกค้าในระบบครับ 🍵\nสามารถกดเลือกชมสินค้าผ่านเมนูหน้าร้านได้เลยครับ")
            return

        o = orders[0]
        status_map = {
            "AWAITING_PAYMENT": "รอการชำระเงิน (ยังไม่ได้รับสลิป)",
            "PAYMENT_SUBMITTED": "ได้รับสลิปแล้ว กำลังรอร้านตรวจสอบยอดเงิน",
            "CONFIRMED": "ยืนยันยอดเงินแล้ว กำลังจัดเตรียมสินค้า",
            "SHIPPED": f"จัดส่งเรียบร้อยแล้ว 📦 เลขพัสดุ: {o.get('tracking_number') or 'ไม่มีเลขพัสดุ'}",
            "CANCELLED": "คำสั่งซื้อถูกยกเลิก"
        }
        reply = (
            f"📦 ออเดอร์ล่าสุด #{str(o['id'])[:8]}\n"
            f"สถานะ: {status_map.get(o['status'], o['status'])}\n"
            f"ยอดชำระ: ฿{float(o['grand_total']):.2f}"
        )
        await send_reply_message(reply_token, reply)
        return

    if "วิธีชง" in msg or "ชงชา" in msg:
        reply = (
            "🍵 เคล็ดลับการชงใบชา Artisan:\n\n"
            "1. ชาเขียว/มัทฉะ: ใช้น้ำอุณหภูมิ 75-80°C แช่ใบชา 1-1.5 นาที เพื่อไม่ให้รสฝาด\n"
            "2. ชาอู่หลง: ใช้น้ำเดือด 90-95°C แช่ 45 วินาที สามารถชงซ้ำได้ 4-5 น้ำ\n"
            "3. ชาดำ: ใช้น้ำเดือดจัด 100°C แช่ 2-3 นาที กลิ่นจะหอมเข้มข้นที่สุดครับ"
        )
        await send_reply_message(reply_token, reply)
        return

    if "ค่าส่ง" in msg or "ส่งฟรี" in msg:
        res = supabase.table("store_settings").select("key, value").execute()
        settings_map = {r["key"]: float(r["value"]) for r in (res.data or [])}
        shipping_fee = settings_map.get("shipping_fee", 40.0)
        free_limit = settings_map.get("free_shipping_threshold", 500.0)
        reply = f"🚚 ข้อมูลการจัดส่ง:\n• ค่าจัดส่งมาตรฐาน: ฿{shipping_fee:.0f}\n• โปรโมชั่นส่งฟรี: เมื่อสั่งซื้อครบ ฿{free_limit:.0f} ขึ้นไปครับ ✨"
        await send_reply_message(reply_token, reply)
        return