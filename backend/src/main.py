from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from backend.src.api.routes import router
from backend.src.core.config import get_settings
from backend.src.core.exceptions import register_exception_handlers
from backend.src.core.logger import configure_logging
from backend.src.db import init_db


settings = get_settings()
logger = configure_logging()

app = FastAPI(title=settings.app_name)
register_exception_handlers(app)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

init_db()
app.include_router(router)


def _frontend_index() -> Path | None:
    candidates = [
        settings.frontend_build_dir / "index.html",
        settings.frontend_source_dir / "src" / "index.html",
        settings.frontend_source_dir / "index.html",
    ]
    for candidate in candidates:
        if candidate.exists():
            return candidate
    return None


frontend_index = _frontend_index()
if settings.frontend_build_dir.exists():
    app.mount("/", StaticFiles(directory=str(settings.frontend_build_dir), html=True), name="frontend")


@app.get("/")
def home():
    if frontend_index is None:
        return {"message": "Robert API is running"}
    return FileResponse(frontend_index)
