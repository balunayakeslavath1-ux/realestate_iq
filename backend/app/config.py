import os
from pathlib import Path

ENV_PATH = Path(__file__).resolve().parent.parent.parent / ".env"

def load_env_file():
    if ENV_PATH.exists():
        try:
            with open(ENV_PATH, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        key, val = line.split("=", 1)
                        os.environ[key.strip()] = val.strip().strip('"').strip("'")
        except Exception:
            pass

load_env_file()

class Settings:
    PROJECT_NAME: str = "RealEstateIQ Market Intelligence Platform"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./propscope.db")
    CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ]
    DATA_IS_SIMULATED: bool = True
    # Apify live scraper integration token (load from .env)
    APIFY_API_TOKEN: str = os.getenv("APIFY_API_TOKEN", "")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "realestateiq-secret-key-2026-secure-session")
    ADMIN_EMAIL: str = os.getenv("ADMIN_EMAIL", "admin@realestateiq.com")
    ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "admin123")
    # SMTP configuration for owner email notifications (readable on smartphones)
    SMTP_HOST: str = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM: str = os.getenv("SMTP_FROM", "alerts@realestateiq.com")
    SMTP_USE_TLS: bool = os.getenv("SMTP_USE_TLS", "true").lower() == "true"

settings = Settings()

def update_smtp_settings(
    host: str,
    port: int,
    user: str,
    password: str,
    from_email: str,
    use_tls: bool
):
    """Updates runtime SMTP settings and persists them into root .env file."""
    settings.SMTP_HOST = host
    settings.SMTP_PORT = port
    settings.SMTP_USER = user
    settings.SMTP_PASSWORD = password
    settings.SMTP_FROM = from_email
    settings.SMTP_USE_TLS = use_tls

    lines = []
    keys_written = set()
    new_values = {
        "SMTP_HOST": host,
        "SMTP_PORT": str(port),
        "SMTP_USER": user,
        "SMTP_PASSWORD": password,
        "SMTP_FROM": from_email,
        "SMTP_USE_TLS": str(use_tls).lower(),
    }

    if ENV_PATH.exists():
        try:
            with open(ENV_PATH, "r", encoding="utf-8") as f:
                for line in f:
                    stripped = line.strip()
                    if stripped and not stripped.startswith("#") and "=" in stripped:
                        k, _ = stripped.split("=", 1)
                        k = k.strip()
                        if k in new_values:
                            lines.append(f"{k}={new_values[k]}\n")
                            keys_written.add(k)
                            continue
                    lines.append(line)
        except Exception:
            pass

    for k, v in new_values.items():
        if k not in keys_written:
            lines.append(f"{k}={v}\n")

    try:
        with open(ENV_PATH, "w", encoding="utf-8") as f:
            f.writelines(lines)
    except Exception:
        pass
