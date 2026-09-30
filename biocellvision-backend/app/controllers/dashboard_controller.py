# app/controllers/dashboard_controller.py
from fastapi import APIRouter, Depends, HTTPException, status

from app.services.auth_service import get_current_user
from app.services.dashboard_service import dashboard_service

router = APIRouter(prefix="/api/admin/dashboard", tags=["Admin Dashboard"])


@router.get("/stats", status_code=status.HTTP_200_OK)
async def get_admin_dashboard_stats(current_user=Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès réservé à l'administrateur"
        )

    result = await dashboard_service.get_admin_dashboard()

    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=result.get("message", "Erreur dashboard admin")
        )

    return result