import pytest
from fastapi.testclient import TestClient
from main import app

# ค้นหา Sub-application หรือใช้ Client หลัก
api_client = None
for route in getattr(app, "routes", []):
    if getattr(route, "path", "") == "/api" and hasattr(route, "app"):
        api_client = TestClient(route.app)
        break

# ถ้าไม่ได้แยก Sub-app ให้ใช้ client ปกติ
root_client = TestClient(app)

def api_request(method: str, path: str, **kwargs):
    """ส่ง request โดยลองทั้ง Sub-app client และ Root client (/api/...)"""
    clean_path = path if path.startswith("/") else f"/{path}"
    
    if api_client:
        res = api_client.request(method, clean_path, **kwargs)
        if res.status_code != 404:
            return res
            
    # ลองผ่าน Root app ด้วย /api นำหน้า
    res_root = root_client.request(method, f"/api{clean_path}", **kwargs)
    if res_root.status_code != 404:
        return res_root
        
    # ลองผ่าน Root app แบบไม่มี /api
    return root_client.request(method, clean_path, **kwargs)

def get_test_product():
    res = api_request("GET", "/catalog/products")
    assert res.status_code == 200, f"ดึงสินค้าล้มเหลว (Status: {res.status_code}, Body: {res.text})"
    data = res.json()
    products = data.get("products", data) if isinstance(data, dict) else data
    assert isinstance(products, list) and len(products) > 0, "ต้องมีสินค้าในระบบอย่างน้อย 1 รายการ"
    return products[0]

def test_store_settings_support_strings_and_numbers():
    """1. ทดสอบว่า Settings API รองรับทั้งข้อความ (ธนาคาร, QR) และตัวเลข (ค่าส่ง, COD)"""
    res = api_request("GET", "/settings")
    assert res.status_code == 200, f"ดึง settings ล้มเหลว (Status: {res.status_code}, Body: {res.text})"
    data = res.json().get("settings", {})

    assert "shipping_fee" in data
    assert "cod_deposit_fee" in data
    assert "bank_name" in data
    assert isinstance(data.get("bank_name"), str)

def test_order_creation_transfer_success():
    """2. ทดสอบสั่งซื้อแบบโอนเต็มจำนวน (TRANSFER)"""
    sample_product = get_test_product()
    is_weight = sample_product.get("type") == "BY_WEIGHT"
    weight_or_qty = 25 if is_weight else 1

    payload = {
        "customer": {
            "name": "ลูกค้า โอนเต็ม",
            "phone": "0891234567",
            "address": "123 สุขุมวิท กรุงเทพฯ",
            "note": "ส่งช่วงบ่าย"
        },
        "items": [
            {
                "product_id": sample_product["id"],
                "quantity_or_weight": weight_or_qty,
                "count": 1
            }
        ],
        "payment_method": "TRANSFER",
        "cod_consent": False
    }

    res = api_request("POST", "/orders", json=payload)
    assert res.status_code == 200, f"สั่งซื้อล้มเหลว (Status: {res.status_code}): {res.text}"
    order = res.json()
    assert order["payment_method"] == "TRANSFER"
    assert order["deposit_amount"] == order["grand_total"]
    assert order["remaining_cod_amount"] == 0.0

def test_order_creation_cod_without_consent_fails():
    """3. ทดสอบสั่งซื้อแบบ COD แต่ไม่ได้ติ๊กยินยอมข้อตกลง (ต้องติด 400 หรือ 422)"""
    sample_product = get_test_product()

    payload = {
        "customer": {
            "name": "ลูกค้า COD ไม่ยินยอม",
            "phone": "0891234567",
            "address": "99 เชียงใหม่",
            "note": ""
        },
        "items": [
            {
                "product_id": sample_product["id"],
                "quantity_or_weight": 1,
                "count": 1
            }
        ],
        "payment_method": "COD",
        "cod_consent": False
    }

    res = api_request("POST", "/orders", json=payload)
    assert res.status_code in [400, 422], f"คาดหวัง 400 หรือ 422 แต่ได้ {res.status_code}"

def test_order_creation_cod_with_consent_success():
    """4. ทดสอบสั่งซื้อแบบ COD ยินยอมสำเร็จ ยอดมัดจำต้องตรงกับที่ตั้งไว้"""
    settings_res = api_request("GET", "/settings")
    assert settings_res.status_code == 200
    expected_cod_fee = float(settings_res.json()["settings"].get("cod_deposit_fee", 80.0))

    sample_product = get_test_product()

    payload = {
        "customer": {
            "name": "ลูกค้า COD ยินยอมแล้ว",
            "phone": "0891234567",
            "address": "99 เชียงใหม่",
            "note": ""
        },
        "items": [
            {
                "product_id": sample_product["id"],
                "quantity_or_weight": 1,
                "count": 1
            }
        ],
        "payment_method": "COD",
        "cod_consent": True
    }

    res = api_request("POST", "/orders", json=payload)
    assert res.status_code == 200, f"สั่งซื้อ COD ล้มเหลว (Status: {res.status_code}): {res.text}"
    order = res.json()
    assert order["payment_method"] == "COD"
    assert order["deposit_amount"] == expected_cod_fee
    assert order["remaining_cod_amount"] == order["grand_total"]