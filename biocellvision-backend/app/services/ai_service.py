# app/services/ai_service.py
import asyncio
import json
import logging
import os
import subprocess
from pathlib import Path
from typing import Any, Dict, Optional, List

from app.config import settings

logger = logging.getLogger(__name__)


class AIService:
    NORMAL_CLASSES = {"normal", "normale", "healthy", "benign"}

    # clés candidates que ton script peut renvoyer (selon versions)
    SAVED_PATH_CANDIDATES = (
        "annotated_image_path",
        "annotated_path",
        "overlay_path",
        "overlay",
        "overlay_path",
        "figure_path",
        "figure",
        "original_path",
        "mask_path",
        "mask_path",
        "output_dir",
    )

    def __init__(self) -> None:
        self.ai_python_path = str(settings.AI_PYTHON_PATH).strip()
        self.ai_script_path = str(settings.AI_SCRIPT_PATH).strip()
        self.ai_anomaly_config_path = str(settings.AI_ANOMALY_CONFIG_PATH).strip()
        self.ai_timeout_seconds = int(settings.AI_TIMEOUT_SECONDS)

        self._pythonpath_root, self._cwd = self._compute_pythonpath_and_cwd()

    # ===============================
    # cwd + PYTHONPATH (IMPORTANT)
    # ===============================
    def _compute_pythonpath_and_cwd(self) -> tuple[str, str]:
        script = Path(self.ai_script_path).resolve()  # .../segmentation/predict_multi_cells_combined.py
        # segmentation/ doit être importable => on ajoute le parent du dossier segmentation
        # ex: root = .../cellules-mini-projet/Test_Hematologie
        pythonpath_root = str(script.parent.parent)
        # cwd => dossier segmentation
        cwd = str(script.parent)
        return pythonpath_root, cwd

    # -----------------------------
    # Validations
    # -----------------------------
    def validate_paths(self) -> Dict[str, Any]:
        py = Path(self.ai_python_path)
        sc = Path(self.ai_script_path)
        cfg = Path(self.ai_anomaly_config_path)

        if not py.exists() or not py.is_file():
            return {"success": False, "message": f"AI_PYTHON_PATH introuvable: {py}"}
        if not sc.exists() or not sc.is_file():
            return {"success": False, "message": f"AI_SCRIPT_PATH introuvable: {sc}"}
        if not cfg.exists() or not cfg.is_file():
            return {"success": False, "message": f"AI_ANOMALY_CONFIG_PATH introuvable: {cfg}"}

        return {"success": True}

    # -----------------------------
    # Disk path -> /storage/... url
    # -----------------------------
    def _to_public_storage_url(self, file_path: Optional[str]) -> Optional[str]:
        if not file_path:
            return None
        try:
            normalized = str(file_path).replace("\\", "/").strip()

            # URL complète
            if normalized.startswith("http://") or normalized.startswith("https://"):
                return normalized

            # URL relative /storage/...
            if normalized.startswith("/storage/") or normalized == "/storage":
                return normalized

            # parfois "storage/..."
            if normalized.startswith("storage/"):
                return "/" + normalized

            storage_root = str(settings.STORAGE_ROOT).replace("\\", "/").rstrip("/").lower()
            normalized_lower = normalized.lower()

            # convertit chemins absolus disque vers /storage/...
            if normalized_lower.startswith(storage_root):
                relative = normalized[len(settings.STORAGE_ROOT) :].lstrip("/").replace("\\", "/")
                return "/storage/" + relative

            # fallback: marker
            marker = "/storage/"
            idx = normalized_lower.find(marker)
            if idx != -1:
                return normalized[idx:]

            return None
        except Exception as e:
            logger.error("Erreur _to_public_storage_url: %s", e, exc_info=True)
            return None

    # -----------------------------
    # Command builder
    # -----------------------------
    def _build_command(self, image_path: str) -> List[str]:
        return [
            self.ai_python_path,
            self.ai_script_path,
            "--image",
            image_path,
            "--no_show",
            "--json_only",
            "--anomaly_config",
            self.ai_anomaly_config_path,
        ]

    # -----------------------------
    # Safe helpers
    # -----------------------------
    @staticmethod
    def _safe_float(v: Any) -> Optional[float]:
        if v is None:
            return None
        try:
            return float(v)
        except (TypeError, ValueError):
            return None

    @staticmethod
    def _safe_int(v: Any, default: int = 0) -> int:
        try:
            return int(v)
        except (TypeError, ValueError):
            return default

    @staticmethod
    def _safe_probabilities(probabilities: Any) -> Dict[str, float]:
        if not isinstance(probabilities, dict):
            return {}
        out: Dict[str, float] = {}
        for k, v in probabilities.items():
            try:
                out[str(k)] = float(v)
            except (TypeError, ValueError):
                pass
        return out

    @staticmethod
    def _normalize_saved_paths(saved_paths: Any) -> Dict[str, str]:
        if not isinstance(saved_paths, dict):
            return {}
        out: Dict[str, str] = {}
        for k, v in saved_paths.items():
            if isinstance(v, (str, os.PathLike)):
                out[str(k)] = str(v)
        return out

    def _pick_existing_path(self, saved_paths: Dict[str, str]) -> Optional[str]:
        if not saved_paths:
            return None
        for key in self.SAVED_PATH_CANDIDATES:
            candidate = saved_paths.get(key)
            if not candidate:
                continue
            p = Path(str(candidate))
            if p.exists() and p.is_file():
                return str(p).replace("\\", "/")

        for _, v in saved_paths.items():
            p = Path(str(v))
            if p.exists() and p.is_file():
                return str(p).replace("\\", "/")
        return None

    @staticmethod
    def _extract_json(text: str) -> Dict[str, Any]:
        s = (text or "").strip()
        if not s:
            raise ValueError("stdout vide")
        try:
            raw = json.loads(s)
        except json.JSONDecodeError:
            # heuristique : extraire dernier bloc {...}
            start = s.find("{")
            end = s.rfind("}")
            if start == -1 or end == -1 or end <= start:
                raise
            raw = json.loads(s[start : end + 1])
        if not isinstance(raw, dict):
            raise ValueError("JSON IA invalide: attendu dict")
        return raw

    # -----------------------------
    # subprocess (core)
    # -----------------------------
    def _run_ai(self, cmd: List[str]) -> subprocess.CompletedProcess:
        env = os.environ.copy()
        env.setdefault("PYTHONUTF8", "1")
        env.setdefault("PYTHONIOENCODING", "utf-8")

        # ✅ Fix segmentation imports
        env["PYTHONPATH"] = self._pythonpath_root + os.pathsep + env.get("PYTHONPATH", "")

        return subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=self.ai_timeout_seconds,
            env=env,
            cwd=self._cwd,  # ✅ cwd = .../segmentation
        )

    # ===============================
    # predict
    # ===============================
    async def predict(self, image_path: str) -> Dict[str, Any]:
        try:
            validation = self.validate_paths()
            if not validation.get("success"):
                return validation

            img = Path(image_path)
            if not img.exists() or not img.is_file():
                return {"success": False, "message": f"Image introuvable: {image_path}"}

            cmd = self._build_command(str(img))
            logger.info("🤖 Lancement module IA")
            logger.info("   cmd=%s", cmd)
            logger.info("   cwd=%s", self._cwd)
            logger.info("   PYTHONPATH root=%s", self._pythonpath_root)

            proc = await asyncio.to_thread(self._run_ai, cmd)
            stdout = proc.stdout or ""
            stderr = proc.stderr or ""

            if proc.returncode != 0:
                logger.error("❌ IA error code=%s\nSTDERR:\n%s", proc.returncode, stderr[-4000:])
                return {"success": False, "message": "Le module IA a échoué."}

            if not stdout.strip():
                return {"success": False, "message": "Le module IA a retourné aucun stdout."}

            raw = self._extract_json(stdout)

            predicted_cells = raw.get("predicted_cells") or []
            if not isinstance(predicted_cells, list):
                predicted_cells = []

            total_cells = self._safe_int(raw.get("total_cells", raw.get("num_cells", len(predicted_cells))), default=0)

            predicted_class = raw.get("predicted_class") or "unknown"
            global_state = raw.get("global_state")
            if not global_state:
                global_state = "Normale" if str(predicted_class).strip().lower() in self.NORMAL_CLASSES else "Anormale"

            confidence = self._safe_float(raw.get("confidence"))
            confidence_percent: Optional[float] = None
            if confidence is not None:
                confidence_percent = round(confidence * 100.0, 2) if confidence <= 1.5 else round(confidence, 2)

            saved_paths = self._normalize_saved_paths(raw.get("saved_paths") or {})

            annotated_image_path = raw.get("annotated_image_path")
            if annotated_image_path is None:
                annotated_image_path = self._pick_existing_path(saved_paths)

            annotated_image_path_public = self._to_public_storage_url(annotated_image_path)

            # cellules : convertir isolated_image_path
            fixed_predicted_cells: List[Dict[str, Any]] = []
            for cell in predicted_cells:
                if not isinstance(cell, dict):
                    continue
                c = dict(cell)
                iso = c.get("isolated_image_path")
                if iso is not None:
                    c["isolated_image_path"] = self._to_public_storage_url(str(iso))
                fixed_predicted_cells.append(c)

            anomaly_type_ui = raw.get("anomaly_type") or "Aucune anomalie détectée"

            ai_explanation = raw.get("ai_explanation") or raw.get("short_conclusion") or "Analyse effectuée."
            short_conclusion = raw.get("short_conclusion") or ""

            normal_cells = self._safe_int(raw.get("normal_cells", 0), default=0)
            abnormal_cells = self._safe_int(raw.get("abnormal_cells", 0), default=0)

            # cohérence
            if normal_cells + abnormal_cells != total_cells and total_cells > 0:
                abnormal_cells = total_cells if global_state == "Anormale" else 0
                normal_cells = total_cells if global_state == "Normale" else 0

            return {
                "success": True,
                "message": "Prediction IA effectuée avec succès.",
                "data": {
                    "predicted_class": predicted_class,
                    "global_state": global_state,
                    "confidence": confidence_percent,
                    "total_cells": total_cells,
                    "normal_cells": normal_cells,
                    "abnormal_cells": abnormal_cells,
                    "ai_explanation": ai_explanation,
                    "short_conclusion": short_conclusion,
                    "predicted_cells": fixed_predicted_cells,
                    "anomaly_type": anomaly_type_ui,
                    "annotated_image_path": annotated_image_path_public,
                    "saved_paths": saved_paths,
                    "raw_probabilities": self._safe_probabilities(
                        raw.get("probabilities") or raw.get("raw_probabilities") or {}
                    ),
                },
            }

        except subprocess.TimeoutExpired:
            return {"success": False, "message": "Le module IA a dépassé le temps maximal autorisé."}
        except Exception as e:
            logger.error("Erreur AIService.predict: %s", e, exc_info=True)
            return {"success": False, "message": f"Erreur lors de l'exécution du module IA: {str(e)}"}


# ✅ IMPORTANT : ne supprime pas ça, sinon ton backend plante à l’import
ai_service = AIService()