"""
TruLabel User Models
Handles user accounts and saved/favourite products
"""

from sqlalchemy import Column, String, DateTime, Integer, ForeignKey, UniqueConstraint
from datetime import datetime
from database import Base


class User(Base):
    """
    User accounts table
    Stores registered users with hashed passwords
    """
    __tablename__ = "users"

    id           = Column(Integer, primary_key=True, autoincrement=True, index=True)
    email        = Column(String(255), unique=True, nullable=False, index=True)
    display_name = Column(String(100), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    created_at   = Column(DateTime, default=datetime.utcnow)
    updated_at   = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, name={self.display_name})>"

    def to_dict(self):
        """Safe public representation — never exposes hashed_password"""
        return {
            "id":           self.id,
            "email":        self.email,
            "display_name": self.display_name,
            "created_at":   self.created_at.isoformat() if self.created_at else None,
        }


class UserFavorite(Base):
    """
    Saved / favourited products per user
    One row per (user, barcode) pair — enforced by unique constraint
    """
    __tablename__ = "user_favorites"

    id         = Column(Integer, primary_key=True, autoincrement=True)
    user_id    = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    barcode    = Column(String(50), nullable=False, index=True)
    saved_at   = Column(DateTime, default=datetime.utcnow)

    # Prevent duplicate favourites for the same user + barcode
    __table_args__ = (
        UniqueConstraint("user_id", "barcode", name="uq_user_favorite"),
    )

    def __repr__(self):
        return f"<UserFavorite(user_id={self.user_id}, barcode={self.barcode})>"

    def to_dict(self):
        return {
            "id":       self.id,
            "user_id":  self.user_id,
            "barcode":  self.barcode,
            "saved_at": self.saved_at.isoformat() if self.saved_at else None,
        }