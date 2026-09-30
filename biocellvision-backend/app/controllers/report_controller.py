# app/controllers/report_controller.py
import os
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse

from app.models.schemas import (
    ReportGenerateResponse,
    ReportListResponse,
    ReportItemResponse,
    ReportDeleteResponse,
)
from app.services.auth_service import get_current_user
from app.services.report_service import report_service


router = APIRouter(prefix="/api/reports", tags=["Reports"])


@router.post("/generate/{analyse_id}", response_model=ReportGenerateResponse)
async def generate_report(analyse_id: int, current_user=Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Seul l'admin peut générer un rapport PDF")

    try:
        report = await report_service.generate_report(
            analyse_id=analyse_id,
            admin_id=current_user.id
        )

        return ReportGenerateResponse(
            success=True,
            message="Rapport PDF généré avec succès",
            report_id=report.id,
            analyse_id=report.analyse_id,
            status=report.status,
            download_url=f"/api/reports/download/{report.id}"
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur génération rapport: {str(e)}")


@router.get("/biologist/my-reports", response_model=ReportListResponse)
async def get_my_reports(current_user=Depends(get_current_user)):
    if current_user.role != "biologist":
        raise HTTPException(status_code=403, detail="Accès réservé au biologiste")

    reports = await report_service.list_biologist_reports(current_user.id)

    items = []
    for report in reports:
        items.append(
            ReportItemResponse(
                id=report.id,
                analyse_id=report.analyse_id,
                client_name=None,
                report_name=report.report_name,
                date=report.created_at,
                status="disponible" if report.status == "generated" else "en_attente",
                comment=report.comment,
                download_url=f"/api/reports/download/{report.id}"
            )
        )

    return ReportListResponse(
        success=True,
        items=items,
        total=len(items)
    )


@router.get("/download/{report_id}")
async def download_report(report_id: int, current_user=Depends(get_current_user)):
    report = await report_service.get_report_by_id(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Rapport introuvable")

    if current_user.role == "biologist" and report.biologist_id != current_user.id:
        raise HTTPException(status_code=403, detail="Accès non autorisé à ce rapport")

    if current_user.role not in ["admin", "biologist"]:
        raise HTTPException(status_code=403, detail="Accès refusé")

    if not report.file_path or not os.path.exists(report.file_path):
        raise HTTPException(status_code=404, detail="Fichier PDF introuvable")

    return FileResponse(
        path=report.file_path,
        media_type="application/pdf",
        filename=os.path.basename(report.file_path)
    )


@router.delete("/{report_id}", response_model=ReportDeleteResponse)
async def delete_report(report_id: int, current_user=Depends(get_current_user)):
    if current_user.role != "biologist":
        raise HTTPException(status_code=403, detail="Seul le biologiste peut supprimer son rapport")

    report = await report_service.get_report_by_id(report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Rapport introuvable")

    if report.biologist_id != current_user.id:
        raise HTTPException(status_code=403, detail="Suppression non autorisée")

    deleted_report = await report_service.delete_report(report_id)

    return ReportDeleteResponse(
        success=True,
        message="Rapport supprimé avec succès",
        report_id=deleted_report.id
    )
