from typing import List
from fastapi import APIRouter, Depends
from modules.setting.schemas import StoreSettingItem, StoreSettingsResponse, UpdateSettingRequest
from modules.setting.setting_service import fetch_all_settings, fetch_settings_details, update_setting_value
from modules.admin.router import verify_admin_auth

router = APIRouter(prefix="/settings", tags=["Settings"])

@router.get("", response_model=StoreSettingsResponse)
def get_store_settings_map():
    """ดึงคู่ Key-Value สำหรับการคำนวณ (หน้าร้านใช้ได้)"""
    return {"settings": fetch_all_settings()}

@router.get("/details", response_model=List[StoreSettingItem], dependencies=[Depends(verify_admin_auth)])
def get_settings_for_admin():
    """ดึงข้อมูลการตั้งค่าทั้งหมดพร้อมคำอธิบายสำหรับหน้าแอดมิน"""
    return fetch_settings_details()

@router.put("/{key}", response_model=StoreSettingItem, dependencies=[Depends(verify_admin_auth)])
def update_setting(key: str, request: UpdateSettingRequest):
    """หน้าแอดมินยิงอัปเดตค่าส่ง/ส่งฟรี/น้ำหนักขั้นต่ำ (Admin Protected)"""
    return update_setting_value(key, request)