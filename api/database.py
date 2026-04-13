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
        
        # If we reach here, the driver is installed!
        url = TURSO_URL.replace("libsql://", "sqlite+libsql://")
        SQLALCHEMY_DATABASE_URL = f"{url}/?authToken={TURSO_TOKEN}&secure=true"
        print("✅ Success: Turso Cloud Database detected and driver is ready.")
    else:
        print("🏠 Note: No Turso credentials found. Using local SQLite.")
except ImportError:
    # If the driver is NOT installed (like on your Windows currently)
    print("⚠️ Warning: Turso driver (sqlalchemy-libsql) not found. Falling back to Local SQLite.")
    SQLALCHEMY_DATABASE_URL = "sqlite:///./nimcet.db"

# Final step: Create the engine
try:
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args=engine_args)
except Exception as e:
    # Final safety fallback
    print(f"❌ Error connecting to Turso: {e}. Falling back to Local SQLite.")
    SQLALCHEMY_DATABASE_URL = "sqlite:///./nimcet.db"
    engine = create_engine(SQLALCHEMY_DATABASE_URL, connect_args=engine_args)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
