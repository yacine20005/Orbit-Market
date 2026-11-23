import logging
import os
from typing import Any, Optional

import httpx

try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:
    pass

logger = logging.getLogger(__name__)

BUNGIE_API_URL = "https://www.bungie.net/Platform"

async_client = httpx.AsyncClient(timeout=20.0)


def get_bungie_api_key() -> Optional[str]:
    """Read BUNGIE_API_KEY lazily so imports and healthchecks never fail without it."""
    key = os.getenv("BUNGIE_API_KEY", "").strip()
    return key or None


def get_async_client() -> httpx.AsyncClient:
    """Return a live shared AsyncClient, recreating it if previously closed."""
    global async_client
    if async_client.is_closed:
        async_client = httpx.AsyncClient(timeout=20.0)
    return async_client


async def close_async_client() -> None:
    """Close the shared AsyncClient cleanly on shutdown."""
    if not async_client.is_closed:
        await async_client.aclose()


async def make_bungie_request(
    endpoint: str, params: Optional[dict] = None
) -> Optional[dict[str, Any]]:
    """Make an authenticated GET request to the Bungie.net Platform API."""
    api_key = get_bungie_api_key()
    if not api_key:
        logger.error("BUNGIE_API_KEY environment variable is not set.")
        return None

    headers = {"X-API-Key": api_key}
    url = f"{BUNGIE_API_URL}{endpoint}"
    client = get_async_client()

    try:
        response = await client.get(url, headers=headers, params=params)
        response.raise_for_status()
        payload = response.json()
    except httpx.HTTPStatusError as exc:
        logger.error(
            "Bungie API HTTP %d while requesting %s",
            exc.response.status_code,
            exc.request.url,
        )
        return None
    except httpx.RequestError as exc:
        logger.error("Network error while requesting %s: %s", exc.request.url, exc)
        return None
    except ValueError as exc:
        logger.error("Invalid JSON from Bungie API (%s): %s", url, exc)
        return None

    # Bungie uses ErrorCode == 1 for Success (PlatformErrorCodes.Success)
    if isinstance(payload, dict) and payload.get("ErrorCode", 1) != 1:
        logger.warning(
            "Bungie API returned ErrorCode=%s (%s) for %s",
            payload.get("ErrorCode"),
            payload.get("ErrorStatus"),
            endpoint,
        )
        return None

    return payload
