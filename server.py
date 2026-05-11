import os
from dotenv import load_dotenv
from fastapi import FastAPI, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from db import init_db, get_db, User, Message
from auth import get_password_hash, verify_password, create_access_token, get_current_user
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import httpx
from datetime import datetime

# Load environment variables from .env file
load_dotenv()

init_db()

app = FastAPI()

MODEL_SERVER_URL = os.getenv("MODEL_SERVER_URL")  # e.g. https://<colab-ngrok>/generate


class RegisterIn(BaseModel):
    username: str
    password: str


class LoginIn(BaseModel):
    username: str
    password: str


class ChatIn(BaseModel):
    message: str


@app.post("/register")
def register(data: RegisterIn, db: Session = Depends(get_db)):
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(status_code=400, detail="Username already exists")
    user = User(username=data.username, hashed_password=get_password_hash(data.password))
    db.add(user)
    db.commit()
    db.refresh(user)
    return {"msg": "registered"}


@app.post("/login")
def login(data: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == data.username).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"sub": user.username})
    return {"access_token": token, "token_type": "bearer"}


@app.post("/chat")
def chat(payload: ChatIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if MODEL_SERVER_URL is None:
        raise HTTPException(status_code=500, detail="MODEL_SERVER_URL not configured")

    # store user message
    msg = Message(user_id=user.id, role="user", content=payload.message, created_at=datetime.utcnow())
    db.add(msg)
    db.commit()

    # forward to model server
    try:
        with httpx.Client(timeout=30.0) as client:
            resp = client.post(MODEL_SERVER_URL, json={"message": payload.message})
            resp.raise_for_status()
            data = resp.json()
            reply = data.get("reply") or data.get("output") or ""
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Model server error: {e}")

    # store assistant reply
    assistant_msg = Message(user_id=user.id, role="assistant", content=reply, created_at=datetime.utcnow())
    db.add(assistant_msg)
    db.commit()

    return {"reply": reply}


@app.get("/history")
def history(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    msgs = db.query(Message).filter(Message.user_id == user.id).order_by(Message.created_at).all()
    return [{"role": m.role, "content": m.content, "created_at": m.created_at.isoformat()} for m in msgs]


app.mount("/static", StaticFiles(directory="./static"), name="static")


@app.get("/")
def home():
    return FileResponse("./static/login.html")
