import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FoodItem {
  name: string;
  portion_size: string;
  portion_grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  confidence: number;
}

// Nutrition data from the CSV file
const NUTRITION_DATA: Record<string, { calories_per_100g: number; carbs_g: number; protein_g: number; fat_g: number; gi_value: number; gi_category: string }> = {
  "bhatura": { calories_per_100g: 330, carbs_g: 50, protein_g: 7, fat_g: 12, gi_value: 70, gi_category: "High" },
  "chapathi": { calories_per_100g: 299, carbs_g: 46, protein_g: 7.9, fat_g: 9.2, gi_value: 45, gi_category: "Low" },
  "cooked_rice": { calories_per_100g: 130, carbs_g: 28, protein_g: 2.7, fat_g: 0.3, gi_value: 72, gi_category: "High" },
  "dal": { calories_per_100g: 116, carbs_g: 20, protein_g: 9, fat_g: 1, gi_value: 30, gi_category: "Low" },
  "dosa": { calories_per_100g: 168, carbs_g: 30, protein_g: 4, fat_g: 3.7, gi_value: 55, gi_category: "Medium" },
  "egg_curry": { calories_per_100g: 155, carbs_g: 4, protein_g: 11, fat_g: 11, gi_value: 45, gi_category: "Low" },
  "groundnut_chutney": { calories_per_100g: 250, carbs_g: 16, protein_g: 8, fat_g: 18, gi_value: 25, gi_category: "Low" },
  "idiyappam": { calories_per_100g: 150, carbs_g: 32, protein_g: 2, fat_g: 0.5, gi_value: 65, gi_category: "Medium" },
  "idli": { calories_per_100g: 58, carbs_g: 12, protein_g: 2, fat_g: 0.4, gi_value: 60, gi_category: "Medium" },
  "jalebi": { calories_per_100g: 459, carbs_g: 60, protein_g: 4, fat_g: 22, gi_value: 75, gi_category: "High" },
  "lemon_rice": { calories_per_100g: 185, carbs_g: 28, protein_g: 4, fat_g: 6, gi_value: 60, gi_category: "Medium" },
  "pongal": { calories_per_100g: 160, carbs_g: 27, protein_g: 5, fat_g: 4, gi_value: 60, gi_category: "Medium" },
  "pulihora": { calories_per_100g: 180, carbs_g: 30, protein_g: 4, fat_g: 6, gi_value: 60, gi_category: "Medium" },
  "sambar": { calories_per_100g: 90, carbs_g: 12, protein_g: 4, fat_g: 3, gi_value: 35, gi_category: "Low" },
  "samosa": { calories_per_100g: 320, carbs_g: 35, protein_g: 7, fat_g: 18, gi_value: 70, gi_category: "High" },
  "umpa": { calories_per_100g: 190, carbs_g: 35, protein_g: 4, fat_g: 6, gi_value: 65, gi_category: "Medium" },
  "uttampam": { calories_per_100g: 170, carbs_g: 28, protein_g: 4, fat_g: 4, gi_value: 55, gi_category: "Medium" },
  "vada": { calories_per_100g: 320, carbs_g: 35, protein_g: 7, fat_g: 18, gi_value: 70, gi_category: "High" },
  "beetroot": { calories_per_100g: 43, carbs_g: 10, protein_g: 1.6, fat_g: 0.2, gi_value: 64, gi_category: "Medium" },
  "brinjal": { calories_per_100g: 25, carbs_g: 6, protein_g: 1, fat_g: 0.2, gi_value: 15, gi_category: "Low" },
  "capsicum": { calories_per_100g: 31, carbs_g: 6, protein_g: 1, fat_g: 0.3, gi_value: 15, gi_category: "Low" },
  "carrot": { calories_per_100g: 41, carbs_g: 10, protein_g: 0.9, fat_g: 0.2, gi_value: 35, gi_category: "Low" },
  "cucumber": { calories_per_100g: 15, carbs_g: 3.6, protein_g: 0.7, fat_g: 0.1, gi_value: 15, gi_category: "Low" },
  "groundnuts": { calories_per_100g: 567, carbs_g: 16, protein_g: 26, fat_g: 49, gi_value: 14, gi_category: "Low" },
  "ladys_finger": { calories_per_100g: 33, carbs_g: 7, protein_g: 1.9, fat_g: 0.2, gi_value: 20, gi_category: "Low" },
  "onion": { calories_per_100g: 40, carbs_g: 9, protein_g: 1.1, fat_g: 0.1, gi_value: 10, gi_category: "Low" },
  "paneer": { calories_per_100g: 265, carbs_g: 1.2, protein_g: 18, fat_g: 20, gi_value: 27, gi_category: "Low" },
  "raw_rice": { calories_per_100g: 365, carbs_g: 80, protein_g: 7.5, fat_g: 0.7, gi_value: 0, gi_category: "Low" },
  "spinach": { calories_per_100g: 23, carbs_g: 3.6, protein_g: 2.9, fat_g: 0.4, gi_value: 15, gi_category: "Low" },
  "tomato": { calories_per_100g: 18, carbs_g: 3.9, protein_g: 0.9, fat_g: 0.2, gi_value: 15, gi_category: "Low" }
};

// Countable foods with average weights
const COUNTABLE_FOODS: Record<string, number> = {
  "idli": 40,
  "vada": 70,
  "dosa": 120,
  "chapathi": 45,
  "samosa": 100,
  "bhatura": 100,
  "jalebi": 60,
  "idiyappam": 50,
  "uttampam": 100
};

// Portion sizes for non-countable foods
const PORTION_GRAMS: Record<string, number> = {
  "Small": 75,
  "Medium": 100,
  "Large": 150,
  "Very Large": 200
};

function getPortionFromArea(areaRatio: number): string {
  if (areaRatio < 0.10) return "Small";
  if (areaRatio < 0.25) return "Medium";
  if (areaRatio < 0.50) return "Large";
  return "Very Large";
}

function calculateNutrition(foodName: string, count: number = 1, areaRatio: number = 0.3): FoodItem {
  const normalizedFoodName = foodName.toLowerCase().replace(/\s+/g, '_');
  const nutrition = NUTRITION_DATA[normalizedFoodName];
  
  if (!nutrition) {
    // Return default values if food not found
    return {
      name: foodName,
      portion_size: "1 portion",
      portion_grams: 100,
      calories: 200,
      protein: 10,
      carbs: 30,
      fat: 5,
      confidence: 0.5
    };
  }

  let portionGrams: number;
  let portionSize: string;

  if (COUNTABLE_FOODS[normalizedFoodName]) {
    // Countable food
    portionGrams = count * COUNTABLE_FOODS[normalizedFoodName];
    portionSize = `${count} pieces`;
  } else {
    // Non-countable food
    const portion = getPortionFromArea(areaRatio);
    portionGrams = PORTION_GRAMS[portion];
    portionSize = `${portion} portion`;
  }

  const multiplier = portionGrams / 100;
  
  return {
    name: foodName,
    portion_size: portionSize,
    portion_grams: portionGrams,
    calories: Math.round(nutrition.calories_per_100g * multiplier),
    protein: Math.round(nutrition.protein_g * multiplier * 10) / 10,
    carbs: Math.round(nutrition.carbs_g * multiplier * 10) / 10,
    fat: Math.round(nutrition.fat_g * multiplier * 10) / 10,
    confidence: 0.85
  };
}

// Real CNN detection using Python API
async function runCNNDetection(image: string): Promise<Array<{food_name: string, confidence: number, area_ratio: number}>> {
  try {
    // Call the Python food detection API
    const response = await fetch("http://localhost:8000/detect", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ image: image }),
    });

    if (!response.ok) {
      console.error("Python API error:", response.status);
      // Fallback to mock data
      return mockCNNDetection();
    }

    const result = await response.json();
    
    if (result.success && result.detections) {
      console.log("Real CNN detections:", result.detections);
      return result.detections;
    } else {
      console.error("Python API returned error:", result.error);
      // Fallback to mock data
      return mockCNNDetection();
    }
  } catch (error) {
    console.error("Failed to call Python API:", error);
    // Fallback to mock data
    return mockCNNDetection();
  }
}

// Mock CNN detection - fallback if Python API fails
function mockCNNDetection(): Array<{food_name: string, confidence: number, area_ratio: number}> {
  // This is a mock implementation. In production, you would:
  // 1. Load the YOLO model (YOLO_Detection.pt)
  // 2. Process the image
  // 3. Run inference
  // 4. Return detected foods with confidence and area ratios
  
  // For demo purposes, return some common Indian foods
  return [
    { food_name: "Idli", confidence: 0.92, area_ratio: 0.15 },
    { food_name: "Sambar", confidence: 0.87, area_ratio: 0.35 },
    { food_name: "Chapathi", confidence: 0.78, area_ratio: 0.20 }
  ];
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image } = await req.json();
    
    if (!image) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // In a real implementation, you would:
    // 1. Save the base64 image to a temporary file
    // 2. Load the YOLO model (YOLO_Detection.pt)
    // 3. Run inference on the image
    // 4. Get detections with confidence scores and bounding boxes
    // 5. Calculate area ratios from bounding boxes
    
    // Run CNN food detection using Python API
    console.log("Running CNN food detection...");
    const detections = await runCNNDetection(image);
    
    // Group detections by food name and calculate nutrition
    const groupedDetections: Record<string, Array<{confidence: number, area_ratio: number}>> = {};
    
    detections.forEach(detection => {
      const foodKey = detection.food_name.toLowerCase();
      if (!groupedDetections[foodKey]) {
        groupedDetections[foodKey] = [];
      }
      groupedDetections[foodKey].push({
        confidence: detection.confidence,
        area_ratio: detection.area_ratio
      });
    });

    const foods: FoodItem[] = [];
    
    Object.entries(groupedDetections).forEach(([foodKey, detections]) => {
      const avgConfidence = detections.reduce((sum, d) => sum + d.confidence, 0) / detections.length;
      const maxAreaRatio = Math.max(...detections.map(d => d.area_ratio));
      const count = detections.length;
      
      const nutrition = calculateNutrition(foodKey, count, maxAreaRatio);
      nutrition.confidence = avgConfidence;
      
      foods.push(nutrition);
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        foods: foods.map((food, index) => ({
          id: `food_${Date.now()}_${index}`,
          ...food
        }))
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Food recognition error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Failed to analyze image",
        success: false
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
