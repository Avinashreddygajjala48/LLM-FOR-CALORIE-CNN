// AI-Powered Food Recognition Service
// Uses CNN (YOLO) model for real food identification from images

export interface RecognizedFood {
  id: string;
  name: string;
  confidence: number;
  portion_size: string;
  portion_grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface FoodRecognitionResult {
  success: boolean;
  foods: RecognizedFood[];
  processing_time_ms: number;
  error?: string;
}

// Convert File to base64 data URL
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Real AI-powered food recognition
export async function recognizeFood(imageFile: File): Promise<FoodRecognitionResult> {
  const startTime = performance.now();

  try {
    // Convert image to base64
    const base64Image = await fileToBase64(imageFile);

    // Call the edge function
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/food-recognition`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ image: base64Image }),
      }
    );

    const processingTime = performance.now() - startTime;

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        foods: [],
        processing_time_ms: Math.round(processingTime),
        error: errorData.error || `Recognition failed: ${response.status}`,
      };
    }

    const data = await response.json();

    if (!data.success) {
      return {
        success: false,
        foods: [],
        processing_time_ms: Math.round(processingTime),
        error: data.error || "Recognition failed",
      };
    }

    return {
      success: true,
      foods: data.foods,
      processing_time_ms: Math.round(processingTime),
    };
  } catch (error) {
    const processingTime = performance.now() - startTime;
    console.error("Food recognition error:", error);
    return {
      success: false,
      foods: [],
      processing_time_ms: Math.round(processingTime),
      error: error instanceof Error ? error.message : "Failed to analyze image",
    };
  }
}

// Food database for manual search (kept for search functionality)
const FOOD_DATABASE: Record<string, Omit<RecognizedFood, 'id' | 'confidence'>> = {
  'grilled_chicken': {
    name: 'Grilled Chicken Breast',
    portion_size: '1 piece (150g)',
    portion_grams: 150,
    calories: 231,
    protein: 43,
    carbs: 0,
    fat: 5,
  },
  'rice': {
    name: 'Steamed White Rice',
    portion_size: '1 cup (200g)',
    portion_grams: 200,
    calories: 260,
    protein: 5,
    carbs: 56,
    fat: 0.5,
  },
  'salad': {
    name: 'Mixed Green Salad',
    portion_size: '1 bowl (150g)',
    portion_grams: 150,
    calories: 45,
    protein: 2,
    carbs: 8,
    fat: 0.5,
  },
  'pasta': {
    name: 'Pasta with Marinara',
    portion_size: '1 plate (250g)',
    portion_grams: 250,
    calories: 380,
    protein: 12,
    carbs: 68,
    fat: 8,
  },
  'pizza': {
    name: 'Margherita Pizza Slice',
    portion_size: '2 slices (180g)',
    portion_grams: 180,
    calories: 450,
    protein: 18,
    carbs: 52,
    fat: 20,
  },
  'burger': {
    name: 'Beef Burger',
    portion_size: '1 burger (220g)',
    portion_grams: 220,
    calories: 540,
    protein: 28,
    carbs: 40,
    fat: 30,
  },
  'salmon': {
    name: 'Grilled Salmon',
    portion_size: '1 fillet (170g)',
    portion_grams: 170,
    calories: 367,
    protein: 34,
    carbs: 0,
    fat: 22,
  },
  'eggs': {
    name: 'Scrambled Eggs',
    portion_size: '2 eggs (120g)',
    portion_grams: 120,
    calories: 182,
    protein: 12,
    carbs: 2,
    fat: 14,
  },
  'toast': {
    name: 'Whole Wheat Toast',
    portion_size: '2 slices (60g)',
    portion_grams: 60,
    calories: 138,
    protein: 6,
    carbs: 24,
    fat: 2,
  },
  'coffee': {
    name: 'Coffee with Milk',
    portion_size: '1 cup (240ml)',
    portion_grams: 240,
    calories: 45,
    protein: 2,
    carbs: 6,
    fat: 1.5,
  },
  'banana': {
    name: 'Banana',
    portion_size: '1 medium (120g)',
    portion_grams: 120,
    calories: 105,
    protein: 1.3,
    carbs: 27,
    fat: 0.4,
  },
  'apple': {
    name: 'Apple',
    portion_size: '1 medium (180g)',
    portion_grams: 180,
    calories: 95,
    protein: 0.5,
    carbs: 25,
    fat: 0.3,
  },
  'oatmeal': {
    name: 'Oatmeal with Berries',
    portion_size: '1 bowl (250g)',
    portion_grams: 250,
    calories: 280,
    protein: 8,
    carbs: 48,
    fat: 6,
  },
  'steak': {
    name: 'Grilled Steak',
    portion_size: '1 piece (200g)',
    portion_grams: 200,
    calories: 450,
    protein: 46,
    carbs: 0,
    fat: 28,
  },
  'sushi': {
    name: 'Sushi Rolls',
    portion_size: '6 pieces (180g)',
    portion_grams: 180,
    calories: 280,
    protein: 12,
    carbs: 40,
    fat: 6,
  },
};

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

// Get all available foods for manual search
export function searchFoods(query: string): RecognizedFood[] {
  const lowerQuery = query.toLowerCase();
  return Object.entries(FOOD_DATABASE)
    .filter(([_, food]) => food.name.toLowerCase().includes(lowerQuery))
    .map(([key, food]) => ({
      id: generateId(),
      ...food,
      confidence: 1,
    }));
}
