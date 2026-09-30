# app/services/auth_service.py
from typing import Any, Dict, Optional
import json
import logging
import os
from datetime import datetime, timedelta, timezone

import jwt
import redis.asyncio as redis
from jwt import ExpiredSignatureError, InvalidTokenError
from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

from app.config import settings
from app.repositories.user_repository import user_repository
from app.services.email_service import email_service
from app.utils.security import security


logger = logging.getLogger(__name__)
security_scheme = HTTPBearer()


class AuthService:
    def __init__(self):
        self.redis_client = None
        self.code_expiry = 900  # 15 minutes

        self.secret_key = os.getenv(
            "JWT_SECRET_KEY",
            getattr(settings, "JWT_SECRET_KEY", "change_this_secret_key")
        )
        self.algorithm = "HS256"
        self.access_token_expire_minutes = 60 * 8  # 8 heures

    # =========================
    # REDIS
    # =========================
    async def init_redis(self):
        """Initialise la connexion Redis une seule fois."""
        try:
            if not self.redis_client:
                self.redis_client = await redis.from_url(
                    settings.REDIS_URL,
                    decode_responses=True
                )
                logger.info("✅ Redis connecté")
        except Exception as e:
            logger.error(f"💥 Erreur connexion Redis: {e}", exc_info=True)
            raise

    async def close_redis(self):
        """Ferme proprement la connexion Redis."""
        try:
            if self.redis_client:
                await self.redis_client.close()
                self.redis_client = None
                logger.info("🔌 Redis déconnecté")
        except Exception as e:
            logger.error(f"💥 Erreur fermeture Redis: {e}", exc_info=True)

    # =========================
    # JWT
    # =========================
    def create_access_token(self, data: Dict[str, Any]) -> str:
        """
        Génère un JWT contenant les données utilisateur.
        """
        to_encode = data.copy()
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=self.access_token_expire_minutes
        )
        to_encode.update({"exp": expire})

        token = jwt.encode(
            payload=to_encode,
            key=self.secret_key,
            algorithm=self.algorithm
        )

        if isinstance(token, bytes):
            token = token.decode("utf-8")

        return token

    def decode_access_token(self, token: str) -> Optional[Dict[str, Any]]:
        """
        Décode et valide un JWT.
        Retourne le payload ou None si invalide/expiré.
        """
        try:
            payload = jwt.decode(
                jwt=token,
                key=self.secret_key,
                algorithms=[self.algorithm]
            )
            return payload
        except ExpiredSignatureError:
            logger.warning("⚠️ JWT expiré")
            return None
        except InvalidTokenError:
            logger.warning("⚠️ JWT invalide")
            return None
        except Exception as e:
            logger.error(f"💥 Erreur decode JWT: {e}", exc_info=True)
            return None

    # =========================
    # LOGIN
    # =========================
    async def login(self, email: str, password: str) -> Dict[str, Any]:
        """
        Authentifie l'utilisateur et retourne user + JWT.
        """
        try:
            logger.info(f"🔐 Tentative de login pour: {email}")

            user = await user_repository.verify_credentials(email, password)

            if not user:
                logger.warning(f"❌ Échec login pour: {email}")
                return {
                    "success": False,
                    "message": "Email ou mot de passe incorrect",
                    "status_code": 401
                }

            if getattr(user, "status", 0) != 1:
                logger.warning(f"⛔ Utilisateur inactif: {email}")
                return {
                    "success": False,
                    "message": "Utilisateur inactif",
                    "status_code": 403
                }

            access_token = self.create_access_token({
                "sub": str(user.id),
                "email": user.email,
                "role": user.role
            })

            logger.info(f"✅ Login réussi pour: {email}, rôle: {user.role}")

            return {
                "success": True,
                "message": "Connexion réussie.",
                "access_token": access_token,
                "token_type": "bearer",
                "user": {
                    "id": user.id,
                    "nom": user.nom,
                    "email": user.email,
                    "role": user.role,
                    "status": user.status,
                    "date_creation": user.date_creation
                }
            }

        except Exception as e:
            logger.error(f"💥 Erreur dans login: {e}", exc_info=True)
            return {
                "success": False,
                "message": "Erreur serveur lors du login.",
                "status_code": 500
            }

    # =========================
    # PASSWORD RESET - STEP 1
    # =========================
    async def request_reset(self, email: str) -> Dict[str, Any]:
        """
        Étape 1: Demande de reset.
        Vérifie l'utilisateur, génère un code, le stocke dans Redis, puis envoie l'email.
        """
        try:
            await self.init_redis()

            user = await user_repository.get_by_email(email)
            if not user:
                logger.warning(f"❌ Email non trouvé: {email}")
                return {
                    "success": False,
                    "message": "Email non trouvé"
                }

            reset_code = security.generate_code()
            code_data = {
                "user_id": user.id,
                "email": email,
                "code": reset_code
            }

            await self.redis_client.setex(
                f"reset:{email}",
                timedelta(seconds=self.code_expiry),
                json.dumps(code_data)
            )
            logger.info(f"✅ Code stocké pour {email}: {reset_code}")

            sent = await email_service.send_reset_code(email, reset_code)

            if not sent:
                logger.error(f"❌ Échec envoi email à {email}")
                return {
                    "success": False,
                    "message": "Erreur d'envoi d'email"
                }

            logger.info(f"✅ Email envoyé à {email}")
            return {
                "success": True,
                "message": "Code envoyé"
            }

        except Exception as e:
            logger.error(f"💥 Erreur request_reset: {e}", exc_info=True)
            return {
                "success": False,
                "message": f"Erreur: {str(e)}"
            }

    # =========================
    # PASSWORD RESET - STEP 2
    # =========================
    async def verify_code(self, email: str, code: str) -> Dict[str, Any]:
        """
        Étape 2: Vérification du code envoyé par email.
        """
        try:
            await self.init_redis()

            data = await self.redis_client.get(f"reset:{email}")
            if not data:
                logger.warning(f"❌ Code expiré ou introuvable pour {email}")
                return {
                    "success": False,
                    "message": "Code expiré ou inexistant"
                }

            code_data = json.loads(data)

            if code_data["code"] != code:
                logger.warning(f"❌ Code invalide pour {email}")
                return {
                    "success": False,
                    "message": "Code invalide"
                }

            logger.info(f"✅ Code valide pour {email}")
            return {
                "success": True,
                "message": "Code valide",
                "user_id": code_data["user_id"]
            }

        except Exception as e:
            logger.error(f"💥 Erreur verify_code: {e}", exc_info=True)
            return {
                "success": False,
                "message": f"Erreur: {str(e)}"
            }

    # =========================
    # PASSWORD RESET - STEP 3
    # =========================
    async def reset_password(self, user_id: int, new_password: str) -> Dict[str, Any]:
        """
        Étape 3: Mise à jour du mot de passe puis suppression du code Redis.
        """
        try:
            updated = await user_repository.update_password(user_id, new_password)

            if not updated:
                logger.error(f"❌ Échec mise à jour mot de passe pour user {user_id}")
                return {
                    "success": False,
                    "message": "Erreur de mise à jour"
                }

            logger.info(f"✅ Mot de passe mis à jour pour user {user_id}")

            user = await user_repository.get_by_id(user_id)
            if user:
                await self.init_redis()
                await self.redis_client.delete(f"reset:{user.email}")
                logger.info(f"✅ Code supprimé pour {user.email}")

            return {
                "success": True,
                "message": "Mot de passe mis à jour"
            }

        except Exception as e:
            logger.error(f"💥 Erreur reset_password: {e}", exc_info=True)
            return {
                "success": False,
                "message": f"Erreur: {str(e)}"
            }


auth_service = AuthService()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security_scheme)
):
    """
    Retourne l'utilisateur courant à partir du token JWT.
    """
    token = credentials.credentials
    payload = auth_service.decode_access_token(token)

    if not payload:
        raise HTTPException(status_code=401, detail="Token invalide ou expiré")

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Token invalide")

    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        raise HTTPException(status_code=401, detail="ID utilisateur invalide dans le token")

    user = await user_repository.get_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable")

    if getattr(user, "status", 0) != 1:
        raise HTTPException(status_code=403, detail="Utilisateur inactif")

    return user
