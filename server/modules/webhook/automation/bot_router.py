from typing import List, Dict, Any, cast
from core.config import settings
from core.database import supabase
from modules.webhook.webhook_service import link_user_rich_menu, unlink_user_rich_menu, send_reply_message
from modules.webhook.automation.faq_handler import handle_faq_query
from modules.webhook.automation.tracking_handler import handle_order_tracking

async def dispatch_text_message(user_id: str, reply_token: str, text: str):
    """คัดกรอง Intent ของข้อความแชทและส่งต่อไปยัง Handler ที่รับผิดชอบ"""
    msg = text.strip()
    admin_list = [uid.strip() for uid in settings.ADMIN_LINE_USER_IDS.split(",") if uid.strip()]
    is_admin = user_id in admin_list

    # 1. คำสั่งแอดมิน
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
        
        if msg in ["#manage_urls", "จัดการ URL"]:
            res = supabase.table("store_settings").select("key, value, description").in_("key", ["url_group", "url_facebook", "url_maps"]).execute()
            
            # ใช้ cast เพื่อระบุประเภทข้อมูลให้ Type Checker รู้ว่าเป็น List ของ Dict
            raw_data = cast(List[Dict[str, Any]], res.data or [])
            rows = {r["key"]: r for r in raw_data}
            
            label_map = [
                ("url_group", "กลุ่มร้านค้า", "group"),
                ("url_facebook", "แฟนเพจเฟซบุ๊ก", "facebook"),
                ("url_maps", "Google Maps", "maps")
            ]
            
            lines = ["🔗 การตั้งค่าลิงก์ปัจจุบัน:"]
            for key, label, alias in label_map:
                row_item = rows.get(key)
                val = row_item.get("value", "-") if row_item else "-"
                lines.append(f"\n• {label} ({alias}):\n  {val}")
                
            lines.append("\n✏️ วิธีแก้ไข พิมพ์คำสั่ง เช่น:\n/set group https://...")
            await send_reply_message(reply_token, "\n".join(lines))
            return

        # เพิ่มใน bot_router_4.py ภายใต้ if is_admin:
        if msg in ["#admin_help", "ช่วยเหลือ"]:
            help_text = (
                "📖 [คู่มือคำสั่งแอดมิน]\n\n"
                "1. #admin_pending_orders : ดูออเดอร์ค้างส่ง/รอตรวจสลิป\n"
                "2. #manage_urls : ดูและตรวจสอบลิงก์ทางผ่านทั้งหมด\n"
                "3. /set <group|facebook|maps> <URL> : เปลี่ยน URL ทางผ่านทันที\n"
                "4. #switch_to_customer : สลับเมนูกลับเป็นของลูกค้า\n"
                "5. #admin : สลับกลับมาใช้เมนูแอดมิน"
            )
            await send_reply_message(reply_token, help_text)
            return

    # 2. เช็กสถานะคำสั่งซื้อ
    if any(k in msg for k in ["เช็กสถานะ", "สถานะออเดอร์", "พัสดุ", "ติดตาม"]):
        reply = handle_order_tracking(user_id)
        await send_reply_message(reply_token, reply)
        return

    # 3. คำถาม FAQ ทั่วไป
    faq_reply = handle_faq_query(msg)
    if faq_reply:
        await send_reply_message(reply_token, faq_reply)
        return