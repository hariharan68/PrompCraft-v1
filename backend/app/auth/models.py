from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    ForeignKey,
    String,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class User(Base):
    __tablename__ = "Users"  # maps to your existing dbo.Users

    id: Mapped[int] = mapped_column("Id", BigInteger, primary_key=True)
    email: Mapped[str] = mapped_column("Email", String(256), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column("PasswordHash", String(255), nullable=False)
    full_name: Mapped[str | None] = mapped_column("FullName", String(256), nullable=True)
    is_active: Mapped[bool] = mapped_column(
        "IsActive", Boolean, server_default=text("1"), nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        "CreatedAt", DateTime, server_default=text("SYSUTCDATETIME()"), nullable=False
    )
    updated_at: Mapped[datetime | None] = mapped_column("UpdatedAt", DateTime, nullable=True)

    # ORM-side convenience; the DB also enforces ON DELETE CASCADE.
    tokens: Mapped[list["RefreshToken"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class RefreshToken(Base):
    __tablename__ = "RefreshTokens"  # maps to your existing dbo.RefreshTokens

    id: Mapped[int] = mapped_column("Id", BigInteger, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        "UserId", BigInteger, ForeignKey("Users.Id"), nullable=False
    )
    token_hash: Mapped[str] = mapped_column("TokenHash", String(255), unique=True, nullable=False)
    expires_at: Mapped[datetime] = mapped_column("ExpiresAt", DateTime, nullable=False)
    revoked: Mapped[bool] = mapped_column(
        "Revoked", Boolean, server_default=text("0"), nullable=False
    )
    replaced_by_token_hash: Mapped[str | None] = mapped_column(
        "ReplacedByTokenHash", String(255), nullable=True
    )
    user_agent: Mapped[str | None] = mapped_column("UserAgent", String(512), nullable=True)
    ip_address: Mapped[str | None] = mapped_column("IpAddress", String(45), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        "CreatedAt", DateTime, server_default=text("SYSUTCDATETIME()"), nullable=False
    )

    user: Mapped["User"] = relationship(back_populates="tokens")