from core.database import supabase
from core.config import settings

print("Testing Supabase Connection...")
print(f"URL: {settings.SUPABASE_URL}")
print(f"Key starts with: {settings.SUPABASE_SERVICE_ROLE_KEY[:15]}...")

try:
    res = supabase.table("products").select("*").execute()
    print("SUCCESS! Data received:", len(res.data), "items")
except Exception as e:
    print("\n--- ERROR CAUSE ---")
    print(type(e), e)