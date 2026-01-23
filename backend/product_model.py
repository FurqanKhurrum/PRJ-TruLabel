"""
TruLabel Database Models
Product and ScanHistory tables
"""

from sqlalchemy import Column, String, Float, Integer, DateTime, JSON, Text
from datetime import datetime
from database import Base


class Product(Base):
    """
    Product table - stores cached product information
    Primary key is barcode
    """
    __tablename__ = "products"
    
    # Primary Key
    barcode = Column(String(50), primary_key=True, index=True)
    
    # Basic Product Info
    product_name = Column(String(200), nullable=False)
    brand_name = Column(String(200))
    brand_owner = Column(String(200))
    quantity = Column(String(100))
    
    # Images
    image_url = Column(Text)
    image_front_url = Column(Text)
    image_small_url = Column(Text)
    
    # Location & Origin
    country_of_origin = Column(String(200))
    origins = Column(String(200))
    manufacturing_places = Column(String(200))
    
    # Categories
    category = Column(Text)
    
    # Ingredients & Allergens
    ingredients = Column(Text)
    allergens = Column(String(500))
    traces = Column(String(500))
    
    # Labels & Certifications
    labels = Column(Text)
    
    # Packaging
    packaging = Column(String(200))
    packaging_text = Column(Text)
    
    # Stores
    stores = Column(String(500))
    purchase_places = Column(String(500))
    
    # Nutrition Scores
    nutriscore_grade = Column(String(1))  # a, b, c, d, e
    nutriscore_score = Column(Integer)
    
    # Environmental Scores
    ecoscore = Column(Integer)  # 0-100
    ecoscore_grade = Column(String(1))  # a, b, c, d, e
    
    # Ethical Scores (will be calculated/stored later)
    ethical_score = Column(Float)
    sustainability_score = Column(Float)
    labor_score = Column(Float)
    health_score = Column(Float)
    
    # Metadata
    completeness = Column(Float)  # 0.0 to 1.0
    link = Column(Text)  # Open Food Facts product page
    
    # Store full API response as JSON for reference
    raw_api_data = Column(JSON)
    
    # Timestamps
    cached_at = Column(DateTime, default=datetime.utcnow, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<Product(barcode={self.barcode}, name={self.product_name})>"
    
    def to_dict(self):
        """Convert product to dictionary for API responses"""
        return {
            "barcode": self.barcode,
            "product_name": self.product_name,
            "brand_name": self.brand_name,
            "brand_owner": self.brand_owner,
            "quantity": self.quantity,
            "image_url": self.image_url,
            "image_front_url": self.image_front_url,
            "image_small_url": self.image_small_url,
            "country_of_origin": self.country_of_origin,
            "origins": self.origins,
            "manufacturing_places": self.manufacturing_places,
            "category": self.category,
            "ingredients": self.ingredients,
            "allergens": self.allergens,
            "traces": self.traces,
            "labels": self.labels,
            "packaging": self.packaging,
            "packaging_text": self.packaging_text,
            "stores": self.stores,
            "purchase_places": self.purchase_places,
            "nutriscore_grade": self.nutriscore_grade,
            "nutriscore_score": self.nutriscore_score,
            "ecoscore": self.ecoscore,
            "ecoscore_grade": self.ecoscore_grade,
            "ethical_score": self.ethical_score,
            "sustainability_score": self.sustainability_score,
            "labor_score": self.labor_score,
            "health_score": self.health_score,
            "completeness": self.completeness,
            "link": self.link,
            "cached_at": self.cached_at.isoformat() if self.cached_at else None,
        }


class ScanHistory(Base):
    """
    Scan history table - tracks when products are scanned
    For analytics and user history
    """
    __tablename__ = "scan_history"
    
    # Primary Key
    id = Column(Integer, primary_key=True, autoincrement=True)
    
    # Product barcode (foreign key reference)
    barcode = Column(String(50), nullable=False, index=True)
    
    # Scan metadata
    scanned_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Optional: User ID if you add authentication later
    # user_id = Column(String(50), nullable=True, index=True)
    
    def __repr__(self):
        return f"<ScanHistory(id={self.id}, barcode={self.barcode}, scanned_at={self.scanned_at})>"
    
    def to_dict(self):
        """Convert scan history to dictionary"""
        return {
            "id": self.id,
            "barcode": self.barcode,
            "scanned_at": self.scanned_at.isoformat() if self.scanned_at else None,
        }


if __name__ == "__main__":
    # Test models
    from database import init_db
    
    print("Creating database tables...")
    init_db()
    print("Tables created successfully!")
    
    print("\nProduct table columns:")
    for column in Product.__table__.columns:
        print(f"  - {column.name}: {column.type}")
    
    print("\nScanHistory table columns:")
    for column in ScanHistory.__table__.columns:
        print(f"  - {column.name}: {column.type}")