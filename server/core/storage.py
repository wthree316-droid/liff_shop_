from typing import Optional
from core.database import supabase

def delete_storage_image_by_url(image_url: Optional[str], bucket_name: str = "products"):
    """แยกชื่อไฟล์จาก Public URL แล้วสั่งลบออกจาก Supabase Storage Bucket"""
    if not image_url:
        return
    try:
        filename = image_url.split("/")[-1].split("?")[0]
        if filename:
            supabase.storage.from_(bucket_name).remove([filename])
    except Exception as e:
        print(f"Warning: Failed to delete old image from {bucket_name}: {e}")