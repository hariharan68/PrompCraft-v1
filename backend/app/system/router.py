from fastapi import APIRouter
from sqlalchemy import text

from app.core.config import settings
from app.core.database import engine

router = APIRouter(tags=["system"])


@router.get("/health")
def health() -> dict:
    """Liveness + DB connectivity probe.

    Deliberately a sync `def`: pyodbc is blocking, so FastAPI runs this in its
    threadpool instead of stalling the event loop. That's the convention for any
    endpoint that touches the database.
    """
    db_status = "ok"
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception:  # noqa: BLE001 — any failure means the DB is unreachable
        db_status = "down"

    return {
        "status": "ok" if db_status == "ok" else "degraded",
        "db": db_status,
        "version": settings.VERSION,
    }
