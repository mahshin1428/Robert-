from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI # type: ignore
from fastapi.middleware.cors import CORSMiddleware # type: ignore
from fastapi.responses import FileResponse # type: ignore
from fastapi.staticfiles import StaticFiles # type: ignore

from src.api.routes import router as auth_router
# from src.api.routes import router as chat_router
from src.core.config import settings
from src.core.logger import logger
from src.db import init_db

@asynccontextmanager
async def lifespan(app:FastAPI):
    print("Application starting...")
    init_db() # it should be here because we want to initialize the database before the application starts accepting requests
    yield
    print("Application shutting down...")


app = FastAPI(lifespan=lifespan, title="Robert-the chatbot", version="1.0.0")


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth_router, prefix=settings.api_prefix, tags=["auth"])
# app.include_router(chat_router, prefix=settings.api_prefix, tags=["chat"])
