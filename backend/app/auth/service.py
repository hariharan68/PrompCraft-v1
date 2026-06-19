from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from app.auth import repository as repo
from app.auth.models import User
from app.auth.schemas import RegisterIn
from app.core.config import settings
from app.core.security import (
    hash_password,
    verify_password,
    create_access_token,
    generate_refresh_token,
    hash_token,
)


class EmailAlreadyExists(Exception):
    pass


class InvalidCredentials(Exception):
    pass


class InvalidRefreshToken(Exception):
    pass


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def register(db: Session, data: RegisterIn) -> User:
    if repo.get_user_by_email(db, data.email):
        raise EmailAlreadyExists()
    user = repo.create_user(
        db,
        email=data.email,
        password_hash=hash_password(data.password),
        full_name=data.full_name,
    )
    db.commit()
    db.refresh(user)
    return user


def authenticate(db: Session, email: str, password: str) -> User:
    user = repo.get_user_by_email(db, email)
    if not user or not verify_password(password, user.password_hash):
        raise InvalidCredentials()
    if not user.is_active:
        raise InvalidCredentials()
    return user


def _issue_refresh(db: Session, user_id: int, user_agent: str | None, ip: str | None) -> str:
    raw = generate_refresh_token()
    repo.add_refresh_token(
        db,
        user_id=user_id,
        token_hash=hash_token(raw),
        expires_at=_utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
        user_agent=user_agent,
        ip_address=ip,
    )
    return raw


def login(db: Session, user: User, user_agent: str | None = None, ip: str | None = None):
    access = create_access_token(user.id)
    raw_refresh = _issue_refresh(db, user.id, user_agent, ip)
    db.commit()
    return access, raw_refresh, settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60


def refresh(db: Session, raw_refresh: str, user_agent: str | None = None, ip: str | None = None):
    token = repo.get_refresh_token_by_hash(db, hash_token(raw_refresh))
    if token is None:
        raise InvalidRefreshToken()

    if token.revoked:
        repo.revoke_all_user_tokens(db, token.user_id)
        db.commit()
        raise InvalidRefreshToken()

    if token.expires_at < _utcnow():
        raise InvalidRefreshToken()

    new_raw = _issue_refresh(db, token.user_id, user_agent, ip)
    repo.revoke_token(db, token, replaced_by_hash=hash_token(new_raw))
    access = create_access_token(token.user_id)
    db.commit()
    return access, new_raw, settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60


def logout(db: Session, raw_refresh: str | None) -> None:
    if not raw_refresh:
        return
    token = repo.get_refresh_token_by_hash(db, hash_token(raw_refresh))
    if token and not token.revoked:
        repo.revoke_token(db, token)
        db.commit()