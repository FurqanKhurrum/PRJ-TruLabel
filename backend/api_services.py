"""
TruLabel API Services
Multi-layer API integration for comprehensive product coverage
Supports: Food, Electronics, Books, Cosmetics, General Retail Products
"""

import httpx
import logging
from typing import Optional, Dict, Any, List
from abc import ABC, abstractmethod
from datetime import datetime

logger = logging.getLogger(__name__)


class ProductAPIService(ABC):
    """Abstract base class for product API services"""
    
    @abstractmethod
    async def fetch_product(self, barcode: str) -> Optional[Dict[str, Any]]:
        """Fetch product data from API"""
        pass
    
    @property
    @abstractmethod
    def service_name(self) -> str:
        """Name of the service"""
        pass
    
    @property
    @abstractmethod
    def product_types(self) -> List[str]:
        """Types of products this service handles best"""
        pass


class OpenFoodFactsService(ProductAPIService):
    """Open Food Facts API - Best for food and beverage products"""
    
    @property
    def service_name(self) -> str:
        return "OpenFoodFacts"
    
    @property
    def product_types(self) -> List[str]:
        return ["food", "beverage", "nutrition"]
    
    async def fetch_product(self, barcode: str) -> Optional[Dict[str, Any]]:
        """Fetch from Open Food Facts API"""
        url = f"https://world.openfoodfacts.org/api/v0/product/{barcode}.json"
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, timeout=10.0)
                response.raise_for_status()
                
                data = response.json()
                
                if data.get("status") == 1:
                    product = data.get("product", {})
                    
                    return {
                        "source": self.service_name,
                        "product_type": "food",
                        "product_name": product.get("product_name", "Unknown"),
                        "brand_name": product.get("brands", "Unknown"),
                        "brand_owner": product.get("brand_owner", ""),
                        "quantity": product.get("quantity", ""),
                        "image_url": product.get("image_url", ""),
                        "image_front_url": product.get("image_front_url", ""),
                        "image_small_url": product.get("image_small_url", ""),
                        "country_of_origin": product.get("countries", ""),
                        "origins": product.get("origins", ""),
                        "manufacturing_places": product.get("manufacturing_places", ""),
                        "category": product.get("categories", ""),
                        "ingredients": product.get("ingredients_text", ""),
                        "allergens": product.get("allergens", ""),
                        "traces": product.get("traces", ""),
                        "labels": product.get("labels", ""),
                        "packaging": product.get("packaging", ""),
                        "packaging_text": product.get("packaging_text", ""),
                        "stores": product.get("stores", ""),
                        "purchase_places": product.get("purchase_places", ""),
                        "nutriscore_grade": product.get("nutriscore_grade", ""),
                        "nutriscore_score": product.get("nutriscore_score"),
                        "ecoscore": product.get("ecoscore_score"),
                        "ecoscore_grade": product.get("ecoscore_grade", ""),
                        "completeness": product.get("completeness", 0),
                        "link": f"https://world.openfoodfacts.org/product/{barcode}",
                        "raw_api_data": product
                    }
                else:
                    logger.info(f"Product {barcode} not found in OpenFoodFacts")
                    return None
                    
        except Exception as e:
            logger.error(f"OpenFoodFacts error: {type(e).__name__}: {e}")
            return None


class UPCItemDBService(ProductAPIService):
    """UPC Item DB - General products, electronics, books, household items"""
    
    @property
    def service_name(self) -> str:
        return "UPCItemDB"
    
    @property
    def product_types(self) -> List[str]:
        return ["electronics", "books", "household", "general"]
    
    async def fetch_product(self, barcode: str) -> Optional[Dict[str, Any]]:
        """Fetch from UPC Item DB API (free tier)"""
        url = f"https://api.upcitemdb.com/prod/trial/lookup"
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    url,
                    params={"upc": barcode},
                    timeout=10.0
                )
                response.raise_for_status()
                
                data = response.json()
                
                if data.get("code") == "OK" and data.get("items"):
                    item = data["items"][0]
                    
                    return {
                        "source": self.service_name,
                        "product_type": self._determine_product_type(item),
                        "product_name": item.get("title", "Unknown"),
                        "brand_name": item.get("brand", "Unknown"),
                        "brand_owner": item.get("brand", ""),
                        "category": ", ".join(item.get("category", [])) if item.get("category") else "",
                        "description": item.get("description", ""),
                        "model": item.get("model", ""),
                        "mpn": item.get("mpn", ""),  # Manufacturer Part Number
                        "asin": item.get("asin", []),  # Amazon ASIN
                        "image_url": item.get("images", [""])[0] if item.get("images") else "",
                        "images": item.get("images", []),
                        "stores": ", ".join([s.get("name", "") for s in item.get("offers", [])]),
                        "ean": item.get("ean", ""),
                        "upc": item.get("upc", barcode),
                        "elid": item.get("elid", ""),  # Electronic Product ID
                        "link": f"https://www.upcitemdb.com/upc/{barcode}",
                        "raw_api_data": item
                    }
                else:
                    logger.info(f"Product {barcode} not found in UPCItemDB")
                    return None
                    
        except Exception as e:
            logger.error(f"UPCItemDB error: {e}")
            return None
    
    def _determine_product_type(self, item: Dict) -> str:
        """Determine product type from UPC Item DB categories"""
        categories = item.get("category", [])
        if not categories:
            return "general"
        
        category_str = " ".join(categories).lower()
        
        if any(word in category_str for word in ["electronic", "computer", "phone", "tablet"]):
            return "electronics"
        elif any(word in category_str for word in ["book", "media", "music", "dvd"]):
            return "media"
        elif any(word in category_str for word in ["beauty", "cosmetic", "personal care"]):
            return "cosmetics"
        elif any(word in category_str for word in ["health", "vitamin", "supplement"]):
            return "health"
        elif any(word in category_str for word in ["toy", "game"]):
            return "toys"
        else:
            return "general"


class BarcodeLookupService(ProductAPIService):
    """Barcode Lookup API - Wide product coverage"""
    
    def __init__(self, api_key: str = None):
        self.api_key = api_key  # Optional API key for higher limits
    
    @property
    def service_name(self) -> str:
        return "BarcodeLookup"
    
    @property
    def product_types(self) -> List[str]:
        return ["general", "retail", "various"]
    
    async def fetch_product(self, barcode: str) -> Optional[Dict[str, Any]]:
        """Fetch from Barcode Lookup API"""
        if not self.api_key:
            logger.warning("BarcodeLookup API key not configured, skipping")
            return None
        
        url = "https://api.barcodelookup.com/v3/products"
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    url,
                    params={"barcode": barcode, "key": self.api_key},
                    timeout=10.0
                )
                response.raise_for_status()
                
                data = response.json()
                
                if data.get("products"):
                    product = data["products"][0]
                    
                    # Handle stores - can be list of strings or list of dicts
                    stores_data = product.get("stores", [])
                    if stores_data and isinstance(stores_data[0], dict):
                        # Extract store names from dict objects
                        stores_str = ", ".join([store.get("name", "") for store in stores_data if isinstance(store, dict)])
                    elif stores_data and isinstance(stores_data[0], str):
                        # Already strings, just join
                        stores_str = ", ".join(stores_data)
                    else:
                        stores_str = ""

                    return {
                        "source": self.service_name,
                        "product_type": product.get("category", "general"),
                        "product_name": product.get("title", "Unknown"),
                        "brand_name": product.get("brand", "Unknown"),
                        "brand_owner": product.get("manufacturer", ""),
                        "category": product.get("category", ""),
                        "description": product.get("description", ""),
                        "image_url": product.get("images", [""])[0] if product.get("images") else "",
                        "images": product.get("images", []),
                        "stores": stores_str,
                        "asin": product.get("asin", ""),
                        "link": f"https://www.barcodelookup.com/{barcode}",
                        "raw_api_data": product
                    }
                else:
                    logger.info(f"Product {barcode} not found in BarcodeLookup")
                    return None
                    
        except Exception as e:
            logger.error(f"BarcodeLookup error: {e}")
            return None


class OpenBeautyFactsService(ProductAPIService):
    """Open Beauty Facts API - Cosmetics and personal care products"""
    
    @property
    def service_name(self) -> str:
        return "OpenBeautyFacts"
    
    @property
    def product_types(self) -> List[str]:
        return ["cosmetics", "beauty", "personal_care"]
    
    async def fetch_product(self, barcode: str) -> Optional[Dict[str, Any]]:
        """Fetch from Open Beauty Facts API"""
        url = f"https://world.openbeautyfacts.org/api/v0/product/{barcode}.json"
        
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(url, timeout=10.0)
                response.raise_for_status()
                
                data = response.json()
                
                if data.get("status") == 1:
                    product = data.get("product", {})
                    
                    return {
                        "source": self.service_name,
                        "product_type": "cosmetics",
                        "product_name": product.get("product_name", "Unknown"),
                        "brand_name": product.get("brands", "Unknown"),
                        "brand_owner": product.get("brand_owner", ""),
                        "quantity": product.get("quantity", ""),
                        "image_url": product.get("image_url", ""),
                        "image_front_url": product.get("image_front_url", ""),
                        "category": product.get("categories", ""),
                        "ingredients": product.get("ingredients_text", ""),
                        "labels": product.get("labels", ""),
                        "packaging": product.get("packaging", ""),
                        "country_of_origin": product.get("countries", ""),
                        "stores": product.get("stores", ""),
                        "completeness": product.get("completeness", 0),
                        "link": f"https://world.openbeautyfacts.org/product/{barcode}",
                        "raw_api_data": product
                    }
                else:
                    logger.info(f"Product {barcode} not found in OpenBeautyFacts")
                    return None
                    
        except Exception as e:
            logger.error(f"OpenBeautyFacts error: {e}")
            return None


class ProductAPIAggregator:
    """
    Aggregates multiple product APIs with intelligent fallback
    Tries APIs in order until product is found
    """
    
    def __init__(self, barcode_lookup_api_key: str = None):
        # Initialize all services - using only open databases
        self.services: List[ProductAPIService] = [
            OpenFoodFactsService(),           # Food and beverage products
            OpenBeautyFactsService(),          # Cosmetics and beauty products
        ]

        logger.info(f"Initialized {len(self.services)} product API services")
    
    async def fetch_product(self, barcode: str, preferred_type: str = None) -> Optional[Dict[str, Any]]:
        """
        Fetch product from multiple APIs with waterfall strategy
        
        Args:
            barcode: Product barcode
            preferred_type: Hint about product type to try specific APIs first
            
        Returns:
            Product data dict or None if not found in any API
        """
        logger.info(f"Starting product lookup for barcode: {barcode}")
        
        # Reorder services based on preferred type
        ordered_services = self._order_services_by_type(preferred_type)
        
        # Try each service until we get a result
        for service in ordered_services:
            logger.info(f"Trying {service.service_name}...")
            
            try:
                result = await service.fetch_product(barcode)
                
                if result:
                    logger.info(f"✓ Product found in {service.service_name}")
                    result["data_source"] = service.service_name
                    result["fetched_at"] = datetime.utcnow().isoformat()
                    return result
                
            except Exception as e:
                logger.error(f"Error with {service.service_name}: {e}")
                continue
        
        logger.warning(f"Product {barcode} not found in any API service")
        return None
    
    def _order_services_by_type(self, preferred_type: str = None) -> List[ProductAPIService]:
        """Order services by product type preference"""
        if not preferred_type:
            return self.services
        
        # Put services that handle this type first
        prioritized = []
        others = []
        
        for service in self.services:
            if preferred_type.lower() in [pt.lower() for pt in service.product_types]:
                prioritized.append(service)
            else:
                others.append(service)
        
        return prioritized + others
    
    def get_supported_product_types(self) -> List[str]:
        """Get all supported product types across all services"""
        types = set()
        for service in self.services:
            types.update(service.product_types)
        return sorted(list(types))


def detect_barcode_type(barcode: str) -> str:
    """
    Detect likely product type from barcode format
    
    Returns:
        Hint about product type: 'food', 'book', 'general', etc.
    """
    # ISBN (books): starts with 978 or 979
    if barcode.startswith(('978', '979')):
        return 'book'
    
    # Most food products use standard UPC/EAN
    # This is a basic heuristic - can be improved
    if len(barcode) in [8, 12, 13, 14]:
        # Could add more sophisticated detection based on GS1 prefixes
        return 'general'
    
    return 'general'


# Example usage
if __name__ == "__main__":
    import asyncio
    
    async def test():
        aggregator = ProductAPIAggregator()
        
        # Test food product
        print("\n" + "="*60)
        print("Testing Food Product")
        print("="*60)
        result = await aggregator.fetch_product("0060410054406")
        if result:
            print(f"Found: {result.get('product_name')}")
            print(f"Source: {result.get('source')}")
            print(f"Type: {result.get('product_type')}")
        
        # Test general product (if you have one)
        print("\n" + "="*60)
        print("Testing General Product")
        print("="*60)
        result = await aggregator.fetch_product("012345678905")
        if result:
            print(f"Found: {result.get('product_name')}")
            print(f"Source: {result.get('source')}")
    
    asyncio.run(test())