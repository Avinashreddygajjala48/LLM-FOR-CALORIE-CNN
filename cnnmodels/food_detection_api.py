import os
import json
import base64
import io
from typing import List, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import torch
from PIL import Image
import numpy as np
from ultralytics import YOLO

app = FastAPI(title="Food Detection API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class FoodDetectionRequest(BaseModel):
    image: str  # Base64 encoded image

class FoodDetectionResponse(BaseModel):
    success: bool
    detections: List[Dict[str, Any]]
    error: str = None

# Global variables
model = None
model_path = None

def load_model():
    """Load the YOLO model"""
    global model, model_path
    try:
        # Path to your YOLO model
        model_path = os.path.join(os.path.dirname(__file__), "..", "cnnmodels", "YOLO_Detection.pt")
        
        if not os.path.exists(model_path):
            print(f"Model file not found at: {model_path}")
            return False
            
        print(f"Loading YOLO model from: {model_path}")
        model = YOLO(model_path)
        print("Model loaded successfully!")
        return True
        
    except Exception as e:
        print(f"Error loading model: {e}")
        return False

def calculate_area_ratio(bbox, image_width, image_height):
    """Calculate the area ratio of bounding box relative to image"""
    x1, y1, x2, y2 = bbox
    bbox_area = (x2 - x1) * (y2 - y1)
    image_area = image_width * image_height
    return bbox_area / image_area if image_area > 0 else 0

def decode_base64_image(base64_str):
    """Decode base64 string to PIL Image"""
    try:
        # Remove data URL prefix if present
        if "," in base64_str:
            base64_str = base64_str.split(",")[1]
        
        # Decode base64
        image_data = base64.b64decode(base64_str)
        image = Image.open(io.BytesIO(image_data))
        return image
    except Exception as e:
        raise ValueError(f"Failed to decode image: {e}")

@app.on_event("startup")
async def startup_event():
    """Load the model on startup"""
    success = load_model()
    if not success:
        print("Warning: Failed to load YOLO model. Using mock detections.")

@app.post("/detect", response_model=FoodDetectionResponse)
async def detect_food(request: FoodDetectionRequest):
    """Detect food items in an image using YOLO model"""
    
    if model is None:
        # Return mock detections if model failed to load
        return FoodDetectionResponse(
            success=True,
            detections=[
                {"food_name": "Idli", "confidence": 0.92, "area_ratio": 0.15},
                {"food_name": "Sambar", "confidence": 0.87, "area_ratio": 0.35},
                {"food_name": "Chapathi", "confidence": 0.78, "area_ratio": 0.20}
            ]
        )
    
    try:
        # Decode the base64 image
        image = decode_base64_image(request.image)
        image_width, image_height = image.size
        
        # Run YOLO inference
        results = model(image)
        
        detections = []
        
        # Process results
        for result in results:
            boxes = result.boxes
            if boxes is not None:
                for box in boxes:
                    # Get bounding box coordinates
                    x1, y1, x2, y2 = box.xyxy[0].cpu().numpy()
                    
                    # Get confidence score
                    confidence = float(box.conf[0].cpu().numpy())
                    
                    # Get class name (assuming your model has food class names)
                    class_id = int(box.cls[0].cpu().numpy())
                    food_name = model.names[class_id] if class_id in model.names else f"Food_{class_id}"
                    
                    # Calculate area ratio
                    area_ratio = calculate_area_ratio((x1, y1, x2, y2), image_width, image_height)
                    
                    detections.append({
                        "food_name": food_name,
                        "confidence": confidence,
                        "area_ratio": area_ratio
                    })
        
        return FoodDetectionResponse(
            success=True,
            detections=detections
        )
        
    except Exception as e:
        print(f"Detection error: {e}")
        return FoodDetectionResponse(
            success=False,
            error=str(e)
        )

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "model_path": model_path
    }

if __name__ == "__main__":
    import uvicorn
    print("Starting Food Detection API...")
    uvicorn.run(app, host="0.0.0.0", port=8000)
