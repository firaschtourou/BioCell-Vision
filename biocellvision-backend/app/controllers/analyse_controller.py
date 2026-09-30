# app/controllers/analyse_controller.py
from typing import Optional

from fastapi import (
    APIRouter,
    HTTPException,
    Query,
    status,
    UploadFile,
    File,
    Form,
    BackgroundTasks,
    Depends,
)
import logging

from app.services.analyse_service import analyse_service
from app.models.schemas import (
    AdminAnalysisListResponse,
    AnalysisCreateResponse,
    ResultDetailResponse,
    BiologistValidationRequest,
    BiologistValidationResponse,
)
from app.services.auth_service import get_current_user

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/analyses", tags=["Analyses"])


@router.post("/", response_model=AnalysisCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_analysis(
    background_tasks: BackgroundTasks,
    clientName: str = Form(...),
    analysisType: str = Form(...),
    parameters: str = Form(...),
    notes: str = Form(""),
    image: UploadFile = File(...),
    current_user=Depends(get_current_user),
):
    logger.info(
        "🧪 [AnalyseController] Création analyse pour client: %s par user_id=%s",
        clientName,
        current_user.id,
    )

    result = await analyse_service.create_analysis(
        client_name=clientName,
        analysis_type=analysisType,
        parameters=parameters,
        notes=notes,
        biologist_id=current_user.id,
        image=image,
    )

    if not result["success"]:
        message = result.get("message", "Erreur lors de la création de l'analyse.")

        msg = message.lower()
        if "obligatoire" in msg or "invalide" in msg or "trop court" in msg:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=message)

        if "fichier" in msg or "type de fichier" in msg or "taille" in msg:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=message)

        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=message)

    background_tasks.add_task(analyse_service.process_analysis_background, result["analysis_id"])
    return result


@router.post("/{analysis_id}/process", status_code=status.HTTP_200_OK)
async def process_analysis(analysis_id: int):
    logger.info("🤖 [AnalyseController] Traitement manuel analyse_id=%s", analysis_id)
    result = await analyse_service.process_analysis(analysis_id)

    if not result["success"]:
        message = result.get("message", "Erreur lors du traitement de l'analyse.")

        if "non trouvée" in message.lower() or "non trouv" in message.lower():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=message)

        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=message)

    return result


@router.get("/resultats/{analysis_id}", response_model=ResultDetailResponse, status_code=status.HTTP_200_OK)
async def get_result_detail(analysis_id: int):
    logger.info("📊 [AnalyseController] Lecture résultat analyse_id=%s", analysis_id)
    result = await analyse_service.get_result_detail(analysis_id)

    if not result["success"]:
        message = result.get("message", "Erreur lors de la récupération du résultat.")
        if "non trouvé" in message.lower() or "non trouvé" in message.lower():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=message)

        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=message)

    return result["data"]


@router.put(
    "/resultats/{analysis_id}/validate",
    response_model=BiologistValidationResponse,
    status_code=status.HTTP_200_OK,
)
async def validate_result(analysis_id: int, payload: BiologistValidationRequest):
    logger.info("✅ [AnalyseController] Validation résultat analyse_id=%s", analysis_id)
    result = await analyse_service.validate_result(analysis_id=analysis_id, comment=payload.comment)

    if not result["success"]:
        message = result.get("message", "Erreur lors de la validation du résultat.")
        if "non trouvé" in message.lower():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=message)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=message)

    return result


@router.put(
    "/resultats/{analysis_id}/reject",
    response_model=BiologistValidationResponse,
    status_code=status.HTTP_200_OK,
)
async def reject_result(analysis_id: int, payload: BiologistValidationRequest):
    logger.info("❌ [AnalyseController] Rejet résultat analyse_id=%s", analysis_id)
    result = await analyse_service.reject_result(analysis_id=analysis_id, comment=payload.comment)

    if not result["success"]:
        message = result.get("message", "Erreur lors du rejet du résultat.")
        if "non trouvé" in message.lower():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=message)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=message)

    return result


@router.get("/admin/overview", response_model=AdminAnalysisListResponse, status_code=status.HTTP_200_OK)
async def get_admin_analysis_overview(
    search: Optional[str] = Query(None),
    filter_date: Optional[str] = Query(None),
    filter_status: Optional[str] = Query("all"),
    page: int = Query(1, ge=1),
    per_page: int = Query(10, ge=1, le=100),
):
    logger.info("📋 [AnalyseController] Lecture overview admin analyses")
    result = await analyse_service.get_admin_analysis_overview(
        search=search,
        filter_date=filter_date,
        filter_status=filter_status,
        page=page,
        per_page=per_page,
    )

    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=result.get("message", "Erreur récupération analyses admin."),
        )

    return result