from datetime import datetime

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.models import User, RefreshToken


# --------------------------- Users ---------------------------
def get_user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == email))


def get_user_by_id(db: Session, user_id: int) -> User | None:
    return db.get(User, user_id)


def create_user(db: Session, *, email: str, password_hash: str, full_name: str | None) -> User:
    user = User(email=email, password_hash=password_hash, full_name=full_name)
    db.add(user)
    db.flush()
    return user


# ----------------------- Refresh tokens -----------------------
def add_refresh_token(
    db: Session,
    *,
    user_id: int,
    token_hash: str,
    expires_at: datetime,
    user_agent: str | None = None,
    ip_address: str | None = None,
) -> RefreshToken:
    token = RefreshToken(
        user_id=user_id,
        token_hash=token_hash,
        expires_at=expires_at,
        user_agent=user_agent,
        ip_address=ip_address,
    )
    db.add(token)
    db.flush()
    return token


def get_refresh_token_by_hash(db: Session, token_hash: str) -> RefreshToken | None:
    return db.scalar(select(RefreshToken).where(RefreshToken.token_hash == token_hash))


def revoke_token(db: Session, token: RefreshToken, replaced_by_hash: str | None = None) -> None:
    token.revoked = True
    if replaced_by_hash:
        token.replaced_by_token_hash = replaced_by_hash
    db.flush()


def revoke_all_user_tokens(db: Session, user_id: int) -> None:
    db.query(RefreshToken).filter(
        RefreshToken.user_id == user_id,
        RefreshToken.revoked == False,  # noqa: E712
    ).update({RefreshToken.revoked: True}, synchronize_session=False)
    db.flush()