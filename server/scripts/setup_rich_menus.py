import os
import sys
import httpx

# ดึง Config จาก core/config.py
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from core.config import settings

LINE_API_BASE = "https://api.line.me/v2/bot"
HEADERS = {
    "Authorization": f"Bearer {settings.LINE_CHANNEL_ACCESS_TOKEN}",
    "Content-Type": "application/json"
}

# 1. โครงสร้างเมนูลูกค้า (ขนาดมาตรฐาน 2500 x 1686 px แบ่ง 3 โซน)
CUSTOMER_MENU_PAYLOAD = {
    "size": {"width": 2500, "height": 1686},
    "selected": True,
    "name": "Customer Storefront Menu",
    "chatBarText": "สั่งซื้อออนไลน์",
    "areas": [
        # ด้านบนใหญ่: ปุ่มเปิด LIFF สั่งซื้อสินค้า
        {
            "bounds": {"x": 0, "y": 0, "width": 2500, "height": 843},
            "action": {
                "type": "uri",
                "label": "สั่งซื้อสินค้า",
                "uri": f"https://liff.line.me/{settings.LINE_CUSTOMER_LIFF_ID}"
            }
        },
        # ขวาบน: เช็กสถานะคำสั่งซื้อ
        {
            "bounds": {"x": 0, "y": 843, "width": 1248, "height": 843},
            "action": {
                "type": "message",
                "label": "เช็กสถานะ",
                "text": "เช็กสถานะออเดอร์"
            }
        },
        # ขวาล่าง:
        {
            "bounds": {"x": 1254, "y": 843, "width": 1248, "height": 843},
            "action": {
                "type": "message",
                "label": "ติดตามพัสดุ",
                "text": "พัสดุ"
            }
        }
    ]
}

# 2. โครงสร้างเมนูแอดมิน (ขนาด 2500 x 1686 px)
ADMIN_MENU_PAYLOAD = {
    "size": {"width": 2500, "height": 1686},
    "selected": True,
    "name": "Admin Management Menu",
    "chatBarText": "เมนูแอดมิน",
    "areas": [
        # ฝั่งซ้ายใหญ่: เปิด LIFF Admin Portal (ใช้ Admin LIFF ID หรือ URL หน้าแอดมิน)
        {
            "bounds": {"x": 0, "y": 0, "width": 1666, "height": 1686},
            "action": {
                "type": "uri",
                "label": "Admin Dashboard",
                "uri": f"https://liff.line.me/{settings.LINE_ADMIN_LIFF_ID}"
            }
        },
        # ขวาบน: ดูสรุปออเดอร์รอจัดส่ง
        {
            "bounds": {"x": 1667, "y": 0, "width": 833, "height": 843},
            "action": {
                "type": "message",
                "label": "ยอดค้างส่ง",
                "text": "#admin_pending_orders"
            }
        },
        # ขวาล่าง: สลับกลับเป็นเมนูลูกค้า
        {
            "bounds": {"x": 1667, "y": 844, "width": 833, "height": 842},
            "action": {
                "type": "message",
                "label": "สลับเป็นเมนูลูกค้า",
                "text": "#switch_to_customer"
            }
        }
    ]
}

def setup_menus():
    with httpx.Client() as client:
        # 1. สร้าง Customer Menu
        res_cust = client.post(f"{LINE_API_BASE}/richmenu", headers=HEADERS, json=CUSTOMER_MENU_PAYLOAD)
        if res_cust.status_code != 200:
            print("สร้าง Customer Menu ล้มเหลว:", res_cust.text)
            return
        cust_menu_id = res_cust.json()["richMenuId"]
        print(f"✓ สร้าง Customer Menu สำเร็จ: {cust_menu_id}")

        # 2. สร้าง Admin Menu
        res_adm = client.post(f"{LINE_API_BASE}/richmenu", headers=HEADERS, json=ADMIN_MENU_PAYLOAD)
        if res_adm.status_code != 200:
            print("สร้าง Admin Menu ล้มเหลว:", res_adm.text)
            return
        adm_menu_id = res_adm.json()["richMenuId"]
        print(f"✓ สร้าง Admin Menu สำเร็จ: {adm_menu_id}")

        # 3. กำหนด Customer Menu เป็น Default สำหรับทุกคน
        res_def = client.post(f"{LINE_API_BASE}/user/all/richmenu/{cust_menu_id}", headers=HEADERS)
        if res_def.status_code == 200:
            print("✓ ตั้งค่า Customer Menu เป็น Default สำเร็จ")

        print("\n--- สรุปคีย์ที่ต้องนำไปใส่ใน .env ---")
        print(f"LINE_CUSTOMER_RICH_MENU_ID={cust_menu_id}")
        print(f"LINE_ADMIN_RICH_MENU_ID={adm_menu_id}")

if __name__ == "__main__":
    setup_menus()