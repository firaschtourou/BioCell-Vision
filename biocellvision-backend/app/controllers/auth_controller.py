# app/controllers/auth_controller.py
from fastapi import APIRouter, HTTPException, status
import logging

from app.models.schemas import (
    UserLogin,
    EmailRequest,
    CodeVerification,
    PasswordReset,
    AuthResponse,
    PasswordResetResponse,
    LoginResponse,
)
from app.services.auth_service import auth_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/login", response_model=LoginResponse, status_code=status.HTTP_200_OK)
async def login(data: UserLogin):
    logger.info(f"🔐 [AuthController] Login demandé pour: {data.email}")

    result = await auth_service.login(data.email, data.password)

    if not result["success"]:
        status_code = result.get("status_code", 401)
        raise HTTPException(
            status_code=status_code,
            detail=result.get("message", "Erreur d'authentification.")
        )

    return result


@router.post("/request-reset", response_model=AuthResponse, status_code=status.HTTP_200_OK)
async def request_reset(data: EmailRequest):
    result = await auth_service.request_reset(data.email)
    if not result["success"]:
        message = result.get("message", "Erreur lors de la demande de reset.")

        if "non trouvé" in message.lower():
            raise HTTPException(status_code=404, detail=message)

        raise HTTPException(status_code=500, detail=message)

    return result


@router.post("/verify-code", response_model=PasswordResetResponse, status_code=status.HTTP_200_OK)
async def verify_code(data: CodeVerification):
    result = await auth_service.verify_code(data.email, data.code)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result


@router.post("/reset-password", response_model=AuthResponse, status_code=status.HTTP_200_OK)
async def reset_password(data: PasswordReset):
    result = await auth_service.reset_password(data.user_id, data.new_password)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result