# app/utils/security.py
import bcrypt
import secrets
import string

class SecurityUtils:
    @staticmethod
    def hash_password(password: str) -> str:
        """Hash un mot de passe"""
        salt = bcrypt.gensalt()
        hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
        return hashed.decode('utf-8')
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Vérifie un mot de passe"""
        return bcrypt.checkpw(
            plain_password.encode('utf-8'),
            hashed_password.encode('utf-8')
        )
    
    @staticmethod
    def generate_code(length: int = 6) -> str:
        """Génère un code à 6 chiffres"""
        return ''.join(secrets.choice(string.digits) for _ in range(length))

security = SecurityUtils()