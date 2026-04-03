"""Compatibility entrypoint for the modular ASTRA backend."""

import uvicorn

from app.core.config import settings
from app.main import app


if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.backend_host,
        port=settings.backend_port,
        reload=settings.debug,
    )
