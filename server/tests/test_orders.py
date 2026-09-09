def test_get_public_products(client):
    """ลูกค้าต้องดึงรายการสินค้าหน้าร้านได้โดยไม่ต้องมี Token"""
    res = client.get("/api/products")
    assert res.status_code == 200
    assert isinstance(res.json(), list)

def test_validate_promo_code_not_found(client):
    """ทดสอบโค้ดส่วนลดที่ไม่มีจริงในระบบ"""
    payload = {"code": "UNKNOWN_CODE_999", "order_amount": 500}
    res = client.post("/api/promotions/validate", json=payload)
    assert res.status_code in [400, 404]

def test_submit_order_missing_fields(client):
    """สร้างคำสั่งซื้อโดยไม่ส่งข้อมูลที่จำเป็น ต้องได้ 422 Unprocessable Entity"""
    res = client.post("/api/orders", json={})
    assert res.status_code == 422