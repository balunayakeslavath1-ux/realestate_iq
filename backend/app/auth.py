import hashlib
import hmac
import time
import base64
import json
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from backend.app.config import settings
from backend.app.database import get_db
from backend.app.models import User

SALT = "realestateiq-salt-2026"
security = HTTPBearer(auto_error=False)

def hash_password(password: str) -> str:
    """Hash password using PBKDF2 HMAC SHA-256 with project salt."""
    return hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        SALT.encode('utf-8'),
        100000
    ).hex()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plain password against hashed password."""
    return hash_password(plain_password) == hashed_password

def create_access_token(user_id: int, email: str, role: str) -> str:
    """Generate tamper-proof signed JWT-like token valid for 7 days."""
    payload = {
        "user_id": user_id,
        "email": email,
        "role": role,
        "exp": int(time.time()) + (7 * 24 * 3600)  # 7 days expiration
    }
    payload_bytes = json.dumps(payload, separators=(',', ':')).encode('utf-8')
    payload_b64 = base64.urlsafe_b64encode(payload_bytes).decode('utf-8').rstrip('=')
    sig = hmac.new(settings.SECRET_KEY.encode('utf-8'), payload_b64.encode('utf-8'), hashlib.sha256).hexdigest()
    return f"{payload_b64}.{sig}"

def decode_access_token(token: str) -> Optional[dict]:
    """Decode and verify HMAC signature and expiration."""
    try:
        parts = token.split(".")
        if len(parts) != 2:
            return None
        payload_b64, sig = parts
        expected_sig = hmac.new(settings.SECRET_KEY.encode('utf-8'), payload_b64.encode('utf-8'), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, expected_sig):
            return None
        # Add back padding
        pad = len(payload_b64) % 4
        if pad:
            payload_b64 += '=' * (4 - pad)
        payload_bytes = base64.urlsafe_b64decode(payload_b64.encode('utf-8'))
        payload = json.loads(payload_bytes.decode('utf-8'))
        if payload.get("exp", 0) < time.time():
            return None
        return payload
    except Exception:
        return None

def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Dependency to retrieve authenticated user or raise 401."""
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token required. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user_id = payload.get("user_id")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user

def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """Dependency to retrieve user if authenticated, else None."""
    if not credentials or not credentials.credentials:
        return None
    token = credentials.credentials
    payload = decode_access_token(token)
    if not payload:
        return None
    user_id = payload.get("user_id")
    return db.query(User).filter(User.id == user_id).first()

def get_current_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    """Dependency ensuring current user has admin privileges."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrative privileges required for this action."
        )
    return current_user

def init_default_users(db: Session):
    """Seed initial administrator and demo user accounts."""
    admin = db.query(User).filter(User.email == settings.ADMIN_EMAIL).first()
    if not admin:
        admin = User(
            email=settings.ADMIN_EMAIL,
            name="Platform Administrator",
            phone="+91 99887 76655",
            hashed_password=hash_password(settings.ADMIN_PASSWORD),
            role="admin",
            share_contact_consent=True
        )
        db.add(admin)

    demo_user = db.query(User).filter(User.email == "user@realestateiq.com").first()
    if not demo_user:
        demo_user = User(
            email="user@realestateiq.com",
            name="Rahul Sharma",
            phone="+91 98765 12345",
            hashed_password=hash_password("user123"),
            role="user",
            share_contact_consent=True
        )
        db.add(demo_user)
    db.commit()
