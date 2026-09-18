import os
from dotenv import load_dotenv

load_dotenv()

class Settings:
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_SERVICE_ROLE_KEY: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    
    LINE_CHANNEL_SECRET: str = os.getenv("LINE_CHANNEL_SECRET", "").strip()
    LINE_CHANNEL_ACCESS_TOKEN: str = os.getenv("LINE_CHANNEL_ACCESS_TOKEN", "").strip()

    LINE_CUSTOMER_LIFF_ID: str = os.getenv("LINE_CUSTOMER_LIFF_ID", "").strip()
    LINE_ADMIN_LIFF_ID: str = os.getenv("LINE_ADMIN_LIFF_ID", "").strip()

    ADMIN_LINE_USER_IDS: str = os.getenv("ADMIN_LINE_USER_IDS", "").strip()
    ADMIN_API_KEY: str = os.getenv("ADMIN_API_KEY", "admin_secret_change_me").strip()

    LINE_CUSTOMER_RICH_MENU_ID: str = os.getenv("LINE_CUSTOMER_RICH_MENU_ID", "").strip()
    LINE_ADMIN_RICH_MENU_ID: str = os.getenv("LINE_ADMIN_RICH_MENU_ID", "").strip()

    CONTACT_URL: str = os.getenv("CONTACT_URL", "").strip().rstrip("/")

settings = Settings()