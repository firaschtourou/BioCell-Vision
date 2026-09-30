# app/repositories/resultat_repository.py
from typing import Optional, Any
import json
import logging

from app.utils.database import db
from app.models.resultat_model import Resultat

logger = logging.getLogger(__name__)


class ResultatRepository:
    async def create_pending(self, analyse_id: int) -> Optional[Resultat]:
        try:
            row = await db.fetch_one(
                """
                INSERT INTO resultats (
                    analyse_id,
                    status,
                    validation_status,
                    anomaly_type,
                    created_at,
                    updated_at
                )
                VALUES (
                    $1, 'pending', 'pending', NULL, NOW(), NOW()
                )
                RETURNING
                    id,
                    analyse_id,
                    predicted_class,
                    global_state,
                    confidence,
                    total_cells,
                    normal_cells,
                    abnormal_cells,
                    ai_explanation,
                    short_conclusion,
                    predicted_cells_json,
                    annotated_image_path,
                    model_version,
                    status,
                    biologist_comment,
                    validation_status,
                    anomaly_type,
                    created_at,
                    updated_at
                """,
                analyse_id,
            )
            return Resultat.from_dict(row) if row else None
        except Exception as e:
            logger.error(f"💥 Erreur create_pending resultat: {e}", exc_info=True)
            return None

    async def get_by_analyse_id(self, analyse_id: int) -> Optional[Resultat]:
        try:
            row = await db.fetch_one(
                """
                SELECT
                    id,
                    analyse_id,
                    predicted_class,
                    global_state,
                    confidence,
                    total_cells,
                    normal_cells,
                    abnormal_cells,
                    ai_explanation,
                    short_conclusion,
                    predicted_cells_json,
                    annotated_image_path,
                    model_version,
                    status,
                    biologist_comment,
                    validation_status,
                    anomaly_type,
                    created_at,
                    updated_at
                FROM resultats
                WHERE analyse_id = $1
                """,
                analyse_id,
            )
            return Resultat.from_dict(row) if row else None
        except Exception as e:
            logger.error(f"💥 Erreur get_by_analyse_id resultat: {e}", exc_info=True)
            return None

    async def update_ai_result(
        self,
        analyse_id: int,
        predicted_class: Optional[str],
        global_state: Optional[str],
        confidence: Optional[float],
        total_cells: int,
        normal_cells: int,
        abnormal_cells: int,
        ai_explanation: Optional[str],
        short_conclusion: Optional[str],
        predicted_cells_json: Optional[Any],
        annotated_image_path: Optional[str],
        model_version: Optional[str],
        anomaly_type: Optional[str] = None,
        status: str = "generated",
    ) -> Optional[Resultat]:
        """
        predicted_cells_json peut être:
        - list de cellules
        - dict {cells:[...]}
        - string json
        -> on la sérialise si nécessaire.
        """
        try:
            serialized_cells = None

            if predicted_cells_json is None:
                serialized_cells = None
            elif isinstance(predicted_cells_json, str):
                # Si c'est déjà une string JSON
                serialized_cells = predicted_cells_json
            else:
                # list/dict -> json dumps
                serialized_cells = json.dumps(predicted_cells_json, ensure_ascii=False)

            row = await db.fetch_one(
                """
                UPDATE resultats
                SET predicted_class = $1,
                    global_state = $2,
                    confidence = $3,
                    total_cells = $4,
                    normal_cells = $5,
                    abnormal_cells = $6,
                    ai_explanation = $7,
                    short_conclusion = $8,
                    predicted_cells_json = $9::jsonb,
                    annotated_image_path = $10,
                    model_version = $11,
                    anomaly_type = $12,
                    status = $13,
                    updated_at = NOW()
                WHERE analyse_id = $14
                RETURNING
                    id,
                    analyse_id,
                    predicted_class,
                    global_state,
                    confidence,
                    total_cells,
                    normal_cells,
                    abnormal_cells,
                    ai_explanation,
                    short_conclusion,
                    predicted_cells_json,
                    annotated_image_path,
                    model_version,
                    status,
                    biologist_comment,
                    validation_status,
                    anomaly_type,
                    created_at,
                    updated_at
                """,
                predicted_class,
                global_state,
                confidence,
                total_cells,
                normal_cells,
                abnormal_cells,
                ai_explanation,
                short_conclusion,
                serialized_cells,
                annotated_image_path,
                model_version,
                anomaly_type,
                status,
                analyse_id,
            )

            return Resultat.from_dict(row) if row else None
        except Exception as e:
            logger.error(f"💥 Erreur update_ai_result: {e}", exc_info=True)
            return None

    async def update_validation(
        self,
        analyse_id: int,
        validation_status: str,
        biologist_comment: Optional[str] = None,
        status: Optional[str] = None,
    ) -> Optional[Resultat]:
        try:
            final_status = status if status else validation_status

            row = await db.fetch_one(
                """
                UPDATE resultats
                SET validation_status = $1,
                    biologist_comment = $2,
                    status = $3,
                    updated_at = NOW()
                WHERE analyse_id = $4
                RETURNING
                    id,
                    analyse_id,
                    predicted_class,
                    global_state,
                    confidence,
                    total_cells,
                    normal_cells,
                    abnormal_cells,
                    ai_explanation,
                    short_conclusion,
                    predicted_cells_json,
                    annotated_image_path,
                    model_version,
                    status,
                    biologist_comment,
                    validation_status,
                    anomaly_type,
                    created_at,
                    updated_at
                """,
                validation_status,
                biologist_comment.strip() if biologist_comment else None,
                final_status,
                analyse_id,
            )

            return Resultat.from_dict(row) if row else None
        except Exception as e:
            logger.error(f"💥 Erreur update_validation resultat: {e}", exc_info=True)
            return None


resultat_repository = ResultatRepository()