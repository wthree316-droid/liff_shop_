import uuid
import httpx
from typing import List, Optional
from fastapi import APIRouter, Header, HTTPException, status, Depends, UploadFile, File
from core.config import settings
from core.database import supabase  

from modules.admin.schemas import (
    UpdateOrderStatusRequest,
    OrderSummaryResponse,
    AdminCreateProductRequest,
    AdminUpdateProductRequest,
    AdminCreatePromoRequest,
    AdminUpdatePromoRequest,
)
from modules.admin.admin_service import (
    fetch_orders, update_order_status,
    fetch_all_products_admin, create_product_admin, update_product_admin, toggle_product_availability,
    fetch_all_promotions_admin, create_promotion_admin, toggle_promotion_active,
    delete_product_admin, update_promotion_admin, 

    delete_promotion_admin
)

router = APIRouter(prefix="/admin", tags=["Admin Portal"])

async def verify_admin_auth(authorization: Optional[str] = Header(None)):
    if not authorization:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Missing Authorization Header")

    parts = authorization.strip().split(" ")
    auth_type = parts[0].lower() if len(parts) > 1 else "key"
    credential = parts[-1]

    # 1. เช็กด้วย ADMIN_API_KEY ก่อนเสมอ (รองรับทั้ง Bearer <key>, Key <key>, หรือ <key>)
    if settings.ADMIN_API_KEY and credential == settings.ADMIN_API_KEY:
        return {"auth": "api_key"}

    # 2. กรณีเป็น LINE ID Token (เปิดผ่าน LINE LIFF Admin)
    if auth_type == "bearer" or credential.startswith("eyJ"):
        # ตัดเอาเฉพาะ Channel ID ก่อนเครื่องหมายขีด (-) เช่น 2011466802
        client_id = settings.LINE_ADMIN_LIFF_ID.split("-")[0] if "-" in settings.LINE_ADMIN_LIFF_ID else settings.LINE_ADMIN_LIFF_ID

        async with httpx.AsyncClient(timeout=5.0) as client:
            res = await client.post(
                "https://api.line.me/oauth2/v2.1/verify",
                data={"id_token": credential, "client_id": client_id}
            )
            if res.status_code != 200:
                raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="LINE ID Token ไม่ถูกต้องหรือหมดอายุ")
            
            payload = res.json()
            user_id = payload.get("sub")
            allowed_admins = [uid.strip() for uid in settings.ADMIN_LINE_USER_IDS.split(",") if uid.strip()]
            if not user_id or user_id not in allowed_admins:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="ไม่มีสิทธิ์เข้าถึงระบบผู้ดูแล")
            return {"auth": "liff", "user_id": user_id}

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="รูปแบบยืนยันตัวตนไม่ถูกต้อง")

# --- Upload Image Endpoint ---
@router.post("/upload", dependencies=[Depends(verify_admin_auth)])
async def upload_asset_image(file: UploadFile = File(...)):
    raw_name = file.filename or "image.jpg"
    # ดึงนามสกุลไฟล์ และบังคับแปลงเป็นตัวพิมพ์เล็ก
    ext = raw_name.split(".")[-1].lower() if "." in raw_name else "jpg"
    # สุ่ม UUIDv4 เพื่อป้องกันชื่อซ้ำและตัดอักขระภาษาไทย/ช่องว่างทิ้ง
    unique_filename = f"{uuid.uuid4().hex}.{ext}"
    file_bytes = await file.read()

    # ต้องส่ง unique_filename เข้า path ของ Supabase Storage
    supabase.storage.from_("products").upload(
        path=unique_filename,
        file=file_bytes,
        file_options={"content-type": file.content_type or "image/jpeg"}
    )

    public_url = supabase.storage.from_("products").get_public_url(unique_filename)
    return {"image_url": public_url}

# --- Orders Endpoints ---
@router.get("/orders", response_model=List[OrderSummaryResponse], dependencies=[Depends(verify_admin_auth)])
def list_orders(status: Optional[str] = None):
    return fetch_orders(status_filter=status)

@router.patch("/orders/{order_id}/status", dependencies=[Depends(verify_admin_auth)])
def change_order_status(order_id: str, request: UpdateOrderStatusRequest):
    return update_order_status(order_id, request.status, request.tracking_number)

# --- Products Endpoints ---
@router.get("/products", dependencies=[Depends(verify_admin_auth)])
def get_all_products():
    return fetch_all_products_admin()

@router.post("/products", status_code=status.HTTP_201_CREATED, dependencies=[Depends(verify_admin_auth)])
def add_product(request: AdminCreateProductRequest):
    return create_product_admin(request)

@router.patch("/products/{product_id}", dependencies=[Depends(verify_admin_auth)])
def edit_product(product_id: str, request: AdminUpdateProductRequest):
    return update_product_admin(product_id, request)

@router.patch("/products/{product_id}/toggle", dependencies=[Depends(verify_admin_auth)])
def toggle_product(product_id: str):
    return toggle_product_availability(product_id)

@router.delete("/products/{product_id}", dependencies=[Depends(verify_admin_auth)])
def delete_product(product_id: str):
    return delete_product_admin(product_id)

# --- Promotions Endpoints ---
@router.get("/promotions", dependencies=[Depends(verify_admin_auth)])
def get_all_promotions():
    return fetch_all_promotions_admin()

@router.post("/promotions", status_code=status.HTTP_201_CREATED, dependencies=[Depends(verify_admin_auth)])
def add_promotion(request: AdminCreatePromoRequest):
    return create_promotion_admin(request)

@router.patch("/promotions/{promo_id}/toggle", dependencies=[Depends(verify_admin_auth)])
def toggle_promotion(promo_id: str):
    return toggle_promotion_active(promo_id)

@router.patch("/promotions/{promo_id}", dependencies=[Depends(verify_admin_auth)])
def update_promo(promo_id: str, payload: AdminUpdatePromoRequest):
    return update_promotion_admin(promo_id, payload)

@router.delete("/promotions/{promo_id}", dependencies=[Depends(verify_admin_auth)])
def delete_promotion(promo_id: str):
    return delete_promotion_admin(promo_id)