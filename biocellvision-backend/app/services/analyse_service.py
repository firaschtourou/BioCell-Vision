from typing import Any, Dict, Optional, List
import logging
from datetime import datetime, date
from pathlib import Path

from fastapi import UploadFile

from app.config import settings
from app.repositories.analyse_repository import analyse_repository
from app.repositories.resultat_repository import resultat_repository
from app.services.file_storage_service import file_storage_service
from app.services.ai_service import ai_service

logger = logging.getLogger(__name__)


class AnalyseService:
    ALLOWED_ANALYSIS_TYPES = {"hematologie", "spermogramme", "immunofluorescent"}

    def _validate_business_data(
        self,
        client_name: str,
        analysis_type: str,
        parameters: str,
        notes: Optional[str] = None,
    ) -> Dict[str, Any]:
        try:
            client_name = (client_name or "").strip()
            analysis_type = (analysis_type or "").strip()
            parameters = (parameters or "").strip()
            notes = notes.strip() if notes else None

            if not client_name:
                return {"success": False, "message": "Le nom du client est obligatoire."}
            if len(client_name) < 2:
                return {"success": False, "message": "Le nom du client est trop court."}
            if not analysis_type:
                return {"success": False, "message": "Le type d'analyse est obligatoire."}
            if analysis_type not in self.ALLOWED_ANALYSIS_TYPES:
                return {"success": False, "message": "Type d'analyse invalide."}
            if not parameters:
                return {"success": False, "message": "Les paramètres d'analyse sont obligatoires."}

            return {
                "success": True,
                "data": {
                    "client_name": client_name,
                    "analysis_type": analysis_type,
                    "parameters": parameters,
                    "notes": notes,
                },
            }
        except Exception as e:
            logger.error(f"💥 Erreur validation métier: {e}", exc_info=True)
            return {"success": False, "message": f"Erreur de validation métier: {str(e)}"}

    def _to_public_storage_url(self, file_path: Optional[str]) -> Optional[str]:
        if not file_path:
            return None
        try:
            normalized = str(file_path).replace("\\", "/").strip()

            if normalized.startswith("/storage/"):
                return normalized
            if normalized == "/storage":
                return normalized
            if normalized.startswith("storage/"):
                return f"/{normalized}"

            storage_root = str(Path(settings.STORAGE_ROOT)).replace("\\", "/").rstrip("/")
            normalized_lower = normalized.lower()
            storage_root_lower = storage_root.lower()

            if normalized_lower.startswith(storage_root_lower):
                relative = normalized[len(storage_root) :].lstrip("/")
                return f"/storage/{relative}"

            marker = "/storage/"
            idx = normalized_lower.find(marker)
            if idx != -1:
                return normalized[idx:]

            return None
        except Exception as e:
            logger.error(f"💥 Erreur _to_public_storage_url: {e}", exc_info=True)
            return None

    def _normalize_predicted_cells(self, predicted_cells: Any) -> List[Dict[str, Any]]:
        if not predicted_cells or not isinstance(predicted_cells, list):
            return []

        normalized: List[Dict[str, Any]] = []

        for index, cell in enumerate(predicted_cells, start=1):
            if not isinstance(cell, dict):
                continue

            cell_id = cell.get("id", index)
            try:
                cell_id = int(cell_id)
            except Exception:
                cell_id = index

            label = (
                cell.get("label")
                or cell.get("predicted_class")
                or cell.get("cell_label")
                or f"Cellule {index:02d}"
            )
            label = str(label)

            state_raw = cell.get("state") or cell.get("cell_state") or cell.get("result_state")
            if state_raw is None:
                anomaly_detected = cell.get("anomaly_detected")
                state_raw = "Anormale" if anomaly_detected else "Normale"

            state_raw = str(state_raw).strip()
            state_ui = state_raw if state_raw in {"Normale", "Anormale"} else "Anormale"

            predicted_class = cell.get("predicted_class")
            if predicted_class is None:
                predicted_class = label

            anomaly_type = cell.get("anomaly_type")
            anomaly_conf = cell.get("anomaly_confidence")

            try:
                if anomaly_conf is None:
                    anomaly_conf = None
                else:
                    anomaly_conf = float(anomaly_conf)
            except Exception:
                anomaly_conf = None

            normalized.append(
                {
                    "id": cell_id,
                    "label": label,
                    "predicted_class": str(predicted_class),
                    "state": state_ui,
                    "anomaly_type": anomaly_type,
                    "anomaly_confidence": anomaly_conf,
                    "isolated_image_path": self._to_public_storage_url(cell.get("isolated_image_path")),
                }
            )

        normalized.sort(key=lambda x: x["id"])
        return normalized

    # =========================================================
    # ✅ ADMIN: get_admin_analysis_overview (RÉPARATION)
    # =========================================================
    async def get_admin_analysis_overview(
        self,
        search: Optional[str],
        filter_date: Optional[str],
        filter_status: Optional[str],
        page: int,
        per_page: int,
    ) -> Dict[str, Any]:
        """
        Retour format EXACT conforme:
        AdminAnalysisListResponse
        """
        try:
            search = (search or "").strip()
            filter_status = (filter_status or "all").strip()
            filter_date = (filter_date or "").strip()  # format "YYYY-MM-DD" côté front

            # items paginés depuis repository
            analyses_result = await analyse_repository.get_admin_analyses(
                search=search or None,
                filter_date=filter_date or None,
                filter_status=filter_status or "all",
                page=page,
                per_page=per_page,
            )

            total = int(analyses_result.get("total", 0) or 0)
            rows = analyses_result.get("items", []) or []

            # stats globales
            stats_row = await analyse_repository.get_admin_analysis_stats()
            stats = {
                "total": int(stats_row.get("total", 0) or 0),
                "validees": int(stats_row.get("validees", 0) or 0),
                "en_attente": int(stats_row.get("en_attente", 0) or 0),
                "rejetees": int(stats_row.get("rejetees", 0) or 0),
                "avec_anomalies": int(stats_row.get("avec_anomalies", 0) or 0),
            }

            # total_pages (selon total global)
            total_pages = max(1, (total + per_page - 1) // per_page)

            items: List[Dict[str, Any]] = []
            for r in rows:
                # r est un Record/Dict-like de db.fetch_all
                # on convertit champs pour matcher le front + schema
                created_at = r.get("created_at") if hasattr(r, "get") else None
                if created_at is None:
                    created_at = r.get("date") if hasattr(r, "get") else None

                predicted_class = r.get("predicted_class")
                global_state = r.get("global_state")
                validation_status = r.get("validation_status")

                # validation front attend: "validé" | "en_attente" | "rejeté"
                # repository filtre sur validation_status déjà mappé. Mais ici on renvoie tel quel.
                validation = validation_status
                if validation is None:
                    validation = "pending"

                # conversion "pending" => "en_attente"
                if str(validation).lower() == "pending":
                    validation = "en_attente"
                elif str(validation).lower() == "validated":
                    validation = "validé"
                elif str(validation).lower() == "rejected":
                    validation = "rejeté"

                anomalie = str(global_state).lower() == "anormale"

                # image URL publique
                image = self._to_public_storage_url(r.get("image_path") if hasattr(r, "get") else None) or self._to_public_storage_url(r.get("image") if hasattr(r, "get") else None)

                # description anomaly: ton repository ne renvoie pas anomaly_type,
                # donc on met None (le front gère via title optionnel)
                description_anomalie = r.get("description_anomalie") if hasattr(r, "get") else None
                if description_anomalie is None:
                    description_anomalie = r.get("short_conclusion") if hasattr(r, "get") else None

                # Type analyse et cellule: ta DB n’a pas "cellule"
                # donc on renvoie None / ou type_analyse pour cellule si vide
                cellule = None

                items.append(
                    {
                        "id": int(r["id"]),
                        "date": created_at,
                        "biologiste": r.get("biologiste"),
                        "email": r.get("email"),
                        "client_name": r.get("client_name"),
                        "type_analyse": r.get("analysis_type"),
                        "cellule": cellule,
                        "image": image,
                        "anomalie": anomalie,
                        "description_anomalie": description_anomalie,
                        "validation": validation,
                        "notes": r.get("notes"),
                        "analysis_status": None,  # non dispo dans query repository
                        "result_status": r.get("result_status"),
                        "confidence": r.get("confidence"),
                    }
                )

            return {
                "success": True,
                "items": items,
                "stats": stats,
                "total": total,
                "page": page,
                "per_page": per_page,
                "total_pages": total_pages,
            }

        except Exception as e:
            logger.error(f"💥 get_admin_analysis_overview: {e}", exc_info=True)
            return {"success": False, "message": f"Erreur récupération analyses admin: {str(e)}"}

    # =========================================================
    # ✅ tout le reste: tu peux garder ton code actuel
    # (je le remets identique à ton fichier sauf admin)
    # =========================================================

    async def create_analysis(
        self,
        client_name: str,
        analysis_type: str,
        parameters: str,
        notes: Optional[str],
        biologist_id: int,
        image: UploadFile,
    ) -> Dict[str, Any]:
        try:
            logger.info("🧪 Début create_analysis")

            business_validation = self._validate_business_data(
                client_name=client_name,
                analysis_type=analysis_type,
                parameters=parameters,
                notes=notes,
            )
            if not business_validation["success"]:
                return business_validation

            validated_data = business_validation["data"]

            file_result = await file_storage_service.save_file(image)
            if not file_result["success"]:
                return file_result

            analyse = await analyse_repository.create(
                client_name=validated_data["client_name"],
                analysis_type=validated_data["analysis_type"],
                parameters=validated_data["parameters"],
                notes=validated_data["notes"],
                original_image_name=file_result["original_image_name"],
                stored_image_name=file_result["stored_image_name"],
                image_path=file_result["image_path"],
                image_size=file_result["image_size"],
                mime_type=file_result["mime_type"],
                status="uploaded",
                biologist_id=biologist_id,
            )

            if not analyse:
                return {"success": False, "message": "Erreur lors de la création de l'analyse en base."}

            resultat = await resultat_repository.create_pending(analyse_id=analyse.id)
            if not resultat:
                await analyse_repository.update_status(analyse.id, "failed")
                return {"success": False, "message": "Erreur lors de la création du résultat initial."}

            return {
                "success": True,
                "message": "Analyse créée avec succès. Traitement IA lancé en arrière-plan.",
                "analysis_id": analyse.id,
                "status": analyse.status,
                "created_at": analyse.created_at,
            }

        except Exception as e:
            logger.error(f"💥 Erreur create_analysis: {e}", exc_info=True)
            return {"success": False, "message": f"Erreur lors de la création de l'analyse: {str(e)}"}

    async def process_analysis_background(self, analysis_id: int) -> None:
        try:
            logger.info("🚀 Background processing démarré pour analysis_id=%s", analysis_id)
            await self._process_analysis_core(analysis_id)
        except Exception as e:
            logger.error(f"💥 Erreur task background analyse_id={analysis_id}: {e}", exc_info=True)

    async def process_analysis(self, analysis_id: int) -> Dict[str, Any]:
        return await self._process_analysis_core(analysis_id)

    async def _process_analysis_core(self, analysis_id: int) -> Dict[str, Any]:
        try:
            analyse = await analyse_repository.get_by_id(analysis_id)
            if not analyse:
                return {"success": False, "message": "Analyse non trouvée."}

            resultat = await resultat_repository.get_by_analyse_id(analysis_id)
            if not resultat:
                return {"success": False, "message": "Résultat initial non trouvé pour cette analyse."}

            if analyse.status == "completed" and resultat.status in {"generated", "validated", "rejected"}:
                return {
                    "success": True,
                    "message": "Analyse déjà traitée.",
                    "analysis_id": analysis_id,
                    "analysis_status": analyse.status,
                    "result_status": resultat.status,
                }

            await analyse_repository.update_status(analysis_id, "processing")

            ai_result = await ai_service.predict(analyse.image_path)
            if not ai_result.get("success"):
                await analyse_repository.update_status(analysis_id, "failed")
                await resultat_repository.update_validation(
                    analyse_id=analysis_id,
                    validation_status="pending",
                    biologist_comment=ai_result.get("message", "Erreur lors du traitement IA."),
                    status="failed",
                )
                return {"success": False, "message": ai_result.get("message", "Le traitement IA a échoué.")}

            ai_data = ai_result["data"]

            updated_result = await resultat_repository.update_ai_result(
                analyse_id=analysis_id,
                predicted_class=ai_data.get("predicted_class"),
                global_state=ai_data.get("global_state"),
                confidence=ai_data.get("confidence"),
                total_cells=ai_data.get("total_cells", 0),
                normal_cells=ai_data.get("normal_cells", 0),
                abnormal_cells=ai_data.get("abnormal_cells", 0),
                ai_explanation=ai_data.get("ai_explanation"),
                short_conclusion=ai_data.get("short_conclusion"),
                predicted_cells_json=ai_data.get("predicted_cells"),
                annotated_image_path=ai_data.get("annotated_image_path"),
                model_version=ai_data.get("model_version"),
                anomaly_type=ai_data.get("anomaly_type"),
                status="generated",
            )

            if not updated_result:
                await analyse_repository.update_status(analysis_id, "failed")
                return {"success": False, "message": "Le résultat IA n'a pas pu être enregistré."}

            await analyse_repository.update_status(analysis_id, "completed")

            return {
                "success": True,
                "message": "Analyse IA terminée avec succès.",
                "analysis_id": analysis_id,
                "analysis_status": "completed",
                "result_status": "generated",
            }

        except Exception as e:
            logger.error(f"💥 Erreur _process_analysis_core: {e}", exc_info=True)
            try:
                await analyse_repository.update_status(analysis_id, "failed")
                await resultat_repository.update_validation(
                    analyse_id=analysis_id,
                    validation_status="pending",
                    biologist_comment="Erreur interne lors du traitement IA.",
                    status="failed",
                )
            except Exception:
                logger.error("💥 Erreur rollback logique _process_analysis_core", exc_info=True)

            return {"success": False, "message": f"Erreur lors du traitement de l'analyse: {str(e)}"}

    async def get_result_detail(self, analysis_id: int) -> Dict[str, Any]:
        try:
            analyse = await analyse_repository.get_by_id(analysis_id)
            if not analyse:
                return {"success": False, "message": "Analyse non trouvée."}

            resultat = await resultat_repository.get_by_analyse_id(analysis_id)
            if not resultat:
                return {"success": False, "message": "Résultat non trouvé pour cette analyse."}

            predicted_cells = self._normalize_predicted_cells(resultat.predicted_cells_json)

            original_image_public_path = self._to_public_storage_url(analyse.image_path)
            annotated_image_public_path = self._to_public_storage_url(resultat.annotated_image_path)

            data = {
                "analysis_id": analyse.id,
                "result_id": resultat.id,
                "client_name": analyse.client_name,
                "analysis_type": analyse.analysis_type,
                "parameters": analyse.parameters,
                "notes": analyse.notes,
                "image_name": analyse.original_image_name,
                "original_image_path": original_image_public_path or "",
                "annotated_image_path": annotated_image_public_path,
                "analysis_status": analyse.status,
                "result_status": resultat.status,
                "predicted_class": resultat.predicted_class,
                "global_state": resultat.global_state,
                "confidence": resultat.confidence,
                "total_cells": resultat.total_cells,
                "normal_cells": resultat.normal_cells,
                "abnormal_cells": resultat.abnormal_cells,
                "short_conclusion": resultat.short_conclusion,
                "ai_explanation": resultat.ai_explanation,
                "anomaly_type": resultat.anomaly_type,
                "predicted_cells": predicted_cells,
                "biologist_comment": resultat.biologist_comment,
                "validation_status": resultat.validation_status,
                "created_at": resultat.created_at,
                "updated_at": resultat.updated_at,
            }

            return {"success": True, "data": data}

        except Exception as e:
            logger.error(f"💥 Erreur get_result_detail: {e}", exc_info=True)
            return {"success": False, "message": f"Erreur lors de la récupération du détail résultat: {str(e)}"}

    async def validate_result(self, analysis_id: int, comment: Optional[str] = None) -> Dict[str, Any]:
        try:
            analyse = await analyse_repository.get_by_id(analysis_id)
            if not analyse:
                return {"success": False, "message": "Analyse non trouvée."}

            resultat = await resultat_repository.get_by_analyse_id(analysis_id)
            if not resultat:
                return {"success": False, "message": "Résultat non trouvé."}

            updated_result = await resultat_repository.update_validation(
                analyse_id=analysis_id,
                validation_status="validated",
                biologist_comment=comment,
                status="validated",
            )

            if not updated_result:
                return {"success": False, "message": "Impossible de valider le résultat."}

            return {
                "success": True,
                "message": "Résultat validé avec succès.",
                "analysis_id": analysis_id,
                "result_id": updated_result.id,
                "validation_status": updated_result.validation_status,
                "biologist_comment": updated_result.biologist_comment,
                "updated_at": updated_result.updated_at,
            }

        except Exception as e:
            logger.error(f"💥 Erreur validate_result: {e}", exc_info=True)
            return {"success": False, "message": f"Erreur lors de la validation du résultat: {str(e)}"}

    async def reject_result(self, analysis_id: int, comment: Optional[str] = None) -> Dict[str, Any]:
        try:
            analyse = await analyse_repository.get_by_id(analysis_id)
            if not analyse:
                return {"success": False, "message": "Analyse non trouvée."}

            resultat = await resultat_repository.get_by_analyse_id(analysis_id)
            if not resultat:
                return {"success": False, "message": "Résultat non trouvé."}

            updated_result = await resultat_repository.update_validation(
                analyse_id=analysis_id,
                validation_status="rejected",
                biologist_comment=comment,
                status="rejected",
            )

            if not updated_result:
                return {"success": False, "message": "Impossible de rejeter le résultat."}

            return {
                "success": True,
                "message": "Résultat rejeté.",
                "analysis_id": analysis_id,
                "result_id": updated_result.id,
                "validation_status": updated_result.validation_status,
                "biologist_comment": updated_result.biologist_comment,
                "updated_at": updated_result.updated_at,
            }

        except Exception as e:
            logger.error(f"💥 Erreur reject_result: {e}", exc_info=True)
            return {"success": False, "message": f"Erreur lors du rejet du résultat: {str(e)}"}


analyse_service = AnalyseService()