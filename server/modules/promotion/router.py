from typing import List
from fastapi import APIRouter
from modules.promotion.schemas import PromotionBannerResponse
from modules.promotion.promotion_service import get_active_promotions
router = APIRouter(prefix="/promotions", tags=["Promotions"])

@router.get("/active", response_model=List[PromotionBannerResponse])
def fetch_active_banners():
    """หน้าเว็บเรียกเส้นนี้เพื่อนำข้อมูลไปเรนเดอร์เป็นการ์ดแบนเนอร์เลื่อนปัด"""
    return get_active_promotions()

