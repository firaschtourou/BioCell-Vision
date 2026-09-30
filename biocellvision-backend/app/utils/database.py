# app/utils/database.py
import asyncpg
from typing import Optional, Dict, Any, List
from app.config import settings
import logging

logger = logging.getLogger(__name__)


class Database:
    def __init__(self):
        self.pool: Optional[asyncpg.Pool] = None

    async def connect(self):
        try:
            self.pool = await asyncpg.create_pool(
                user=settings.DB_USER,
                password=settings.DB_PASSWORD,
                database=settings.DB_NAME,
                host=settings.DB_HOST,
                port=settings.DB_PORT,
                min_size=5,
                max_size=20
            )
            logger.info(f"✅ Connecté à la base de données {settings.DB_NAME}")
        except Exception as e:
            logger.error(f"❌ Erreur de connexion à la DB: {e}", exc_info=True)
            raise

    async def disconnect(self):
        if self.pool:
            await self.pool.close()
            logger.info("🔌 Déconnecté de la base de données")

    async def fetch_one(self, query: str, *args) -> Optional[Dict[str, Any]]:
        async with self.pool.acquire() as conn:
            row = await conn.fetchrow(query, *args)
            return dict(row) if row else None

    async def fetch_all(self, query: str, *args) -> List[Dict[str, Any]]:
        async with self.pool.acquire() as conn:
            rows = await conn.fetch(query, *args)
            return [dict(row) for row in rows]

    async def execute(self, query: str, *args) -> str:
        async with self.pool.acquire() as conn:
            return await conn.execute(query, *args)


db = Database()