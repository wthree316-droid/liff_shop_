import os
from fastapi import FastAPI, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from modules.catalog.router import router as catalog_router
from modules.order.router import router as order_router
from modules.promotion.router import router as promotion_router
from modules.setting.router import router as setting_router
from modules.webhook.router import router as webhook_router
from modules.admin.router import router as admin_router

app = FastAPI(
    title="Artisan Shop E-Commerce API",
    version="1.0.0",
    description="Modular Monolith API with Unified Client Serving"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Modules
app.include_router(catalog_router, prefix="/api")
app.include_router(order_router, prefix="/api")
app.include_router(promotion_router, prefix="/api")
app.include_router(setting_router, prefix="/api")
app.include_router(webhook_router, prefix="/api")
app.include_router(admin_router, prefix="/api")

@app.get("/health")
def health_check():
    return {"status": "ok", "service": "artisan-tea-api"}

# --- Static Files & Single Domain Client Mounting ---
# อ้างอิงโฟลเดอร์ client ที่อยู่นอกโฟลเดอร์ server
base_dir = os.path.dirname(os.path.abspath(__file__))
client_dir = os.path.abspath(os.path.join(base_dir, "../client"))

# Mount โฟลเดอร์ js และ assets อื่นๆ (ถ้ามี)
if os.path.exists(os.path.join(client_dir, "js")):
    app.mount("/js", StaticFiles(directory=os.path.join(client_dir, "js")), name="js")

css_dir = os.path.join(client_dir, "css")
if os.path.exists(css_dir):
    app.mount("/css", StaticFiles(directory=css_dir), name="css")


@app.get("/favicon.ico", include_in_schema=False)
async def favicon():
    return Response(status_code=204)

@app.get("/")
def serve_shop():
    """เปิดหน้าร้านค้าสำหรับลูกค้า"""
    return FileResponse(os.path.join(client_dir, "index.html"))

@app.get("/admin.html")
def serve_admin():
    """เปิดหน้าผู้ดูแลระบบ"""
    return FileResponse(os.path.join(client_dir, "admin.html"))