"""
TruLabel Database Configuration
SQLite database setup with SQLAlchemy
"""

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os

# Database file location
DATABASE_URL = "sqlite:///./trulabel.db"

# Create engine
# connect_args={"check_same_thread": False} is needed for SQLite
engine = create_engine(
    DATABASE_URL, 
    connect_args={"check_same_thread": False},
    echo=False  # Set to True for SQL query logging during development
)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class for models
Base = declarative_base()


def init_db():
    """
    Initialize database - create all tables
    Call this when server starts
    """
    print("Initializing database...")
    Base.metadata.create_all(bind=engine)
    print("Database initialized successfully!")
    print(f"Database location: {os.path.abspath('trulabel.db')}")


def get_db():
    """
    Dependency function to get database session
    Use this in FastAPI endpoints
    
    Usage:
        @app.get("/endpoint")
        def endpoint(db: Session = Depends(get_db)):
            # use db here
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def drop_all_tables():
    """
    Drop all tables - use with caution!
    Only for development/testing
    """
    print("WARNING: Dropping all tables...")
    Base.metadata.drop_all(bind=engine)
    print("All tables dropped!")


if __name__ == "__main__":
    # Test database connection
    print("Testing database connection...")
    init_db()
    print("Database test successful!")