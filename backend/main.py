"""
TruLabel Enhanced Backend API
Multi-Source Product Scanner supporting:
- Food & Beverages (Open Food Facts)
- Electronics & General Products (UPC Item DB)
- Cosmetics & Beauty (Open Beauty Facts)
- Books (ISBN detection)
- General Retail (Barcode Lookup API)
"""

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from barcode_service import BarcodeService
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import os
import google.genai as genai
from dotenv import load_dotenv
import logging
from typing import Optional, Dict, Any
import asyncio
import json
import re

# Import database components
from database import init_db, get_db
from product_model import Product, ScanHistory
from product_service import (
    get_product_from_cache,
    save_product_to_cache,
    add_scan_to_history,
    get_scan_history,
    get_cache_stats,
    clear_stale_cache
)

# Import new API aggregator
from api_services import ProductAPIAggregator, detect_barcode_type

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)
logger.setLevel(logging.DEBUG)

# Suppress verbose logs
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("google_genai").setLevel(logging.WARNING)

# Load environment variables
load_dotenv()

# Configure Google Generative AI
api_key = os.getenv("GOOGLE_API_KEY")
if not api_key:
    logger.error("GOOGLE_API_KEY not found in environment variables")
    raise ValueError("GOOGLE_API_KEY must be set in .env file")

client = genai.Client(api_key=api_key)

# Initialize API Aggregator (optionally with Barcode Lookup API key)
barcode_lookup_key = os.getenv("BARCODE_LOOKUP_API_KEY")  # Optional
api_aggregator = ProductAPIAggregator(barcode_lookup_api_key=barcode_lookup_key)

app = FastAPI(
    title="TruLabel Multi-Source API",
    description="Ethical Consumer Product Scanner - Food, Electronics, Books, Cosmetics & More",
    version="3.0.0"
)

@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    print("\n" + "="*70)
    print("🚀 TruLabel Multi-Source API Server Starting...")
    print("="*70)
    init_db()
    
    print("\n📡 Configured API Sources:")
    for service in api_aggregator.services:
        types = ", ".join(service.product_types)
        print(f"   ✓ {service.service_name}: {types}")
    
    print("\n🎯 Supported Product Types:")
    types = api_aggregator.get_supported_product_types()
    for ptype in types:
        print(f"   • {ptype}")
    
    print("="*70 + "\n")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

barcode_service = BarcodeService()

# Configuration constants
MAX_RETRIES = 3
RETRY_DELAY = 1
AI_TIMEOUT = 30

# Enhanced AI prompt for different product types
ETHICAL_ASSESSMENT_PROMPT = """You are an ethical product assessment AI. Analyze this product and return ONLY a JSON object.

Product: {product_name}
Brand: {brand_name}
Type: {product_type}
Category: {category}
Description: {description}
Labels: {labels}
Product URL: {product_url}

Based on the product type "{product_type}", provide appropriate ethical scores:

For FOOD products, focus on:
- Sustainability: organic farming, carbon footprint, packaging
- Labor: fair trade, worker conditions
- Environmental: local sourcing, seasonal production
- Health: nutritional value, additives

For ELECTRONICS products, focus on:
- Sustainability: e-waste, recyclability, repairability
- Labor: supply chain ethics, conflict minerals
- Environmental: energy efficiency, toxic materials
- Durability: planned obsolescence, warranty

For COSMETICS products, focus on:
- Animal Testing: cruelty-free status
- Sustainability: packaging, ingredients sourcing
- Health: toxic chemicals, allergens
- Environmental: biodegradability, microplastics

For GENERAL/RETAIL products, focus on:
- Manufacturing ethics
- Environmental impact
- Labor practices
- Product longevity

Return this exact JSON structure with scores out of 100:
{{
  "sustainability_score": <number 0-100>,
  "sustainability_description": "<brief 1-2 sentence explanation>",
  "labor_practices_score": <number 0-100>,
  "labor_practices_description": "<brief 1-2 sentence explanation>",
  "animal_testing_score": <number 0-100>,
  "animal_testing_description": "<brief 1-2 sentence explanation>",
  "environmental_impact_score": <number 0-100>,
  "environmental_impact_description": "<brief 1-2 sentence explanation>",
  "overall_recommendation": "<SHORT: 'Highly Recommended', 'Recommended', 'Consider Alternatives', or 'Avoid'>",
  "key_concerns": ["<concern 1>", "<concern 2>"],
  "positive_attributes": ["<positive 1>", "<positive 2>"],
  "sources": [
    {{
      "name": "<source name>",
      "url": "<https://...>"
    }}
  ]
}}

Rules for sources:
- Use real, product-related URLs whenever possible (product page, brand site, certification registry, or public database).
- If Product URL is provided, include it as one of the sources.
- Provide 1-4 sources. If none are available, return an empty array.

Return ONLY the JSON object, no other text."""


class AIServiceError(Exception):
    """Custom exception for AI service errors"""
    pass


async def assess_product_ethics(
    product_name: str,
    brand_name: str,
    product_type: str = "general",
    category: str = "Unknown",
    description: str = "",
    labels: str = "",
    product_url: str = "",
    retry_count: int = 0
) -> Optional[Dict[str, Any]]:
    """
    Enhanced AI assessment supporting multiple product types
    """
    try:
        if not product_name or product_name == "Unknown":
            logger.warning("Product name is unknown or empty")
            return {
                "status": "incomplete_data",
                "error": "Product name not available"
            }
        
        # Format prompt with enhanced product info
        prompt = ETHICAL_ASSESSMENT_PROMPT.format(
            product_name=product_name,
            brand_name=brand_name if brand_name != "Unknown" else "Not specified",
            product_type=product_type,
            category=category if category else "Unknown",
            description=description[:200] if description else "Not available",
            labels=labels if labels else "None",
            product_url=product_url if product_url else "Not available"
        )
        
        logger.info(f"Sending {product_type} product to AI (attempt {retry_count + 1}/{MAX_RETRIES})")
        print(f"\n{'='*70}\n🤖 AI Assessment Request ({product_type})\n{'='*70}")
        
        try:
            response = await asyncio.wait_for(
                asyncio.to_thread(
                    client.models.generate_content,
                    model="gemini-2.5-flash",
                    contents=prompt
                ),
                timeout=AI_TIMEOUT
            )
            
            if not response or not hasattr(response, 'text'):
                raise AIServiceError("Invalid response from AI service")
            
            assessment_text = response.text
            
            if not assessment_text or len(assessment_text.strip()) < 10:
                raise AIServiceError("AI response is empty or too short")
            
            logger.info(f"✓ AI Response received ({len(assessment_text)} chars)")
            print(f"✅ AI Assessment Complete\n{'='*70}\n")
            
            # Parse JSON from response
            parsed_data = parse_ai_json_response(assessment_text)
            
            if parsed_data:
                return {
                    "status": "success",
                    "data": parsed_data,
                    "error": None
                }
            else:
                return {
                    "status": "success",
                    "raw_assessment": assessment_text,
                    "error": "Could not parse structured data"
                }
            
        except asyncio.TimeoutError:
            error_msg = f"AI API timeout after {AI_TIMEOUT} seconds"
            logger.error(error_msg)
            raise AIServiceError(error_msg)
        
        except Exception as api_error:
            error_msg = f"{type(api_error).__name__}: {api_error}"
            logger.error(f"AI API error: {error_msg}")
            raise AIServiceError(f"AI API error: {str(api_error)}")
    
    except AIServiceError as e:
        if retry_count < MAX_RETRIES - 1:
            logger.warning(f"Retrying AI request in {RETRY_DELAY} seconds...")
            await asyncio.sleep(RETRY_DELAY)
            return await assess_product_ethics(
                product_name, brand_name, product_type, 
                category, description, labels, product_url, retry_count + 1
            )
        else:
            logger.error(f"All retry attempts exhausted: {e}")
            return {
                "status": "error",
                "error": str(e)
            }
    
    except Exception as e:
        logger.error(f"Unexpected error: {type(e).__name__}: {e}")
        return {
            "status": "error",
            "error": f"Unexpected error: {str(e)}"
        }


def parse_ai_json_response(text: str) -> Optional[Dict]:
    """Parse JSON from AI response, handling markdown code blocks"""
    try:
        # Remove markdown code blocks if present
        text = text.strip()
        if text.startswith("```json"):
            text = text[7:]
        if text.startswith("```"):
            text = text[3:]
        if text.endswith("```"):
            text = text[:-3]
        
        text = text.strip()
        
        # Try to find JSON object
        json_match = re.search(r'\{.*\}', text, re.DOTALL)
        if json_match:
            json_str = json_match.group(0)
            return json.loads(json_str)
        
        return json.loads(text)
        
    except Exception as e:
        logger.error(f"Error parsing AI JSON: {e}")
        return None


@app.post("/api/scan")
async def scan_product(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Enhanced scan endpoint supporting multiple product types
    Automatically detects barcode and tries appropriate APIs
    """
    print("\n" + "="*70)
    print("📸 NEW SCAN REQUEST")
    print("="*70)
    
    if not file.content_type.startswith('image/'):
        raise HTTPException(
            status_code=400,
            detail="File must be an image (jpeg, png, etc.)"
        )
    
    image_bytes = await file.read()
    print(f"📷 Image uploaded: {len(image_bytes)} bytes")
    
    # Extract barcode
    print("🔍 Extracting barcode...")
    barcode = barcode_service.extract_barcode_from_image(image_bytes)
    
    if not barcode:
        raise HTTPException(
            status_code=404,
            detail="No barcode detected in image. Please ensure barcode is clearly visible."
        )
    
    print(f"✓ Barcode extracted: {barcode}")
    
    # Detect barcode type for smarter API selection
    barcode_type_hint = detect_barcode_type(barcode)
    print(f"🎯 Barcode type hint: {barcode_type_hint}")
    
    # Check cache
    print("💾 Checking database cache...")
    cached_product = get_product_from_cache(db, barcode, cache_days=7)
    
    if cached_product:
        print(f"⚡ CACHE HIT! Using cached data")
        
        # Record scan
        scan_history = ScanHistory(
            barcode=barcode,
            product_type=cached_product.product_type,
            data_source=cached_product.data_source,
            cache_hit=True
        )
        db.add(scan_history)
        db.commit()
        
        product_dict = cached_product.to_dict()
        product_dict['cache_hit'] = True
        
        # AI assessment
        ethical_result = await assess_product_ethics(
            product_name=product_dict.get("product_name", "Unknown"),
            brand_name=product_dict.get("brand_name", "Unknown"),
            product_type=product_dict.get("product_type", "general"),
            category=product_dict.get("category", ""),
            description=product_dict.get("description", ""),
            labels=product_dict.get("labels", ""),
            product_url=product_dict.get("link", "")
        )
        
        print("="*70 + "\n")
        return {
            "barcode": barcode,
            "product": product_dict,
            "ethical_assessment": ethical_result
        }
    
    # Fetch from APIs
    print(f"❌ Cache miss - fetching from API sources...")
    product_info = await api_aggregator.fetch_product(barcode, preferred_type=barcode_type_hint)
    
    if not product_info:
        raise HTTPException(
            status_code=404,
            detail=f"Product {barcode} not found in any database. Barcode may be invalid or not in our sources."
        )
    
    print(f"✓ Product found: {product_info.get('product_name')}")
    print(f"  Source: {product_info.get('source')}")
    print(f"  Type: {product_info.get('product_type')}")
    
    # Save to cache
    print("💾 Saving to cache...")
    # Map 'source' to 'data_source' for database model
    cache_data = {"barcode": barcode, **product_info}
    if 'source' in cache_data:
        cache_data['data_source'] = cache_data.pop('source')
    saved_product = save_product_to_cache(db, cache_data)
    
    # Record scan
    scan_history = ScanHistory(
        barcode=barcode,
        product_type=saved_product.product_type,
        data_source=saved_product.data_source,
        cache_hit=False
    )
    db.add(scan_history)
    db.commit()
    
    result_dict = saved_product.to_dict()
    result_dict['cache_hit'] = False
    
    # AI assessment
    ethical_result = await assess_product_ethics(
        product_name=result_dict.get("product_name", "Unknown"),
        brand_name=result_dict.get("brand_name", "Unknown"),
        product_type=result_dict.get("product_type", "general"),
        category=result_dict.get("category", ""),
        description=result_dict.get("description", ""),
        labels=result_dict.get("labels", ""),
        product_url=result_dict.get("link", "")
    )
    
    print("✓ Scan complete!")
    print("="*70 + "\n")
    
    return {
        "barcode": barcode,
        "product": result_dict,
        "ethical_assessment": ethical_result
    }


@app.get("/api/product/{barcode}")
async def get_product(barcode: str, db: Session = Depends(get_db)):
    """Get product by barcode"""
    print(f"\n🔍 Direct lookup: {barcode}")
    
    cached_product = get_product_from_cache(db, barcode, cache_days=7)
    
    if cached_product:
        print(f"⚡ Cache hit")
        
        scan_history = ScanHistory(
            barcode=barcode,
            product_type=cached_product.product_type,
            data_source=cached_product.data_source,
            cache_hit=True
        )
        db.add(scan_history)
        db.commit()
        
        product_dict = cached_product.to_dict()
        product_dict['cache_hit'] = True
        
        return {
            "barcode": barcode,
            "product": product_dict
        }
    
    barcode_type_hint = detect_barcode_type(barcode)
    product_info = await api_aggregator.fetch_product(barcode, preferred_type=barcode_type_hint)
    
    if not product_info:
        raise HTTPException(
            status_code=404,
            detail=f"Product {barcode} not found"
        )

    # Map 'source' to 'data_source' for database model
    cache_data = {"barcode": barcode, **product_info}
    if 'source' in cache_data:
        cache_data['data_source'] = cache_data.pop('source')
    saved_product = save_product_to_cache(db, cache_data)
    
    scan_history = ScanHistory(
        barcode=barcode,
        product_type=saved_product.product_type,
        data_source=saved_product.data_source,
        cache_hit=False
    )
    db.add(scan_history)
    db.commit()
    
    result_dict = saved_product.to_dict()
    result_dict['cache_hit'] = False
    
    return {
        "barcode": barcode,
        "product": result_dict
    }


@app.get("/api/history")
async def get_history(limit: int = 20, db: Session = Depends(get_db)):
    """Get recent scan history"""
    scans = get_scan_history(db, limit=limit)
    return {
        "count": len(scans),
        "scans": [scan.to_dict() for scan in scans]
    }


@app.get("/api/cache/stats")
async def cache_statistics(db: Session = Depends(get_db)):
    """Enhanced cache statistics with product type breakdown"""
    from sqlalchemy import func
    
    stats = get_cache_stats(db)
    
    # Add product type breakdown
    type_breakdown = db.query(
        Product.product_type,
        func.count(Product.barcode)
    ).group_by(Product.product_type).all()
    
    source_breakdown = db.query(
        Product.data_source,
        func.count(Product.barcode)
    ).group_by(Product.data_source).all()
    
    stats["products_by_type"] = {ptype: count for ptype, count in type_breakdown}
    stats["products_by_source"] = {source: count for source, count in source_breakdown}
    
    return stats


@app.delete("/api/cache/clear-stale")
async def clear_stale(days: int = 30, db: Session = Depends(get_db)):
    """Clear stale cache"""
    count = clear_stale_cache(db, days=days)
    return {
        "message": f"Cleared {count} stale products",
        "days_threshold": days
    }


@app.get("/api/sources")
async def get_api_sources():
    """Get information about configured API sources"""
    sources = []
    for service in api_aggregator.services:
        sources.append({
            "name": service.service_name,
            "product_types": service.product_types
        })
    
    return {
        "configured_sources": sources,
        "supported_types": api_aggregator.get_supported_product_types()
    }


# Serve static files
if os.path.exists("static"):
    app.mount("/static", StaticFiles(directory="static"), name="static")
    
    @app.get("/test")
    async def serve_test_page():
        """Serve the image upload test page"""
        return FileResponse("static/index.html")


if __name__ == "__main__":
    import uvicorn
    print("=" * 70)
    print("🚀 TruLabel Multi-Source API Server")
    print("=" * 70)
    print("Server: http://localhost:8000")
    print("API Docs: http://localhost:8000/docs")
    print("Test Interface: http://localhost:8000/test")
    print("=" * 70)
    uvicorn.run(app, host="0.0.0.0", port=8000)
