from typing import List
from fastapi import APIRouter
from modules.catalog.schemas import ProductResponse
from modules.catalog.catalog_service import get_available_products

router = APIRouter(prefix="/products", tags=["Catalog"])

@router.get("", response_model=List[ProductResponse])
def fetch_products():
    return get_available_products()