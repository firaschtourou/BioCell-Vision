# app/services/report_service.py
import os
from datetime import datetime
from typing import Dict, Any, Optional, List

from app.models.analyse_model import Analyse
from app.models.resultat_model import Resultat
from app.models.user_model import User
from app.repositories.report_repository import report_repository
from app.utils.pdf_generator import generate_analysis_report_pdf
from app.utils.database import db


class ReportService:
    REPORTS_BASE_DIR = "storage/reports"

    async def get_analysis_by_id(self, analyse_id: int) -> Optional[Analyse]:
        query = """
            SELECT id, client_name, analysis_type, parameters, notes,
                   original_image_name, stored_image_name, image_path, image_size,
                   mime_type, status, biologist_id, created_at, updated_at
            FROM analyses
            WHERE id = $1
        """
        row = await db.fetch_one(query, analyse_id)
        return Analyse.from_dict(dict(row)) if row else None

    async def get_result_by_analyse_id(self, analyse_id: int) -> Optional[Resultat]:
        query = """
            SELECT id, analyse_id, predicted_class, global_state, confidence,
                   total_cells, normal_cells, abnormal_cells, ai_explanation,
                   short_conclusion, predicted_cells_json, annotated_image_path,
                   model_version, status, biologist_comment, validation_status,
                   created_at, updated_at
            FROM resultats
            WHERE analyse_id = $1
            LIMIT 1
        """
        row = await db.fetch_one(query, analyse_id)
        return Resultat.from_dict(dict(row)) if row else None

    async def get_user_by_id(self, user_id: int) -> Optional[User]:
        query = """
            SELECT id, nom, email, password, role, status, date_creation
            FROM users
            WHERE id = $1
        """
        row = await db.fetch_one(query, user_id)
        return User.from_dict(dict(row)) if row else None

    def _resolve_storage_path(self, path_value: Optional[str]) -> Optional[str]:
        """
        Normalise des chemins stockés pour qu'ils soient utilisables côté serveur.
        Ex:
          - "storage/..." -> "storage/..."
          - "/storage/..." -> "storage/..."
          - "C:\\...\\storage\\..." -> "..."
        """
        if not path_value:
            return None

        normalized = str(path_value).replace("\\", "/").strip()
        if not normalized:
            return None

        if normalized.startswith("storage/"):
            return normalized
        if normalized.startswith("/storage/"):
            return normalized[1:]

        return normalized

    async def build_report_payload(self, analyse_id: int) -> Dict[str, Any]:
        analyse = await self.get_analysis_by_id(analyse_id)
        if not analyse:
            raise ValueError("Analyse introuvable")

        if not analyse.biologist_id:
            raise ValueError("Aucun biologiste associé à cette analyse")

        user = await self.get_user_by_id(analyse.biologist_id)
        if not user:
            raise ValueError("Biologiste introuvable")

        resultat = await self.get_result_by_analyse_id(analyse_id)
        if not resultat:
            raise ValueError("Résultat introuvable pour cette analyse")

        predicted_cells = (
            resultat.predicted_cells_json
            if isinstance(resultat.predicted_cells_json, list)
            else []
        )

        payload: Dict[str, Any] = {
            "analyse_id": analyse.id,
            "analyse_date": analyse.created_at.strftime("%d/%m/%Y %H:%M") if analyse.created_at else "N/A",
            "client_name": analyse.client_name,
            "analysis_type": analyse.analysis_type,
            "parameters": analyse.parameters,
            "notes": analyse.notes,
            "original_image_name": analyse.original_image_name,
            "analysis_status": analyse.status,

            "biologist_id": user.id,
            "biologist_name": user.nom,
            "biologist_email": user.email,

            "result_id": resultat.id,
            "predicted_class": resultat.predicted_class,
            "global_state": resultat.global_state,
            "confidence": f"{resultat.confidence}%" if resultat.confidence is not None else "N/A",
            "total_cells": resultat.total_cells,
            "normal_cells": resultat.normal_cells,
            "abnormal_cells": resultat.abnormal_cells,
            "ai_explanation": resultat.ai_explanation,
            "short_conclusion": resultat.short_conclusion,

            # Le générateur PDF utilise "predicted_cells"
            "predicted_cells": predicted_cells,

            "annotated_image_path": resultat.annotated_image_path,
            "model_version": resultat.model_version,
            "result_status": resultat.status,
            "biologist_comment": resultat.biologist_comment,
            "validation_status": resultat.validation_status,

            # Chemins serveurs (utilisés par reportlab)
            "original_image_full_path": self._resolve_storage_path(analyse.image_path),
            "annotated_image_full_path": self._resolve_storage_path(resultat.annotated_image_path),
        }

        # ✅ Ajout: images isolées depuis predicted_cells[*].isolated_image_path
        isolated_imgs: List[str] = []
        for cell in payload.get("predicted_cells", []):
            if isinstance(cell, dict):
                p = cell.get("isolated_image_path")
                if p:
                    resolved = self._resolve_storage_path(p)
                    if resolved and os.path.exists(resolved):
                        isolated_imgs.append(resolved)

        payload["isolated_cells_images"] = isolated_imgs[:12]

        # Optionnel: logo société (si tu veux l’activer, décommente et mets ton chemin réel)
        # payload["company_logo_path"] = self._resolve_storage_path("/storage/assets/company_logo.png")

        return payload

    async def generate_report(self, analyse_id: int, admin_id: Optional[int] = None):
        try:
            existing_report = await report_repository.get_latest_by_analyse_id(analyse_id)
            if existing_report and existing_report.status == "generated" and existing_report.file_path:
                if os.path.exists(existing_report.file_path):
                    return existing_report

            payload = await self.build_report_payload(analyse_id)

            now = datetime.now()
            folder = os.path.join(self.REPORTS_BASE_DIR, str(now.year), f"{now.month:02d}")
            os.makedirs(folder, exist_ok=True)

            filename = f"rapport_analyse_{analyse_id}_{now.strftime('%Y%m%d_%H%M%S')}.pdf"
            file_path = os.path.join(folder, filename).replace("\\", "/")

            generate_analysis_report_pdf(file_path, payload)

            created_report = await report_repository.create_report(
                analyse_id=analyse_id,
                biologist_id=payload["biologist_id"],
                generated_by_admin_id=admin_id,
                report_name=f"Rapport Analyse #{analyse_id}",
                file_path=file_path,
                status="generated",
                comment=payload.get("short_conclusion") or "Rapport généré automatiquement.",
            )

            return created_report

        except Exception:
            import traceback
            traceback.print_exc()
            raise

    async def list_biologist_reports(self, biologist_id: int):
        return await report_repository.get_reports_by_biologist(biologist_id)

    async def get_report_by_id(self, report_id: int):
        return await report_repository.get_by_id(report_id)

    async def delete_report(self, report_id: int):
        report = await report_repository.get_by_id(report_id)
        if not report:
            return None

        if report.file_path and os.path.exists(report.file_path):
            try:
                os.remove(report.file_path)
            except Exception:
                pass

        await report_repository.delete_report(report_id)
        return report


report_service = ReportService()