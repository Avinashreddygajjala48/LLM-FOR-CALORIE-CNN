import json
import pandas as pd
import os

# =====================================================
# PATH CONFIG
# =====================================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

DETECTION_JSON = os.path.join(BASE_DIR, "../../detections_clean.json")
NUTRITION_CSV = os.path.join(BASE_DIR, "../../notebooks/Nutrition_Lookup_Table.csv")

# =====================================================
# FOOD DEFINITIONS (ALL LOWERCASE)
# =====================================================

# ✅ COUNTABLE (DISCRETE) FOODS
COUNTABLE_FOODS = {
    "idli",
    "vada",
    "dosa",
    "chapathi",
    "samosa",
    "bhatura",
    "jalebi",
    "idiyappam",
    "uttampam"
}

# Average weight per piece (grams)
ITEM_WEIGHTS = {
    "idli": 40,
    "vada": 70,
    "dosa": 120,
    "chapathi": 45,
    "samosa": 100,
    "bhatura": 100,
    "jalebi": 60,
    "idiyappam": 50,
    "uttampam": 100
}

# Portion → grams mapping for NON-COUNTABLE foods
PORTION_GRAMS = {
    "Small": 75,
    "Medium": 100,
    "Large": 150,
    "Very Large": 200
}

# =====================================================
def portion_from_area(area_ratio):
    if area_ratio < 0.10:
        return "Small"
    elif area_ratio < 0.25:
        return "Medium"
    elif area_ratio < 0.50:
        return "Large"
    else:
        return "Very Large"

# =====================================================
# LOAD DATA
# =====================================================
with open(DETECTION_JSON, "r") as f:
    detections = json.load(f)

nutrition_df = pd.read_csv(NUTRITION_CSV)

# Normalize CSV
nutrition_df.columns = nutrition_df.columns.str.strip().str.lower()
nutrition_df["food_name"] = nutrition_df["food_name"].str.lower()
nutrition_df["food_state"] = nutrition_df["food_state"].str.lower()

final_output = []

# =====================================================
# MAIN LOGIC
# =====================================================
for image_data in detections:
    image_result = {
        "image": image_data["image"],
        "items": [],
        "total_calories": 0.0
    }

    # Group detections by food name
    grouped = {}
    for det in image_data["detections"]:
        food_key = det["food_name"].strip().lower()
        grouped.setdefault(food_key, []).append(det)

    for food_key, dets in grouped.items():
        state = dets[0]["state"].lower()

        row = nutrition_df[
            (nutrition_df["food_name"] == food_key) &
            (nutrition_df["food_state"] == state)
        ]

        if row.empty:
            continue

        row = row.iloc[0]

        # =================================================
        # COUNTABLE FOODS (Idli, Bhatura, etc.)
        # =================================================
        if food_key in COUNTABLE_FOODS:
            count = len(dets)
            weight_per_item = ITEM_WEIGHTS.get(food_key, 50)
            total_weight = count * weight_per_item

            calories = (row["calories_per_100g"] / 100) * total_weight
            carbs = (row["carbs_g"] / 100) * total_weight
            protein = (row["protein_g"] / 100) * total_weight
            fat = (row["fat_g"] / 100) * total_weight

            portion_desc = f"{count} pieces"

        # =================================================
        # NON-COUNTABLE FOODS (Brinjal, vegetables, curries)
        # =================================================
        else:
            # ✅ FIX: use MAX area_ratio (not first box)
            max_area_ratio = max(d["area_ratio"] for d in dets)

            portion = portion_from_area(max_area_ratio)
            grams = PORTION_GRAMS[portion]

            calories = (row["calories_per_100g"] / 100) * grams
            carbs = (row["carbs_g"] / 100) * grams
            protein = (row["protein_g"] / 100) * grams
            fat = (row["fat_g"] / 100) * grams

            portion_desc = f"{portion} portion"

        image_result["items"].append({
            "food_name": food_key.capitalize(),
            "state": state.capitalize(),
            "portion": portion_desc,
            "calories": float(round(calories, 1)),
            "carbs_g": float(round(carbs, 1)),
            "protein_g": float(round(protein, 1)),
            "fat_g": float(round(fat, 1)),
            "gi_value": int(row["gi_value"]),
            "gi_category": str(row["gi_category"])
        })

        image_result["total_calories"] += calories

    image_result["total_calories"] = float(round(image_result["total_calories"], 1))
    final_output.append(image_result)

# =====================================================
# SAVE OUTPUT
# =====================================================
OUTPUT_JSON = os.path.join(BASE_DIR, "final_nutrition_output.json")

with open(OUTPUT_JSON, "w") as f:
    json.dump(final_output, f, indent=4)

print("Final nutrition output saved at:")
print(OUTPUT_JSON)
