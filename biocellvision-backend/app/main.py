# app/main.py
import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import settings
from app.controllers import auth_router, user_router, analyse_router
from app.services.auth_service import auth_service
from app.utils.database import db
from app.controllers.report_controller import router as report_router
from app.controllers.dashboard_controller import router as dashboard_router

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Créer les dossiers AVANT le mount static
Path(settings.STORAGE_ROOT).mkdir(parents=True, exist_ok=True)
Path(settings.UPLOAD_ANALYSES_DIR).mkdir(parents=True, exist_ok=True)
Path(settings.OUTPUT_ANNOTATED_DIR).mkdir(parents=True, exist_ok=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 Démarrage du serveur...")

    await db.connect()
    await auth_service.init_redis()

    logger.info("✅ Serveur prêt !")
    yield

    logger.info("🛑 Arrêt du serveur...")
    await db.disconnect()
    await auth_service.close_redis()
    logger.info("✅ Serveur arrêté proprement.")


app = FastAPI(
    title="BioCellVision API",
    debug=settings.DEBUG,
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# URL publique = /storage
# Dossier physique = C:/Users/fchto/Desktop/storage
app.mount(
    "/storage",
    StaticFiles(directory=settings.STORAGE_ROOT),
    name="storage"
)

app.include_router(auth_router)
app.include_router(user_router)
app.include_router(analyse_router)
app.include_router(report_router)
app.include_router(dashboard_router)


@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "Bienvenue sur BioCellVision API",
        "docs": "/docs"
    }


@app.get("/health", tags=["Health"])
async def health():
    return {
        "status": "healthy",
        "database": "connected",
        "redis": "connected"
    }