from datetime import datetime, timezone
from typing import Optional, Tuple
from zoneinfo import ZoneInfo

BANGKOK_TZ = ZoneInfo("Asia/Bangkok")

THAI_MONTHS_SHORT = [
    "", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
    "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."
]

def parse_to_bangkok(iso_str: Optional[str]) -> Optional[datetime]:
    """แปลง ISO String (UTC จาก Supabase) ให้อยู่ในโซนเวลา Asia/Bangkok"""
    if not iso_str:
        return None
    try:
        clean_str = iso_str.replace("Z", "+00:00")
        dt = datetime.fromisoformat(clean_str)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(BANGKOK_TZ)
    except Exception:
        return None

def get_thai_order_time_meta(iso_str: Optional[str]) -> Tuple[str, str, str]:
    """
    คืนค่า Tuple 3 อย่างสำหรับนำไปเรนเดอร์ในบิลออเดอร์:
    (date_key เช่น '2026-09-16', date_label เช่น 'วันนี้' หรือ '16 ก.ย. 2026', time_display เช่น '20:45')
    """
    dt = parse_to_bangkok(iso_str)
    if not dt:
        return "unknown", "ไม่ทราบวันที่", ""

    date_key = dt.strftime("%Y-%m-%d")
    time_display = dt.strftime("%H:%M")

    # เทียบกับวันปัจจุบันในไทย
    now_bkk = datetime.now(BANGKOK_TZ)
    today_key = now_bkk.strftime("%Y-%m-%d")
    
    # คำนวณวันเมื่อวาน
    yesterday_bkk = now_bkk.date().toordinal() - 1
    if dt.date().toordinal() == now_bkk.date().toordinal():
        date_label = "วันนี้"
    elif dt.date().toordinal() == yesterday_bkk:
        date_label = "เมื่อวานนี้"
    else:
        month_name = THAI_MONTHS_SHORT[dt.month]
        date_label = f"{dt.day} {month_name} {dt.year + 543}" # แสดงปี พ.ศ. หรือใช้ {dt.year} เป็น ค.ศ.

    return date_key, date_label, time_display