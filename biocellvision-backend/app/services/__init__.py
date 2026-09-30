# app/services/__init__.py
from .email_service import email_service, EmailService
from .auth_service import auth_service, AuthService
from .user_service import user_service, UserService  # NOUVEAU

__all__ = [
    'email_service', 'EmailService',
    'auth_service', 'AuthService',
    'user_service', 'UserService'  # NOUVEAU
]