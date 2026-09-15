FROM python:3.11-slim

# กำหนดตัวแปรระบบสำหรับ Python ใน Container
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8000

WORKDIR /app

# ติดตั้ง System Dependencies (curl สำหรับ healthcheck)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# ติดตั้ง Python Dependencies ก่อน เพื่อใช้ประโยชน์จาก Docker Layer Cache
COPY server/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r /app/requirements.txt

# คัดลอก Source Code ของ Client และ Server เข้าสู่ Container
COPY client /app/client
COPY server /app/server

# สลับ Working Directory ไปที่โฟลเดอร์ server เพื่อให้อ้างอิง core/ และ modules/ ได้ตามปกติ
WORKDIR /app/server

EXPOSE 8000

# รัน FastAPI ผ่าน Uvicorn Production Mode
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]