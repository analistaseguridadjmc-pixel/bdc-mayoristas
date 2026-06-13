from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import text
from app.config import settings
from app.database import AsyncSessionLocal
from app.routers import auth, vigilante, admin

app = FastAPI(title="BDC Mayoristas API", version="1.0.0")

# CORS
origins = [o.strip() for o in settings.cors_origins.split(",")]
app.add_middleware(CORSMiddleware,
    allow_origins=origins, allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"])

# Routers
app.include_router(auth.router)
app.include_router(vigilante.router)
app.include_router(admin.router)

# Cron: marcar ventas vencidas cada hora
scheduler = AsyncIOScheduler()

async def cron_marcar_vencidas():
    async with AsyncSessionLocal() as db:
        r = await db.execute(text("SELECT marcar_ventas_vencidas()"))
        count = r.scalar()
        if count and count > 0:
            print(f"[CRON] {count} ventas marcadas como vencidas")
        await db.commit()

@app.on_event("startup")
async def startup():
    scheduler.add_job(cron_marcar_vencidas, "interval", hours=1, id="marcar_vencidas")
    scheduler.start()

@app.on_event("shutdown")
async def shutdown():
    scheduler.shutdown()

@app.api_route("/health", methods=["GET", "HEAD"])
async def health():
    return {"status": "ok", "service": "bdc-mayoristas-api"}
