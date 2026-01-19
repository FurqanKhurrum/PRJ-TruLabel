from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from barcode_service import BarcodeService
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
import httpx
import google.genai as genai
from dotenv import load_dotenv
import logging
from typing import Optional, Dict, Any
import asyncio
import json
import re

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

client = genai.Client(api_key=api_key)

app = FastAPI(
    title="TruLabel API",
    description="Ethical Consumer Product Scanner API",
    version="1.0.0"
)

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
    return {"message": "TruLabel API - Welcome!"}

@app.get("/api/health")
async def health_check():
    """Health check endpoint with AI service status"""
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
        "message": "API is running",
        "ai_service": ai_status
    }

@app.post("/api/scan-image")
async def scan_image(file: UploadFile = File(...)):
    """
    Upload an image and extract barcode
    
    Returns product information if barcode found
    """
    # Validate file type
    if not file.content_type.startswith('image/'):
        raise HTTPException(
            status_code=400,
            detail="File must be an image (jpeg, png, etc.)"
        )
    
    # Read image bytes
    image_bytes = await file.read()
    
    # Extract barcode
    barcode = barcode_service.extract_barcode_from_image(image_bytes)
    
    if not barcode:
        raise HTTPException(
            status_code=404,
            detail="No barcode detected in image. Please ensure barcode is clearly visible."
        )
    
    # Fetch product info from Open Food Facts
    product_info = await fetch_product_from_openfoodfacts(barcode)
    
    if not product_info:
        raise HTTPException(
            status_code=404,
            detail=f"Barcode {barcode} not found in product database"
        )
    
    # Call the AI assessment function
    ethical_result = await assess_product_ethics(
        product_name=product_info.get("product_name", "Unknown"),
        brand_name=product_info.get("brand_name", "Unknown"),
        category=product_info.get("category", ""),
        labels=product_info.get("labels", "")
    )
    
    return {
        "barcode": barcode,
        "product": product_info,
        "ethical_assessment": ethical_result
    }

@app.get("/api/product/{barcode}")
async def get_product(barcode: str):
    """
    Get product by barcode (direct lookup, no image)
    """
    product_info = await fetch_product_from_openfoodfacts(barcode)
    
    if not product_info:
        raise HTTPException(
            status_code=404,
            detail=f"Product {barcode} not found"
        )
    
    return {
        "barcode": barcode,
        "product": product_info
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
                    "image_url": product.get("image_url", ""),
                    "country_of_origin": product.get("countries", "Unknown"),
                    "category": product.get("categories", ""),
                    "labels": product.get("labels", ""),
                    "origins": product.get("origins", ""),
                    "ecoscore": product.get("ecoscore_score", None),
                }
            else:
                return None
                
    except Exception as e:
        logger.error(f"Error fetching product: {e}")
        return None

# Serve static files
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/test")
async def serve_test_page():
    """Serve the image upload test page"""
    return FileResponse("static/index.html")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)