# app/config.py
from pydantic_settings import BaseSettings
from dotenv import load_dotenv
import os

load_dotenv()


class Settings(BaseSettings):
    # Database
    DB_NAME: str = os.getenv("DB_NAME", "biocellvision_db")
    DB_USER: str = os.getenv("DB_USER", "postgres")
    DB_PASSWORD: str = os.getenv("DB_PASSWORD", "")
    DB_HOST: str = os.getenv("DB_HOST", "localhost")
    DB_PORT: str = os.getenv("DB_PORT", "5432")

    # Email
    MAIL_SERVER: str = os.getenv("MAIL_SERVER", "smtp.gmail.com")
    MAIL_PORT: int = int(os.getenv("MAIL_PORT", 587))
    MAIL_USE_TLS: bool = os.getenv("MAIL_USE_TLS", "True") == "True"
    MAIL_USERNAME: str = os.getenv("MAIL_USERNAME", "")
    MAIL_PASSWORD: str = os.getenv("MAIL_PASSWORD", "")
    MAIL_DEFAULT_SENDER: str = os.getenv("MAIL_DEFAULT_SENDER", "")

    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "dev-key")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Redis
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    # CORS
    CORS_ORIGINS: list[str] = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

    # App
    DEBUG: bool = os.getenv("DEBUG", "True") == "True"
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", 8001))

    # Storage
    STORAGE_ROOT: str = os.getenv("STORAGE_ROOT", "C:/Users/fchto/Desktop/storage")
    UPLOAD_ANALYSES_DIR: str = os.getenv(
        "UPLOAD_ANALYSES_DIR",
        "C:/Users/fchto/Desktop/storage/uploads/analyses",
    )
    OUTPUT_ANNOTATED_DIR: str = os.getenv(
        "OUTPUT_ANNOTATED_DIR",
        "C:/Users/fchto/Desktop/storage/outputs/annotated",
    )

    # AI
    AI_PYTHON_PATH: str = os.getenv(
        "AI_PYTHON_PATH",
        r"C:/Users/fchto/Desktop/test computer vision/cellules-mini-projet/Test_Hematologie/venv_hema/Scripts/python.exe",
    )
    AI_SCRIPT_PATH: str = os.getenv(
        "AI_SCRIPT_PATH",
        r"C:/Users/fchto/Desktop/test computer vision/cellules-mini-projet/Test_Hematologie/segmentation/predict_multi_cells_combined.py",
    )

    # ✅ IMPORTANT: chemin ABSOLU vers inference_anomaly.yaml (évite FileNotFoundError relatif)
    AI_ANOMALY_CONFIG_PATH: str = os.getenv(
        "AI_ANOMALY_CONFIG_PATH",
        r"C:/Users/fchto/Desktop/BIOCELL VISION/AiModule/configs/inference_anomaly.yaml",
    )

    AI_TIMEOUT_SECONDS: int = int(os.getenv("AI_TIMEOUT_SECONDS", "300"))

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()