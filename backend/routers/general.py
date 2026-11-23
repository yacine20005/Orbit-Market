"""
Routes for general API information
"""
from fastapi import APIRouter

router = APIRouter(tags=["general"])


@router.get("/")
def read_root():
    """Root API endpoint."""
    return {
        "message": "Welcome to the Orbit Market API",
        "description": "Optional Destiny 2 Xûr & Manifest proxy API",
        "version": "2.0.0",
        "endpoints": {
            "/health": "API health check",
            "/xur": "Xûr inventory",
            "/xur/debug": "Xûr data debug",
            "/manifest/status": "Manifest status",
            "/manifest/update": "Update manifest (admin token required)",
            "/manifest/info": "Detailed manifest information",
        },
    }


@router.get("/health")
def health_check():
    """API health check endpoint."""
    return {
        "status": "healthy",
        "message": "Orbit Market API is running",
        "version": "2.0.0",
        "service": "Orbit Market Destiny 2 Proxy API",
    }
