def make_text_message(text: str) -> dict:
    return {"type": "text", "text": text}

MSG_UNKNOWN_ORDER = "ยังไม่พบประวัติการสั่งซื้อของคุณลูกค้าในระบบครับ 🍵\nสามารถกดเลือกชมสินค้าผ่านเมนูหน้าร้านได้เลยครับ"

def make_shipping_info_msg(fee: float, threshold: float) -> str:
    return (
        f"🚚 ข้อมูลการจัดส่ง:\n"
        f"• ค่าจัดส่งมาตรฐาน: ฿{fee:.0f}\n"
        f"• โปรโมชั่นส่งฟรี: เมื่อสั่งซื้อครบ ฿{threshold:.0f} ขึ้นไปครับ ✨"
    )