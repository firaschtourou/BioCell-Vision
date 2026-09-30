# app/controllers/user_controller.py
from typing import Optional

from fastapi import APIRouter, HTTPException, status, Query, Depends
from app.models.schemas import (
    UserCreate, UserResponse, 
    UserCreateResponse, UserListResponse, UserUpdate
)
from app.services.user_service import user_service
import logging

logger = logging.getLogger(__name__)

# Création du router pour les endpoints utilisateurs
router = APIRouter(prefix="/api/users", tags=["Users"])

# ========== CRÉATION ==========
@router.post("/", response_model=UserCreateResponse, status_code=status.HTTP_201_CREATED)
async def create_user(user_data: UserCreate):
    """
    Créer un nouvel utilisateur
    
    - **nom**: Nom complet (min 3 caractères)
    - **email**: Adresse email valide
    - **password**: Mot de passe (min 8 caractères, avec majuscule et chiffre)
    - **role**: Rôle de l'utilisateur (admin ou biologist)
    """
    logger.info(f"📝 [UserController] Création d'utilisateur: {user_data.email}")
    
    result = await user_service.create_user(
        nom=user_data.nom,
        email=user_data.email,
        password=user_data.password,
        role=user_data.role
    )
    
    if not result['success']:
        if "existe déjà" in result['message']:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=result['message'])
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=result['message'])
    
    return result

# ========== LECTURE ==========
# app/controllers/user_controller.py
@router.get("/", response_model=UserListResponse)
async def get_all_users(
    role: Optional[str] = Query(None, pattern='^(admin|biologist)$', description="Filtrer par rôle"),
    page: int = Query(1, ge=1, description="Numéro de page"),
    limit: int = Query(20, ge=1, le=100, description="Nombre d'éléments par page")
):
    """
    Récupère tous les utilisateurs avec pagination
    """
    logger.info(f"📝 [UserController] Récupération des utilisateurs - page {page}, rôle: {role}")
    
    result = await user_service.get_all_users(role, page, limit)
    
    if not result['success']:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail=result.get('message', 'Erreur inconnue')
        )
    
    return result

@router.get("/{user_id}", response_model=UserResponse)
async def get_user_by_id(user_id: int):
    """
    Récupère un utilisateur par son ID
    """
    logger.info(f"📝 [UserController] Récupération de l'utilisateur {user_id}")
    
    result = await user_service.get_user_by_id(user_id)
    
    if not result['success']:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=result['message'])
    
    return result['user']

# ========== MISE À JOUR ==========
@router.put("/{user_id}", response_model=UserResponse)
async def update_user(user_id: int, user_data: UserUpdate):
    """
    Met à jour un utilisateur de façon partielle
    Seuls les champs fournis seront mis à jour
    """
    logger.info(f"📝 [UserController] Mise à jour utilisateur {user_id}")
    
    # Convertir les données en dictionnaire en excluant les None
    update_data = {k: v for k, v in user_data.dict().items() if v is not None}
    
    result = await user_service.update_user(user_id, **update_data)
    
    if not result['success']:
        if "non trouvé" in result['message']:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=result['message'])
        if "déjà utilisé" in result['message']:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=result['message'])
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=result['message'])
    
    return result['user']

# ========== SUPPRESSION ==========
@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(user_id: int):
    """
    Supprime un utilisateur
    """
    logger.info(f"🗑️ [UserController] Suppression utilisateur {user_id}")
    
    result = await user_service.delete_user(user_id)
    
    if not result['success']:
        if "non trouvé" in result['message']:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=result['message'])
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=result['message'])
    
    return None  # 204 No Content
