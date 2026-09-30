# app/repositories/analyse_repository.py
from typing import Optional, Dict, Any
import logging

from app.utils.database import db
from app.models.analyse_model import Analyse

logger = logging.getLogger(__name__)


class AnalyseRepository:
    async def create(
        self,
        client_name: str,
        analysis_type: str,
        parameters: str,
        notes: Optional[str],
        original_image_name: str,
        stored_image_name: str,
        image_path: str,
        image_size: int,
        mime_type: str,
        biologist_id: int,
        status: str = "uploaded"
    ) -> Optional[Analyse]:
        """
        Crée une nouvelle analyse liée à un biologiste.
        """
        try:
            row = await db.fetch_one(
                """
                INSERT INTO analyses (
                    client_name,
                    analysis_type,
                    parameters,
                    notes,
                    original_image_name,
                    stored_image_name,
                    image_path,
                    image_size,
                    mime_type,
                    biologist_id,
                    status,
                    created_at,
                    updated_at
                )
                VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW()
                )
                RETURNING
                    id,
                    client_name,
                    analysis_type,
                    parameters,
                    notes,
                    original_image_name,
                    stored_image_name,
                    image_path,
                    image_size,
                    mime_type,
                    biologist_id,
                    status,
                    created_at,
                    updated_at
                """,
                client_name.strip(),
                analysis_type.strip(),
                parameters.strip(),
                notes.strip() if notes else None,
                original_image_name,
                stored_image_name,
                image_path,
                image_size,
                mime_type,
                biologist_id,
                status
            )

            return Analyse.from_dict(row) if row else None

        except Exception as e:
            logger.error(f"💥 Erreur create analyse: {e}", exc_info=True)
            return None

    async def get_by_id(self, analysis_id: int) -> Optional[Analyse]:
        """
        Récupère une analyse par son identifiant.
        """
        try:
            row = await db.fetch_one(
                """
                SELECT
                    id,
                    client_name,
                    analysis_type,
                    parameters,
                    notes,
                    original_image_name,
                    stored_image_name,
                    image_path,
                    image_size,
                    mime_type,
                    biologist_id,
                    status,
                    created_at,
                    updated_at
                FROM analyses
                WHERE id = $1
                """,
                analysis_id
            )

            return Analyse.from_dict(row) if row else None

        except Exception as e:
            logger.error(f"💥 Erreur get_by_id analyse: {e}", exc_info=True)
            return None

    async def update_status(self, analysis_id: int, status: str) -> Optional[Analyse]:
        """
        Met à jour le statut d'une analyse.
        """
        try:
            row = await db.fetch_one(
                """
                UPDATE analyses
                SET status = $1,
                    updated_at = NOW()
                WHERE id = $2
                RETURNING
                    id,
                    client_name,
                    analysis_type,
                    parameters,
                    notes,
                    original_image_name,
                    stored_image_name,
                    image_path,
                    image_size,
                    mime_type,
                    biologist_id,
                    status,
                    created_at,
                    updated_at
                """,
                status,
                analysis_id
            )

            return Analyse.from_dict(row) if row else None

        except Exception as e:
            logger.error(f"💥 Erreur update_status analyse: {e}", exc_info=True)
            return None

    async def get_admin_analysis_stats(self) -> Dict[str, int]:
        """
        Statistiques globales pour la page admin des analyses.
        """
        try:
            row = await db.fetch_one(
                """
                SELECT
                    COUNT(*) AS total,
                    COUNT(*) FILTER (
                        WHERE COALESCE(r.validation_status, 'pending') = 'validated'
                    ) AS validees,
                    COUNT(*) FILTER (
                        WHERE COALESCE(r.validation_status, 'pending') = 'pending'
                    ) AS en_attente,
                    COUNT(*) FILTER (
                        WHERE COALESCE(r.validation_status, 'pending') = 'rejected'
                    ) AS rejetees,
                    COUNT(*) FILTER (
                        WHERE r.global_state = 'Anormale'
                    ) AS avec_anomalies
                FROM analyses a
                LEFT JOIN resultats r ON r.analyse_id = a.id
                """
            )

            return {
                "total": row["total"] if row else 0,
                "validees": row["validees"] if row else 0,
                "en_attente": row["en_attente"] if row else 0,
                "rejetees": row["rejetees"] if row else 0,
                "avec_anomalies": row["avec_anomalies"] if row else 0,
            }

        except Exception as e:
            logger.error(f"💥 Erreur get_admin_analysis_stats: {e}", exc_info=True)
            return {
                "total": 0,
                "validees": 0,
                "en_attente": 0,
                "rejetees": 0,
                "avec_anomalies": 0,
            }

    async def get_admin_analyses(
        self,
        search: Optional[str] = None,
        filter_date: Optional[str] = None,
        filter_status: Optional[str] = None,
        page: int = 1,
        per_page: int = 10
    ) -> Dict[str, Any]:
        """
        Liste paginée des analyses pour l'admin avec jointure sur users/resultats.
        """
        try:
            conditions = []
            params = []
            idx = 1

            if search:
                conditions.append(
                    f"""
                    (
                        COALESCE(u.nom, '') ILIKE ${idx}
                        OR COALESCE(u.email, '') ILIKE ${idx}
                        OR COALESCE(a.analysis_type, '') ILIKE ${idx}
                        OR COALESCE(r.predicted_class, '') ILIKE ${idx}
                        OR COALESCE(a.client_name, '') ILIKE ${idx}
                    )
                    """
                )
                params.append(f"%{search.strip()}%")
                idx += 1

            if filter_date:
                conditions.append(f"DATE(a.created_at) = ${idx}")
                params.append(filter_date)
                idx += 1

            if filter_status and filter_status != "all":
                status_map = {
                    "validé": "validated",
                    "en_attente": "pending",
                    "rejeté": "rejected",
                }
                mapped_status = status_map.get(filter_status, filter_status)
                conditions.append(f"COALESCE(r.validation_status, 'pending') = ${idx}")
                params.append(mapped_status)
                idx += 1

            where_clause = ""
            if conditions:
                where_clause = "WHERE " + " AND ".join(conditions)

            count_query = f"""
                SELECT COUNT(*) AS total
                FROM analyses a
                LEFT JOIN resultats r ON r.analyse_id = a.id
                LEFT JOIN users u ON u.id = a.biologist_id
                {where_clause}
            """

            count_row = await db.fetch_one(count_query, *params)
            total = count_row["total"] if count_row else 0

            offset = (page - 1) * per_page

            data_query = f"""
                SELECT
                    a.id,
                    a.created_at,
                    a.client_name,
                    a.analysis_type,
                    a.notes,
                    a.image_path,
                    a.biologist_id,

                    u.nom AS biologiste,
                    u.email AS email,

                    r.predicted_class,
                    r.global_state,
                    r.short_conclusion,
                    r.validation_status,
                    r.status AS result_status,
                    r.confidence

                FROM analyses a
                LEFT JOIN resultats r ON r.analyse_id = a.id
                LEFT JOIN users u ON u.id = a.biologist_id
                {where_clause}
                ORDER BY a.created_at DESC
                LIMIT ${idx} OFFSET ${idx + 1}
            """

            rows = await db.fetch_all(data_query, *params, per_page, offset)

            return {
                "total": total,
                "items": rows or []
            }

        except Exception as e:
            logger.error(f"💥 Erreur get_admin_analyses: {e}", exc_info=True)
            return {
                "total": 0,
                "items": []
            }


analyse_repository = AnalyseRepository()
