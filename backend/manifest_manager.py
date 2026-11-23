import asyncio
import json
import logging
import os
import shutil
import tempfile
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

import httpx

try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:
    pass

logger = logging.getLogger(__name__)

BUNGIE_API_URL = "https://www.bungie.net/Platform"

MANIFEST_DIRECTORY = Path(__file__).parent / "manifest"
MANIFEST_DB_FILE = MANIFEST_DIRECTORY / "manifest.sqlite"
MANIFEST_INFO_FILE = MANIFEST_DIRECTORY / "manifest_info.json"
MANIFEST_DIRECTORY.mkdir(exist_ok=True)

_manifest_lock = asyncio.Lock()


class ManifestUpdateError(RuntimeError):
    """Raised when Destiny 2 manifest metadata, download, or extraction fails."""


def _get_bungie_api_key() -> str:
    key = os.getenv("BUNGIE_API_KEY", "").strip()
    if not key:
        raise ManifestUpdateError("BUNGIE_API_KEY environment variable is not set.")
    return key


async def get_manifest_metadata() -> Optional[dict[str, Any]]:
    """Fetch Destiny 2 Manifest metadata from the Bungie.net API."""
    api_key = _get_bungie_api_key()
    headers = {"X-API-Key": api_key}
    url = f"{BUNGIE_API_URL}/Destiny2/Manifest/"

    logger.info("Fetching Destiny 2 manifest metadata from Bungie.net...")
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            payload = response.json()
            if payload.get("ErrorCode", 1) != 1:
                logger.error(
                    "Bungie manifest metadata returned ErrorCode=%s (%s)",
                    payload.get("ErrorCode"),
                    payload.get("ErrorStatus"),
                )
                return None
            return payload
    except httpx.HTTPStatusError as exc:
        logger.error(
            "HTTP %d fetching manifest metadata", exc.response.status_code
        )
        return None
    except httpx.RequestError as exc:
        logger.error("Network error fetching manifest metadata: %s", exc)
        return None
    except ValueError as exc:
        logger.error("Invalid JSON in manifest metadata response: %s", exc)
        return None


def _extract_manifest_zip(zip_path: Path, dest_path: Path) -> None:
    """Safely extract the .content SQLite file without zip-slip and swap atomically."""
    dest_path.parent.mkdir(parents=True, exist_ok=True)
    tmp_db_path: Optional[Path] = None

    try:
        with zipfile.ZipFile(zip_path, "r") as zip_ref:
            content_member = next(
                (
                    info
                    for info in zip_ref.infolist()
                    if not info.is_dir() and info.filename.endswith(".content")
                ),
                None,
            )
            if content_member is None:
                raise FileNotFoundError(
                    "No .content database file found in manifest archive."
                )

            with tempfile.NamedTemporaryFile(
                dir=dest_path.parent,
                prefix="manifest_",
                suffix=".sqlite.tmp",
                delete=False,
            ) as tmp_file:
                tmp_db_path = Path(tmp_file.name)
                with zip_ref.open(content_member, "r") as src:
                    shutil.copyfileobj(src, tmp_file, length=1024 * 256)

        os.replace(tmp_db_path, dest_path)
        tmp_db_path = None
    finally:
        if zip_path.exists():
            try:
                os.remove(zip_path)
            except OSError:
                pass
        if tmp_db_path is not None and tmp_db_path.exists():
            try:
                os.remove(tmp_db_path)
            except OSError:
                pass


def _write_json_atomic(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp_path: Optional[Path] = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            dir=path.parent,
            prefix="manifest_info_",
            suffix=".json.tmp",
            delete=False,
        ) as tmp_file:
            tmp_path = Path(tmp_file.name)
            json.dump(payload, tmp_file, indent=2)
        os.replace(tmp_path, path)
        tmp_path = None
    finally:
        if tmp_path is not None and tmp_path.exists():
            try:
                os.remove(tmp_path)
            except OSError:
                pass


async def download_and_unzip_manifest(url: str, dest_path: Path) -> None:
    """Stream-download the manifest zip to disk and atomically replace dest_path."""
    full_url = url if url.startswith("http") else f"https://www.bungie.net{url}"
    logger.info("Downloading manifest archive from %s", full_url)

    dest_path.parent.mkdir(parents=True, exist_ok=True)
    tmp_zip = tempfile.NamedTemporaryFile(
        dir=dest_path.parent,
        prefix="manifest_",
        suffix=".zip",
        delete=False,
    )
    zip_path = Path(tmp_zip.name)
    tmp_zip.close()

    total_bytes = 0
    try:
        async with httpx.AsyncClient(timeout=360.0) as client:
            async with client.stream("GET", full_url) as response:
                response.raise_for_status()
                with open(zip_path, "wb") as fh:
                    async for chunk in response.aiter_bytes(chunk_size=1024 * 64):
                        await asyncio.to_thread(fh.write, chunk)
                        total_bytes += len(chunk)

        logger.info("Downloaded %d bytes; extracting manifest...", total_bytes)
        await asyncio.to_thread(_extract_manifest_zip, zip_path, dest_path)
        logger.info("Manifest updated atomically at %s", dest_path)
    except Exception:
        if zip_path.exists():
            try:
                os.remove(zip_path)
            except OSError:
                pass
        raise


async def update_manifest_if_needed() -> dict[str, Any]:
    """Check if the local manifest is outdated and update it atomically under a lock."""
    async with _manifest_lock:
        logger.info("Checking Destiny 2 manifest version...")
        metadata = await get_manifest_metadata()
        if not metadata:
            raise ManifestUpdateError("Unable to fetch manifest metadata from Bungie.net.")

        try:
            new_manifest_path = metadata["Response"]["mobileWorldContentPaths"]["en"]
        except (KeyError, TypeError) as exc:
            raise ManifestUpdateError(
                "English mobileWorldContentPaths entry missing from manifest metadata."
            ) from exc

        current_manifest_version = ""
        if MANIFEST_INFO_FILE.exists():
            try:
                with open(MANIFEST_INFO_FILE, "r", encoding="utf-8") as f:
                    info = json.load(f)
                    current_manifest_version = info.get("version_path", "")
            except (json.JSONDecodeError, OSError):
                logger.warning("Failed to parse manifest_info.json; forcing update.")

        if new_manifest_path == current_manifest_version and MANIFEST_DB_FILE.exists():
            logger.info("Manifest is already up to date (%s)", new_manifest_path)
            return {"updated": False, "version_path": new_manifest_path}

        logger.info("New manifest detected (%s); updating...", new_manifest_path)
        await download_and_unzip_manifest(new_manifest_path, MANIFEST_DB_FILE)

        manifest_info = {
            "version_path": new_manifest_path,
            "last_update": datetime.now(timezone.utc).isoformat(),
            "file_size": MANIFEST_DB_FILE.stat().st_size if MANIFEST_DB_FILE.exists() else 0,
        }
        await asyncio.to_thread(_write_json_atomic, MANIFEST_INFO_FILE, manifest_info)
        logger.info("Manifest update completed.")
        return {"updated": True, "version_path": new_manifest_path}


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )
    asyncio.run(update_manifest_if_needed())
