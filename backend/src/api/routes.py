from __future__ import annotations

from datetime import datetime

import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from backend.src.core.config import get_settings
from backend.src.core.security import create_access_token, get_current_user, get_password_hash, verify_password
from backend.src.db import Message, User, get_db


settings = get_settings()
router = APIRouter(prefix=settings.api_prefix)


class RegisterIn(BaseModel):
    username: str
    password: str


class LoginIn(BaseModel):
    username: str
    password: str


class ChatIn(BaseModel):
    message: str


@router.post("/auth/register")
def register(data: RegisterIn, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(status_code=400, detail="Username already exists")
    user = User(username=data.username, hashed_password=get_password_hash(data.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"msg": "registered"}


@router.post("/auth/login")
def login(data: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == data.username).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": user.username})
    return {"access_token": token, "token_type": "bearer"}


@router.post("/chat")
def chat(payload: ChatIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if settings.model_server_url is None:
        raise HTTPException(status_code=500, detail="MODEL_SERVER_URL not configured")

    user_message = Message(user_id=user.id, role="user", content=payload.message, created_at=datetime.utcnow())
    db.add(user_message)
    db.commit()

    try:
        with httpx.Client(timeout=30.0) as client:
            response = client.post(settings.model_server_url, json={"message": payload.message})
            response.raise_for_status()
            data = response.json()
            reply = data.get("reply") or data.get("output") or ""
    except Exception as exc:  # pragma: no cover - network/model failure path
        raise HTTPException(status_code=502, detail=f"Model server error: {exc}")

    assistant_message = Message(user_id=user.id, role="assistant", content=reply, created_at=datetime.utcnow())
    db.add(assistant_message)
    db.commit()

    return {"reply": reply}


@router.get("/history")
def history(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    messages = db.query(Message).filter(Message.user_id == user.id).order_by(Message.created_at).all()
    return [
        {"role": message.role, "content": message.content, "created_at": message.created_at.isoformat()}
        for message in messages
    ]
