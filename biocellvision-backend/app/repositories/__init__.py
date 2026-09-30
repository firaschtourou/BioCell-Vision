# app/repositories/__init__.py
from .user_repository import user_repository, UserRepository
from .analyse_repository import analyse_repository, AnalyseRepository
from .resultat_repository import resultat_repository, ResultatRepository
from .report_repository import report_repository, ReportRepository


__all__ = ['user_repository', 'UserRepository','report_repository','analyse_repository','AnalyseRepository','ResultatRepository','resultat_repository','ReportRepository',]