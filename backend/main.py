import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import bungie_api
from .manifest_manager import update_manifest_if_needed
from .routers import general, manifest, xur

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MANIFEST_UPDATE_INTERVAL_SECONDS = 604800  # 7 days
periodic_task: asyncio.Task | None = None


async def periodic_manifest_update() -> None:
    """Background task: ensure manifest is initialized on boot, then refresh weekly."""
    while True:
        try:
            logger.info("Running scheduled manifest check...")
            await update_manifest_if_needed()
            logger.info("Scheduled manifest check completed.")
        except asyncio.CancelledError:
            raise
        except Exception as exc:
            logger.error("Error during manifest update: %s", exc)

        await asyncio.sleep(MANIFEST_UPDATE_INTERVAL_SECONDS)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Non-blocking application lifecycle manager."""
    global periodic_task

    logger.info("Starting Orbit Market API...")
    if not bungie_api.get_bungie_api_key():
        logger.warning(
            "BUNGIE_API_KEY is not set; /xur and manifest updates will fail until configured."
        )

    # Run initial manifest check + weekly schedule in the background so /health is ready immediately
    periodic_task = asyncio.create_task(periodic_manifest_update())

    yield

    logger.info("Stopping Orbit Market API...")
    if periodic_task:
        periodic_task.cancel()
        try:
            await periodic_task
        except asyncio.CancelledError:
            logger.info("Periodic manifest task stopped.")
    await bungie_api.close_async_client()


app = FastAPI(
    title="Orbit Market API",
    description="Optional Destiny 2 Xûr & Manifest proxy API",
    version="2.0.0",
    lifespan=lifespan,
)

# Public read-only API uses no cookies/credentials
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(general.router)
app.include_router(xur.router)
app.include_router(manifest.router)
