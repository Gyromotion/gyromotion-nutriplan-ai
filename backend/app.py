import os
import json
import sqlite3
import re
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from database import get_db_connection, DB_PATH

def scale_serving_size(serving_size, multiplier):
    if multiplier == 1.0:
        return serving_size
    
    # 12-15 nos (28g)
    range_match = re.match(r'^(\d+)-(\d+)\s*([a-zA-Z\s]+)\s*\((\d+)\s*(g|ml|oz)\)$', serving_size, re.IGNORECASE)
    if range_match:
        start = round(int(range_match.group(1)) * multiplier)
        end = round(int(range_match.group(2)) * multiplier)
        unit = range_match.group(3).strip()
        weight = round(int(range_match.group(4)) * multiplier)
        weight_unit = range_match.group(5)
        return f"{start}-{end} {unit} ({weight}{weight_unit})"
        
    # 2 Chapatis (57g)
    count_weight_match = re.match(r'^(\d+(?:\.\d+)?)\s*([a-zA-Z\s\.\-]+)\s*\((\d+)\s*(g|ml|oz)\)$', serving_size, re.IGNORECASE)
    if count_weight_match:
        count = float(count_weight_match.group(1)) * multiplier
        count_str = f"{count:.1f}".rstrip('0').rstrip('.') if count % 1 != 0 else f"{int(count)}"
        unit = count_weight_match.group(2).strip()
        weight = round(int(count_weight_match.group(3)) * multiplier)
        weight_unit = count_weight_match.group(4)
        return f"{count_str}x {unit} ({weight}{weight_unit})"
        
    # 100g or 150ml
    weight_match = re.match(r'^(\d+)\s*(g|ml|oz)$', serving_size, re.IGNORECASE)
    if weight_match:
        weight = round(int(weight_match.group(1)) * multiplier)
        weight_unit = weight_match.group(2)
        return f"{weight}{weight_unit}"
        
    # 2 Eggs or 1 Dosa
    count_unit_match = re.match(r'^(\d+(?:\.\d+)?)\s*([a-zA-Z\s\.\-]+)$', serving_size, re.IGNORECASE)
    if count_unit_match:
        count = float(count_unit_match.group(1)) * multiplier
        count_str = f"{count:.1f}".rstrip('0').rstrip('.') if count % 1 != 0 else f"{int(count)}"
        unit = count_unit_match.group(2).strip()
        return f"{count_str}x {unit}"
        
    mult_str = f"{multiplier:.1f}".rstrip('0').rstrip('.') if multiplier % 1 != 0 else f"{int(multiplier)}"
    return f"{mult_str}x {serving_size}"


app = Flask(__name__)
# Enable CORS for all routes so our React frontend can communicate from port 5173
CORS(app, resources={r"/*": {"origins": "*"}})

@app.route('/')
def home():
    return send_from_directory(os.path.join(os.path.dirname(__file__), 'templates'), 'index.html')

@app.route('/images/<path:filename>')
@app.route('/static/images/<path:filename>')
def serve_images(filename):
    return send_from_directory(os.path.join(os.path.dirname(__file__), 'static', 'images'), filename)


# Helper function to query the food database
def query_foods(category=None, name_query=None, is_veg=None):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    query = "SELECT * FROM Foods"
    params = []
    conditions = []
    
    if category:
        conditions.append("category = ?")
        params.append(category)
        
    if name_query:
        conditions.append("name LIKE ?")
        params.append(f"%{name_query}%")
        
    if is_veg is not None:
        conditions.append("is_veg = ?")
        params.append(int(is_veg))
        
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
        
    cursor.execute(query, params)
    rows = cursor.fetchall()
    conn.close()
    
    return [dict(row) for row in rows]

# Helper to find a specific food by name
def find_food_by_name(name):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM Foods WHERE name LIKE ? LIMIT 1", (f"%{name}%",))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None

@app.route('/foods', methods=['GET'])
@app.route('/api/foods', methods=['GET'])
def get_foods():
    """Retrieve all food items or filter by name query / category."""
    q = request.args.get('q')
    category = request.args.get('category')
    is_veg = request.args.get('is_veg')
    try:
        is_veg_val = int(is_veg) if is_veg is not None and is_veg != '' else None
        foods = query_foods(category=category, name_query=q, is_veg=is_veg_val)
        # Enrich foods with vitamins & amino acids for Food Explorer
        enriched_foods = [enrich_food_micros(f) for f in foods]
        return jsonify({"success": True, "data": enriched_foods}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/calculate-bmi', methods=['POST'])
@app.route('/api/calculate-bmi', methods=['POST'])
def calculate_bmi():
    """Calculate BMI and return value and category."""
    data = request.get_json() or {}
    weight = data.get('weight')
    height = data.get('height') # in cm
    
    if not weight or not height:
        return jsonify({"success": False, "error": "Weight and height are required."}), 400
        
    try:
        height_cm = float(height)
        weight_kg = float(weight)
        
        # Validation checks
        if not (50 <= height_cm <= 250):
            return jsonify({"success": False, "error": "Height must be between 50 and 250 cm."}), 400
        if not (10 <= weight_kg <= 300):
            return jsonify({"success": False, "error": "Weight must be between 10 and 300 kg."}), 400
            
        height_m = height_cm / 100.0
        bmi = weight_kg / (height_m ** 2)
        bmi = round(bmi, 2)
        
        if bmi < 18.5:
            category = "Underweight"
            description = "You have a lower body weight than normal. Consider increasing calorie intake."
        elif 18.5 <= bmi < 25.0:
            category = "Normal"
            description = "You have a healthy body weight. Keep up the good work!"
        elif 25.0 <= bmi < 30.0:
            category = "Overweight"
            description = "You are slightly overweight. A balanced diet and regular exercise are recommended."
        else:
            category = "Obese"
            description = "You are in the obese range. We recommend counseling with a nutritionist and tailored workouts."
            
        return jsonify({
            "success": True,
            "data": {
                "bmi": bmi,
                "category": category,
                "description": description
            }
        }), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/calculate-bmr', methods=['POST'])
@app.route('/api/calculate-bmr', methods=['POST'])
def calculate_bmr():
    """Calculate BMR and TDEE based on activity levels."""
    data = request.get_json() or {}
    age = data.get('age')
    gender = data.get('gender', 'male')
    weight = data.get('weight') # in kg
    height = data.get('height') # in cm
    activity = data.get('activity_level', 'light')
    
    if not all([age, weight, height]):
        return jsonify({"success": False, "error": "Age, weight, and height are required."}), 400
        
    try:
        age_yrs = int(age)
        weight_kg = float(weight)
        height_cm = float(height)
        
        # Validation checks
        if not (1 <= age_yrs <= 120):
            return jsonify({"success": False, "error": "Age must be between 1 and 120."}), 400
        if not (50 <= height_cm <= 250):
            return jsonify({"success": False, "error": "Height must be between 50 and 250 cm."}), 400
        if not (10 <= weight_kg <= 300):
            return jsonify({"success": False, "error": "Weight must be between 10 and 300 kg."}), 400
            
        # BMR Formula
        if gender.lower() == 'male':
            bmr = 66 + (13.7 * weight_kg) + (5.0 * height_cm) - (6.8 * age_yrs)
        else:
            bmr = 655 + (9.6 * weight_kg) + (1.8 * height_cm) - (4.7 * age_yrs)
            
        bmr = round(bmr, 2)
        
        # Activity Multipliers
        multipliers = {
            "sedentary": 1.2,
            "light": 1.375,
            "moderate": 1.55,
            "very_active": 1.725,
            "extra_active": 1.9
        }
        
        # Map activity to key
        act_key = "light"
        activity_lower = str(activity).lower()
        if "sedentary" in activity_lower:
            act_key = "sedentary"
        elif "light" in activity_lower:
            act_key = "light"
        elif "moderate" in activity_lower:
            act_key = "moderate"
        elif "very" in activity_lower:
            act_key = "very_active"
        elif "extra" in activity_lower:
            act_key = "extra_active"
            
        tdee = bmr * multipliers[act_key]
        tdee = round(tdee, 2)
        
        return jsonify({
            "success": True,
            "data": {
                "bmr": bmr,
                "tdee": tdee,
                "activity_multiplier": multipliers[act_key]
            }
        }), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/predict-weight', methods=['POST'])
@app.route('/api/predict-weight', methods=['POST'])
def predict_weight():
    """Predict weight trajectory over 12 weeks based on goal and starting parameters."""
    data = request.get_json() or {}
    weight = data.get('weight')
    goal = data.get('goal', 'maintenance')
    
    if weight is None:
        return jsonify({"success": False, "error": "Weight is required."}), 400
        
    try:
        weight = float(weight)
        if not (10 <= weight <= 300):
            return jsonify({"success": False, "error": "Weight must be between 10 and 300 kg."}), 400
        goal_lower = str(goal).lower()
        
        if "aggressive" in goal_lower:
            weekly_change = -0.8
        elif "loss" in goal_lower:
            weekly_change = -0.5
        elif "muscle" in goal_lower:
            weekly_change = 0.25
        elif "gain" in goal_lower:
            weekly_change = 0.4
        else:
            weekly_change = 0.0
            
        projection = []
        for week in range(13): # Week 0 to 12
            projected_w = weight + (weekly_change * week)
            projection.append({
                "week": f"Week {week}",
                "weight": round(projected_w, 1)
            })
            
        return jsonify({
            "success": True,
            "data": {
                "starting_weight": weight,
                "goal": goal,
                "weekly_rate_kg": weekly_change,
                "projection": projection,
                "expected_three_months": round(weight + (weekly_change * 12), 1)
            }
        }), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

def generate_weekly_exercise_chart(goal, age, equipment, injury_type):
    try:
        age_val = int(age)
    except:
        age_val = 30
        
    if age_val > 60:
        intensity = "Basic"
        duration = "30-45 mins"
    elif age_val > 45:
        intensity = "Moderate"
        duration = "45 mins"
    else:
        intensity = "Advanced" if ("muscle" in goal.lower() or "sports" in goal.lower()) else "Moderate"
        duration = "45-60 mins"

    days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    weekly_chart = {}

    for day in days:
        exercises = []
        
        # Warm-ups (2 exercises)
        warmups_pool = [
            {"name": "Arm Circles", "category": "warmup", "desc": "Stand with feet shoulder-width, extend arms straight out, and rotate them in circles.", "dumbbell_alt": "N/A", "band_alt": "N/A"},
            {"name": "Neck Rolls", "category": "warmup", "desc": "Slowly rotate your neck clockwise, then counter-clockwise to relieve tension.", "dumbbell_alt": "N/A", "band_alt": "N/A"},
            {"name": "Torso Twists", "category": "warmup", "desc": "Twist your upper body side to side, letting arms swing loosely.", "dumbbell_alt": "N/A", "band_alt": "N/A"},
            {"name": "Hip Circles", "category": "warmup", "desc": "Place hands on hips, rotate hips in large circles clockwise and counter-clockwise.", "dumbbell_alt": "N/A", "band_alt": "N/A"},
            {"name": "Dynamic Leg Swings", "category": "warmup", "desc": "Hold a wall, swing one leg forward and backward in a controlled manner.", "dumbbell_alt": "N/A", "band_alt": "N/A"},
            {"name": "Shoulder Rolls", "category": "warmup", "desc": "Lift shoulders up toward ears, roll them backward in circles, and lower them.", "dumbbell_alt": "Light dumbbell shrugs", "band_alt": "Banded shrugs"},
            {"name": "Ankle Rotations", "category": "warmup", "desc": "Lift one foot off the ground and rotate the ankle in circular motions.", "dumbbell_alt": "N/A", "band_alt": "N/A"},
            {"name": "Wrist Rotations", "category": "warmup", "desc": "Clasp hands together and rotate wrists to warm up the joints.", "dumbbell_alt": "N/A", "band_alt": "N/A"}
        ]
        
        # Select 2 warmups based on day
        if day in ["Monday", "Friday"]:
            exercises.append(warmups_pool[4]) # leg swings
            exercises.append(warmups_pool[3]) # hip circles
        elif day in ["Wednesday", "Saturday"]:
            exercises.append(warmups_pool[0]) # arm circles
            exercises.append(warmups_pool[5]) # shoulder rolls
        else:
            exercises.append(warmups_pool[1]) # neck rolls
            exercises.append(warmups_pool[2]) # torso twists
            
        # Primary Strength / Conditioning (4 exercises)
        # Monday (Lower Body)
        if day == "Monday":
            workout_type = "Lower Body"
            if injury_type in ['acl', 'knee']:
                primary = [
                    {"name": "Glute Bridges", "category": "strength", "desc": "Lie on back, knees bent, lift hips high, squeezing glutes.", "dumbbell_alt": "Weighted Glute Bridges (hold dumbbell on hips)", "band_alt": "Banded Glute Bridges (loop band above knees)"},
                    {"name": "Seated Leg Extensions", "category": "strength", "desc": "Sit on a chair, slowly extend one leg straight out, squeeze quad, lower.", "dumbbell_alt": "Seated Extensions (clamp light dumbbell between feet)", "band_alt": "Banded Leg Extensions (anchor band under chair)"},
                    {"name": "Straight Leg Raises", "category": "strength", "desc": "Lie flat, lift one leg to 45 degrees, keeping it straight. Hold, lower.", "dumbbell_alt": "Ankle Weighted Leg Raises", "band_alt": "Banded Leg Raises (band around ankles)"},
                    {"name": "Calf Raises", "category": "strength", "desc": "Stand on a flat surface, raise onto toes, squeeze calves, lower slowly.", "dumbbell_alt": "Dumbbell Calf Raises (hold at sides)", "band_alt": "Banded Calf Raises"}
                ]
            else:
                primary = [
                    {"name": "Bodyweight Squats", "category": "strength", "desc": "Stand with feet shoulder-width, lower hips back and down, keeping knees behind toes.", "dumbbell_alt": "Dumbbell Goblet Squats (hold one dumbbell at chest)", "band_alt": "Banded Squats (stand on band, hold handles at shoulders)"},
                    {"name": "Forward Lunges", "category": "strength", "desc": "Step forward with one foot, lower hips until both knees are bent at 90 degrees.", "dumbbell_alt": "Dumbbell Lunges (hold dumbbells at sides)", "band_alt": "Banded Lunges"},
                    {"name": "Glute Bridges", "category": "strength", "desc": "Lie on back, knees bent, lift hips high, squeezing glutes.", "dumbbell_alt": "Weighted Glute Bridges", "band_alt": "Banded Glute Bridges"},
                    {"name": "Calf Raises", "category": "strength", "desc": "Stand on a flat surface, raise onto toes, squeeze calves, lower slowly.", "dumbbell_alt": "Dumbbell Calf Raises", "band_alt": "Banded Calf Raises"}
                ]
                
        # Tuesday (Cardio & Conditioning)
        elif day == "Tuesday":
            workout_type = "Cardio & Conditioning"
            if injury_type in ['acl', 'knee']:
                primary = [
                    {"name": "Stationary Cycling", "category": "cardio", "desc": "Low-impact indoor pedaling at a moderate pace to promote knee mobility.", "dumbbell_alt": "N/A (stick to stationary cycling)", "band_alt": "Banded Hamstring Curls (lying down)"},
                    {"name": "Arm Ergometer / Upper Body Cardio", "category": "cardio", "desc": "Pedaling with arms to maintain cardiovascular output without knee strain.", "dumbbell_alt": "Light Dumbbell Shadow Boxing", "band_alt": "Banded Woodchops"},
                    {"name": "Shadow Boxing", "category": "cardio", "desc": "Throw controlled punches in the air at a fast pace while shuffling feet.", "dumbbell_alt": "Light Dumbbell Punches", "band_alt": "Banded Punches"},
                    {"name": "Low-Impact Swimming / Water Walking", "category": "cardio", "desc": "Walk briskly in chest-deep water to reduce joint load while building cardio.", "dumbbell_alt": "N/A", "band_alt": "N/A"}
                ]
            elif injury_type == 'back':
                primary = [
                    {"name": "Brisk Flat Walking", "category": "cardio", "desc": "Walk on a flat, even surface at a brisk pace. Keep spine neutral.", "dumbbell_alt": "Farmer's Walk (very light dumbbells)", "band_alt": "Banded Walkouts"},
                    {"name": "Shadow Boxing", "category": "cardio", "desc": "Throw controlled punches in the air while keeping core locked and stable.", "dumbbell_alt": "Light Dumbbell Punches", "band_alt": "Banded Punches"},
                    {"name": "Arm Ergometer", "category": "cardio", "desc": "Pedaling with arms to maintain cardiovascular output.", "dumbbell_alt": "N/A", "band_alt": "N/A"},
                    {"name": "Brisk Walking on Treadmill (Flat)", "category": "cardio", "desc": "Maintain a steady brisk pace to support circulation without spinal impact.", "dumbbell_alt": "N/A", "band_alt": "N/A"}
                ]
            else:
                primary = [
                    {"name": "Jogging / Outdoor Running", "category": "cardio", "desc": "Steady-state run at moderate intensity.", "dumbbell_alt": "Weighted Carry (Farmer's walk)", "band_alt": "Banded Running-in-place"},
                    {"name": "Burpees", "category": "cardio", "desc": "Drop to plank, perform push-up, jump back to feet and explode upwards.", "dumbbell_alt": "Dumbbell Devil Press (light)", "band_alt": "Banded Burpees"},
                    {"name": "Jumping Jacks", "category": "cardio", "desc": "Jump feet wide while raising arms, then jump back to start.", "dumbbell_alt": "Light Dumbbell Press Jacks", "band_alt": "Banded Pull-Jacks"},
                    {"name": "High Knees", "category": "cardio", "desc": "Run in place, lifting knees high to chest level dynamically.", "dumbbell_alt": "N/A", "band_alt": "N/A"}
                ]
                
        # Wednesday (Upper Body Strength)
        elif day == "Wednesday":
            workout_type = "Upper Body Strength"
            if injury_type == 'shoulder':
                primary = [
                    {"name": "Bicep Curls", "category": "strength", "desc": "Keep elbows close to torso, curl weights while contracting biceps.", "dumbbell_alt": "Dumbbell Curls", "band_alt": "Banded Curls (stand on band)"},
                    {"name": "Hammer Curls", "category": "strength", "desc": "Curl weights with palms facing each other to target brachialis.", "dumbbell_alt": "Dumbbell Hammer Curls", "band_alt": "Banded Hammer Curls"},
                    {"name": "Wall Push-ups", "category": "strength", "desc": "Push-ups performed standing against a wall to reduce shoulder load.", "dumbbell_alt": "Incline Dumbbell Press (very light, high incline)", "band_alt": "Light Band Chest Press"},
                    {"name": "Seated Band Rows", "category": "strength", "desc": "Sit tall on floor, loop band around feet, pull handles to chest.", "dumbbell_alt": "Seated Dumbbell Rows (chest supported)", "band_alt": "Banded Seated Row"}
                ]
            else:
                primary = [
                    {"name": "Standard Push-ups", "category": "strength", "desc": "Keep body in straight line, lower chest to floor, push back up.", "dumbbell_alt": "Dumbbell Chest Press (lying on floor)", "band_alt": "Banded Push-ups (band wrapped across upper back)"},
                    {"name": "Dumbbell Rows", "category": "strength", "desc": "Hinge forward at hips, pull dumbbell up to chest, keeping elbow close.", "dumbbell_alt": "Dumbbell Row", "band_alt": "Banded Row (anchored in front)"},
                    {"name": "Dumbbell Overhead Shoulder Press", "category": "strength", "desc": "Press dumbbells upwards from shoulder height until arms are straight.", "dumbbell_alt": "Dumbbell Shoulder Press", "band_alt": "Banded Overhead Press (stand on band)"},
                    {"name": "Tricep dips on chair", "category": "strength", "desc": "Place hands on edge of chair, slide hips off, bend elbows to lower body, push back up.", "dumbbell_alt": "Dumbbell Kickbacks", "band_alt": "Banded Tricep Extensions"}
                ]
                
        # Thursday (Spine & Joint Mobility)
        elif day == "Thursday":
            workout_type = "Spine & Joint Mobility"
            primary = [
                {"name": "Cat-Cow Stretch", "category": "mobility", "desc": "On hands and knees, slowly arch your back (cow) then round it (cat).", "dumbbell_alt": "N/A", "band_alt": "N/A"},
                {"name": "Bird-Dog Pose", "category": "mobility", "desc": "Extend opposite arm and leg straight out, keeping hips square and spine flat.", "dumbbell_alt": "N/A", "band_alt": "N/A"},
                {"name": "Child's Pose", "category": "mobility", "desc": "Kneel, sit back on heels, and reach arms forward on floor, lowering forehead.", "dumbbell_alt": "N/A", "band_alt": "N/A"},
                {"name": "Spinal Twist Stretch", "category": "mobility", "desc": "Lie on back, bring one knee across body to floor, stretching lower back.", "dumbbell_alt": "N/A", "band_alt": "N/A"}
            ]
            
        # Friday (Full Body Conditioning)
        elif day == "Friday":
            workout_type = "Full Body Conditioning"
            if injury_type in ['acl', 'knee']:
                primary = [
                    {"name": "Glute Bridges", "category": "strength", "desc": "Lie on back, knees bent, lift hips high, squeezing glutes.", "dumbbell_alt": "Weighted Glute Bridges", "band_alt": "Banded Glute Bridges"},
                    {"name": "Seated Band Rows", "category": "strength", "desc": "Sit tall on floor, loop band around feet, pull handles to chest.", "dumbbell_alt": "Seated Dumbbell Rows", "band_alt": "Banded Seated Row"},
                    {"name": "Straight Leg Raises", "category": "strength", "desc": "Lie flat, lift one leg to 45 degrees, keeping it straight. Hold, lower.", "dumbbell_alt": "Ankle Weighted Leg Raises", "band_alt": "Banded Leg Raises"},
                    {"name": "Wall Push-ups", "category": "strength", "desc": "Push-ups performed standing against a wall to reduce joint load.", "dumbbell_alt": "Incline Dumbbell Press (very light)", "band_alt": "Light Band Chest Press"}
                ]
            elif injury_type == 'back':
                primary = [
                    {"name": "Wall Push-ups", "category": "strength", "desc": "Push-ups performed standing against a wall to reduce spinal load.", "dumbbell_alt": "Incline Dumbbell Press (very light)", "band_alt": "Light Band Chest Press"},
                    {"name": "Glute Bridges", "category": "strength", "desc": "Lie on back, knees bent, lift hips high, squeezing glutes.", "dumbbell_alt": "Weighted Glute Bridges", "band_alt": "Banded Glute Bridges"},
                    {"name": "Seated Band Rows", "category": "strength", "desc": "Sit tall on floor, loop band around feet, pull handles to chest.", "dumbbell_alt": "Seated Dumbbell Rows (chest supported)", "band_alt": "Banded Seated Row"},
                    {"name": "Plank (Forearms)", "category": "strength", "desc": "Hold straight body line resting on forearms and toes. Squeeze core.", "dumbbell_alt": "N/A", "band_alt": "N/A"}
                ]
            else:
                primary = [
                    {"name": "Dumbbell/Kettlebell Swings", "category": "strength", "desc": "Hinge at hips, swing weight from between legs to shoulder height.", "dumbbell_alt": "Dumbbell Swings", "band_alt": "Banded Pull-Throughs"},
                    {"name": "Standard Push-ups", "category": "strength", "desc": "Keep body in straight line, lower chest to floor, push back up.", "dumbbell_alt": "Dumbbell Chest Press (lying on floor)", "band_alt": "Banded Push-ups"},
                    {"name": "Bodyweight Squats", "category": "strength", "desc": "Stand with feet shoulder-width, lower hips back and down.", "dumbbell_alt": "Dumbbell Goblet Squats", "band_alt": "Banded Squats"},
                    {"name": "Dumbbell Rows", "category": "strength", "desc": "Hinge forward at hips, pull dumbbell up to chest.", "dumbbell_alt": "Dumbbell Row", "band_alt": "Banded Row"}
                ]
                
        # Saturday (Aerobic Cardio)
        elif day == "Saturday":
            workout_type = "Aerobic Cardio"
            if injury_type in ['acl', 'knee']:
                primary = [
                    {"name": "Steady Outdoor Walk", "category": "cardio", "desc": "Walk outdoors at a comfortable pace. Aim for fresh air.", "dumbbell_alt": "N/A", "band_alt": "N/A"},
                    {"name": "Arm Ergometer / Upper Body Cardio", "category": "cardio", "desc": "Pedaling with arms to maintain cardiovascular output without knee strain.", "dumbbell_alt": "Light Dumbbell Shadow Boxing", "band_alt": "Banded Woodchops"},
                    {"name": "Shadow Boxing", "category": "cardio", "desc": "Throw controlled punches in the air at a fast pace while shuffling feet.", "dumbbell_alt": "Light Dumbbell Punches", "band_alt": "Banded Punches"},
                    {"name": "Low-Impact Swimming / Water Walking", "category": "cardio", "desc": "Walk briskly in chest-deep water to reduce joint load.", "dumbbell_alt": "N/A", "band_alt": "N/A"}
                ]
            else:
                primary = [
                    {"name": "Steady Outdoor Walk / Light Jog", "category": "cardio", "desc": "Walk outdoors at a comfortable pace. Combine with light jogging intervals.", "dumbbell_alt": "N/A", "band_alt": "N/A"},
                    {"name": "Jumping Jacks", "category": "cardio", "desc": "Jump feet wide while raising arms, then jump back.", "dumbbell_alt": "Light Dumbbell Press Jacks", "band_alt": "Banded Pull-Jacks"},
                    {"name": "Side Shuffles", "category": "cardio", "desc": "Shuffle side-to-side in a low stance, staying on the balls of your feet.", "dumbbell_alt": "N/A", "band_alt": "N/A"},
                    {"name": "Shadow Boxing", "category": "cardio", "desc": "Throw controlled punches in the air while shuffling feet.", "dumbbell_alt": "Light Dumbbell Punches", "band_alt": "Banded Punches"}
                ]
                
        # Sunday (Rest & Active Recovery)
        else:
            workout_type = "Rest & Active Recovery"
            primary = [
                {"name": "Full Body Mobility Routine", "category": "recovery", "desc": "Rotate joints (wrists, ankles, neck, hips) and practice deep breathing.", "dumbbell_alt": "N/A", "band_alt": "N/A"},
                {"name": "Pelvic Tilts", "category": "recovery", "desc": "Lie on back, knees bent, flatten lower back against floor, squeeze glutes.", "dumbbell_alt": "N/A", "band_alt": "N/A"},
                {"name": "Glute Bridge hold", "category": "recovery", "desc": "Lie on back, lift hips and hold for 10-15 seconds. Squeeze glutes.", "dumbbell_alt": "N/A", "band_alt": "N/A"},
                {"name": "Sphinx Pose", "category": "recovery", "desc": "Lie on stomach, prop upper body up on forearms, stretch abdominal wall.", "dumbbell_alt": "N/A", "band_alt": "N/A"}
            ]
            
        for ex in primary:
            exercises.append(ex)
            
        # Core & Stability (2 exercises)
        core_pool = [
            {"name": "Standard Plank", "category": "strength", "desc": "Hold straight body line resting on hands/forearms and toes. Squeeze core.", "dumbbell_alt": "Weighted Plank", "band_alt": "N/A"},
            {"name": "Bird-Dog Pose", "category": "mobility", "desc": "On hands and knees, extend opposite arm and leg straight out.", "dumbbell_alt": "N/A", "band_alt": "N/A"},
            {"name": "Deadbug", "category": "strength", "desc": "Lie on back, arms up, knees bent. Extend opposite arm/leg, return, repeat.", "dumbbell_alt": "Weighted Deadbug", "band_alt": "N/A"},
            {"name": "Side Plank", "category": "strength", "desc": "Lie on side, lift hips up, supporting weight on forearm and feet.", "dumbbell_alt": "N/A", "band_alt": "N/A"},
            {"name": "Pelvic Tilts", "category": "recovery", "desc": "Lie on back, knees bent, flatten lower back against floor, tilt pelvis.", "dumbbell_alt": "N/A", "band_alt": "N/A"}
        ]
        
        if injury_type == 'back':
            exercises.append(core_pool[1]) # Bird-Dog
            exercises.append(core_pool[4]) # Pelvic Tilts
        elif injury_type == 'shoulder':
            exercises.append(core_pool[2]) # Deadbug
            exercises.append(core_pool[4]) # Pelvic Tilts
        else:
            exercises.append(core_pool[0]) # Plank
            exercises.append(core_pool[2]) # Deadbug
            
        # Cool-down & Stretching (2 exercises)
        stretches_pool = [
            {"name": "Quadriceps Stretch", "category": "mobility", "desc": "Stand on one leg, pull other foot to glute. Hold for 30s.", "dumbbell_alt": "N/A", "band_alt": "Banded Assisted Quad Stretch"},
            {"name": "Hamstring Stretch", "category": "mobility", "desc": "Sit on floor, extend one leg, reach forward toward toes. Hold for 30s.", "dumbbell_alt": "N/A", "band_alt": "Banded Assisted Hamstring Stretch"},
            {"name": "Cobra Stretch", "category": "mobility", "desc": "Lie on stomach, press hands down, lift chest, arch back slightly.", "dumbbell_alt": "N/A", "band_alt": "N/A"},
            {"name": "Seated Spinal Twist", "category": "mobility", "desc": "Sit cross-legged, twist torso to one side, looking over shoulder.", "dumbbell_alt": "N/A", "band_alt": "N/A"},
            {"name": "Chest Opener Stretch", "category": "mobility", "desc": "Clasp hands behind back, squeeze shoulder blades, lift chest.", "dumbbell_alt": "N/A", "band_alt": "N/A"},
            {"name": "Posterior Delt Stretch", "category": "mobility", "desc": "Pull one arm across chest, hold with opposite arm. Hold for 30s.", "dumbbell_alt": "N/A", "band_alt": "N/A"},
            {"name": "Child's Pose", "category": "mobility", "desc": "Sit back on heels, reach arms forward on floor, forehead down.", "dumbbell_alt": "N/A", "band_alt": "N/A"}
        ]
        
        if injury_type == 'shoulder':
            exercises.append(stretches_pool[0]) # Quad stretch
            exercises.append(stretches_pool[1]) # Hamstring stretch
        elif injury_type == 'back':
            exercises.append(stretches_pool[6]) # Child's pose
            exercises.append(stretches_pool[1]) # Hamstring stretch
        elif injury_type in ['acl', 'knee']:
            exercises.append(stretches_pool[4]) # Chest Opener
            exercises.append(stretches_pool[5]) # Shoulder Delt stretch
        else:
            exercises.append(stretches_pool[0]) # Quad stretch
            exercises.append(stretches_pool[1]) # Hamstring stretch
            
        day_intensity = "Light" if day == "Sunday" else intensity
        day_duration = "20-30 mins" if day == "Sunday" else duration
        
        # Add workout metadata
        weekly_chart[day] = {
            "workout": workout_type,
            "exercises": exercises,
            "intensity": day_intensity,
            "duration": day_duration
        }
        
    return weekly_chart

# Helper to enrich food items with vitamins and amino acids
def enrich_food_micros(food_item):
    name_l = food_item['name'].lower()
    
    # Defaults
    vitamins = "Vitamin B-complex"
    amino_acids = "Glutamic Acid, Aspartic Acid"
    
    # 1. Cereals & Grains
    if any(x in name_l for x in ['idli', 'dosa', 'rice', 'chapati', 'roti', 'paratha', 'jowar', 'bajra', 'maize', 'poha', 'uppuma', 'upma', 'oats', 'porridge', 'bread', 'bun', 'puffed rice', 'khichdi', 'pulao']):
        vitamins = "Vitamin B1, B2, B3, B9, Iron, Magnesium"
        amino_acids = "Glutamic Acid, Proline, Aspartic Acid (Incomplete protein)"
        if 'ragi' in name_l:
            vitamins = "Calcium, Vitamin B1, B2, B6, Iron, Magnesium"
            amino_acids = "Methionine, Valine, Glutamic Acid (Rich amino profile)"
        elif 'bajra' in name_l:
            vitamins = "Iron, Zinc, Vitamin B3, B9, Magnesium"
            amino_acids = "Leucine, Isoleucine, Glutamic Acid"
            
    # 2. Dals & Pulses
    elif any(x in name_l for x in ['dal', 'dhal', 'rajmah', 'kidney beans', 'chole', 'chana', 'chickpeas', 'sprouts', 'lentil', 'makhani']):
        vitamins = "Vitamin B9 (Folate), B1, B6, Iron, Zinc, Potassium"
        amino_acids = "Lysine, Threonine, Valine, Isoleucine, Leucine (Pairs with grains for complete protein)"
        
    # 3. Dairy
    elif any(x in name_l for x in ['milk', 'curd', 'dahi', 'paneer', 'cheese', 'buttermilk', 'chass']):
        vitamins = "Vitamin B12, B2, Vitamin D, Vitamin A, Calcium, Phosphorus"
        amino_acids = "Leucine, Lysine, Isoleucine, Valine, Methionine (Complete protein, high BCAAs)"
        
    # 4. Vegetables
    elif any(x in name_l for x in ['curry', 'aloo', 'baigan', 'bhindi', 'okra', 'cabbage', 'gobi', 'kaddu', 'pumpkin', 'paneer palak', 'palak', 'spinach', 'sarson', 'saag', 'veg', 'vegetable', 'salad', 'cucumber', 'tomato', 'carrot', 'beetroot']):
        vitamins = "Vitamin A, Vitamin C, Vitamin K, Folate (B9), Iron, Potassium"
        amino_acids = "Arginine, Glutamic Acid, Aspartic Acid (Traces)"
        if 'spinach' in name_l or 'palak' in name_l or 'saag' in name_l:
            vitamins = "Iron, Calcium, Vitamin A, Vitamin C, Vitamin K, Folate"
            
    # 5. Fruits & Sweet Snacks
    elif any(x in name_l for x in ['apple', 'banana', 'dates', 'figs', 'grapes', 'guava', 'orange', 'pineapple', 'amla']):
        vitamins = "Vitamin C, Vitamin A, Vitamin B6, Potassium, Magnesium"
        amino_acids = "Alanine, Aspartic Acid, Arginine (Traces)"
        if 'orange' in name_l or 'amla' in name_l or 'guava' in name_l:
            vitamins = "Vitamin C (High Antioxidant), Vitamin A, Potassium"
        elif 'banana' in name_l:
            vitamins = "Potassium (High), Vitamin B6, Vitamin C"
        elif 'dates' in name_l or 'figs' in name_l:
            vitamins = "Iron, Potassium, Vitamin B6, Magnesium"

    # 6. Nuts
    elif any(x in name_l for x in ['almonds', 'cashew', 'walnut', 'groundnut', 'nuts']):
        vitamins = "Vitamin E, Vitamin B6, Magnesium, Zinc, Copper"
        amino_acids = "Arginine (High), Glutamic Acid, Leucine, Valine (Rich healthy fats)"
        
    # 7. Non-Veg
    elif any(x in name_l for x in ['egg', 'chicken', 'fish', 'mutton', 'prawn', 'biryani', 'tandoori']):
        vitamins = "Vitamin B12, Vitamin D, Vitamin B6, Selenium, Zinc, Iron"
        amino_acids = "Lysine, Leucine, Isoleucine, Valine, Methionine (All 9 essential amino acids - Complete protein)"
        if 'fish' in name_l:
            vitamins = "Omega-3 Fatty Acids, Vitamin D, Vitamin B12, Selenium"

    # 8. Fats & Oils
    elif 'ghee' in name_l or 'butter' in name_l:
        vitamins = "Vitamin A, E, K (Fat-soluble vitamins)"
        amino_acids = "None (Pure fat source)"

    food_item['vitamins'] = vitamins
    food_item['amino_acids'] = amino_acids
    return food_item

# Helper to generate custom diet tip based on medical history
def generate_medical_tip(medical_history, surgical_history, hormonal_disturbance, physiological_condition, nutritional_deficiency):
    med_hist = str(medical_history).lower()
    surg_hist = str(surgical_history).lower()
    hormonal = str(hormonal_disturbance).lower()
    phys = str(physiological_condition).lower()
    defic = str(nutritional_deficiency).lower()
    
    tips = []
    
    # 1. Diabetes or PCOS
    if any(x in med_hist for x in ['diabetes', 'diabetic', 'sugar']) or any(x in hormonal for x in ['pcos', 'pcod']):
        tips.append("you have Diabetes/PCOS condition, therefore you should include more of Vitamin B-complex, Magnesium, and low-glycemic fiber containing food which includes Ragi, Oats, Sprouts, Roasted Chana, and Spinach.")
        
    # 2. Hypertension / BP
    if any(x in med_hist for x in ['hypertension', 'bp', 'blood pressure']):
        tips.append("you have Hypertension condition, therefore you should include more of Potassium and Magnesium containing food which includes Banana, Orange, Apples, Spinach (Palak), Almonds, and Walnuts.")
        
    # 3. Thyroid
    if any(x in med_hist for x in ['thyroid']) or any(x in hormonal for x in ['thyroid']):
        tips.append("you have a Thyroid condition, therefore you should include more of Selenium, Zinc, and Vitamin D containing food which includes Almonds, Sprouts, Eggs, Fish, Lentils, and Paneer.")
        
    # 4. Surgical Recovery
    if surg_hist.strip() and surg_hist.strip() != 'none':
        tips.append("you have a surgical history, therefore you should include more of Vitamin C and complete proteins containing food which includes Orange, Amla, Guava, Eggs, Chicken, Fish, and Paneer.")
        
    # 5. Physiological Condition
    if phys == 'pregnancy' or phys == 'lactation':
        tips.append("you are in pregnancy/lactation condition, therefore you should include more of Vitamin B9 (Folate), Iron, and Calcium containing food which includes Cow Milk, Curd, Spinach, Bajra, Oats, and Sprouts.")
        
    # 6. Deficiencies
    if 'iron' in defic:
        tips.append("you have an Iron deficiency, therefore you should include more of Iron and Vitamin C containing food which includes Spinach (Palak), Bajra Roti, Amla, Guava, and Dates.")
    if 'calcium' in defic:
        tips.append("you have a Calcium deficiency, therefore you should include more of Calcium and Vitamin D containing food which includes Ragi Porridge/Roti, Cow Milk, Curd, Paneer, and Buttermilk.")
    if 'vitamin_d' in defic:
        tips.append("you have a Vitamin D deficiency, therefore you should include more of Vitamin D and Calcium containing food which includes Cow Milk, Curd, Paneer, Cheese, and Eggs.")
    if 'vitamin_b12' in defic:
        tips.append("you have a Vitamin B12 deficiency, therefore you should include more of Vitamin B12 containing food which includes Cow Milk, Curd, Paneer, Eggs, Chicken, and Fish.")

    if not tips:
        tips.append("you have a normal profile, therefore you should maintain a balanced intake of Vitamin C, Vitamin E, and complete protein foods like fresh fruits, sprouts, mixed nuts, and lentils.")
        
    formatted_tips = []
    for tip in tips:
        formatted_tips.append(f"Ex- {tip}")
        
    return " \n".join(formatted_tips)


@app.route('/generate-diet', methods=['POST'])
@app.route('/api/generate-diet', methods=['POST'])
def generate_diet():
    """Diet recommendation engine based on user metrics, preferences, injury type, and active meals list."""
    data = request.get_json() or {}
    age = data.get('age')
    gender = data.get('gender', 'male')
    weight = data.get('weight')
    height = data.get('height')
    activity = data.get('activity_level', 'light')
    goal = data.get('goal', 'maintenance')
    preference = data.get('food_preference', 'vegetarian')
    injury_type = data.get('injury_type', 'none')
    effective_active_meals = data.get('active_meals', ['breakfast', 'mid_morning_snack', 'lunch', 'evening_snack', 'dinner'])
    physiological_condition = data.get('physiological_condition', 'none')
    equipment = data.get('equipment', 'bodyweight')
    medical_history = data.get('medical_history', '')
    surgical_history = data.get('surgical_history', '')
    hormonal_disturbance = data.get('hormonal_disturbance', '')
    nutritional_deficiency = data.get('nutritional_deficiency', 'none')
    
    addictions = data.get('addictions', 'None')
    allergies = data.get('allergies', 'None')
    religious_preference = data.get('religiousPreference', 'None')
    eating_customs = data.get('eatingCustoms', 'Standard (3-5 meals)')
    results_expected_by = data.get('resultsExpectedBy', '3 Months (Moderate)')
    vrat_days = data.get('vrat_days', data.get('vratDays', []))
    vrat_type = data.get('vratType', 'No Grains (Navratri/Ekadashi)')
    start_date_str = data.get('start_date', data.get('startDate'))
    sleep_schedule = data.get('sleepSchedule', '')
    work_schedule = data.get('workSchedule', '')
    
    # Handle list input for medical history
    if isinstance(medical_history, list):
        medical_history = ", ".join(medical_history)
        
    pref_lower = str(preference).lower().replace('_', ' ').replace('-', ' ')
    
    # Eating Customs
    if 'OMAD' in eating_customs:
        effective_active_meals = ['dinner']
    elif 'Intermittent Fasting' in eating_customs or 'Two Meals' in eating_customs:
        effective_active_meals = [m for m in effective_active_meals if m not in ['breakfast', 'mid_morning_snack']]
    goal_lower = str(goal).lower()
    injury_type = str(injury_type).lower()
    
    if not all([age, weight, height]):
        return jsonify({"success": False, "error": "Age, weight, and height are required."}), 400
        
    try:
        weight_kg = float(weight)
        height_cm = float(height)
        age_yrs = int(age)
        
        # Form Validation
        if not (1 <= age_yrs <= 120):
            return jsonify({"success": False, "error": "Age must be between 1 and 120."}), 400
        if not (50 <= height_cm <= 250):
            return jsonify({"success": False, "error": "Height must be between 50 and 250 cm."}), 400
        if not (10 <= weight_kg <= 300):
            return jsonify({"success": False, "error": "Weight must be between 10 and 300 kg."}), 400
            
        # 1. Calculators
        # BMR
        if str(gender).lower() == 'male':
            bmr = 66 + (13.7 * weight_kg) + (5.0 * height_cm) - (6.8 * age_yrs)
        else:
            bmr = 655 + (9.6 * weight_kg) + (1.8 * height_cm) - (4.7 * age_yrs)
            
        # TDEE
        multipliers = {
            "sedentary": 1.2,
            "light": 1.375,
            "moderate": 1.55,
            "very_active": 1.725,
            "extra_active": 1.9
        }
        act_key = "light"
        activity_lower = str(activity).lower()
        if "sedentary" in activity_lower:
            act_key = "sedentary"
        elif "light" in activity_lower:
            act_key = "light"
        elif "moderate" in activity_lower:
            act_key = "moderate"
        elif "very" in activity_lower:
            act_key = "very_active"
        elif "extra" in activity_lower:
            act_key = "extra_active"
            
        tdee = bmr * multipliers[act_key]
        
        # Physiological Calories Extra
        phys_calories = 0
        if physiological_condition == 'pregnancy':
            phys_calories = 350
        elif physiological_condition == 'lactation':
            phys_calories = 500
            
        # Goal target calories adjustments
        goal_calories = 0
        if "aggressive" in goal_lower:
            goal_calories = -800
        elif "loss" in goal_lower or "fat_loss" in goal_lower:
            goal_calories = -500
        elif "muscle" in goal_lower:
            goal_calories = 500
        elif "gain" in goal_lower:
            goal_calories = 300
        elif "sports" in goal_lower:
            goal_calories = 400
            
        target_calories = tdee + phys_calories + goal_calories
        target_calories = max(1200.0, target_calories)
        target_calories = round(target_calories)
        
        # Refined Progressive Protein targets
        protein_factor = 1.1
        if age_yrs > 60:
            protein_factor = max(protein_factor, 1.0)
        if "loss" in goal_lower or "fat_loss" in goal_lower:
            protein_factor = max(protein_factor, 1.4)
        if "muscle" in goal_lower or "sports" in goal_lower:
            protein_factor = max(protein_factor, 1.8)
            
        protein_g = protein_factor * weight_kg
        if physiological_condition == 'pregnancy':
            protein_g += 25
        elif physiological_condition == 'lactation':
            protein_g += 20
        protein_g = round(protein_g)
        
        # Salad Calculations
        # 1/2 serving each of Cucumber, Tomato, Carrot, Beetroot
        salad_cal = 59
        salad_prot = 2.0
        salad_carbs = 13.6
        salad_fats = 0.4
        
        # Remaining calorie budget for meals
        meals_target_calories = max(1000.0, target_calories - salad_cal)
        
        # Macro Splits of Non-Protein Calories
        carb_pct = 0.60
        fat_pct = 0.40
        if "aggressive" in goal_lower or "fat_loss" in goal_lower:
            carb_pct = 0.45
            fat_pct = 0.55
        elif "loss" in goal_lower:
            carb_pct = 0.50
            fat_pct = 0.50
        elif "gain" in goal_lower:
            carb_pct = 0.65
            fat_pct = 0.35
        elif "sports" in goal_lower:
            carb_pct = 0.70
            fat_pct = 0.30
            
        protein_kcal = protein_g * 4
        non_protein_kcal = max(0.0, target_calories - protein_kcal)
        
        carbs_g = round((non_protein_kcal * carb_pct) / 4)
        fats_g = round((non_protein_kcal * fat_pct) / 9)
        
        # Water intake (35ml per kg)
        water_ml = round(weight_kg * 35)
        
        # Get Foods from Database
        is_non_veg = "non" in pref_lower
        
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM Foods")
        all_db_foods = [dict(row) for row in cursor.fetchall()]
        conn.close()
        
        # Helper to filter foods
        def filter_foods(foods_list, preference_str):
            pref = preference_str.lower()
            filtered = []
            for f in foods_list:
                if not is_non_veg and f['is_veg'] == 0:
                    continue
                name_l = f['name'].lower()
                if "vegan" in pref:
                    exclude = ['egg', 'chicken', 'fish', 'mutton', 'beef', 'pork', 'prawn', 'crab', 'sausage', 'fowl', 'milk', 'ghee', 'cheese', 'curd', 'dahi', 'paneer', 'khoa', 'butter', 'biscuit', 'rusk', 'chai (with milk']
                    if any(x in name_l for x in exclude):
                        continue
                elif "jain" in pref:
                    exclude = ['potato', 'onion', 'garlic', 'beetroot', 'carrot', 'arvi', 'colocasia', 'sweet-potato', 'tapioca', 'yam', 'beef', 'pork', 'mutton', 'chicken', 'sausage', 'egg', 'fish', 'crab', 'prawn']
                    if any(x in name_l for x in exclude):
                        continue
                filtered.append(f)
            return filtered

        if religious_preference in ['Jain (No Root Vegetables)', 'Swaminarayan (No Onion/Garlic)', 'Brahmin (Strict Vegetarian)', 'Vegan']:
            pref_lower = 'vegetarian'
        
        filtered_all = filter_foods(all_db_foods, pref_lower)
        
        # Apply Religious and Custom Constraints
        if religious_preference == 'Jain (No Root Vegetables)':
            jain_forbidden = ['potato', 'carrot', 'beetroot', 'aloo', 'onion', 'garlic', 'egg', 'chicken', 'fish', 'mutton', 'meat', 'prawn']
            filtered_all = [f for f in filtered_all if not any(x in f['name'].lower() for x in jain_forbidden)]
        elif religious_preference == 'Swaminarayan (No Onion/Garlic)':
            swami_forbidden = ['onion', 'garlic', 'egg', 'chicken', 'fish', 'mutton', 'meat', 'prawn']
            filtered_all = [f for f in filtered_all if not any(x in f['name'].lower() for x in swami_forbidden)]
        elif religious_preference == 'Brahmin (Strict Vegetarian)':
            brahmin_forbidden = ['egg', 'chicken', 'fish', 'mutton', 'meat', 'prawn']
            filtered_all = [f for f in filtered_all if not any(x in f['name'].lower() for x in brahmin_forbidden)]
        elif religious_preference == 'Vegan':
            vegan_forbidden = ['milk', 'curd', 'paneer', 'cheese', 'ghee', 'egg', 'chicken', 'fish', 'mutton', 'buttermilk', 'dahi', 'butter', 'prawn']
            filtered_all = [f for f in filtered_all if not any(x in f['name'].lower() for x in vegan_forbidden)]
            
        # Apply Allergy Constraints
        if 'Dairy' in allergies:
            dairy_forbidden = ['milk', 'curd', 'paneer', 'cheese', 'ghee', 'dahi', 'buttermilk']
            filtered_all = [f for f in filtered_all if not any(x in f['name'].lower() for x in dairy_forbidden)]
        if 'Gluten' in allergies:
            gluten_forbidden = ['chapati', 'wheat', 'bread', 'oats', 'uppuma', 'upma', 'roti', 'khakhra']
            filtered_all = [f for f in filtered_all if not any(x in f['name'].lower() for x in gluten_forbidden)]
        if 'Nuts' in allergies:
            nuts_forbidden = ['almond', 'walnut', 'peanut', 'groundnut']
            filtered_all = [f for f in filtered_all if not any(x in f['name'].lower() for x in nuts_forbidden)]
        if 'Egg' in allergies:
            filtered_all = [f for f in filtered_all if 'egg' not in f['name'].lower()]
        
        db_breakfast = [f for f in filtered_all if f['category'] == 'breakfast']
        db_lunch_dinner = [f for f in filtered_all if f['category'] in ['lunch', 'dinner']]
        db_snacks = [f for f in filtered_all if f['category'] == 'snacks']
        
        import hashlib
        import random
        seed_str = f"{data.get('name', 'john')}_{weight_kg}_{height_cm}_{age_yrs}_{goal_lower}_{pref_lower}_{injury_type}"
        seed_val = int(hashlib.md5(seed_str.encode('utf-8')).hexdigest(), 16) % 10000000
        random.seed(seed_val)
        
        def prioritize_style(foods_list, preference_str):
            pref = preference_str.lower()
            style_matches = []
            for f in foods_list:
                name_l = f['name'].lower()
                if "punjabi" in pref:
                    if any(x in name_l for x in ['paneer', 'rajma', 'chole', 'paratha', 'dal tadka']):
                        style_matches.append(f)
                elif "gujarati" in pref:
                    if any(x in name_l for x in ['poha', 'upma', 'khichdi', 'mixed veg', 'chass', 'buttermilk', 'rusk']):
                        style_matches.append(f)
                elif "south" in pref:
                    if any(x in name_l for x in ['idli', 'dosa', 'pongal', 'sambhar', 'curd rice', 'puttu', 'uppuma']):
                        style_matches.append(f)
            return style_matches if style_matches else foods_list

        breakfast_options = prioritize_style(db_breakfast, pref_lower)
        lunch_options = prioritize_style(db_lunch_dinner, pref_lower)
        snacks_options = prioritize_style(db_snacks, pref_lower)
        
        if not breakfast_options: breakfast_options = db_breakfast if db_breakfast else filtered_all
        if not lunch_options: lunch_options = db_lunch_dinner if db_lunch_dinner else filtered_all
        if not snacks_options: snacks_options = db_snacks if db_snacks else filtered_all

        # Dynamic Meal Splits Normalizer
        ratios = {
            'breakfast': 35,
            'mid_morning_snack': 10,
            'lunch': 35,
            'evening_snack': 10,
            'dinner': 30
        }
        
        if 'mid_morning_snack' in effective_active_meals:
            ratios['lunch'] -= 5
            ratios['dinner'] -= 5
        if 'evening_snack' in effective_active_meals:
            ratios['lunch'] -= 5
            ratios['dinner'] -= 5
            
        ratios['lunch'] = max(15, ratios['lunch'])
        ratios['dinner'] = max(15, ratios['dinner'])
        
        active_ratios = {m: ratios[m] for m in effective_active_meals if m in ratios}
        total_active_ratio = sum(active_ratios.values())
        if total_active_ratio > 0:
            for m in active_ratios:
                active_ratios[m] = active_ratios[m] / total_active_ratio
        else:
            for m in effective_active_meals:
                active_ratios[m] = 1.0 / len(effective_active_meals)
                
        meal_targets = {}
        for m in effective_active_meals:
            pct = active_ratios.get(m, 0.2)
            m_cal = meals_target_calories * pct
            m_prot = protein_g * pct
            meal_targets[m] = {
                'calories': m_cal,
                'protein': m_prot
            }
            
        # Shift protein for Weight Loss (breakfast) or Weight Gain (lunch)
        is_loss = "loss" in goal_lower or "fat_loss" in goal_lower
        is_gain = "gain" in goal_lower or "muscle" in goal_lower
        
        if is_loss:
            if 'breakfast' in meal_targets:
                extra = protein_g * 0.1
                meal_targets['breakfast']['protein'] += extra
                other_meals = [x for x in effective_active_meals if x != 'breakfast']
                if other_meals:
                    deduct = extra / len(other_meals)
                    for om in other_meals:
                        meal_targets[om]['protein'] = max(5.0, meal_targets[om]['protein'] - deduct)
        elif is_gain:
            if 'lunch' in meal_targets:
                extra = protein_g * 0.1
                meal_targets['lunch']['protein'] += extra
                other_meals = [x for x in effective_active_meals if x != 'lunch']
                if other_meals:
                    deduct = extra / len(other_meals)
                    for om in other_meals:
                        meal_targets[om]['protein'] = max(5.0, meal_targets[om]['protein'] - deduct)

        med_hist = str(medical_history).lower()
        surg_hist = str(surgical_history).lower()
        hormonal = str(hormonal_disturbance).lower()

        def get_top_items(pool, target, count=4, slot_key=None):
            scored_items = []
            for food in pool:
                name_l = food['name'].lower()
                cals = food['calories']
                mult = target / max(1.0, cals)
                mult_penalty = 0
                if mult < 0.5:
                    mult_penalty = (0.5 - mult) * 100
                elif mult > 2.5:
                    mult_penalty = (mult - 2.5) * 100
                    
                score = mult_penalty
                if is_loss:
                    score += cals * 0.1
                else:
                    score -= cals * 0.1
                
                boost = 0
                if injury_type == 'bone':
                    if any(x in name_l for x in ['ragi', 'milk', 'curd', 'dahi', 'paneer', 'cheese', 'buttermilk', 'chass']):
                        boost += 300
                elif injury_type == 'muscle':
                    if any(x in name_l for x in ['almond', 'cashew', 'walnut', 'groundnut', 'chana', 'sprouts', 'egg', 'chicken', 'fish', 'mutton', 'dal', 'dhal', 'paneer', 'lentil', 'rajmah', 'chole']):
                        boost += 300
                elif injury_type == 'wound':
                    if any(x in name_l for x in ['orange', 'amla', 'guava', 'pineapple', 'apple', 'grapes']):
                        boost += 300
                elif injury_type == 'joint':
                    if any(x in name_l for x in ['walnut', 'almond', 'green tea', 'spinach', 'palak']):
                        boost += 300

                # 1. Diabetes or PCOS
                if any(x in med_hist for x in ['diabetes', 'diabetic', 'sugar']) or any(x in hormonal for x in ['pcos', 'pcod']):
                    if any(x in name_l for x in ['ragi', 'oats', 'barley', 'chana', 'sprouts', 'dal', 'dhal', 'green tea']):
                        boost += 300
                    if any(x in name_l for x in ['rice', 'paratha', 'sugar']):
                        boost -= 300

                # 2. Hypertension / BP
                if any(x in med_hist for x in ['hypertension', 'bp', 'blood pressure']):
                    if any(x in name_l for x in ['banana', 'orange', 'apple', 'spinach', 'palak', 'almond', 'walnut']):
                        boost += 300
                    if any(x in name_l for x in ['cheese', 'butter', 'tandoori']):
                        boost -= 300

                # 3. Thyroid
                if any(x in med_hist for x in ['thyroid']) or any(x in hormonal for x in ['thyroid']):
                    if any(x in name_l for x in ['almond', 'sprouts', 'chicken', 'fish', 'egg', 'lentil', 'dal', 'dhal', 'chana', 'paneer']):
                        boost += 300

                # 4. Surgical Recovery
                if surg_hist.strip() and surg_hist.strip() != 'none':
                    if any(x in name_l for x in ['orange', 'amla', 'guava']):
                        boost += 300
                    if any(x in name_l for x in ['almond', 'sprouts', 'chicken', 'fish', 'egg', 'lentil', 'dal', 'dhal', 'chana', 'paneer']):
                        boost += 300
                
                if is_gain and slot_key in ['lunch', 'dinner']:
                    protein_fats_ratio = (food['protein'] + food['fats']) / max(1.0, food['calories'])
                    boost += protein_fats_ratio * 500
                    
                score -= boost
                scored_items.append((score, food))
            
            scored_items.sort(key=lambda x: x[0])
            return [x[1] for x in scored_items[:min(count, len(scored_items))]]

        # Keep track of recently used food item IDs to guarantee uniqueness
        last_breakfasts = []
        last_snacks = []
        last_lunch_combos = []
        last_dinner_combos = []

        from datetime import datetime, timedelta
        start_date = datetime.now()
        if start_date_str:
            try:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
            except ValueError:
                pass

        fifteen_days = []
        for day_num in range(1, 16):
            day_meals = []
            
            current_day_date = start_date + timedelta(days=day_num - 1)
            day_of_week_name = current_day_date.strftime('%A')
            
            is_vrat_day = False
            if religious_preference == 'Vrat (Fasting)' and day_of_week_name in vrat_days:
                is_vrat_day = True
            
            # Seed changes per day to generate variations
            day_seed = seed_val + day_num * 100
            random.seed(day_seed)
            
            for slot_key in effective_active_meals:
                slot_target = meal_targets[slot_key]['calories']
                slot_label = slot_key.replace('_', ' ').title()
                
                current_pool_breakfast = breakfast_options
                current_pool_snacks = snacks_options
                current_pool_lunch = lunch_options
                
                if is_vrat_day:
                    if 'Water Fast' in vrat_type:
                        slot_target = 0
                    elif 'Fruits & Milk' in vrat_type:
                        fm_filter = lambda f: any(n in f['name'].lower() for n in ['apple', 'banana', 'orange', 'milk', 'curd', 'almond', 'walnut'])
                        current_pool_breakfast = [f for f in breakfast_options if fm_filter(f)]
                        current_pool_snacks = [f for f in snacks_options if fm_filter(f)]
                        current_pool_lunch = [f for f in snacks_options if fm_filter(f)]
                    elif 'No Grains' in vrat_type:
                        ng_filter = lambda f: not any(n in f['name'].lower() for n in ['wheat', 'rice', 'dal', 'chole', 'rajmah', 'chapati', 'bread', 'oats', 'poha', 'uppuma', 'roti'])
                        current_pool_breakfast = [f for f in breakfast_options if ng_filter(f)]
                        current_pool_snacks = [f for f in snacks_options if ng_filter(f)]
                        current_pool_lunch = [f for f in lunch_options if ng_filter(f)]

                if slot_target == 0:
                    continue # Skip meal entirely if it's 0 calories (e.g. water fast)
                
                if slot_key in ['breakfast', 'mid_morning_snack', 'evening_snack']:
                    pool = (current_pool_breakfast if current_pool_breakfast else snacks_options) if slot_key == 'breakfast' else (current_pool_snacks if current_pool_snacks else snacks_options)
                    top_foods = get_top_items(pool, slot_target, count=6, slot_key=slot_key)
                    
                    recent_used = last_breakfasts if slot_key == 'breakfast' else last_snacks
                    available = [f for f in top_foods if f['id'] not in recent_used]
                    if not available:
                        available = top_foods
                        
                    food = random.choice(available) if available else pool[0]
                    recent_used.append(food['id'])
                    if len(recent_used) > 3:
                        recent_used.pop(0)
                        
                    mult = round(slot_target / food['calories'], 1)
                    mult = max(0.5, min(4.0, mult))
                    
                    enriched_item = {
                        "id": food['id'],
                        "name": food['name'],
                        "calories": round(food['calories'] * mult),
                        "protein": round(food['protein'] * mult, 1),
                        "carbs": round(food['carbs'] * mult, 1),
                        "fats": round(food['fats'] * mult, 1),
                        "serving_size": scale_serving_size(food['serving_size'], mult),
                        "is_veg": food['is_veg']
                    }
                    enriched_item = enrich_food_micros(enriched_item)
                    items = [enriched_item]
                    
                    # Alternative meals for swaps
                    alt_foods = [f for f in top_foods if f['id'] != food['id']][:3]
                    if len(alt_foods) < 3: alt_foods = top_foods[:3]
                    
                    alternatives = []
                    for f in alt_foods:
                        a_mult = round(slot_target / f['calories'], 1)
                        a_mult = max(0.5, min(4.0, a_mult))
                        alt_enriched = {
                            "id": f['id'],
                            "name": f['name'],
                            "calories": round(f['calories'] * a_mult),
                            "protein": round(f['protein'] * a_mult, 1),
                            "carbs": round(f['carbs'] * a_mult, 1),
                            "fats": round(f['fats'] * a_mult, 1),
                            "serving_size": scale_serving_size(f['serving_size'], a_mult),
                            "is_veg": f['is_veg']
                        }
                        alt_enriched = enrich_food_micros(alt_enriched)
                        alternatives.append({"items": [alt_enriched]})
                
                else: # lunch or dinner
                    actual_lunch_pool = current_pool_lunch if current_pool_lunch else lunch_options
                    carbs_pool = [f for f in actual_lunch_pool if any(x in f['name'].lower() for x in ['chapati', 'rice', 'khichdi', 'curd rice', 'roti'])]
                    sides_pool = [f for f in actual_lunch_pool if not any(x in f['name'].lower() for x in ['chapati', 'rice', 'khichdi', 'curd rice', 'roti', 'ghee', 'buttermilk', 'milk'])]
                    
                    if not carbs_pool: carbs_pool = actual_lunch_pool
                    if not sides_pool: sides_pool = actual_lunch_pool
                    
                    top_carbs = get_top_items(carbs_pool, slot_target * 0.45, count=5, slot_key=slot_key)
                    top_sides = get_top_items(sides_pool, slot_target * 0.55, count=5, slot_key=slot_key)
                    
                    combo_history = last_lunch_combos if slot_key == 'lunch' else last_dinner_combos
                    valid_combos = []
                    for c in top_carbs:
                        for s in top_sides:
                            combo_id = (c['id'], s['id'])
                            if combo_id not in combo_history:
                                valid_combos.append((c, s, combo_id))
                                
                    if not valid_combos:
                        for c in top_carbs:
                            for s in top_sides:
                                valid_combos.append((c, s, (c['id'], s['id'])))
                                
                    selected_carb, selected_side, combo_id = random.choice(valid_combos)
                    combo_history.append(combo_id)
                    if len(combo_history) > 4:
                        combo_history.pop(0)
                        
                    comb_cal = selected_carb['calories'] + selected_side['calories']
                    mult = round(slot_target / comb_cal, 1)
                    mult = max(0.5, min(4.0, mult))
                    
                    enriched_carb = {
                        "id": selected_carb['id'],
                        "name": selected_carb['name'],
                        "calories": round(selected_carb['calories'] * mult),
                        "protein": round(selected_carb['protein'] * mult, 1),
                        "carbs": round(selected_carb['carbs'] * mult, 1),
                        "fats": round(selected_carb['fats'] * mult, 1),
                        "serving_size": scale_serving_size(selected_carb['serving_size'], mult),
                        "is_veg": selected_carb['is_veg']
                    }
                    enriched_carb = enrich_food_micros(enriched_carb)
                    
                    enriched_side = {
                        "id": selected_side['id'],
                        "name": selected_side['name'],
                        "calories": round(selected_side['calories'] * mult),
                        "protein": round(selected_side['protein'] * mult, 1),
                        "carbs": round(selected_side['carbs'] * mult, 1),
                        "fats": round(selected_side['fats'] * mult, 1),
                        "serving_size": scale_serving_size(selected_side['serving_size'], mult),
                        "is_veg": selected_side['is_veg']
                    }
                    enriched_side = enrich_food_micros(enriched_side)
                    
                    items = [enriched_carb, enriched_side]
                    
                    alt_carbs = [c for c in top_carbs if c['id'] != selected_carb['id']][:3]
                    if len(alt_carbs) < 3: alt_carbs = top_carbs[:3]
                    alt_sides = [s for s in top_sides if s['id'] != selected_side['id']][:3]
                    if len(alt_sides) < 3: alt_sides = top_sides[:3]
                    
                    alternatives = []
                    for i in range(3):
                        c_item = alt_carbs[i % len(alt_carbs)]
                        s_item = alt_sides[i % len(alt_sides)]
                        comb_cal_a = c_item['calories'] + s_item['calories']
                        a_mult = round(slot_target / comb_cal_a, 1)
                        a_mult = max(0.5, min(4.0, a_mult))
                        
                        alt_c_enriched = {
                            "id": c_item['id'],
                            "name": c_item['name'],
                            "calories": round(c_item['calories'] * a_mult),
                            "protein": round(c_item['protein'] * a_mult, 1),
                            "carbs": round(c_item['carbs'] * a_mult, 1),
                            "fats": round(c_item['fats'] * a_mult, 1),
                            "serving_size": scale_serving_size(c_item['serving_size'], a_mult),
                            "is_veg": c_item['is_veg']
                        }
                        alt_c_enriched = enrich_food_micros(alt_c_enriched)
                        
                        alt_s_enriched = {
                            "id": s_item['id'],
                            "name": s_item['name'],
                            "calories": round(s_item['calories'] * a_mult),
                            "protein": round(s_item['protein'] * a_mult, 1),
                            "carbs": round(s_item['carbs'] * a_mult, 1),
                            "fats": round(s_item['fats'] * a_mult, 1),
                            "serving_size": scale_serving_size(s_item['serving_size'], a_mult),
                            "is_veg": s_item['is_veg']
                        }
                        alt_s_enriched = enrich_food_micros(alt_s_enriched)
                        
                        alternatives.append({"items": [alt_c_enriched, alt_s_enriched]})
                
                meal_cals = sum(item['calories'] for item in items)
                meal_prots = round(sum(item['protein'] for item in items), 1)
                meal_carbs = round(sum(item['carbs'] for item in items), 1)
                meal_fats = round(sum(item['fats'] for item in items), 1)
                
                day_meals.append({
                    "key": slot_key,
                    "label": slot_label,
                    "target_kcal_pct": f"{int(active_ratios.get(slot_key, 0.2) * 100)}%",
                    "items": items,
                    "calories": meal_cals,
                    "protein": meal_prots,
                    "carbs": meal_carbs,
                    "fats": meal_fats,
                    "alternatives": alternatives
                })
                
            actual_calories = sum(m['calories'] for m in day_meals)
            actual_protein = round(sum(m['protein'] for m in day_meals), 1)
            actual_carbs = round(sum(m['carbs'] for m in day_meals), 1)
            actual_fats = round(sum(m['fats'] for m in day_meals), 1)
            
            fifteen_days.append({
                "day": day_num,
                "date_string": current_day_date.strftime('%b %d, %a'),
                "day_of_week": day_of_week_name,
                "is_vrat_day": is_vrat_day,
                "target_calories": target_calories,
                "diet": day_meals,
                "meals": day_meals,
                "totals": {
                    "calories": actual_calories + salad_cal,
                    "protein": round(actual_protein + salad_prot, 1),
                    "carbs": round(actual_carbs + salad_carbs, 1),
                    "fats": round(actual_fats + salad_fats, 1)
                }
            })

        # Generate the 30-day calendar plan by cycling the 15 unique days
        thirty_day_plan = []
        from datetime import timedelta
        for d in range(1, 31):
            source_day = fifteen_days[(d - 1) % 15]
            
            # Recalculate date for all 30 days
            if 'start_date' in locals():
                current_day_date = start_date + timedelta(days=d - 1)
                day_of_week_name = current_day_date.strftime('%A')
                is_vrat_day = False
                if religious_preference == 'Vrat (Fasting)' and day_of_week_name in vrat_days:
                    is_vrat_day = True
            else:
                day_of_week_name = source_day.get('day_of_week')
                is_vrat_day = source_day.get('is_vrat_day')
                current_day_date = None

            day_entry = {
                "day": d,
                "date_string": current_day_date.strftime('%b %d, %a') if current_day_date else source_day.get("date_string"),
                "day_of_week": day_of_week_name,
                "is_vrat_day": is_vrat_day,
                "target_calories": source_day.get("target_calories"),
                "diet": json.loads(json.dumps(source_day["meals"])),
                "meals": json.loads(json.dumps(source_day["meals"])), # deep copy
                "totals": source_day["totals"]
            }
            thirty_day_plan.append(day_entry)

        # Legacy compatibility values matching Day 1
        day1_meals = thirty_day_plan[0]["meals"]
        day1_totals = thirty_day_plan[0]["totals"]
        
        legacy_meal_plan = {}
        for m in day1_meals:
            legacy_meal_plan[m['key']] = m

        for k in list(legacy_meal_plan.keys()):
            legacy_meal = legacy_meal_plan[k]
            if k in ["breakfast", "mid_morning_snack", "evening_snack"] and "items" in legacy_meal and len(legacy_meal["items"]) > 0:
                item = legacy_meal["items"][0]
                legacy_meal_plan[k] = {
                    "id": item.get("id"),
                    "name": item.get("name"),
                    "calories": legacy_meal.get("calories"),
                    "protein": legacy_meal.get("protein"),
                    "carbs": legacy_meal.get("carbs"),
                    "fats": legacy_meal.get("fats"),
                    "serving_size": item.get("serving_size"),
                    "is_veg": item.get("is_veg"),
                    "vitamins": item.get("vitamins"),
                    "amino_acids": item.get("amino_acids")
                }
        
        legacy_meal_plan["meals"] = day1_meals
        
        fat_calories = (day1_totals['fats'] + salad_fats) * 9
        fat_ratio = fat_calories / max(1.0, day1_totals['calories'])
        ghee_advisory = None
        if fat_ratio < 0.20:
            if target_calories < 1600:
                ghee_advisory = f"Your diet plan's fat ratio is {fat_ratio*100:.1f}% (less than the recommended 20%). We suggest adding 1 tsp of Ghee (45 kcal, 5g fat) to your Lunch or Dinner to support fat-soluble vitamin absorption."
            else:
                ghee_advisory = f"Your diet plan's fat ratio is {fat_ratio*100:.1f}% (less than the recommended 20%). We suggest adding 2 tsp of Ghee (90 kcal, 10g fat) to your Lunch or Dinner to support fat-soluble vitamin absorption."

        # Generate Exercise Chart
        exercise_chart = generate_weekly_exercise_chart(goal, age, equipment, injury_type)
        
        # Generate custom medical tip
        medical_tip = generate_medical_tip(medical_history, surgical_history, hormonal_disturbance, physiological_condition, nutritional_deficiency)

        response_data = {
            "bmi": round(weight_kg / ((height_cm / 100.0) ** 2), 2),
            "bmr": round(bmr),
            "tdee": round(tdee),
            "target_calories": target_calories,
            "target_protein_g": protein_g,
            "target_carbs_g": carbs_g,
            "target_fats_g": fats_g,
            "water_ml": water_ml,
            "meal_plan": legacy_meal_plan,
            "thirty_day_plan": thirty_day_plan,
            "medical_tip": medical_tip,
            "ghee_advisory": ghee_advisory,
            "salad": {
                "calories": salad_cal,
                "protein": salad_prot,
                "carbs": salad_carbs,
                "fats": salad_fats,
                "description": "Standard daily healing salad: 1/2 cup each of Cucumber, Tomato, Carrot, Beetroot."
            },
            "exercise_chart": exercise_chart,
            "totals": day1_totals
        }
        
        return jsonify({"success": True, "data": response_data}), 200
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/swap-meal', methods=['POST'])
@app.route('/api/swap-meal', methods=['POST'])
@app.route('/meal-swap', methods=['POST'])
@app.route('/api/meal-swap', methods=['POST'])
def swap_meal():
    """Swap a diet item for an alternative (single or combined) with similar carbohydrate/caloric footprint."""
    data = request.get_json() or {}
    item_id = data.get('item_id')
    current_name = data.get('name')
    category = data.get('category') # 'breakfast', 'lunch', 'dinner', 'snacks'
    target_calories = data.get('target_calories', 200)
    preference = data.get('food_preference', 'vegetarian')
    
    if not category:
        return jsonify({"success": False, "error": "Category is required."}), 400
        
    try:
        is_non_veg = "non" in str(preference).lower()
        db_category = 'lunch' if category in ['lunch', 'dinner'] else category
        
        # Find if current item exists in DB to get its carbs
        current_item = find_food_by_name(current_name)
        current_is_veg = current_item['is_veg'] if current_item else 1
        
        # Estimate target carbs to maintain carb parity
        if current_item:
            mult_est = float(target_calories) / max(1.0, current_item['calories'])
            target_carbs = current_item['carbs'] * mult_est
        else:
            target_carbs = (float(target_calories) * 0.5) / 4.0

        if is_non_veg:
            if current_is_veg == 0:
                foods = query_foods(category=db_category, is_veg=0)
                alternatives = [f for f in foods if f['name'].lower() != str(current_name).lower()]
                if not alternatives:
                    foods = query_foods(category=db_category)
                    alternatives = [f for f in foods if f['name'].lower() != str(current_name).lower()]
            else:
                foods = query_foods(category=db_category)
                alternatives = [f for f in foods if f['name'].lower() != str(current_name).lower()]
        else:
            foods = query_foods(category=db_category, is_veg=1)
            alternatives = [f for f in foods if f['name'].lower() != str(current_name).lower()]
        
        # Separate carbs and sides for lunch/dinner categories
        if category in ['lunch', 'dinner']:
            is_carb = str(current_name).lower() in ['chapati', 'rice', 'khichdi', 'curd rice', 'roti']
            if is_carb:
                alternatives = [f for f in alternatives if any(x in f['name'].lower() for x in ['chapati', 'rice', 'khichdi', 'curd rice', 'roti'])]
            else:
                alternatives = [f for f in alternatives if not any(x in f['name'].lower() for x in ['chapati', 'rice', 'khichdi', 'curd rice', 'roti', 'ghee', 'buttermilk', 'milk'])]
        
        if not alternatives:
            alternatives = foods
            
        import random
        # Decision: Smart Swaps can combine two items to meet target carbs (approx. 50% chance for lunch/dinner/snacks)
        if len(alternatives) >= 2 and random.random() > 0.4:
            # Let's construct a combination of two items
            item_a = random.choice(alternatives)
            
            # Select item_b that is different
            item_b_pool = [x for x in alternatives if x['id'] != item_a['id']]
            if item_b_pool:
                item_b = random.choice(item_b_pool)
                
                # We want: (item_a.carbs + item_b.carbs) * mult = target_carbs
                base_carbs = item_a['carbs'] + item_b['carbs']
                mult = target_carbs / max(1.0, base_carbs)
                mult = round(max(0.4, min(4.0, mult)), 1)
                
                result = {
                    "id": item_a['id'],
                    "name": f"{item_a['name']} + {item_b['name']}",
                    "calories": round((item_a['calories'] + item_b['calories']) * mult),
                    "protein": round((item_a['protein'] + item_b['protein']) * mult, 1),
                    "carbs": round(base_carbs * mult, 1),
                    "fats": round((item_a['fats'] + item_b['fats']) * mult, 1),
                    "serving_size": f"{scale_serving_size(item_a['serving_size'], mult)} + {scale_serving_size(item_b['serving_size'], mult)}",
                    "is_veg": 1 if (item_a['is_veg'] == 1 and item_b['is_veg'] == 1) else 0
                }
                
                item_a_enriched = enrich_food_micros(item_a)
                item_b_enriched = enrich_food_micros(item_b)
                result['vitamins'] = f"{item_a_enriched['vitamins']} | {item_b_enriched['vitamins']}"
                result['amino_acids'] = f"{item_a_enriched['amino_acids']} | {item_b_enriched['amino_acids']}"
                
                return jsonify({"success": True, "data": result}), 200

        # Fallback to single item swap
        swap_item = min(alternatives, key=lambda x: abs(x['calories'] - float(target_calories)))
        multiplier = round(float(target_calories) / swap_item['calories'], 1)
        if multiplier < 0.5: multiplier = 0.5
        elif multiplier > 3.0: multiplier = 3.0
        
        result = {
            "id": swap_item['id'],
            "name": swap_item['name'],
            "calories": round(swap_item['calories'] * multiplier),
            "protein": round(swap_item['protein'] * multiplier, 1),
            "carbs": round(swap_item['carbs'] * multiplier, 1),
            "fats": round(swap_item['fats'] * multiplier, 1),
            "serving_size": scale_serving_size(swap_item['serving_size'], multiplier),
            "is_veg": swap_item['is_veg']
        }
        result = enrich_food_micros(result)
        
        return jsonify({"success": True, "data": result}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/chatbot', methods=['POST'])
@app.route('/api/chatbot', methods=['POST'])
def chatbot():
    """Nutrition chatbot assistant answering queries with local database capabilities."""
    data = request.get_json() or {}
    message = data.get('message', '').strip().lower()
    
    if not message:
        return jsonify({"success": False, "error": "Message is required."}), 400
        
    try:
        response_text = ""
        # 1. Check for swap request, e.g. "replace poha with oats"
        if "replace" in message and "with" in message:
            # Parse names
            words = message.split()
            try:
                replace_idx = words.index("replace")
                with_idx = words.index("with")
                food_a_words = words[replace_idx+1:with_idx]
                food_b_words = words[with_idx+1:]
                
                food_a_name = " ".join(food_a_words)
                food_b_name = " ".join(food_b_words)
                
                food_a = find_food_by_name(food_a_name)
                food_b = find_food_by_name(food_b_name)
                
                if food_a and food_b:
                    diff_cal = food_b['calories'] - food_a['calories']
                    diff_prot = food_b['protein'] - food_a['protein']
                    
                    sign_cal = "more" if diff_cal >= 0 else "fewer"
                    sign_prot = "more" if diff_prot >= 0 else "less"
                    
                    response_text = (
                        f"Great swap request! Swapping **{food_a['name']}** with **{food_b['name']}**:\n\n"
                        f"- **{food_a['name']}** ({food_a['serving_size']}): {food_a['calories']} kcal, {food_a['protein']}g protein, {food_a['carbs']}g carbs.\n"
                        f"- **{food_b['name']}** ({food_b['serving_size']}): {food_b['calories']} kcal, {food_b['protein']}g protein, {food_b['carbs']}g carbs.\n\n"
                        f"This swap will give you **{abs(round(diff_cal))} {sign_cal} calories** and "
                        f"**{abs(round(diff_prot, 1))}g {sign_prot} protein**. "
                    )
                    if food_b['protein'] > food_a['protein']:
                        response_text += "This is a higher protein option, which is excellent for weight loss or muscle building!"
                    else:
                        response_text += "Make sure you meet your daily protein targets with your other meals."
                else:
                    missing = []
                    if not food_a: missing.append(food_a_name)
                    if not food_b: missing.append(food_b_name)
                    response_text = f"I couldn't find {' and '.join(missing)} in our nutrition database. Try checking spelling or search in the Food Explorer!"
            except ValueError:
                response_text = "I couldn't parse the swap command. Try formatting it like: *'Replace [food1] with [food2]'*."
                
        # 2. Check for nutritional check, e.g. "can i eat dosa during weight loss?" or "calories in rajma"
        else:
            # Check if any food item in database matches
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM Foods")
            all_foods = [dict(row) for row in cursor.fetchall()]
            conn.close()
            
            matched_food = None
            for food in all_foods:
                if food['name'].lower() in message:
                    matched_food = food
                    break
                    
            if matched_food:
                if "weight loss" in message or "fat loss" in message:
                    if matched_food['calories'] < 150:
                        advice = f"Yes! **{matched_food['name']}** is very diet-friendly with only {matched_food['calories']} kcal per serving. You can definitely include it in your daily budget."
                    elif matched_food['calories'] < 250:
                        advice = f"Yes, you can eat **{matched_food['name']}** ({matched_food['calories']} kcal) during weight loss, but eat in moderation. Make sure to track the portion size so it fits within your deficit!"
                    else:
                        advice = f"You can, but be careful! **{matched_food['name']}** has {matched_food['calories']} kcal. Pair it with high-protein, low-calorie options like dal or fruits to stay full."
                else:
                    advice = f"A single serving of **{matched_food['name']}** ({matched_food['serving_size']}) contains **{matched_food['calories']} calories**, **{matched_food['protein']}g protein**, **{matched_food['carbs']}g carbs**, and **{matched_food['fats']}g fats**."
                    
                response_text = (
                    f"Here is what I found for **{matched_food['name']}**:\n\n"
                    f"- **Serving Size:** {matched_food['serving_size']}\n"
                    f"- **Calories:** {matched_food['calories']} kcal\n"
                    f"- **Macros:** Protein: {matched_food['protein']}g | Carbs: {matched_food['carbs']}g | Fats: {matched_food['fats']}g\n\n"
                    f"{advice}"
                )
            else:
                # 3. FAQ / General responses
                if "hi" in message or "hello" in message or "hey" in message:
                    response_text = (
                        "Hello! I am your Nutritionist assistant chatbot. 😊 I can help you with:\n"
                        "- Explaining macros for Indian foods (e.g. *'calories in idli'*)\n"
                        "- Recommending meal replacements (e.g. *'replace poha with oats'*)\n"
                        "- Advising on weight loss/gain (e.g. *'can I eat paneer for weight loss?'*)\n\n"
                        "How can I assist you with your diet plan today?"
                    )
                elif "diet" in message or "plan" in message:
                    response_text = (
                        "To generate a custom diet plan, please use the **Diet Calculator** at the top of the page. "
                        "I will formulate targets for calories, protein, and water, and recommend breakfast, lunch, snack, and dinner combinations matching those goals!"
                    )
                elif "water" in message:
                    response_text = (
                        "Staying hydrated is key! A good formula is **35ml of water per kg of body weight**. "
                        "For example, at 70kg, you should aim for about 2.4 liters (10 cups) of water per day."
                    )
                elif "protein" in message:
                    response_text = (
                        "Protein is essential for muscle retention and satiety! For general health, aim for **1g per kg of body weight**. "
                        "For weight loss, aim for **1.2-1.6g/kg**, and for muscle building, strive for **1.8-2.2g/kg**."
                    )
                else:
                    response_text = (
                        "I'm here to help with your nutrition questions! You can query me about Indian foods in our database "
                        "(e.g., *dosa, idli, rajma, paneer, sprouts*), ask for swaps, or check calorie targets. "
                        "Try asking *'Can I eat paneer during weight loss?'* or *'Replace poha with oats'*!"
                    )
                    
        return jsonify({"success": True, "reply": response_text}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == '__main__':
    # Initialize the database file if it doesn't exist
    if not os.path.exists(DB_PATH):
        from database import init_db
        init_db()
    
    # Run the server on port 5001
    app.run(host='0.0.0.0', port=5001, debug=True)
