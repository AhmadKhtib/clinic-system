from __future__ import annotations

import os
import tempfile
from urllib.parse import urlparse, urlunparse, parse_qsl, urlencode

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

load_dotenv()

def _normalize_sqlalchemy_url(url: str) -> str:
    # Aiven may provide: mysql://user:pass@host:port/db?ssl-mode=REQUIRED
    # SQLAlchemy expects a driver, e.g. mysql+pymysql://...
    if url.startswith("mysql://"):
        url = "mysql+pymysql://" + url[len("mysql://"):]
    # Remove ssl-mode query param from URL (we pass SSL via connect_args)
    try:
        p = urlparse(url)
        drop = {"ssl-mode", "ssl_mode", "ssl"}
        q = [(k, v) for (k, v) in parse_qsl(p.query, keep_blank_values=True) if k.lower() not in drop]

        p = p._replace(query=urlencode(q))
        return urlunparse(p)
    except Exception:
        return url

DATABASE_URL = os.getenv("DATABASE_URL", "").strip()
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL is not set. Set it in .env (local) or Render environment variables.")

DATABASE_URL = _normalize_sqlalchemy_url(DATABASE_URL)

# Optional: Aiven CA cert content (PEM). Put the *full PEM text* in Render env var AIVEN_CA_CERT.
# If provided, we write it to a temp file and pass it to PyMySQL SSL.
connect_args = {}
ca_pem = os.getenv("AIVEN_CA_CERT", "").strip()
if ca_pem:
    ca_path = os.path.join(tempfile.gettempdir(), "aiven-ca.pem")
    with open(ca_path, "w", encoding="utf-8") as f:
        f.write(ca_pem)
    connect_args = {"ssl": {"ca": ca_path}}

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=3600,
    connect_args=connect_args,
)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

class Base(DeclarativeBase):
    pass

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
