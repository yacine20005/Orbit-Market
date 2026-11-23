"""
Routes for Destiny 2 manifest management
"""
import hmac
import json
import logging
import os
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Header, HTTPException

from backend import manifest_manager

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/manifest", tags=["manifest"])


def _verify_admin_token(
    x_admin_token: Optional[str], authorization: Optional[str]
) -> None:
    expected = os.getenv("MANIFEST_ADMIN_TOKEN", "").strip()
    if not expected:
        raise HTTPException(
            status_code=403,
            detail="Manifest updates are disabled (MANIFEST_ADMIN_TOKEN is not configured).",
        )

    provided = (x_admin_token or "").strip()
    if not provided and authorization and authorization.lower().startswith("bearer "):
        provided = authorization[7:].strip()

    if not provided or not hmac.compare_digest(provided, expected):
        raise HTTPException(
            status_code=401,
            detail="Invalid or missing admin token.",
        )


def _mtime_iso(path) -> str:
    return datetime.fromtimestamp(path.stat().st_mtime, tz=timezone.utc).isoformat()


@router.get("/status")
async def get_manifest_status():
    """Check local manifest status."""
    manifest_db_file = manifest_manager.MANIFEST_DB_FILE
    manifest_info_file = manifest_manager.MANIFEST_INFO_FILE

    exists = manifest_db_file.exists()
    status = {
        "manifest_exists": exists,
        "manifest_size": manifest_db_file.stat().st_size if exists else 0,
        "last_update": None,
        "version_path": None,
        "status": "available" if exists else "missing",
    }

    if manifest_info_file.exists():
        try:
            with open(manifest_info_file, "r", encoding="utf-8") as f:
                info = json.load(f)
                if isinstance(info, dict):
                    status["version_path"] = info.get("version_path")
                    status["last_update"] = info.get("last_update")
        except (json.JSONDecodeError, OSError) as exc:
            logger.error("Error reading manifest info file: %s", exc)

    if exists and not status["last_update"]:
        status["last_update"] = _mtime_iso(manifest_db_file)

    return status


@router.post("/update")
async def force_manifest_update(
    x_admin_token: Optional[str] = Header(default=None, alias="X-Admin-Token"),
    authorization: Optional[str] = Header(default=None, alias="Authorization"),
):
    """Trigger a manifest update (requires MANIFEST_ADMIN_TOKEN)."""
    _verify_admin_token(x_admin_token, authorization)

    try:
        logger.info("Forced manifest update requested.")
        result = await manifest_manager.update_manifest_if_needed()
        return {
            "status": "success",
            "updated": bool(result.get("updated")),
            "version_path": result.get("version_path"),
            "message": (
                "Manifest updated successfully"
                if result.get("updated")
                else "Manifest already up to date"
            ),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    except manifest_manager.ManifestUpdateError as exc:
        logger.error("Manifest update failed: %s", exc)
        raise HTTPException(status_code=502, detail="Manifest update failed.")
    except Exception as exc:
        logger.exception("Unexpected error during manifest update: %s", exc)
        raise HTTPException(status_code=500, detail="Internal error updating manifest.")


@router.get("/info")
async def get_manifest_info():
    """Get detailed manifest metadata without exposing server filesystem paths."""
    manifest_db_file = manifest_manager.MANIFEST_DB_FILE
    manifest_info_file = manifest_manager.MANIFEST_INFO_FILE

    if not manifest_db_file.exists():
        raise HTTPException(
            status_code=404,
            detail="Manifest not found. Please download the manifest first.",
        )

    info = {
        "file_name": manifest_db_file.name,
        "file_size": manifest_db_file.stat().st_size,
        "file_modified": _mtime_iso(manifest_db_file),
        "is_readable": os.access(manifest_db_file, os.R_OK),
    }

    if manifest_info_file.exists():
        try:
            with open(manifest_info_file, "r", encoding="utf-8") as f:
                stored_info = json.load(f)
                if isinstance(stored_info, dict):
                    info["version_path"] = stored_info.get("version_path")
                    info["last_update"] = stored_info.get("last_update")
        except (json.JSONDecodeError, OSError) as exc:
            logger.error("Error reading manifest metadata: %s", exc)

    return info
