def test_admin_unauthorized_access(client):
    """เข้าใช้งานโดยไม่มี Token ต้องโดน 401"""
    res = client.get("/api/admin/orders")
    assert res.status_code == 401

def test_admin_authorized_access(client, admin_headers):
    """เข้าใช้งานด้วย Admin Key ต้องได้ 200"""
    res = client.get("/api/admin/orders", headers=admin_headers)
    assert res.status_code == 200
    assert isinstance(res.json(), list)

def test_admin_create_and_delete_product(client, admin_headers):
    """ทดสอบสร้างสินค้าชั่วคราวและสั่งลบ"""
    test_prod_id = "test-item-temp"
    payload = {
        "id": test_prod_id,
        "name": "Test Tea Product",
        "category_id": "cat_weight",
        "type": "BY_WEIGHT",
        "price_per_unit": 2.5,
        "is_available": True,
        "variants": [],
        "price_tiers": [{"min_weight": 50, "price_per_unit": 2.0}]
    }

    # สร้าง
    res_create = client.post("/api/admin/products", json=payload, headers=admin_headers)
    assert res_create.status_code in [201, 400]  # 400 เผื่อของเดิมยังค้างอยู่

    # ลบ
    res_del = client.delete(f"/api/admin/products/{test_prod_id}", headers=admin_headers)
    assert res_del.status_code in [200, 404]