import hmac
import hashlib
import base64
from typing import Optional
import httpx
from fastapi import HTTPException, status, Header, Depends
from core.config import settings

def verify_line_signature(body: bytes, signature: str) -> bool:
    """
    ตรวจสอบความถูกต้องของ X-Line-Signature ที่ส่งมาจาก LINE Webhook
    """
    if not signature:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing X-Line-Signature header"
        )

    channel_secret = settings.LINE_CHANNEL_SECRET
    if not channel_secret:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="LINE_CHANNEL_SECRET is not configured on server"
        )

    hash_digest = hmac.new(
        key=channel_secret.encode("utf-8"),
        msg=body,
        digestmod=hashlib.sha256
    ).digest()

    expected_signature = base64.b64encode(hash_digest).decode("utf-8")

    if not hmac.compare_digest(signature, expected_signature):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid LINE Webhook signature"
        )

    return True


async def verify_admin_auth(authorization: Optional[str] = Header(None)) -> bool:
    """
    ตรวจสอบสิทธิ์ Admin:
    1. รองรับ Admin API Key (Bearer <key> หรือ Key <key> หรือ <key>)
    2. รองรับ LINE ID Token (Bearer <id_token>) ผ่านการ verify กับ LINE API
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization Header"
        )

    token_parts = authorization.strip().split(" ")
    token = token_parts[-1]  # ดึงค่า token ไม่ว่าจะส่งมาเป็น 'Bearer xxx', 'Key xxx', หรือ 'xxx'

    # 1. ตรวจสอบด้วย ADMIN_API_KEY ก่อนเป็นอันดับแรก
    if settings.ADMIN_API_KEY and token == settings.ADMIN_API_KEY:
        return True

    # 2. หากไม่ใช่ API Key ให้ตรวจสอบว่าเป็น LINE ID Token หรือไม่
    admin_ids = [uid.strip() for uid in settings.ADMIN_LINE_USER_IDS.split(",") if uid.strip()]
    
    if token.startswith("eyJ"):  # รูปแบบมาตรฐานของ JWT (LINE ID Token)
        try:
            # ยิงไป verify กับ LINE Official Verification Endpoint
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.post(
                    "https://api.line.me/oauth2/v2.1/verify",
                    data={
                        "id_token": token,
                        "client_id": settings.LINE_ADMIN_LIFF_ID.split("-")[0] if "-" in settings.LINE_ADMIN_LIFF_ID else ""
                    }
                )
                if resp.status_code == 200:
                    payload = resp.json()
                    user_id = payload.get("sub")  # LINE User ID ของคนที่ล็อกอิน
                    if user_id and user_id in admin_ids:
                        return True
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail=f"User {user_id} is not authorized as Admin"
                    )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"LINE Token verification failed: {str(e)}"
            )

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid Admin Credentials"
    )