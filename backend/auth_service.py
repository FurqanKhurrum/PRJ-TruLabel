"""
TruLabel Auth Service
Handles password hashing, JWT token creation/decoding,
and the FastAPI dependency for protected routes.

Requirements (add to requirements.txt):
    passlib[bcrypt]>=1.7.4
    python-jose[cryptography]>=3.3.0
"""

import os
import logging
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from database import get_db
from user_model import User

logger = logging.getLogger(__name__)

# ── Configuration ─────────────────────────────────────────────────────────────

# In production this should live in .env — we fall back to a dev default so
# the server starts without extra setup during the capstone demo.
SECRET_KEY      = os.getenv("JWT_SECRET_KEY", "trulabel-dev-secret-change-in-prod")
ALGORITHM       = "HS256"
TOKEN_EXPIRE_DAYS = 30          # Long expiry so students don't get logged out mid-demo

# ── Password hashing ──────────────────────────────────────────────────────────

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(plain_password: str) -> str:
    """Hash a plain-text password using bcrypt"""
    return pwd_context.hash(plain_password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Check a plain-text password against a stored bcrypt hash"""
    return pwd_context.verify(plain_password, hashed_password)

# ── JWT helpers ───────────────────────────────────────────────────────────────

def create_access_token(user_id: int, email: str) -> str:
    """
    Create a signed JWT that encodes the user's id and email.
    Expires after TOKEN_EXPIRE_DAYS days.
    """
    payload = {
        "sub":   str(user_id),
        "email": email,
        "exp":   datetime.utcnow() + timedelta(days=TOKEN_EXPIRE_DAYS),
        "iat":   datetime.utcnow(),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    """
    Decode and validate a JWT.
    Returns the payload dict on success, None if invalid/expired.
    """
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError as e:
        logger.warning(f"JWT decode failed: {e}")
        return None

# ── FastAPI dependency ────────────────────────────────────────────────────────

bearer_scheme = HTTPBearer(auto_error=False)

def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    FastAPI dependency for protected endpoints.
    Extracts the Bearer token from the Authorization header,
    decodes it, and returns the matching User row.

    Raises HTTP 401 if the token is missing, invalid, or the user no longer exists.

    Usage in an endpoint:
        @app.get("/api/protected")
        def protected(current_user: User = Depends(get_current_user)):
            ...
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials. Please log in again.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not credentials:
        raise credentials_exception

    payload = decode_access_token(credentials.credentials)
    if not payload:
        raise credentials_exception

    user_id: Optional[str] = payload.get("sub")
    if not user_id:
        raise credentials_exception

    user = db.query(User).filter(User.id == int(user_id)).first()
    if not user:
        raise credentials_exception

    return user


def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> Optional[User]:
    """
    Like get_current_user but returns None instead of raising 401.
    Use on endpoints that work for both guests and logged-in users.
    """
    if not credentials:
        return None
    payload = decode_access_token(credentials.credentials)
    if not payload:
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None
    return db.query(User).filter(User.id == int(user_id)).first()