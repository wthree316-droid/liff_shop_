import os
import sys
import httpx

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from core.config import settings

LINE_API_BASE = "https://api.line.me/v2/bot"
headers = {
    "Authorization": f"Bearer {settings.LINE_CHANNEL_ACCESS_TOKEN}"
}

menu_id = settings.LINE_CUSTOMER_RICH_MENU_ID

if not menu_id:
    print("✕ ไม่พบ LINE_CUSTOMER_RICH_MENU_ID ใน .env กรุณานำ ID มาใส่ก่อนครับ")
    sys.exit(1)

# สั่งให้เมนูนี้เป็น Default ของลูกค้าทุกคน
res = httpx.post(f"{LINE_API_BASE}/user/all/richmenu/{menu_id}", headers=headers)

if res.status_code == 200:
    print(f"✓ สำเร็จ! เปิดใช้งาน Customer Rich Menu [{menu_id}] เป็นค่าเริ่มต้นแล้ว")
else:
    print(f"✕ ล้มเหลว ({res.status_code}): {res.text}")