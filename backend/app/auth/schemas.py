from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class RegisterIn(BaseModel):
    """Body for POST /api/auth/register."""
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    full_name: str | None = Field(default=None, max_length=256)


class UserOut(BaseModel):
    """The public shape of a user — note: NO password_hash here, ever."""
    model_config = ConfigDict(from_attributes=True)  # build from the ORM User object

    id: int
    email: EmailStr
    full_name: str | None = None
    is_active: bool
    created_at: datetime


class TokenOut(BaseModel):
    """Login/refresh response. Matches what the frontend expects."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int