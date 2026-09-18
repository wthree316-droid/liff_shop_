import os
import sys
import httpx

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from core.config import settings

LINE_API_BASE = "https://api.line.me/v2/bot"
HEADERS = {
    "Authorization": f"Bearer {settings.LINE_CHANNEL_ACCESS_TOKEN}",
    "Content-Type": "application/json"
}

# 1. โครงสร้างเมนูลูกค้า (ตรงตาม customer_menu.jpg)
CUSTOMER_MENU_PAYLOAD = {
    "size": {"width": 2500, "height": 1686},
    "selected": True,
    "name": "Customer Storefront Menu",
    "chatBarText": "สั่งซื้อออนไลน์",
    "areas": [
        # แถวบนซ้าย: ดูสินค้าออนไลน์ (เปิดเว็บ LIFF)
        {
            "bounds": {"x": 0, "y": 0, "width": 1666, "height": 843},
            "action": {
                "type": "uri",
                "label": "ดูสินค้าออนไลน์",
                "uri": f"https://liff.line.me/{settings.LINE_CUSTOMER_LIFF_ID}"
            }
        },
        # แถวบนขวา: กลุ่ม (ใส่ลิงก์ OpenChat / Line Square ตรงๆ)
        {
            "bounds": {"x": 1666, "y": 0, "width": 834, "height": 843},
            "action": {
                "type": "uri",
                "label": "เข้ากลุ่ม",
                "uri": f"{settings.CONTACT_URL}/r/group"
            }
        },
        # แถวล่างซ้าย: Order สั่งซื้อ (ดูประวัติ/แจ้งสลิป)
        {
            "bounds": {"x": 0, "y": 843, "width": 833, "height": 843},
            "action": {
                "type": "message",
                "label": "ติดตามพัสดุ",
                "text": "พัสดุ"
            }
        },
        # แถวล่างกลาง: แฟนเพจ Facebook (ใส่ลิงก์เพจร้านค้า)
        {
            "bounds": {"x": 833, "y": 843, "width": 834, "height": 843},
            "action": {
                "type": "uri",
                "label": "Facebook Page",
                "uri": f"{settings.CONTACT_URL}/r/facebook"
            }
        },
        # แถวล่างขวา: แผนที่ Google Maps (ใส่ลิงก์แชร์จาก Google Maps)
        {
            "bounds": {"x": 1667, "y": 843, "width": 833, "height": 843},
            "action": {
                "type": "uri",
                "label": "Google Maps",
                "uri": f"{settings.CONTACT_URL}/r/maps"
            }
        }
    ]
}

# 2. โครงสร้างเมนูแอดมิน (ตรงตาม admin_menu.jpg)
ADMIN_MENU_PAYLOAD = {
    "size": {"width": 2500, "height": 1686},
    "selected": True,
    "name": "Admin Management Menu",
    "chatBarText": "เมนูแอดมิน",
    "areas": [
        # แถวบนเต็ม: จัดการร้าน (เปิด LIFF แอดมิน)
        {
            "bounds": {"x": 0, "y": 0, "width": 2500, "height": 843},
            "action": {
                "type": "uri",
                "label": "จัดการร้าน",
                "uri": f"https://liff.line.me/{settings.LINE_ADMIN_LIFF_ID}"
            }
        },
        # แถวล่างซ้าย: เมนูลูกค้า (สลับกลับไปเป็นเมนูลูกค้า)
        {
            "bounds": {"x": 0, "y": 843, "width": 833, "height": 843},
            "action": {
                "type": "message",
                "label": "เมนูลูกค้า",
                "text": "#switch_to_customer"
            }
        },
        # แถวล่างกลาง: ช่วยเหลือ (คู่มือการใช้งานบอท/แอดมิน)
        {
            "bounds": {"x": 833, "y": 843, "width": 834, "height": 843},
            "action": {
                "type": "message",
                "label": "ช่วยเหลือ",
                "text": "#admin_help"
            }
        },
        # แถวล่างขวา: จัดการ URL (แก้ไขลิงก์กลุ่ม, เพจ, แผนที่)
        {
            "bounds": {"x": 1667, "y": 843, "width": 833, "height": 843},
            "action": {
                "type": "message",
                "label": "จัดการ URL",
                "text": "#manage_urls"
            }
        }
    ]
}

def upload_menu_image(client: httpx.Client, menu_id: str, image_path: str):
    """อัปโหลดรูปภาพ JPG เข้า Rich Menu ID"""
    if not os.path.exists(image_path):
        print(f"คำเตือน: ไม่พบไฟล์รูป {image_path}")
        return
    with open(image_path, "rb") as f:
        img_bytes = f.read()
    res = client.post(
        f"https://api-data.line.me/v2/bot/richmenu/{menu_id}/content",
        headers={
            "Authorization": f"Bearer {settings.LINE_CHANNEL_ACCESS_TOKEN}",
            "Content-Type": "image/jpeg"
        },
        content=img_bytes
    )
    if res.status_code == 200:
        print(f"✓ อัปโหลดรูปสำเร็จ: {image_path}")
    else:
        print(f"อัปโหลดรูปภาพล้มเหลว ({image_path}):", res.text)

def setup_menus():
    with httpx.Client() as client:
        # 1. สร้าง Customer Menu
        res_cust = client.post(f"{LINE_API_BASE}/richmenu", headers=HEADERS, json=CUSTOMER_MENU_PAYLOAD)
        if res_cust.status_code != 200:
            print("สร้าง Customer Menu ล้มเหลว:", res_cust.text)
            return
        cust_menu_id = res_cust.json()["richMenuId"]
        print(f"✓ สร้าง Customer Menu สำเร็จ: {cust_menu_id}")
        upload_menu_image(client, cust_menu_id, "customer_menu.jpg")

        # 2. สร้าง Admin Menu
        res_adm = client.post(f"{LINE_API_BASE}/richmenu", headers=HEADERS, json=ADMIN_MENU_PAYLOAD)
        if res_adm.status_code != 200:
            print("สร้าง Admin Menu ล้มเหลว:", res_adm.text)
            return
        adm_menu_id = res_adm.json()["richMenuId"]
        print(f"✓ สร้าง Admin Menu สำเร็จ: {adm_menu_id}")
        upload_menu_image(client, adm_menu_id, "admin_menu.jpg")

        # 3. กำหนด Customer Menu เป็น Default
        res_def = client.post(f"{LINE_API_BASE}/user/all/richmenu/{cust_menu_id}", headers=HEADERS)
        if res_def.status_code == 200:
            print("✓ ตั้งค่า Customer Menu เป็น Default สำเร็จ")

        print("\n--- นำคีย์เหล่านี้ไปใส่ในไฟล์ .env ---")
        print(f"LINE_CUSTOMER_RICH_MENU_ID={cust_menu_id}")
        print(f"LINE_ADMIN_RICH_MENU_ID={adm_menu_id}")

if __name__ == "__main__":
    setup_menus()