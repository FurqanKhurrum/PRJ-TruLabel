from pyzbar import pyzbar
from PIL import Image
from typing import Optional, List, Dict
import io

class BarcodeService:
    """Service for extracting barcodes from images"""
    
    @staticmethod
    def extract_barcode_from_image(image_bytes: bytes) -> Optional[str]:
        """
        Extract barcode from uploaded image
        
        Args:
            image_bytes: Raw image bytes
            
        Returns:
            Barcode string if found, None if not found
        """
        try:
            # Open image from bytes
            image = Image.open(io.BytesIO(image_bytes))
            
            # Convert to RGB if necessary
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Detect barcodes
            barcodes = pyzbar.decode(image)
            
            if not barcodes:
                return None
            
            # Return first barcode found
            first_barcode = barcodes[0]
            barcode_data = first_barcode.data.decode('utf-8')
            
            print(f"Detected barcode: {barcode_data} (Type: {first_barcode.type})")
            
            return barcode_data
            
        except Exception as e:
            print(f"Error extracting barcode: {e}")
            return None
    
    @staticmethod
    def extract_all_barcodes(image_bytes: bytes) -> List[Dict]:
        """
        Extract all barcodes from image (if multiple exist)
        
        Args:
            image_bytes: Raw image bytes
            
        Returns:
            List of barcode dictionaries with data and type
        """
        try:
            image = Image.open(io.BytesIO(image_bytes))
            
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            barcodes = pyzbar.decode(image)
            
            results = []
            for barcode in barcodes:
                results.append({
                    "data": barcode.data.decode('utf-8'),
                    "type": barcode.type,
                    "quality": barcode.quality
                })
            
            return results
            
        except Exception as e:
            print(f"Error extracting barcodes: {e}")
            return []