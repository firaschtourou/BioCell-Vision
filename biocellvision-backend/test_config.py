# test_config.py
from app.config import settings

print("CORS_ORIGINS:", settings.CORS_ORIGINS)
print("DB_NAME:", settings.DB_NAME)
print("DEBUG:", settings.DEBUG)