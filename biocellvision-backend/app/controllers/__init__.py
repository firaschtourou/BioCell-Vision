# app/controllers/__init__.py
from .auth_controller import router as auth_router
from .user_controller import router as user_router  
from .analyse_controller import router as analyse_router
from .report_controller import router as report_router

__all__ = ['auth_router', 'user_router','analyse_router', 'report_router']