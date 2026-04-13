from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
import os
from dotenv import load_dotenv

load_dotenv()

# Get credentials from .env
TURSO_URL = os.environ.get("TURSO_DATABASE_URL")
TURSO_TOKEN = os.environ.get("TURSO_AUTH_TOKEN")

# Setup default local database
SQLALCHEMY_DATABASE_URL = "sqlite:///./nimcet.db"
engine_args = {"check_same_thread": False}

# Attempt to use Turso ONLY if the driver is successfully loaded
try:
    if TURSO_URL and TURSO_TOKEN:
        # We try to import the driver first
        import sqlalchemy_libsql 
        
    engine = create_engine(SQLALCHEMY_DATABASE_URL)
else:
    # Local Development Logic (Offline)
    print("🏠 Connecting to Local Database (nimcet.db)...")
    SQLALCHEMY_DATABASE_URL = "sqlite:///./nimcet.db"
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
