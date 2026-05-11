from __future__ import annotations

import hashlib
from datetime import datetime, timedelta

from fastapi import Depends, HTTPException, status # type: ignore
from fastapi.security import OAuth2PasswordBearer # type: ignore
from jose import JWTError, jwt
from passlib.context import CryptContext # type: ignore
from sqlalchemy.orm import Session # type: ignore

from src.core.config import settings
from src.db import User, get_db


oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.api_prefix}/auth/login")

class AuthHandler:
    def __init__(self):
        self.pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        self.secret_key = settings.JWT_SECRET_KEY
        self.algorithm = settings.JWT_ALGORITHM

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        return self.pwd_context.verify(plain_password, hashed_password)

    def get_password_hash(self, password: str) -> str:
        # bcrypt has a 72-byte limit; pre-hashing long passwords prevents truncation issues
        if len(password.encode()) > 72:
            password = hashlib.sha256(password.encode()).hexdigest()
        return self.pwd_context.hash(password)

    def create_access_token(self, data: dict, expires_delta: timedelta | None = None) -> str:
        payload = data.copy()
        expire = datetime.utcnow() + (
            expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        )
        payload.update({"exp": expire})
        return jwt.encode(payload, self.secret_key, algorithm=self.algorithm)

    def create_refresh_token(self, data: dict, expires_delta: timedelta | None = None) -> str:
        payload = data.copy()
        expire = datetime.utcnow() + (
            expires_delta or timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        )
        payload.update({"exp": expire, "type": "refresh"})
        return jwt.encode(payload, self.secret_key, algorithm=self.algorithm)

    def verify_refresh_token(self, token: str) -> str:
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            if payload.get("type") != "refresh":
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token type"
                )
            username: str | None = payload.get("sub")
            if username is None:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token payload"
                )
            return username
        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired refresh token"
            )

    async def get_current_user(
        self, 
        token: str = Depends(oauth2_scheme), 
        db: Session = Depends(get_db)
    ) -> User:
        """
        Note: Using Depends with class methods in FastAPI can be tricky. 
        It is usually cleaner to instantiate the handler and use its methods as dependencies.
        """
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            username: str | None = payload.get("sub")
            if username is None:
                raise credentials_exception
        except JWTError:
            raise credentials_exception

        user = db.query(User).filter(User.username == username).first()
        if user is None:
            raise credentials_exception
        return user

# Instantiate the handler for use in routes
auth_handler = AuthHandler()