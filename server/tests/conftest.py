import pytest
from fastapi.testclient import TestClient
from main import app
from core.config import settings

@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c

@pytest.fixture(scope="session")
def admin_headers():
    # ใช้ ADMIN_API_KEY ที่ตั้งไว้ใน config
    key = settings.ADMIN_API_KEY or "admin_secret_change_me"
    return {"Authorization": f"Bearer {key}"}