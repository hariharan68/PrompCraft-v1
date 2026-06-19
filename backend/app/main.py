from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.system.router import router as system_router
from app.auth.router import router as auth_router


def create_app() -> FastAPI:
    """Application factory — keeps wiring explicit and testable."""
    app = FastAPI(title=settings.APP_NAME, version=settings.VERSION)

    # Allow the Vite dev server to call the API with credentials (refresh cookie later).
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.FRONTEND_ORIGIN],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

        # Routers mount under /api.
    app.include_router(system_router, prefix="/api")
    app.include_router(auth_router, prefix="/api/auth")
    

    return app


app = create_app()