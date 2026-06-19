from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user
from app.auth import service
from app.auth.models import User
from app.auth.schemas import RegisterIn, UserOut, TokenOut

router = APIRouter(tags=["auth"])

REFRESH_COOKIE = "refresh_token"
REFRESH_PATH = "/api/auth"


def _set_refresh_cookie(response: Response, raw_refresh: str) -> None:
    response.set_cookie(
        key=REFRESH_COOKIE,
        value=raw_refresh,
        httponly=True,                              # JS can't read it (XSS defense)
        secure=settings.ENV != "development",        # HTTPS-only in prod; off for localhost
        samesite="strict",
        path=REFRESH_PATH,                           # only sent to /api/auth/*
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
    )


@router.post("/register", response_model=UserOut, status_code=201)
def register(data: RegisterIn, db: Session = Depends(get_db)):
    try:
        return service.register(db, data)
    except service.EmailAlreadyExists:
        raise HTTPException(status_code=409, detail="Email already registered")


@router.post("/login", response_model=TokenOut)
def login(
    response: Response,
    request: Request,
    form: OAuth2PasswordRequestForm = Depends(),   # parses username/password form fields
    db: Session = Depends(get_db),
):
    try:
        user = service.authenticate(db, form.username, form.password)
    except service.InvalidCredentials:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    access, raw_refresh, expires_in = service.login(
        db, user,
        user_agent=request.headers.get("user-agent"),
        ip=request.client.host if request.client else None,
    )
    _set_refresh_cookie(response, raw_refresh)
    return TokenOut(access_token=access, expires_in=expires_in)


@router.post("/refresh", response_model=TokenOut)
def refresh(response: Response, request: Request, db: Session = Depends(get_db)):
    raw = request.cookies.get(REFRESH_COOKIE)
    if not raw:
        raise HTTPException(status_code=401, detail="Missing refresh token")
    try:
        access, new_raw, expires_in = service.refresh(
            db, raw,
            user_agent=request.headers.get("user-agent"),
            ip=request.client.host if request.client else None,
        )
    except service.InvalidRefreshToken:
        response.delete_cookie(REFRESH_COOKIE, path=REFRESH_PATH)
        raise HTTPException(status_code=401, detail="Invalid or expired refresh token")
    _set_refresh_cookie(response, new_raw)
    return TokenOut(access_token=access, expires_in=expires_in)


@router.post("/logout", status_code=204)
def logout(response: Response, request: Request, db: Session = Depends(get_db)):
    service.logout(db, request.cookies.get(REFRESH_COOKIE))
    response.delete_cookie(REFRESH_COOKIE, path=REFRESH_PATH)


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user