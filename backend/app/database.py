from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker
from backend.app.config import settings

# SQLite configuration with check_same_thread=False
connect_args = {"check_same_thread": False} if settings.DATABASE_URL.startswith("sqlite") else {}

engine = create_engine(
    settings.DATABASE_URL,
    connect_args=connect_args,
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def migrate_db():
    """Ensure all tables and newly added columns exist in the database."""
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        try:
            # Check existing columns in properties table
            res = conn.execute(text("PRAGMA table_info(properties)"))
            cols = [row[1] for row in res.fetchall()]
            
            if "address" not in cols:
                conn.execute(text("ALTER TABLE properties ADD COLUMN address VARCHAR(255)"))
            if "owner_name" not in cols:
                conn.execute(text("ALTER TABLE properties ADD COLUMN owner_name VARCHAR(100) DEFAULT 'PropScope Partner'"))
            if "owner_email" not in cols:
                conn.execute(text("ALTER TABLE properties ADD COLUMN owner_email VARCHAR(120) DEFAULT 'owner@realestateiq.com'"))
            if "owner_phone" not in cols:
                conn.execute(text("ALTER TABLE properties ADD COLUMN owner_phone VARCHAR(30) DEFAULT '+91 98765 43210'"))
            if "is_available" not in cols:
                conn.execute(text("ALTER TABLE properties ADD COLUMN is_available BOOLEAN DEFAULT 1"))
            if "amenities" not in cols:
                conn.execute(text("ALTER TABLE properties ADD COLUMN amenities VARCHAR(255) DEFAULT 'Gym, Swimming Pool, Clubhouse, 24/7 Security'"))
            conn.commit()
        except Exception as e:
            # Table might not exist yet or not SQLite
            pass
