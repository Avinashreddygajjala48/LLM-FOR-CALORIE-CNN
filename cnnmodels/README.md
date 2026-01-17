# CNN Food Detection Models

This folder contains the YOLO model and Python API for food recognition.

## Files:

- **YOLO_Detection.pt**: Your trained YOLO model for food detection
- **Nutrition_Lookup_Table.csv**: Nutritional data for detected foods
- **food_detection_api.py**: FastAPI service that runs YOLO inference
- **requirements.txt**: Python dependencies
- **start_api.bat**: Windows batch file to start the API
- **nutrition_calculation.py**: Original nutrition calculation script

## How to Use:

### 1. Start the Python API:
```bash
# Option 1: Use the batch file (Windows)
start_api.bat

# Option 2: Manual start
pip install -r requirements.txt
python food_detection_api.py
```

### 2. The API will start on:
- **URL**: http://localhost:8000
- **Health Check**: http://localhost:8000/health
- **Detection Endpoint**: http://localhost:8000/detect

### 3. API Usage:
```python
import requests

# Test health
response = requests.get("http://localhost:8000/health")
print(response.json())

# Detect food
image_data = "base64_encoded_image_string..."
response = requests.post("http://localhost:8000/detect", 
                         json={"image": image_data})
print(response.json())
```

## Integration:

The Supabase edge function (`supabase/functions/food-recognition/index.ts`) automatically calls this Python API:
1. Receives base64 image from frontend
2. Sends to Python API at `http://localhost:8000/detect`
3. Gets YOLO detections with confidence and area ratios
4. Calculates nutrition using the CSV data
5. Returns results to frontend

## Fallback:

If the Python API is not available, the system automatically falls back to mock data for testing.

## Model Requirements:

Your YOLO model should be trained to recognize Indian foods like:
- Idli, Vada, Dosa, Chapathi
- Sambar, Dal, Curries
- Rice varieties
- Vegetables and more

The model outputs should include:
- Class names (food items)
- Confidence scores
- Bounding box coordinates
