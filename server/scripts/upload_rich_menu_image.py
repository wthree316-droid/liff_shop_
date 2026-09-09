import os
import sys
import httpx

# โหลด Environment Variables จาก core/config.py
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from core.config import settings

HEADERS = {
    "Authorization": f"Bearer {settings.LINE_CHANNEL_ACCESS_TOKEN}",
}

def upload_image(client: httpx.Client, menu_id: str, image_filename: str):
    """ส่งไฟล์ภาพขึ้นไปผูกกับ Rich Menu ID บน LINE Server"""
    script_dir = os.path.dirname(os.path.abspath(__file__))
    image_path = os.path.join(script_dir, "assets", image_filename)

    if not os.path.exists(image_path):
        print(f"✕ ไม่พบไฟล์: {image_path}")
        return False

    if not menu_id:
        print(f"✕ ข้าม {image_filename}: ไม่พบ Rich Menu ID ใน .env")
        return False

    # ตรวจสอบประเภทไฟล์
    ext = image_filename.split(".")[-1].lower()
    content_type = "image/png" if ext == "png" else "image/jpeg"

    with open(image_path, "rb") as f:
        img_bytes = f.read()

    url = f"https://api-data.line.me/v2/bot/richmenu/{menu_id}/content"
    headers = {**HEADERS, "Content-Type": content_type}

    res = client.post(url, headers=headers, content=img_bytes)
    if res.status_code == 200:
        print(f"✓ อัปโหลด {image_filename} เข้า Menu ID [{menu_id}] สำเร็จ")
        return True
    else:
        print(f"✕ ล้มเหลว ({res.status_code}): {res.text}")
        return False

def main():
    print("--- กำลังเริ่มอัปโหลดภาพ Rich Menu ---")
    with httpx.Client() as client:
        # 1. อัปโหลดภาพเมนูลูกค้า
        upload_image(
            client, 
            settings.LINE_CUSTOMER_RICH_MENU_ID, 
            "customer_menu.png"
        )

        # 2. อัปโหลดภาพเมนูแอดมิน
        upload_image(
            client, 
            settings.LINE_ADMIN_RICH_MENU_ID, 
            "admin_menu.png"
        )
    print("--- เสร็จสิ้นขั้นตอนการอัปโหลด ---")

if __name__ == "__main__":
    main()