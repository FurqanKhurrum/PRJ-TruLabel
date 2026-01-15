from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from barcode_service import BarcodeService
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
import httpx

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

@app.get("/")
async def root():
    return {"message": "TruLabel API - Welcome!"}

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "message": "API is running"}

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
    
    return {
        "barcode": barcode,
        "product": product_info
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
        print(f"Error fetching product: {e}")
        return None

@app.get("/test")
async def serve_test_page():
    """Serve the image upload test page"""
    file_path = "static/index.html"
    
    if os.path.exists(file_path):
        return FileResponse(file_path)
    else:
        return {
            "error": "File not found",
            "looking_for": os.path.abspath(file_path),
            "current_dir": os.getcwd()
        }
    
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

    # Serve static files
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/test")
async def serve_test_page():
    """Serve the image upload test page"""
    return FileResponse("static/index.html")