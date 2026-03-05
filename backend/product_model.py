"""
TruLabel Enhanced Database Models
Supports multiple product types: Food, Electronics, Books, Cosmetics, General Retail
"""

from sqlalchemy import Column, String, Float, Integer, DateTime, JSON, Text, Boolean, ForeignKey
from datetime import datetime
from database import Base


class Product(Base):
    """
    Enhanced Product table - stores cached product information from multiple sources
    Primary key is barcode
    Supports: Food, Electronics, Books, Cosmetics, General Retail Products
    """
    __tablename__ = "products"
    
    # ==================== PRIMARY KEY ====================
    barcode = Column(String(50), primary_key=True, index=True)
    
    # ==================== METADATA ====================
    data_source = Column(String(50), index=True)  # OpenFoodFacts, UPCItemDB, etc.
    product_type = Column(String(50), index=True)  # food, electronics, cosmetics, etc.
    
    # ==================== BASIC PRODUCT INFO ====================
    product_name = Column(String(500), nullable=False)
    brand_name = Column(String(200))
    brand_owner = Column(String(200))
    manufacturer = Column(String(200))
    quantity = Column(String(100))
    description = Column(Text)
    
    # ==================== IMAGES ====================
    image_url = Column(Text)
    image_front_url = Column(Text)
    image_small_url = Column(Text)
    images = Column(JSON)  # Array of image URLs for products with multiple images
    
    # ==================== LOCATION & ORIGIN ====================
    country_of_origin = Column(String(200))
    origins = Column(String(200))
    manufacturing_places = Column(String(200))
    
    # ==================== CATEGORIES ====================
    category = Column(Text)
    
    # ==================== PRODUCT IDENTIFIERS ====================
    # For books
    isbn = Column(String(20))
    
    # For electronics/general
    model = Column(String(200))
    mpn = Column(String(200))  # Manufacturer Part Number
    asin = Column(JSON)  # Amazon ASIN (can be array)
    ean = Column(String(20))
    upc = Column(String(20))
    elid = Column(String(100))  # Electronic Product ID
    
    # ==================== FOOD-SPECIFIC FIELDS ====================
    # Ingredients & Allergens
    ingredients = Column(Text)
    allergens = Column(String(500))
    traces = Column(String(500))
    
    # Labels & Certifications
    labels = Column(Text)
    
    # Packaging
    packaging = Column(String(200))
    packaging_text = Column(Text)
    
    # Nutrition Scores
    nutriscore_grade = Column(String(1))  # a, b, c, d, e
    nutriscore_score = Column(Integer)
    
    # Environmental Scores
    ecoscore = Column(Integer)  # 0-100
    ecoscore_grade = Column(String(1))  # a, b, c, d, e
    
    # ==================== RETAIL INFO ====================
    stores = Column(String(500))
    purchase_places = Column(String(500))
    
    # ==================== CALCULATED SCORES ====================
    # Ethical Scores (AI-calculated)
    ethical_score = Column(Float)
    sustainability_score = Column(Float)
    labor_score = Column(Float)
    health_score = Column(Float)
    
    # ==================== QUALITY METRICS ====================
    completeness = Column(Float)  # 0.0 to 1.0
    link = Column(Text)  # Product page URL
    
    # ==================== RAW DATA ====================
    raw_api_data = Column(JSON)  # Store full API response for reference
    
    # ==================== TIMESTAMPS ====================
    cached_at = Column(DateTime, default=datetime.utcnow, index=True)
    fetched_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<Product(barcode={self.barcode}, name={self.product_name}, type={self.product_type})>"
    
    def to_dict(self):
        """Convert product to dictionary for API responses"""
        base_dict = {
            "barcode": self.barcode,
            "product_name": self.product_name,
            "brand_name": self.brand_name,
            "brand_owner": self.brand_owner,
            "manufacturer": self.manufacturer,
            "quantity": self.quantity,
            "description": self.description,
            "product_type": self.product_type,
            "data_source": self.data_source,
            "image_url": self.image_url,
            "image_front_url": self.image_front_url,
            "image_small_url": self.image_small_url,
            "images": self.images,
            "country_of_origin": self.country_of_origin,
            "origins": self.origins,
            "manufacturing_places": self.manufacturing_places,
            "category": self.category,
            "stores": self.stores,
            "purchase_places": self.purchase_places,
            "link": self.link,
            "completeness": self.completeness,
            "cached_at": self.cached_at.isoformat() if self.cached_at else None,
            "fetched_at": self.fetched_at.isoformat() if self.fetched_at else None,
        }
        
        # Add product-specific fields based on type
        if self.product_type == "food":
            base_dict.update({
                "ingredients": self.ingredients,
                "allergens": self.allergens,
                "traces": self.traces,
                "labels": self.labels,
                "packaging": self.packaging,
                "packaging_text": self.packaging_text,
                "nutriscore_grade": self.nutriscore_grade,
                "nutriscore_score": self.nutriscore_score,
                "ecoscore": self.ecoscore,
                "ecoscore_grade": self.ecoscore_grade,
            })
        
        elif self.product_type in ["electronics", "general"]:
            base_dict.update({
                "model": self.model,
                "mpn": self.mpn,
                "asin": self.asin,
                "ean": self.ean,
                "upc": self.upc,
                "elid": self.elid,
            })
        
        elif self.product_type == "book":
            base_dict.update({
                "isbn": self.isbn,
            })
        
        elif self.product_type == "cosmetics":
            base_dict.update({
                "ingredients": self.ingredients,
                "labels": self.labels,
                "packaging": self.packaging,
            })
        
        # Always include ethical scores if available
        if self.ethical_score is not None or self.sustainability_score is not None:
            base_dict.update({
                "ethical_score": self.ethical_score,
                "sustainability_score": self.sustainability_score,
                "labor_score": self.labor_score,
                "health_score": self.health_score,
            })
        
        return base_dict


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
    
    # Product type for analytics
    product_type = Column(String(50), index=True)
    
    # Scan metadata
    scanned_at = Column(DateTime, default=datetime.utcnow, index=True)
    
    # Data source used
    data_source = Column(String(50))
    
    # Cache hit or API fetch
    cache_hit = Column(Boolean, default=False)
    
    # User who performed the scan (NULL for guests)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    
    def __repr__(self):
        return f"<ScanHistory(id={self.id}, barcode={self.barcode}, type={self.product_type}, scanned_at={self.scanned_at})>"
    
    def to_dict(self):
        """Convert scan history to dictionary"""
        return {
            "id": self.id,
            "barcode": self.barcode,
            "product_type": self.product_type,
            "data_source": self.data_source,
            "cache_hit": self.cache_hit,
            "user_id": self.user_id,
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