from fastapi import APIRouter
from modules.order.schemas import CreateOrderRequest, OrderSummaryResponse
from modules.order.order_service import process_order

router = APIRouter(prefix="/orders", tags=["Order"])

@router.post("", response_model=OrderSummaryResponse)
def create_new_order(request: CreateOrderRequest):
    return process_order(request)