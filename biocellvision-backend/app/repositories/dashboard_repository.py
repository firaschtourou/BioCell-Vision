# app/repositories/dashboard_repository.py
import logging
from typing import Dict, Any, List

from app.utils.database import db

logger = logging.getLogger(__name__)


class DashboardRepository:
    async def get_global_stats(self) -> Dict[str, Any]:
        try:
            query = """
                SELECT
                    (SELECT COUNT(*) FROM users) AS total_users,
                    (SELECT COUNT(*) FROM users WHERE role = 'biologist' AND status = 1) AS active_biologists,
                    (SELECT COUNT(*) FROM analyses) AS total_analyses,
                    (
                        SELECT COUNT(*)
                        FROM analyses
                        WHERE DATE(created_at) = CURRENT_DATE
                    ) AS analyses_today,
                    (
                        SELECT COUNT(*)
                        FROM resultats
                        WHERE COALESCE(validation_status, 'pending') = 'pending'
                    ) AS pending_analyses,
                    (
                        SELECT COUNT(*)
                        FROM resultats
                        WHERE validation_status = 'validated'
                    ) AS validated_analyses,
                    (
                        SELECT COUNT(*)
                        FROM resultats
                        WHERE validation_status = 'rejected'
                    ) AS rejected_analyses,
                    (
                        SELECT COUNT(*)
                        FROM resultats
                        WHERE global_state = 'Anormale'
                    ) AS abnormal_analyses,
                    (
                        SELECT COUNT(*)
                        FROM reports
                        WHERE status = 'generated'
                    ) AS generated_reports
            """
            row = await db.fetch_one(query)

            return {
                "total_users": row["total_users"] if row else 0,
                "active_biologists": row["active_biologists"] if row else 0,
                "total_analyses": row["total_analyses"] if row else 0,
                "analyses_today": row["analyses_today"] if row else 0,
                "pending_analyses": row["pending_analyses"] if row else 0,
                "validated_analyses": row["validated_analyses"] if row else 0,
                "rejected_analyses": row["rejected_analyses"] if row else 0,
                "abnormal_analyses": row["abnormal_analyses"] if row else 0,
                "generated_reports": row["generated_reports"] if row else 0,
            }

        except Exception as e:
            logger.error(f"Erreur get_global_stats: {e}", exc_info=True)
            return {
                "total_users": 0,
                "active_biologists": 0,
                "total_analyses": 0,
                "analyses_today": 0,
                "pending_analyses": 0,
                "validated_analyses": 0,
                "rejected_analyses": 0,
                "abnormal_analyses": 0,
                "generated_reports": 0,
            }

    async def get_analyses_by_status(self) -> List[Dict[str, Any]]:
        query = """
            SELECT
                CASE
                    WHEN COALESCE(validation_status, 'pending') = 'validated' THEN 'Validées'
                    WHEN COALESCE(validation_status, 'pending') = 'rejected' THEN 'Rejetées'
                    ELSE 'En attente'
                END AS label,
                COUNT(*) AS value
            FROM resultats
            GROUP BY COALESCE(validation_status, 'pending')
            ORDER BY value DESC
        """
        return await db.fetch_all(query)

    async def get_analyses_by_type(self) -> List[Dict[str, Any]]:
        query = """
            SELECT
                COALESCE(analysis_type, 'Non défini') AS label,
                COUNT(*) AS value
            FROM analyses
            GROUP BY analysis_type
            ORDER BY value DESC
        """
        return await db.fetch_all(query)

    async def get_analyses_last_7_days(self) -> List[Dict[str, Any]]:
        query = """
            SELECT
                TO_CHAR(day::date, 'DD/MM') AS label,
                COALESCE(COUNT(a.id), 0) AS value
            FROM generate_series(
                CURRENT_DATE - INTERVAL '6 days',
                CURRENT_DATE,
                INTERVAL '1 day'
            ) AS day
            LEFT JOIN analyses a ON DATE(a.created_at) = day::date
            GROUP BY day
            ORDER BY day
        """
        return await db.fetch_all(query)

    async def get_anomaly_distribution(self) -> List[Dict[str, Any]]:
        query = """
            SELECT
                CASE
                    WHEN global_state = 'Normale' THEN 'Normales'
                    WHEN global_state = 'Anormale' THEN 'Anormales'
                    ELSE 'Non déterminées'
                END AS label,
                COUNT(*) AS value
            FROM resultats
            GROUP BY global_state
            ORDER BY value DESC
        """
        return await db.fetch_all(query)

    async def get_top_biologists(self) -> List[Dict[str, Any]]:
        query = """
            SELECT
                u.nom AS label,
                COUNT(a.id) AS value
            FROM users u
            LEFT JOIN analyses a ON a.biologist_id = u.id
            WHERE u.role = 'biologist'
            GROUP BY u.id, u.nom
            ORDER BY value DESC
            LIMIT 5
        """
        return await db.fetch_all(query)

    async def get_recent_analyses(self) -> List[Dict[str, Any]]:
        query = """
            SELECT
                a.id,
                a.client_name,
                a.analysis_type,
                a.created_at,
                a.status AS analysis_status,
                u.nom AS biologist_name,
                r.validation_status,
                r.global_state,
                r.confidence
            FROM analyses a
            LEFT JOIN users u ON u.id = a.biologist_id
            LEFT JOIN resultats r ON r.analyse_id = a.id
            ORDER BY a.created_at DESC
            LIMIT 6
        """
        return await db.fetch_all(query)


dashboard_repository = DashboardRepository()