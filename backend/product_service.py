"""
TruLabel Product Service
Handles database caching operations for products
"""

from sqlalchemy.orm import Session
from product_model import Product, ScanHistory
from datetime import datetime, timedelta
from typing import Optional, Dict, List


def get_product_from_cache(db: Session, barcode: str, cache_days: int = 7) -> Optional[Product]:
    """
    Get product from database cache if it exists and is fresh
    
    Args:
        db: Database session
        barcode: Product barcode
        cache_days: Number of days cache is considered fresh (default 7)
        
    Returns:
        Product object if found and fresh, None otherwise
    """
    try:
        # Query product by barcode
        product = db.query(Product).filter(Product.barcode == barcode).first()
        
        if not product:
            print(f"Product {barcode} not found in cache")
            return None
        
        # Check if cache is fresh
        cache_age = datetime.utcnow() - product.cached_at
        if cache_age > timedelta(days=cache_days):
            print(f"Product {barcode} cache is stale (age: {cache_age.days} days)")
            return None
        
        print(f"Product {barcode} found in cache (age: {cache_age.days} days)")
        return product
        
    except Exception as e:
        print(f"Error getting product from cache: {e}")
        return None


def save_product_to_cache(db: Session, product_data: Dict) -> Product:
    """
    Save product to database cache
    If product exists, update it. If not, create new entry.
    
    Args:
        db: Database session
        product_data: Dictionary with product information
        
    Returns:
        Product object that was saved
    """
    try:
        barcode = product_data.get('barcode')
        
        # Check if product already exists
        existing_product = db.query(Product).filter(Product.barcode == barcode).first()
        
        if existing_product:
            # Update existing product
            print(f"Updating existing product {barcode} in cache")

            # Skip datetime fields - we'll set them manually
            datetime_fields = ['cached_at', 'fetched_at', 'created_at', 'updated_at']

            for key, value in product_data.items():
                if key != 'barcode' and key not in datetime_fields and hasattr(existing_product, key):
                    setattr(existing_product, key, value)

            # Update timestamps
            existing_product.cached_at = datetime.utcnow()
            existing_product.updated_at = datetime.utcnow()
            
            db.commit()
            db.refresh(existing_product)
            
            print(f"Product {barcode} updated successfully")
            return existing_product
        else:
            # Create new product
            print(f"Creating new product {barcode} in cache")

            # Ensure required fields are present
            if 'product_name' not in product_data or not product_data['product_name']:
                product_data['product_name'] = 'Unknown'

            # Remove datetime fields - let the model defaults handle them
            datetime_fields = ['cached_at', 'fetched_at', 'created_at', 'updated_at']
            product_data = {k: v for k, v in product_data.items() if k not in datetime_fields}

            # Create product instance
            product = Product(**product_data)
            
            db.add(product)
            db.commit()
            db.refresh(product)
            
            print(f"Product {barcode} created successfully")
            return product
            
    except Exception as e:
        print(f"Error saving product to cache: {e}")
        db.rollback()
        raise


def add_scan_to_history(db: Session, barcode: str) -> ScanHistory:
    """
    Add a scan to the history table
    
    Args:
        db: Database session
        barcode: Product barcode that was scanned
        
    Returns:
        ScanHistory object that was created
    """
    try:
        scan = ScanHistory(barcode=barcode)
        db.add(scan)
        db.commit()
        db.refresh(scan)
        
        print(f"Scan recorded for barcode {barcode}")
        return scan
        
    except Exception as e:
        print(f"Error adding scan to history: {e}")
        db.rollback()
        return None


def get_scan_history(db: Session, limit: int = 20) -> List[ScanHistory]:
    """
    Get recent scan history
    
    Args:
        db: Database session
        limit: Number of recent scans to retrieve
        
    Returns:
        List of ScanHistory objects
    """
    try:
        scans = db.query(ScanHistory)\
            .order_by(ScanHistory.scanned_at.desc())\
            .limit(limit)\
            .all()
        
        return scans
        
    except Exception as e:
        print(f"Error getting scan history: {e}")
        return []


def get_products_by_barcode_list(db: Session, barcodes: List[str]) -> List[Product]:
    """
    Get multiple products by barcode list
    Useful for getting products from scan history
    
    Args:
        db: Database session
        barcodes: List of barcodes
        
    Returns:
        List of Product objects
    """
    try:
        products = db.query(Product)\
            .filter(Product.barcode.in_(barcodes))\
            .all()
        
        return products
        
    except Exception as e:
        print(f"Error getting products by barcode list: {e}")
        return []


def delete_product_from_cache(db: Session, barcode: str) -> bool:
    """
    Delete product from cache
    Useful for testing or cache invalidation
    
    Args:
        db: Database session
        barcode: Product barcode
        
    Returns:
        True if deleted, False otherwise
    """
    try:
        product = db.query(Product).filter(Product.barcode == barcode).first()
        
        if product:
            db.delete(product)
            db.commit()
            print(f"Product {barcode} deleted from cache")
            return True
        else:
            print(f"Product {barcode} not found in cache")
            return False
            
    except Exception as e:
        print(f"Error deleting product from cache: {e}")
        db.rollback()
        return False


def get_cache_stats(db: Session) -> Dict:
    """
    Get cache statistics
    
    Args:
        db: Database session
        
    Returns:
        Dictionary with cache statistics
    """
    try:
        total_products = db.query(Product).count()
        total_scans = db.query(ScanHistory).count()
        
        # Count fresh products (< 7 days old)
        week_ago = datetime.utcnow() - timedelta(days=7)
        fresh_products = db.query(Product)\
            .filter(Product.cached_at > week_ago)\
            .count()
        
        # Count stale products (> 7 days old)
        stale_products = total_products - fresh_products
        
        return {
            "total_products": total_products,
            "fresh_products": fresh_products,
            "stale_products": stale_products,
            "total_scans": total_scans,
            "cache_freshness_days": 7
        }
        
    except Exception as e:
        print(f"Error getting cache stats: {e}")
        return {}


def clear_stale_cache(db: Session, days: int = 30) -> int:
    """
    Clear products older than specified days from cache
    
    Args:
        db: Database session
        days: Clear products older than this many days
        
    Returns:
        Number of products deleted
    """
    try:
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        # Find stale products
        stale_products = db.query(Product)\
            .filter(Product.cached_at < cutoff_date)\
            .all()
        
        count = len(stale_products)
        
        # Delete them
        for product in stale_products:
            db.delete(product)
        
        db.commit()
        
        print(f"Cleared {count} stale products (older than {days} days)")
        return count
        
    except Exception as e:
        print(f"Error clearing stale cache: {e}")
        db.rollback()
        return 0


if __name__ == "__main__":
    # Test the service
    from database import SessionLocal, init_db
    
    print("Initializing database...")
    init_db()
    
    print("\nTesting product service...")
    db = SessionLocal()
    
    # Test data
    test_product = {
        "barcode": "0060410054406",
        "product_name": "Test Product",
        "brand_name": "Test Brand",
        "ecoscore": 75
    }
    
    # Test save
    print("\n1. Testing save to cache...")
    saved = save_product_to_cache(db, test_product)
    print(f"Saved: {saved}")
    
    # Test get
    print("\n2. Testing get from cache...")
    retrieved = get_product_from_cache(db, "0060410054406")
    print(f"Retrieved: {retrieved}")
    
    # Test add scan
    print("\n3. Testing add scan to history...")
    scan = add_scan_to_history(db, "0060410054406")
    print(f"Scan added: {scan}")
    
    # Test stats
    print("\n4. Testing cache stats...")
    stats = get_cache_stats(db)
    print(f"Cache stats: {stats}")
    
    # Cleanup
    print("\n5. Testing delete...")
    deleted = delete_product_from_cache(db, "0060410054406")
    print(f"Deleted: {deleted}")
    
    db.close()
    print("\nAll tests complete!")