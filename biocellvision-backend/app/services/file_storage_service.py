# app/services/file_storage_service.py
import uuid
import logging
from pathlib import Path
from typing import Dict, Any
from fastapi import UploadFile

from app.config import settings

logger = logging.getLogger(__name__)


class FileStorageService:
    ALLOWED_MIME_TYPES = {
        "image/png": ".png",
        "image/jpeg": ".jpg",
        "image/jpg": ".jpg",
        "image/webp": ".webp",
    }

    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB

    def __init__(self, base_upload_dir: str | None = None):
        self.base_upload_dir = Path(base_upload_dir or settings.UPLOAD_ANALYSES_DIR)

    def ensure_directories(self) -> None:
        self.base_upload_dir.mkdir(parents=True, exist_ok=True)
        logger.info(f"📁 Dossier de stockage prêt: {self.base_upload_dir}")

    def validate_mime_type(self, file: UploadFile) -> Dict[str, Any]:
        mime_type = (file.content_type or "").strip().lower()

        if mime_type not in self.ALLOWED_MIME_TYPES:
            return {
                "success": False,
                "message": "Type de fichier non autorisé. Utilisez PNG, JPG, JPEG ou WEBP."
            }

        return {
            "success": True,
            "mime_type": mime_type
        }

    async def validate_file_size(self, file: UploadFile) -> Dict[str, Any]:
        try:
            content = await file.read()
            file_size = len(content)
            await file.seek(0)

            if file_size == 0:
                return {
                    "success": False,
                    "message": "Le fichier est vide."
                }

            if file_size > self.MAX_FILE_SIZE:
                return {
                    "success": False,
                    "message": f"Le fichier dépasse la taille maximale autorisée ({self.MAX_FILE_SIZE // (1024 * 1024)} MB)."
                }

            return {
                "success": True,
                "file_size": file_size
            }

        except Exception as e:
            logger.error(f"💥 Erreur validation taille fichier: {e}", exc_info=True)
            return {
                "success": False,
                "message": f"Erreur lors de la validation de la taille du fichier: {str(e)}"
            }

    def generate_unique_filename(self, mime_type: str) -> str:
        extension = self.ALLOWED_MIME_TYPES.get(mime_type, "")
        return f"{uuid.uuid4()}{extension}"

    async def save_file(self, file: UploadFile) -> Dict[str, Any]:
        try:
            if not file:
                return {
                    "success": False,
                    "message": "Aucun fichier fourni."
                }

            mime_validation = self.validate_mime_type(file)
            if not mime_validation["success"]:
                return mime_validation

            mime_type = mime_validation["mime_type"]

            size_validation = await self.validate_file_size(file)
            if not size_validation["success"]:
                return size_validation

            file_size = size_validation["file_size"]

            self.ensure_directories()

            stored_image_name = self.generate_unique_filename(mime_type)
            file_path = self.base_upload_dir / stored_image_name

            content = await file.read()
            with open(file_path, "wb") as f:
                f.write(content)

            await file.seek(0)

            logger.info(f"✅ Fichier sauvegardé: {file_path}")

            return {
                "success": True,
                "message": "Fichier sauvegardé avec succès.",
                "original_image_name": file.filename,
                "stored_image_name": stored_image_name,
                "image_path": str(file_path).replace("\\", "/"),
                "image_size": file_size,
                "mime_type": mime_type
            }

        except Exception as e:
            logger.error(f"💥 Erreur sauvegarde fichier: {e}", exc_info=True)
            return {
                "success": False,
                "message": f"Erreur lors de la sauvegarde du fichier: {str(e)}"
            }


file_storage_service = FileStorageService()