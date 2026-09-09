def test_webhook_missing_signature(client):
    """เรียก Webhook โดยไม่ส่ง X-Line-Signature ต้องถูกปฏิเสธ 400"""
    res = client.post("/api/webhook/line", json={"events": []})
    assert res.status_code == 400

def test_webhook_invalid_signature(client):
    """ส่งลายเซ็นปลอม ต้องติด 400 Invalid Signature"""
    headers = {"X-Line-Signature": "fake_signature_abc123"}
    res = client.post("/api/webhook/line", json={"events": []}, headers=headers)
    assert res.status_code == 400