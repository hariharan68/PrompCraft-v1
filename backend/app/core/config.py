from functools import lru_cache
from urllib.parse import quote_plus

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Typed application settings, loaded once from environment / .env."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    # --- App ---
    APP_NAME: str = "PromptCraft"
    ENV: str = "development"
    VERSION: str = "0.1.0"

    # --- Database (MSSQL via pyodbc) ---
    DB_DRIVER: str = "ODBC Driver 18 for SQL Server"
    DB_SERVER: str = r"localhost\SQLEXPRESS"
    DB_NAME: str = "PromptCraft"
    DB_TRUSTED_CONNECTION: bool = True          # Windows auth
    DB_USER: str | None = None                  # used only when trusted = False
    DB_PASSWORD: str | None = None
    DB_ENCRYPT: str = "no"                       # Driver 18 defaults to "yes"; off for local
    DB_TRUST_SERVER_CERTIFICATE: bool = True

    # --- JWT (placeholders, used from Phase 1) ---
    JWT_SECRET: str = "dev-secret-change-me"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # --- AI (placeholder, used from Phase 4) ---
    ANTHROPIC_API_KEY: str | None = None
    AI_MODEL: str = "claude-sonnet-4-6"

    # --- CORS ---
    FRONTEND_ORIGIN: str = "http://localhost:5173"

    @property
    def database_url(self) -> str:
        """Build a SQLAlchemy mssql+pyodbc URL from the parts above.

        We pass a full ODBC string via ?odbc_connect=... because the server name
        contains a backslash (instance name), which doesn't fit the
        user:pass@host URL form cleanly.
        """
        parts = [
            f"DRIVER={{{self.DB_DRIVER}}}",
            f"SERVER={self.DB_SERVER}",
            f"DATABASE={self.DB_NAME}",
        ]
        if self.DB_TRUSTED_CONNECTION:
            parts.append("Trusted_Connection=yes")
        else:
            parts.append(f"UID={self.DB_USER}")
            parts.append(f"PWD={self.DB_PASSWORD}")
        parts.append(f"Encrypt={self.DB_ENCRYPT}")
        if self.DB_TRUST_SERVER_CERTIFICATE:
            parts.append("TrustServerCertificate=yes")
        odbc_str = ";".join(parts) + ";"
        return f"mssql+pyodbc:///?odbc_connect={quote_plus(odbc_str)}"


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()