# app/services/dashboard_service.py
import logging
from typing import Dict, Any, List

from app.repositories.dashboard_repository import dashboard_repository

logger = logging.getLogger(__name__)


class DashboardService:
    def _safe_chart(self, rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        return [
            {
                "label": str(row.get("label") or "N/A"),
                "value": int(row.get("value") or 0)
            }
            for row in rows
        ]

    def _format_recent_analyses(self, rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        items = []

        for row in rows:
            items.append({
                "id": row.get("id"),
                "client_name": row.get("client_name") or "N/A",
                "analysis_type": row.get("analysis_type") or "N/A",
                "biologist_name": row.get("biologist_name") or "Non assigné",
                "analysis_status": row.get("analysis_status") or "N/A",
                "validation_status": row.get("validation_status") or "pending",
                "global_state": row.get("global_state") or "N/A",
                "confidence": float(row["confidence"]) if row.get("confidence") is not None else None,
                "created_at": row.get("created_at")
            })

        return items

    async def get_admin_dashboard(self) -> Dict[str, Any]:
        try:
            stats = await dashboard_repository.get_global_stats()

            analyses_by_status = await dashboard_repository.get_analyses_by_status()
            analyses_by_type = await dashboard_repository.get_analyses_by_type()
            analyses_last_7_days = await dashboard_repository.get_analyses_last_7_days()
            anomaly_distribution = await dashboard_repository.get_anomaly_distribution()
            top_biologists = await dashboard_repository.get_top_biologists()
            recent_analyses = await dashboard_repository.get_recent_analyses()

            return {
                "success": True,
                "stats": stats,
                "charts": {
                    "analyses_by_status": self._safe_chart(analyses_by_status),
                    "analyses_by_type": self._safe_chart(analyses_by_type),
                    "analyses_last_7_days": self._safe_chart(analyses_last_7_days),
                    "anomaly_distribution": self._safe_chart(anomaly_distribution),
                    "top_biologists": self._safe_chart(top_biologists),
                },
                "recent_analyses": self._format_recent_analyses(recent_analyses)
            }

        except Exception as e:
            logger.error(f"Erreur get_admin_dashboard: {e}", exc_info=True)
            return {
                "success": False,
                "message": f"Erreur chargement dashboard admin: {str(e)}"
            }


dashboard_service = DashboardService()