from datetime import datetime, timedelta, timezone
import hashlib
import secrets

from jose import jwt
from passlib.context import CryptContext

from app.core.config import settings

# bcrypt hashing context. passlib's bcrypt default cost factor is 12 (your spec).
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


# --- Passwords -------------------------------------------------------------
def hash_password(password: str) -> str:
    """Return a bcrypt hash to store in Users.PasswordHash. Never store the raw password."""
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    """Check a login attempt against the stored bcrypt hash."""
    return pwd_context.verify(plain, hashed)


# --- Access tokens (JWT) ---------------------------------------------------
def create_access_token(subject: str | int) -> str:
    """Short-lived JWT. `subject` is the user id; goes in the 'sub' claim."""
    expire = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload = {"sub": str(subject), "exp": expire, "type": "access"}
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode + verify a JWT. Raises jose.JWTError if invalid/expired."""
    return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])


# --- Refresh tokens --------------------------------------------------------
def generate_refresh_token() -> str:
    """An opaque random string (NOT a JWT). This raw value goes in the cookie."""
    return secrets.token_urlsafe(48)


def hash_token(token: str) -> str:
    """SHA-256 hex of a refresh token. THIS is what we store in RefreshTokens.TokenHash
    — so a DB leak never exposes a usable token."""
    return hashlib.sha256(token.encode()).hexdigest()