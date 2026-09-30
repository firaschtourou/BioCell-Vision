# app/services/user_service.py
from typing import Any, Dict, Optional, List
from app.repositories.user_repository import user_repository
from app.utils.security import security
import logging

logger = logging.getLogger(__name__)

class UserService:
    """Service dédié à la gestion des utilisateurs"""
    
    # ========== CRÉATION ==========
    async def create_user(self, nom: str, email: str, password: str, role: str) -> Dict[str, Any]:
        """Crée un nouvel utilisateur"""
        try:
            logger.info(f"👤 [UserService] Tentative de création: {email}")
            
            # Vérifier si l'utilisateur existe déjà
            existing = await user_repository.get_by_email(email)
            if existing:
                logger.warning(f"❌ Email déjà existant: {email}")
                return {
                    'success': False,
                    'message': 'Un utilisateur avec cet email existe déjà'
                }
            
            # Validation du rôle
            if role not in ['admin', 'biologist']:
                return {
                    'success': False,
                    'message': 'Rôle invalide. Doit être "admin" ou "biologist"'
                }
            
            # Créer l'utilisateur
            user = await user_repository.create(nom, email, password, role)
            
            if user:
                logger.info(f"✅ Utilisateur créé: {email} avec le rôle {role}")
                return {
                    'success': True,
                    'message': 'Utilisateur créé avec succès',
                    'user': user.to_dict(),
                    'password': password
                }
            else:
                return {
                    'success': False,
                    'message': 'Erreur lors de la création de l\'utilisateur'
                }
                
        except Exception as e:
            logger.error(f"💥 Erreur dans create_user: {e}", exc_info=True)
            return {
                'success': False,
                'message': f'Erreur serveur: {str(e)}'
            }
    
    # ========== LECTURE ==========
    async def get_all_users(self, role: Optional[str] = None, page: int = 1, per_page: int = 20) -> Dict[str, Any]:
        """Récupère tous les utilisateurs avec pagination"""
        try:
            offset = (page - 1) * per_page
            users = await user_repository.get_all(role, per_page, offset)
            total = await user_repository.count(role)
            
            return {
                'success': True,
                'total': total,
                'page': page,
                'per_page': per_page,
                'total_pages': (total + per_page - 1) // per_page if total > 0 else 1,
                'users': [user.to_dict() for user in users]
            }
            
        except Exception as e:
            logger.error(f"Erreur get_all_users: {e}")
            return {
                'success': False,
                'message': f'Erreur: {str(e)}',
                'users': []
            }
    
    async def get_user_by_id(self, user_id: int) -> Dict[str, Any]:
        """Récupère un utilisateur par son ID"""
        try:
            user = await user_repository.get_by_id(user_id)
            if user:
                return {
                    'success': True,
                    'user': user.to_dict()
                }
            return {
                'success': False,
                'message': 'Utilisateur non trouvé'
            }
        except Exception as e:
            logger.error(f"Erreur get_user_by_id: {e}")
            return {
                'success': False,
                'message': f'Erreur: {str(e)}'
            }
    
    # ========== MISE À JOUR ==========
    async def update_user(self, user_id: int, **kwargs) -> Dict[str, Any]:
        """
        Met à jour un utilisateur de façon flexible
        kwargs peut contenir: nom, email, role, status
        """
        try:
            logger.info(f"📝 [UserService] Mise à jour utilisateur {user_id} avec: {kwargs}")
            
            # Vérifier que l'utilisateur existe
            existing = await user_repository.get_by_id(user_id)
            if not existing:
                return {
                    'success': False,
                    'message': 'Utilisateur non trouvé'
                }
            
            # Validation du rôle si fourni
            if 'role' in kwargs and kwargs['role'] not in ['admin', 'biologist']:
                return {
                    'success': False,
                    'message': 'Rôle invalide. Doit être "admin" ou "biologist"'
                }
            
            # Validation du statut si fourni
            if 'status' in kwargs and kwargs['status'] not in [0, 1]:
                return {
                    'success': False,
                    'message': 'Statut invalide. Doit être 0 (inactif) ou 1 (actif)'
                }
            
            # Validation de l'email si fourni
            if 'email' in kwargs:
                email_exists = await user_repository.get_by_email(kwargs['email'])
                if email_exists and email_exists.id != user_id:
                    return {
                        'success': False,
                        'message': 'Cet email est déjà utilisé par un autre utilisateur'
                    }
            
            # Mettre à jour l'utilisateur
            updated_user = await user_repository.update(user_id, **kwargs)
            
            if updated_user:
                return {
                    'success': True,
                    'message': 'Utilisateur mis à jour avec succès',
                    'user': updated_user.to_dict()
                }
            
            return {
                'success': False,
                'message': 'Erreur lors de la mise à jour'
            }
            
        except Exception as e:
            logger.error(f"Erreur update_user: {e}")
            return {
                'success': False,
                'message': f'Erreur serveur: {str(e)}'
            }
    
    # ========== SUPPRESSION ==========
    async def delete_user(self, user_id: int) -> Dict[str, Any]:
        """Supprime un utilisateur"""
        try:
            logger.info(f"🗑️ [UserService] Tentative de suppression utilisateur {user_id}")
            
            # Vérifier que l'utilisateur existe
            existing = await user_repository.get_by_id(user_id)
            if not existing:
                return {
                    'success': False,
                    'message': 'Utilisateur non trouvé'
                }
            
            # Empêcher la suppression de soi-même
            # Note: Vous devrez passer l'ID de l'utilisateur connecté
            # if current_user_id == user_id:
            #     return {
            #         'success': False,
            #         'message': 'Vous ne pouvez pas supprimer votre propre compte'
            #     }
            
            deleted = await user_repository.delete(user_id)
            
            if deleted:
                logger.info(f"✅ Utilisateur {user_id} supprimé avec succès")
                return {
                    'success': True,
                    'message': 'Utilisateur supprimé avec succès'
                }
            
            return {
                'success': False,
                'message': 'Erreur lors de la suppression'
            }
            
        except Exception as e:
            logger.error(f"Erreur delete_user: {e}")
            return {
                'success': False,
                'message': f'Erreur serveur: {str(e)}'
            }


# Instance unique du service
user_service = UserService()