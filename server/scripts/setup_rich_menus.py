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

CUSTOMER_MENU_PAYLOAD = {
    "size": {"width": 2500, "height": 1686},
    "selected": True,
    "name": "Customer Storefront Menu",
    "chatBarText": "สั่งซื้อออนไลน์",
    "areas": [
        {"bounds": {"x": 0, "y": 0, "width": 1666, "height": 843}, "action": {"type": "uri", "label": "ดูสินค้าออนไลน์", "uri": f"https://liff.line.me/{settings.LINE_CUSTOMER_LIFF_ID}"}},
        {"bounds": {"x": 1666, "y": 0, "width": 834, "height": 843}, "action": {"type": "uri", "label": "เข้ากลุ่ม", "uri": f"{settings.CONTACT_URL}/r/group"}},
        {"bounds": {"x": 0, "y": 843, "width": 833, "height": 843}, "action": {"type": "message", "label": "ติดตามพัสดุ", "text": "พัสดุ"}},
        {"bounds": {"x": 833, "y": 843, "width": 834, "height": 843}, "action": {"type": "uri", "label": "Facebook Page", "uri": f"{settings.CONTACT_URL}/r/facebook"}},
        {"bounds": {"x": 1667, "y": 843, "width": 833, "height": 843}, "action": {"type": "uri", "label": "Google Maps", "uri": f"{settings.CONTACT_URL}/r/maps"}}
    ]
}

ADMIN_MENU_PAYLOAD = {
    "size": {"width": 2500, "height": 1686},
    "selected": True,
    "name": "Admin Management Menu",
    "chatBarText": "เมนูแอดมิน",
    "areas": [
        {"bounds": {"x": 0, "y": 0, "width": 2500, "height": 843}, "action": {"type": "uri", "label": "จัดการร้าน", "uri": f"https://liff.line.me/{settings.LINE_ADMIN_LIFF_ID}"}},
        {"bounds": {"x": 0, "y": 843, "width": 833, "height": 843}, "action": {"type": "message", "label": "เมนูลูกค้า", "text": "#switch_to_customer"}},
        {"bounds": {"x": 833, "y": 843, "width": 834, "height": 843}, "action": {"type": "message", "label": "ช่วยเหลือ", "text": "#admin_help"}},
        {"bounds": {"x": 1667, "y": 843, "width": 833, "height": 843}, "action": {"type": "message", "label": "จัดการ URL", "text": "#manage_urls"}}
    ]
}

def resolve_image_path(filename: str) -> str:
    """หา Path ของรูปภาพ (ตรวจทั้งในไดเรกทอรีเดียวกัน และในโฟลเดอร์ assets/)"""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    path_direct = os.path.join(script_dir, filename)
    path_assets = os.path.join(script_dir, "assets", filename)
    if os.path.exists(path_direct):
        return path_direct
    if os.path.exists(path_assets):
        return path_assets
    return ""

def upload_menu_image(client: httpx.Client, menu_id: str, image_filename: str):
    image_path = resolve_image_path(image_filename)
    if not image_path:
        print(f"✕ คำเตือน: หาไฟล์รูป {image_filename} ไม่เจอ (ตรวจสอบทั้งโฟลเดอร์นี้และ assets/)")
        return False
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
        print(f"✓ อัปโหลดรูปสำเร็จ: {image_filename}")
        return True
    print(f"✕ อัปโหลดรูปล้มเหลว ({image_filename}):", res.text)
    return False

def setup_menus():
    with httpx.Client() as client:
        # 1. สร้าง Customer Menu
        res_cust = client.post(f"{LINE_API_BASE}/richmenu", headers=HEADERS, json=CUSTOMER_MENU_PAYLOAD)
        if res_cust.status_code != 200:
            print("✕ สร้าง Customer Menu ล้มเหลว:", res_cust.text)
            return
        cust_menu_id = res_cust.json()["richMenuId"]
        print(f"✓ สร้าง Customer Menu สำเร็จ: {cust_menu_id}")
        upload_menu_image(client, cust_menu_id, "customer_menu.jpg")

        # 2. สร้าง Admin Menu
        res_adm = client.post(f"{LINE_API_BASE}/richmenu", headers=HEADERS, json=ADMIN_MENU_PAYLOAD)
        if res_adm.status_code != 200:
            print("✕ สร้าง Admin Menu ล้มเหลว:", res_adm.text)
            return
        adm_menu_id = res_adm.json()["richMenuId"]
        print(f"✓ สร้าง Admin Menu สำเร็จ: {adm_menu_id}")
        upload_menu_image(client, adm_menu_id, "admin_menu.jpg")

        # 3. ตั้งค่าเป็น Default ทันที
        res_def = client.post(f"{LINE_API_BASE}/user/all/richmenu/{cust_menu_id}", headers=HEADERS)
        if res_def.status_code == 200:
            print("✓ ตั้งค่า Customer Menu เป็น Default สำเร็จ")

        print("\n--- อัปเดต 2 ค่านี้ลงในไฟล์ .env ---")
        print(f"LINE_CUSTOMER_RICH_MENU_ID={cust_menu_id}")
        print(f"LINE_ADMIN_RICH_MENU_ID={adm_menu_id}")

if __name__ == "__main__":
    setup_menus()