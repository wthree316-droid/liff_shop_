from core.config import settings
from modules.webhook.notifications.push_service import send_push_message

async def notify_admins_new_slip(order_id: str, grand_total: float, slip_url: str):
    """แจ้งเตือนกลุ่มผู้ดูแลระบบเมื่อมีลูกค้าแนบสลิปเข้ามาใหม่"""
    admin_ids = [uid.strip() for uid in settings.ADMIN_LINE_USER_IDS.split(",") if uid.strip()]
    if not admin_ids:
        return

    order_short = order_id[:8]
    text_msg = (
        f"🔔 [แจ้งเตือนแอดมิน] มีสลิปใหม่!\n"
        f"คำสั่งซื้อ: #{order_short}\n"
        f"ยอดชำระ: ฿{grand_total:.2f}\n"
        f"สามารถเข้าดูสลิปและกดยืนยันได้ที่หน้า Admin Dashboard ครับ"
    )

    for admin_id in admin_ids:
        await send_push_message(admin_id, [{"type": "text", "text": text_msg}])

async def notify_customer_shipping(user_id: str, order_id: str, tracking_number: str):
    """แจ้งเตือนลูกค้าเมื่อสินค้าถูกจัดส่งพร้อมเลขพัสดุ"""
    if not user_id:
        return
    text_msg = (
        f"📦 สินค้าของคุณถูกจัดส่งเรียบร้อยแล้ว!\n"
        f"คำสั่งซื้อ: #{order_id[:8]}\n"
        f"หมายเลขพัสดุ: {tracking_number}\n"
        f"ขอบคุณที่อุดหนุน Artisan Tea ครับ 🍵"
    )
    await send_push_message(user_id, [{"type": "text", "text": text_msg}])