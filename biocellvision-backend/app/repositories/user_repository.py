# app/repositories/user_repository.py
from typing import List, Optional
from app.utils.database import db
from app.models.user_model import User
from app.utils.security import security
import logging

logger = logging.getLogger(__name__)

class UserRepository:
    
    # ========== LECTURE ==========
    async def get_by_email(self, email: str) -> Optional[User]:
        """Récupère un utilisateur par son email"""
        try:
            clean_email = email.strip().lower()
            
            row = await db.fetch_one(
                """
                SELECT id, nom, email, password, role, status, date_creation 
                FROM users 
                WHERE LOWER(TRIM(email)) = LOWER(TRIM($1))
                """,
                clean_email
            )
            
            if row:
                logger.info(f"✅ Utilisateur trouvé: {row['email']}")
                return User.from_dict(row)
            else:
                logger.warning(f"❌ Utilisateur non trouvé: {clean_email}")
                return None
                
        except Exception as e:
            logger.error(f"Erreur get_by_email: {e}")
            return None
    
    async def get_by_id(self, user_id: int) -> Optional[User]:
        """Récupère un utilisateur par son ID"""
        try:
            row = await db.fetch_one(
                """
                SELECT id, nom, email, password, role, status, date_creation 
                FROM users 
                WHERE id = $1
                """,
                user_id
            )
            return User.from_dict(row) if row else None
        except Exception as e:
            logger.error(f"Erreur get_by_id: {e}")
            return None
    
    # 🌟 NOUVELLE MÉTHODE get_all (BIEN INDENTÉE DANS LA CLASSE)
    async def get_all(self, role: Optional[str] = None, limit: int = 100, offset: int = 0) -> List[User]:
        """Récupère tous les utilisateurs avec pagination"""
        try:
            if role:
                rows = await db.fetch_all(
                    """
                    SELECT id, nom, email, password, role, status, date_creation 
                    FROM users 
                    WHERE role = $1 
                    ORDER BY id DESC 
                    LIMIT $2 OFFSET $3
                    """,
                    role, limit, offset
                )
            else:
                rows = await db.fetch_all(
                    """
                    SELECT id, nom, email, password, role, status, date_creation 
                    FROM users 
                    ORDER BY id DESC 
                    LIMIT $1 OFFSET $2
                    """,
                    limit, offset
                )
            
            logger.info(f"📋 {len(rows)} utilisateurs récupérés")
            return [User.from_dict(row) for row in rows]
            
        except Exception as e:
            logger.error(f"Erreur get_all: {e}")
            return []
    
    # 🌟 NOUVELLE MÉTHODE count (BIEN INDENTÉE DANS LA CLASSE)
    async def count(self, role: Optional[str] = None) -> int:
        """Compte le nombre d'utilisateurs"""
        try:
            if role:
                row = await db.fetch_one(
                    "SELECT COUNT(*) as count FROM users WHERE role = $1",
                    role
                )
            else:
                row = await db.fetch_one("SELECT COUNT(*) as count FROM users")
            
            count = row['count'] if row else 0
            logger.info(f"📊 Total utilisateurs: {count}")
            return count
            
        except Exception as e:
            logger.error(f"Erreur count: {e}")
            return 0
    
    # ========== CRÉATION ==========
    async def create(self, nom: str, email: str, password: str, role: str) -> Optional[User]:
        """Crée un nouvel utilisateur dans la base de données"""
        try:
            # Vérifier si l'email existe déjà
            existing = await self.get_by_email(email)
            if existing:
                logger.warning(f"Tentative de création avec email existant: {email}")
                return None
            
            # Hasher le mot de passe
            hashed_password = security.hash_password(password)
            
            # Insérer dans la base
            row = await db.fetch_one(
                """
                INSERT INTO users (nom, email, password, role, status, date_creation)
                VALUES ($1, $2, $3, $4, 1, NOW())
                RETURNING id, nom, email, password, role, status, date_creation
                """,
                nom.strip(),
                email.strip().lower(),
                hashed_password,
                role
            )
            
            if row:
                logger.info(f"✅ Utilisateur créé: {email} avec le rôle {role}")
                return User.from_dict(row)
            return None
            
        except Exception as e:
            logger.error(f"Erreur create user: {e}")
            return None
    
    # ========== MISE À JOUR ==========
    async def update(self, user_id: int, **kwargs) -> Optional[User]:
        """
        Met à jour un utilisateur de façon dynamique
        kwargs peut contenir: nom, email, role, status
        """
        try:
            # Vérifier que l'utilisateur existe
            existing = await self.get_by_id(user_id)
            if not existing:
                logger.warning(f"Tentative de mise à jour d'un utilisateur inexistant: {user_id}")
                return None
            
            # Vérifier si l'email est déjà utilisé (si changement d'email)
            if 'email' in kwargs:
                email_exists = await self.get_by_email(kwargs['email'])
                if email_exists and email_exists.id != user_id:
                    logger.warning(f"Email déjà utilisé: {kwargs['email']}")
                    return None
            
            # Construire la requête dynamiquement
            updates = []
            params = []
            param_index = 1
            
            # Champs autorisés à la mise à jour
            allowed_fields = ['nom', 'email', 'role', 'status']
            
            for field in allowed_fields:
                if field in kwargs and kwargs[field] is not None:
                    updates.append(f"{field} = ${param_index}")
                    if field == 'nom':
                        params.append(kwargs[field].strip())
                    else:
                        params.append(kwargs[field])
                    param_index += 1
            
            if not updates:
                return existing
            
            params.append(user_id)
            query = f"""
                UPDATE users 
                SET {', '.join(updates)}
                WHERE id = ${param_index}
                RETURNING id, nom, email, password, role, status, date_creation
            """
            
            row = await db.fetch_one(query, *params)
            
            if row:
                logger.info(f"✅ Utilisateur {user_id} mis à jour: {', '.join(updates)}")
                return User.from_dict(row)
            return None
            
        except Exception as e:
            logger.error(f"Erreur update user: {e}")
            return None
    
    async def update_password(self, user_id: int, new_password: str) -> bool:
        """Met à jour le mot de passe"""
        try:
            hashed = security.hash_password(new_password)
            result = await db.execute(
                "UPDATE users SET password = $1 WHERE id = $2",
                hashed, user_id
            )
            success = "UPDATE 1" in result
            if success:
                logger.info(f"✅ Mot de passe mis à jour pour l'utilisateur {user_id}")
            return success
        except Exception as e:
            logger.error(f"Erreur update_password: {e}")
            return False
    
    # ========== SUPPRESSION ==========
    async def delete(self, user_id: int) -> bool:
        """Supprime un utilisateur par son ID"""
        try:
            # Vérifier que l'utilisateur existe
            existing = await self.get_by_id(user_id)
            if not existing:
                logger.warning(f"Tentative de suppression d'un utilisateur inexistant: {user_id}")
                return False
            
            result = await db.execute(
                "DELETE FROM users WHERE id = $1",
                user_id
            )
            success = "DELETE 1" in result
            if success:
                logger.info(f"✅ Utilisateur {user_id} supprimé")
            return success
            
        except Exception as e:
            logger.error(f"Erreur delete user: {e}")
            return False
    
    # ========== AUTHENTIFICATION ==========
    async def verify_credentials(self, email: str, password: str) -> Optional[User]:
        """
        Vérifie les identifiants d'un utilisateur
        Compare le mot de passe en clair avec le hash dans la base
        """
        try:
            logger.info(f"🔐 Vérification des identifiants pour: {email}")
            
            user = await self.get_by_email(email)
            
            if not user:
                logger.warning(f"❌ Utilisateur non trouvé: {email}")
                return None
            
            is_valid = security.verify_password(password, user.password)
            
            if is_valid:
                logger.info(f"✅ Mot de passe valide pour: {email}")
                return user
            else:
                logger.warning(f"❌ Mot de passe invalide pour: {email}")
                return None
                
        except Exception as e:
            logger.error(f"Erreur verify_credentials: {e}")
            return None

# Instance unique du repository
user_repository = UserRepository()