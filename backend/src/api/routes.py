from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException # type: ignore
from fastapi.responses import StreamingResponse # type: ignore
from ollama import Client # type: ignore
from pydantic import BaseModel, Field # type: ignore
from sqlalchemy.orm import Session # type: ignore

from src.core.config import settings
from src.core.logger import logger
from src.core.security import auth_handler
from src.db import Message, User, get_db


router = APIRouter()


class RegisterIn(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=6)


class LoginIn(BaseModel):
    username: str
    password: str


class RefreshIn(BaseModel):
    refresh_token: str


class ChatIn(BaseModel):
    message: str = Field(min_length=1, max_length=4000)


@router.post("/auth/register")
def register(data: RegisterIn, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.username == data.username).first()

    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")

    try:
        user = User(
            username=data.username,
            hashed_password=auth_handler.get_password_hash(data.password),
        )

        db.add(user)
        db.commit()
        db.refresh(user)

        return {"msg": "registered"}

    except Exception as e:
        db.rollback()
        logger.error(f"Registration failed: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Registration failed")


@router.post("/auth/login")
def login(data: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == data.username).first()

    if not user or not auth_handler.verify_password(
        data.password,
        user.hashed_password
    ):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    access_token = auth_handler.create_access_token(
        {"sub": user.username}
    )

    refresh_token = auth_handler.create_refresh_token(
        {"sub": user.username}
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


@router.post("/auth/refresh")
def refresh_token(data: RefreshIn, db: Session = Depends(get_db)):
    username = auth_handler.verify_refresh_token(data.refresh_token)

    user = db.query(User).filter(User.username == username).first()

    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    new_access_token = auth_handler.create_access_token(
        {"sub": user.username}
    )

    new_refresh_token = auth_handler.create_refresh_token(
        {"sub": user.username}
    )

    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer",
    }


@router.post("/chat")
def chat(
    payload: ChatIn,
    user: User = Depends(auth_handler.get_current_user),
    db: Session = Depends(get_db),
):
    logger.info(
        f"Chat request received from user '{user.username}' "
        f"(ID: {user.id})"
    )

    cleaned_message = payload.message.strip()

    if not cleaned_message:
        raise HTTPException(
            status_code=400,
            detail="Message cannot be empty"
        )

    try:
        # Save user message
        user_message = Message(
            user_id=user.id,
            role="user",
            content=cleaned_message,
            created_at=datetime.now(timezone.utc),
        )

        db.add(user_message)
        db.commit()

    except Exception as e:
        db.rollback()
        logger.error(f"Failed to save user message: {str(e)}", exc_info=True)

        raise HTTPException(
            status_code=500,
            detail="Failed to save message"
        )

    # Load limited history
    history = (
        db.query(Message)
        .filter(Message.user_id == user.id)
        .order_by(Message.created_at.desc())
        .limit(20)
        .all()
    )

    history.reverse()

    messages_payload = [
        {
            "role": message.role,
            "content": message.content,
        }
        for message in history
    ]

    def event_generator():
        logger.info("Starting Ollama stream...")

        client = Client()

        chunks = []

        try:
            response = client.chat(
                model=settings.MODEL_NAME,
                messages=messages_payload,
                stream=True,
            )

            for chunk in response:
                content = chunk["message"]["content"]

                chunks.append(content)

                yield content

            full_response = "".join(chunks)

            try:
                assistant_message = Message(
                    user_id=user.id,
                    role="assistant",
                    content=full_response,
                    created_at=datetime.now(timezone.utc),
                )

                db.add(assistant_message)
                db.commit()

                logger.info("Assistant response saved successfully.")

            except Exception as e:
                db.rollback()

                logger.error(
                    f"Failed to save assistant message: {str(e)}",
                    exc_info=True,
                )

        except Exception as e:
            logger.error(
                f"Ollama streaming failed: {str(e)}",
                exc_info=True,
            )

            yield "\n[Error]: Failed to generate response."

    return StreamingResponse(
        event_generator(),
        media_type="text/plain",
    )


@router.get("/history")
def history(
    user: User = Depends(auth_handler.get_current_user),
    db: Session = Depends(get_db),
):
    messages = (
        db.query(Message)
        .filter(Message.user_id == user.id)
        .order_by(Message.created_at)
        .all()
    )

    return [
        {
            "role": message.role,
            "content": message.content,
            "created_at": message.created_at.isoformat(),
        }
        for message in messages
    ]