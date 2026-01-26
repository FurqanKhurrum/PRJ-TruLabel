from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
import os
import httpx
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

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Set your app logger to DEBUG to see detailed logs
logger.setLevel(logging.DEBUG)

# Optionally suppress verbose logs from other libraries
logging.getLogger("httpx").setLevel(logging.WARNING)
logging.getLogger("google_genai").setLevel(logging.WARNING)

# Load environment variables from .env file
load_dotenv()

# Configure Google Generative AI
api_key = os.getenv("GOOGLE_API_KEY")
if not api_key:
    logger.error("GOOGLE_API_KEY not found in environment variables")
    raise ValueError("GOOGLE_API_KEY must be set in .env file")

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

app = FastAPI(
    title="TruLabel API with Database Caching",
    description="Ethical Consumer Product Scanner with AI Assessment & Database Caching",
    version="2.0.0"
)

@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    print("\n" + "="*60)
    print("TruLabel API Server Starting...")
    print("="*60)
    init_db()
    print("="*60 + "\n")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files (for test interface)
if os.path.exists("static"):
    app.mount("/static", StaticFiles(directory="static"), name="static")


@app.on_event("startup")
async def startup_event():
    """Initialize database on startup"""
    print("\n" + "="*60)
    print("TruLabel API Server Starting...")
    print("="*60)
    init_db()
    print("="*60 + "\n")


def extract_barcode_from_image(image_bytes: bytes) -> str:
    """Extract barcode from uploaded image"""
    try:
        image = Image.open(io.BytesIO(image_bytes))
        
        if image.mode != 'RGB':
            image = image.convert('RGB')
        
        barcodes = pyzbar.decode(image)
        
        if not barcodes:
            return None
        
        first_barcode = barcodes[0]
        barcode_data = first_barcode.data.decode('utf-8')
        
        print(f"✓ Detected barcode: {barcode_data} (Type: {first_barcode.type})")
        
        return barcode_data
        
    except Exception as e:
        print(f"✗ Error extracting barcode: {e}")
        return None


def generate_barcode_variations(barcode: str) -> list:
    """
    Generate smart barcode variations to try
    Returns list of barcodes ordered by likelihood
    """
    variations = []
    
    # Always try original first
    variations.append(barcode)
    
    # For 13-digit barcodes starting with 0 (common UPC-A expansion)
    if len(barcode) == 13 and barcode.startswith('0'):
        # Try 12-digit version (remove leading 0)
        variations.append(barcode[1:])
        
        # Try extracting potential UPC-E patterns
        # Pattern: Take specific positions that often work
        # For 0067000004629 -> 06746209:
        # Positions: 0,1,2,3,6,7,10,11
        if len(barcode) >= 12:
            try:
                # Common UPC-E extraction pattern
                upce_attempt = barcode[0] + barcode[1:4] + barcode[6:8] + barcode[10] + barcode[12]
                if len(upce_attempt) == 8:
                    variations.append(upce_attempt)
            except:
                pass
    
    # Try without leading zeros (any length)
    stripped = barcode.lstrip('0')
    if stripped and stripped != barcode:
        variations.append(stripped)
    
    # Try first 8 digits
    if len(barcode) >= 8:
        variations.append(barcode[:8])
        # Also try first 8 without leading zeros
        first_8_stripped = barcode[:8].lstrip('0')
        if first_8_stripped != barcode[:8]:
            variations.append(first_8_stripped)
    
    # Try last 8 digits
    if len(barcode) >= 8:
        variations.append(barcode[-8:])
        # Also try last 8 without leading zeros
        last_8_stripped = barcode[-8:].lstrip('0')
        if last_8_stripped != barcode[-8:]:
            variations.append(last_8_stripped)
    
    # For shorter barcodes, try with leading zero
    if len(barcode) < 13 and not barcode.startswith('0'):
        variations.append('0' + barcode)
    
    # Remove duplicates while preserving order
    seen = set()
    unique = []
    for v in variations:
        if v and v not in seen and len(v) >= 6:  # Must be at least 6 digits
            seen.add(v)
            unique.append(v)
    
    return unique


async def fetch_product_from_openfoodfacts(barcode: str) -> dict:
    """
    Fetch product from Open Food Facts API
    Tries multiple barcode format variations
    """
    
    # Generate variations to try
    barcodes_to_try = generate_barcode_variations(barcode)
    
    print(f"🔍 Trying {len(barcodes_to_try)} barcode variation(s)")
    for i, bc in enumerate(barcodes_to_try, 1):
        print(f"   {i}. {bc}")
    
    # Try each variation
    for try_barcode in barcodes_to_try:
        url = f"https://world.openfoodfacts.org/api/v0/product/{try_barcode}.json"
        
        try:
            print(f"   → Trying {try_barcode}...", end=" ")
            async with httpx.AsyncClient() as client:
                response = await client.get(url, timeout=10.0)
                response.raise_for_status()
                
                data = response.json()
                
                if data.get("status") == 1:
                    product = data.get("product", {})
                    product_name = product.get("product_name", "Unknown")
                    
                    print(f"✓ FOUND! ({product_name})")
                    
                    # Extract product data (WITHOUT scanned_barcode)
                    product_data = {
                        "barcode": try_barcode,
                        "product_name": product_name,
                        "brand_name": product.get("brands", "Unknown"),
                        "brand_owner": product.get("brand_owner", ""),
                        "quantity": product.get("quantity", ""),
                        "image_url": product.get("image_url", ""),
                        "image_front_url": product.get("image_front_url", ""),
                        "image_small_url": product.get("image_small_url", ""),
                        "country_of_origin": product.get("countries", "Unknown"),
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
                        "nutriscore_score": product.get("nutriscore_score", None),
                        "ecoscore": product.get("ecoscore_score", None),
                        "ecoscore_grade": product.get("ecoscore_grade", ""),
                        "completeness": product.get("completeness", 0),
                        "link": product.get("link", ""),
                        "raw_api_data": product
                    }
                    
                    if try_barcode != barcode:
                        print(f"      ℹ️  Used format {try_barcode} instead of scanned {barcode}")
                    
                    return product_data
                else:
                    print(f"✗")
                    
        except Exception as e:
            print(f"✗")
            continue
    
    print(f"❌ Product not found with any variation")
    return None


# Configuration constants
MAX_RETRIES = 3
RETRY_DELAY = 1  # seconds
AI_TIMEOUT = 30  # seconds

# Prompt template for ethical assessment
ETHICAL_ASSESSMENT_PROMPT = """You are an ethical product assessment AI. Analyze this product and return ONLY a JSON object with the following structure:

Product: {product_name}
Brand: {brand_name}
Category: {category}
Labels: {labels}

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
  "overall_recommendation": "<SHORT recommendation: 'Highly Recommended', 'Recommended', 'Consider Alternatives', or 'Avoid'>",
  "key_concerns": ["<concern 1>", "<concern 2>"],
  "positive_attributes": ["<positive 1>", "<positive 2>"]
}}

Base your scores on:
- Sustainability: carbon footprint, renewable energy, waste management, packaging
- Labor Practices: working conditions, fair wages, employee rights, supply chain transparency
- Animal Testing: cruelty-free certifications, testing policies
- Environmental Impact: resource usage, pollution, ecological footprint

Return ONLY the JSON object, no other text."""

class AIServiceError(Exception):
    """Custom exception for AI service errors"""
    pass

async def assess_product_ethics(
    product_name: str, 
    brand_name: str,
    category: str = "Unknown",
    labels: str = "",
    retry_count: int = 0
) -> Optional[Dict[str, Any]]:
    """
    Call AI API to assess product for ethical consumers with robust error handling
    
    Returns:
        Dict with structured assessment data, or None if all retries fail
    """
    try:
        # Validate inputs
        if not product_name or product_name == "Unknown":
            logger.warning("Product name is unknown or empty")
            return {
                "status": "incomplete_data",
                "error": "Product name not available"
            }
        
        # Format the prompt with product info
        prompt = ETHICAL_ASSESSMENT_PROMPT.format(
            product_name=product_name,
            brand_name=brand_name if brand_name != "Unknown" else "Not specified",
            category=category if category else "Unknown",
            labels=labels if labels else "None"
        )
        
        logger.info(f"Sending prompt to AI API (attempt {retry_count + 1}/{MAX_RETRIES})")
        logger.debug(f"Prompt:\n{prompt}")
        print(f"\n{'='*60}\n🔵 PROMPT SENT TO AI (Attempt {retry_count + 1})\n{'='*60}\n{prompt}\n{'='*60}\n")
        
        # Call the AI API with timeout
        try:
            response = await asyncio.wait_for(
                asyncio.to_thread(
                    client.models.generate_content,
                    model="models/gemini-2.5-flash-lite",
                    contents=prompt
                ),
                timeout=AI_TIMEOUT
            )
            
            # Extract and validate response
            if not response or not hasattr(response, 'text'):
                raise AIServiceError("Invalid response from AI service")
            
            assessment_text = response.text
            
            if not assessment_text or len(assessment_text.strip()) < 10:
                raise AIServiceError("AI response is empty or too short")
            
            logger.info(f"AI Response received successfully ({len(assessment_text)} chars)")
            logger.debug(f"Response:\n{assessment_text}")
            print(f"\n{'='*60}\n✅ AI RESPONSE RECEIVED ({len(assessment_text)} chars)\n{'='*60}\n{assessment_text}\n{'='*60}\n")
            
            # Parse JSON from response
            parsed_data = parse_ai_json_response(assessment_text)
            
            if parsed_data:
                return {
                    "status": "success",
                    "data": parsed_data,
                    "error": None
                }
            else:
                # Fallback if JSON parsing fails
                return {
                    "status": "success",
                    "raw_assessment": assessment_text,
                    "error": "Could not parse structured data"
                }
            
        except asyncio.TimeoutError:
            error_msg = f"AI API timeout after {AI_TIMEOUT} seconds"
            logger.error(error_msg)
            print(f"\n⏰ TIMEOUT ERROR: {error_msg}\n")
            raise AIServiceError(error_msg)
        
        except Exception as api_error:
            error_msg = f"{type(api_error).__name__}: {api_error}"
            logger.error(f"AI API call error: {error_msg}")
            print(f"\n❌ API ERROR: {error_msg}\n")
            raise AIServiceError(f"AI API error: {str(api_error)}")
    
    except AIServiceError as e:
        # Retry logic for transient errors
        if retry_count < MAX_RETRIES - 1:
            logger.warning(f"Retrying AI request in {RETRY_DELAY} seconds...")
            await asyncio.sleep(RETRY_DELAY)
            return await assess_product_ethics(product_name, brand_name, category, labels, retry_count + 1)
        else:
            logger.error(f"All retry attempts exhausted: {e}")
            return {
                "status": "error",
                "error": str(e)
            }
    
    except Exception as e:
        # Catch-all for unexpected errors
        logger.error(f"Unexpected error in assess_product_ethics: {type(e).__name__}: {e}")
        return {
            "status": "error",
            "error": f"Unexpected error: {str(e)}"
        }

def parse_ai_json_response(text: str) -> Optional[Dict[str, Any]]:
    """
    Extract and parse JSON from AI response text
    """
    try:
        # Try to parse the entire response as JSON first
        return json.loads(text)
    except json.JSONDecodeError:
        # Try to find JSON within the text
        json_match = re.search(r'\{.*\}', text, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group())
            except json.JSONDecodeError:
                logger.warning("Found JSON-like text but could not parse it")
                return None
        logger.warning("Could not extract JSON from AI response")
        return None

@app.get("/")
async def root():
    """API welcome message"""
    return {
        "message": "TruLabel API - Product Scanner with Database Caching",
        "version": "2.0.0",
        "features": ["Barcode scanning", "AI ethics assessment", "Database caching", "Scan history"],
        "endpoints": {
            "scan": "POST /api/scan-image",
            "lookup": "GET /api/product/{barcode}",
            "history": "GET /api/history",
            "cache_stats": "GET /api/cache/stats",
            "health": "GET /api/health",
            "test_ui": "GET /test"
        }
    }

@app.get("/api/health")
async def health_check(db: Session = Depends(get_db)):
    """Health check endpoint with cache stats and AI service status"""
    stats = get_cache_stats(db)
    
    ai_status = "unknown"
    try:
        # Quick test of AI service
        test_response = await asyncio.wait_for(
            asyncio.to_thread(
                client.models.generate_content,
                model="models/gemini-2.5-flash-lite",
                contents="test"
            ),
            timeout=5.0
        )
        ai_status = "healthy" if test_response else "unhealthy"
    except Exception as e:
        logger.warning(f"AI health check failed: {e}")
        ai_status = "unhealthy"
    
    return {
        "status": "healthy",
        "message": "API is running with database caching",
        "ai_service": ai_status,
        "cache_stats": stats
    }


@app.post("/api/scan-image")
async def scan_image(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Upload an image and extract barcode
    Returns product information with database caching
    """
    print("\n" + "="*60)
    print("NEW SCAN REQUEST")
    print("="*60)
    
    if not file.content_type.startswith('image/'):
        raise HTTPException(
            status_code=400,
            detail="File must be an image (jpeg, png, etc.)"
        )
    
    image_bytes = await file.read()
    print(f"📷 Image uploaded: {len(image_bytes)} bytes")
    
    print("🔍 Extracting barcode from image...")
    barcode = barcode_service.extract_barcode_from_image(image_bytes)
    
    if not barcode:
        raise HTTPException(
            status_code=404,
            detail="No barcode detected in image. Please ensure barcode is clearly visible."
        )
    
    print(f"✓ Barcode extracted: {barcode}")
    
    print("💾 Checking database cache...")
    cached_product = get_product_from_cache(db, barcode, cache_days=7)
    
    if cached_product:
        print(f"⚡ CACHE HIT! Using cached data for {barcode}")
        add_scan_to_history(db, barcode)
        
        product_dict = cached_product.to_dict()
        product_dict['cache_hit'] = True
        
        # Call AI assessment for cached product
        ethical_result = await assess_product_ethics(
            product_name=product_dict.get("product_name", "Unknown"),
            brand_name=product_dict.get("brand_name", "Unknown"),
            category=product_dict.get("category", ""),
            labels=product_dict.get("labels", "")
        )
        
        print("="*60 + "\n")
        return {
            "barcode": barcode,
            "product": product_dict,
            "ethical_assessment": ethical_result
        }
    
    print(f"❌ Cache miss for {barcode}")
    print("🌐 Fetching from Open Food Facts API...")
    
    product_info = await fetch_product_from_openfoodfacts(barcode)
    
    if not product_data:
        raise HTTPException(
            status_code=404,
            detail=f"Barcode {barcode} not found in product database. Tried multiple formats."
        )
    
    print(f"✓ Product found: {product_info.get('product_name', 'Unknown')}")
    
    print("💾 Saving to database cache...")
    saved_product = save_product_to_cache(db, {"barcode": barcode, **product_info})
    
    add_scan_to_history(db, barcode)
    
    result_dict = saved_product.to_dict()
    result_dict['cache_hit'] = False
    
    # Call AI assessment for new product
    ethical_result = await assess_product_ethics(
        product_name=result_dict.get("product_name", "Unknown"),
        brand_name=result_dict.get("brand_name", "Unknown"),
        category=result_dict.get("category", ""),
        labels=result_dict.get("labels", "")
    )
    
    print("✓ Scan complete!")
    print("="*60 + "\n")
    
    return {
        "barcode": barcode,
        "product": result_dict,
        "ethical_assessment": ethical_result
    }


@app.get("/api/product/{barcode}")
async def get_product(barcode: str, db: Session = Depends(get_db)):
    """Get product by barcode with caching"""
    print(f"\n🔍 Direct lookup for barcode: {barcode}")
    
    cached_product = get_product_from_cache(db, barcode, cache_days=7)
    
    if cached_product:
        print(f"⚡ Cache hit for {barcode}")
        add_scan_to_history(db, barcode)
        
        product_dict = cached_product.to_dict()
        product_dict['cache_hit'] = True
        
        return {
            "barcode": barcode,
            "product": product_dict
        }
    
    print(f"🌐 Fetching {barcode} from API...")
    product_info = await fetch_product_from_openfoodfacts(barcode)
    
    print(f"🌐 Fetching {barcode} from API...")
    product_data = await fetch_product_from_openfoodfacts(barcode)
    
    if not product_data:
        raise HTTPException(
            status_code=404,
            detail=f"Product {barcode} not found. Tried multiple formats."
        )
    
    saved_product = save_product_to_cache(db, {"barcode": barcode, **product_info})
    add_scan_to_history(db, barcode)
    
    result_dict = saved_product.to_dict()
    result_dict['cache_hit'] = False
    
    return {
        "barcode": barcode,
        "product": result_dict
    }

async def fetch_product_from_openfoodfacts(barcode: str):
    """Fetch product from Open Food Facts API"""
    url = f"https://world.openfoodfacts.org/api/v0/product/{barcode}.json"
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=10.0)
            response.raise_for_status()
            
            data = response.json()
            
            if data.get("status") == 1:
                product = data.get("product", {})
                
                # Extract relevant fields
                return {
                    "product_name": product.get("product_name", "Unknown"),
                    "brand_name": product.get("brands", "Unknown"),
                    "brand_owner": product.get("brand_owner", ""),
                    "quantity": product.get("quantity", ""),
                    "image_url": product.get("image_url", ""),
                    "image_front_url": product.get("image_front_url", ""),
                    "image_small_url": product.get("image_small_url", ""),
                    "country_of_origin": product.get("countries", "Unknown"),
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
                    "nutriscore_score": product.get("nutriscore_score", None),
                    "ecoscore": product.get("ecoscore_score", None),
                    "ecoscore_grade": product.get("ecoscore_grade", ""),
                    "completeness": product.get("completeness", 0),
                    "link": product.get("link", ""),
                    "raw_api_data": product
                }
            else:
                return None
                
    except Exception as e:
        logger.error(f"Error fetching product: {e}")
        return None


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
    """Get cache statistics"""
    stats = get_cache_stats(db)
    return stats


@app.delete("/api/cache/clear-stale")
async def clear_stale(days: int = 30, db: Session = Depends(get_db)):
    """Clear products older than specified days from cache"""
    count = clear_stale_cache(db, days=days)
    return {
        "message": f"Cleared {count} stale products",
        "days_threshold": days
    }


# Serve static files
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/test")
async def serve_test_page():
    """Serve the image upload test page"""
    if os.path.exists("static/index.html"):
        return FileResponse("static/index.html")
    else:
        return {
            "message": "Test page not found. Create static/index.html to use the test interface.",
            "api_docs": "Visit /docs for interactive API documentation"
        }


if __name__ == "__main__":
    import uvicorn
    print("=" * 60)
    print("TruLabel API Server - With Database Caching & AI Assessment")
    print("=" * 60)
    print("Starting server on http://localhost:8000")
    print("API Docs: http://localhost:8000/docs")
    print("Test Interface: http://localhost:8000/test")
    print("=" * 60)
    uvicorn.run(app, host="0.0.0.0", port=8000)
