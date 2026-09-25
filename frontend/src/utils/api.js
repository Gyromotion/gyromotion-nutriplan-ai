const BASE_URL = 'http://localhost:5001/api';

const scaleServingSize = (servingSize, multiplier) => {
  if (multiplier === 1.0) return servingSize;

  // 12-15 nos (28g)
  let rangeMatch = servingSize.match(/^(\d+)-(\d+)\s*([a-zA-Z\s]+)\s*\((\d+)\s*(g|ml|oz)\)$/i);
  if (rangeMatch) {
    let start = Math.round(parseInt(rangeMatch[1]) * multiplier);
    let end = Math.round(parseInt(rangeMatch[2]) * multiplier);
    let unit = rangeMatch[3].trim();
    let weight = Math.round(parseInt(rangeMatch[4]) * multiplier);
    let weightUnit = rangeMatch[5];
    return `${start}-${end} ${unit} (${weight}${weightUnit})`;
  }

  // 2 Chapatis (57g)
  let countWeightMatch = servingSize.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z\s\.\-]+)\s*\((\d+)\s*(g|ml|oz)\)$/i);
  if (countWeightMatch) {
    let count = parseFloat(countWeightMatch[1]) * multiplier;
    let countStr = count % 1 !== 0 ? count.toFixed(1).replace(/\.?0+$/, '') : `${Math.round(count)}`;
    let unit = countWeightMatch[2].trim();
    let weight = Math.round(parseInt(countWeightMatch[3]) * multiplier);
    let weightUnit = countWeightMatch[4];
    return `${countStr}x ${unit} (${weight}${weightUnit})`;
  }

  // 100g or 150ml
  let weightMatch = servingSize.match(/^(\d+)\s*(g|ml|oz)$/i);
  if (weightMatch) {
    let weight = Math.round(parseInt(weightMatch[1]) * multiplier);
    let weightUnit = weightMatch[2];
    return `${weight}${weightUnit}`;
  }

  // 2 Eggs or 1 Dosa
  let countUnitMatch = servingSize.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z\s\.\-]+)$/i);
  if (countUnitMatch) {
    let count = parseFloat(countUnitMatch[1]) * multiplier;
    let countStr = count % 1 !== 0 ? count.toFixed(1).replace(/\.?0+$/, '') : `${Math.round(count)}`;
    let unit = countUnitMatch[2].trim();
    return `${countStr}x ${unit}`;
  }

  let multStr = multiplier % 1 !== 0 ? multiplier.toFixed(1).replace(/\.?0+$/, '') : `${Math.round(multiplier)}`;
  return `${multStr}x ${servingSize}`;
};

// Native calculations fallback in case API server is offline
const calculateBMILocal = (weight, height) => {
  const heightM = height / 100;
  const bmi = parseFloat((weight / (heightM * heightM)).toFixed(2));
  let category = "Normal";
  let description = "You have a healthy body weight. Keep up the good work!";
  
  if (bmi < 18.5) {
    category = "Underweight";
    description = "You have a lower body weight than normal. Consider increasing calorie intake.";
  } else if (bmi >= 25 && bmi < 30) {
    category = "Overweight";
    description = "You are slightly overweight. A balanced diet and regular exercise are recommended.";
  } else if (bmi >= 30) {
    category = "Obese";
    description = "You are in the obese range. We recommend counseling with a nutritionist and tailored workouts.";
  }
  
  return { bmi, category, description };
};

const calculateBMRLocal = (age, gender, weight, height, activityLevel) => {
  let bmr = 0;
  if (gender.toLowerCase() === 'male') {
    bmr = 66 + (13.7 * weight) + (5.0 * height) - (6.8 * age);
  } else {
    bmr = 655 + (9.6 * weight) + (1.8 * height) - (4.7 * age);
  }
  
  const multipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    very_active: 1.725,
    extra_active: 1.9
  };
  
  const mult = multipliers[activityLevel] || 1.375;
  const tdee = bmr * mult;
  return { bmr: Math.round(bmr), tdee: Math.round(tdee) };
};

const predictWeightLocal = (weight, goal) => {
  let rate = 0;
  if (goal.includes('aggressive')) rate = -0.8;
  else if (goal.includes('loss')) rate = -0.5;
  else if (goal.includes('muscle')) rate = 0.25;
  else if (goal.includes('gain')) rate = 0.4;
  
  const projection = [];
  for (let week = 0; week <= 12; week++) {
    projection.push({
      week: `Week ${week}`,
      weight: parseFloat((weight + (rate * week)).toFixed(1))
    });
  }
  
  return {
    projection,
    expected_three_months: parseFloat((weight + (rate * 12)).toFixed(1))
  };
};

const localFoods = {
  breakfast: [
    { name: "Idli", calories: 130, protein: 4.6, carbs: 27.6, fats: 0.2, serving_size: "2 Idlis (136g)", is_veg: 1 },
    { name: "Plain Dosa", calories: 216, protein: 4.1, carbs: 28.2, fats: 9.7, serving_size: "2 Dosas (100g)", is_veg: 1 },
    { name: "Poha (Beaten Rice)", calories: 114, protein: 1.8, carbs: 26.3, fats: 0.2, serving_size: "1 cup (30g)", is_veg: 1 },
    { name: "Wheat Uppuma", calories: 163, protein: 3.8, carbs: 24.7, fats: 5.4, serving_size: "1 plate (128g)", is_veg: 1 },
    { name: "Oats / Oatmeal", calories: 101, protein: 3.6, carbs: 17.6, fats: 1.8, serving_size: "1 cup (25g)", is_veg: 1 },
    { name: "Rava Idli", calories: 212, protein: 5.0, carbs: 28.7, fats: 8.5, serving_size: "2 Idlis (114g)", is_veg: 1 },
    { name: "Ragi Porridge (Calcium Rich)", calories: 120, protein: 3.5, carbs: 22.0, fats: 1.5, serving_size: "1 bowl (200g)", is_veg: 1 },
    { name: "Ragi Roti (Calcium Rich)", calories: 150, protein: 4.0, carbs: 30.0, fats: 1.5, serving_size: "1 piece (60g)", is_veg: 1 },
    { name: "Egg Bhurji", calories: 210, protein: 14.0, carbs: 4.0, fats: 15.0, serving_size: "1 plate (2 Eggs)", is_veg: 0 },
    { name: "Boiled Eggs", calories: 155, protein: 13.0, carbs: 1.1, fats: 11.0, serving_size: "2 Eggs", is_veg: 0 }
  ],
  lunch: [
    { name: "Chapati", calories: 193, protein: 5.0, carbs: 30.8, fats: 5.5, serving_size: "2 Chapatis (57g)", is_veg: 1 },
    { name: "Dal", calories: 150, protein: 7.0, carbs: 22.0, fats: 3.5, serving_size: "1 bowl (150g)", is_veg: 1 },
    { name: "Rajmah (Kidney Beans)", calories: 102, protein: 4.7, carbs: 10.7, fats: 3.4, serving_size: "100g", is_veg: 1 },
    { name: "Chole (Chickpeas)", calories: 74, protein: 4.3, carbs: 3.3, fats: 4.1, serving_size: "100g", is_veg: 1 },
    { name: "Rice (Plain)", calories: 198, protein: 4.0, carbs: 46.9, fats: 0.3, serving_size: "1 plate (168g)", is_veg: 1 },
    { name: "Palak Paneer", calories: 380, protein: 14.0, carbs: 46.0, fats: 15.0, serving_size: "262g", is_veg: 1 },
    { name: "Khichdi", calories: 270, protein: 7.0, carbs: 48.0, fats: 5.0, serving_size: "1 bowl (200g)", is_veg: 1 },
    { name: "Sambhar", calories: 110, protein: 4.0, carbs: 18.0, fats: 2.0, serving_size: "1 bowl (150g)", is_veg: 1 },
    { name: "Mixed Vegetable Curry", calories: 134, protein: 4.3, carbs: 15.6, fats: 6.0, serving_size: "127g", is_veg: 1 },
    { name: "Curd Rice", calories: 221, protein: 6.0, carbs: 33.3, fats: 7.0, serving_size: "1 plate (253g)", is_veg: 1 },
    { name: "Chicken Curry", calories: 240, protein: 26.0, carbs: 6.0, fats: 12.0, serving_size: "1 bowl (150g)", is_veg: 0 },
    { name: "Fish Curry", calories: 190, protein: 22.0, carbs: 4.0, fats: 9.0, serving_size: "1 bowl (150g)", is_veg: 0 },
    { name: "Mutton Curry", calories: 310, protein: 24.0, carbs: 5.0, fats: 22.0, serving_size: "1 bowl (150g)", is_veg: 0 },
    { name: "Tandoori Chicken", calories: 220, protein: 30.0, carbs: 3.0, fats: 9.0, serving_size: "1 portion (150g)", is_veg: 0 }
  ],
  snacks: [
    { name: "Roasted Chana", calories: 110, protein: 6.0, carbs: 18.0, fats: 2.0, serving_size: "1 cup (30g)", is_veg: 1 },
    { name: "Apple", calories: 42, protein: 0.2, carbs: 9.9, fats: 0.3, serving_size: "1 medium (66g)", is_veg: 1 },
    { name: "Banana", calories: 99, protein: 1.2, carbs: 23.0, fats: 0.2, serving_size: "1 large (100g)", is_veg: 1 },
    { name: "Almonds", calories: 186, protein: 5.9, carbs: 3.0, fats: 16.7, serving_size: "12-15 nos (28g)", is_veg: 1 },
    { name: "Walnuts", calories: 195, protein: 4.4, carbs: 3.1, fats: 18.3, serving_size: "1 oz (28g)", is_veg: 1 },
    { name: "Sprouts Salad", calories: 120, protein: 8.0, carbs: 20.0, fats: 0.5, serving_size: "1 cup (100g)", is_veg: 1 },
    { name: "Green Tea (Antioxidants)", calories: 2, protein: 0.0, carbs: 0.5, fats: 0.0, serving_size: "1 cup (200ml)", is_veg: 1 },
    { name: "Tea (with Milk)", calories: 64, protein: 0.7, carbs: 13.5, fats: 0.8, serving_size: "1 cup (150ml)", is_veg: 1 },
    { name: "Curd (Dahi)", calories: 100, protein: 5.0, carbs: 6.0, fats: 5.0, serving_size: "1 bowl (150g)", is_veg: 1 },
    { name: "Cow Milk (Calcium Rich)", calories: 120, protein: 6.0, carbs: 9.0, fats: 4.5, serving_size: "1 glass (200ml)", is_veg: 1 },
    { name: "Ghee", calories: 45, protein: 0.0, carbs: 0.0, fats: 5.0, serving_size: "1 tsp (5g)", is_veg: 1 }
  ]
};

const generateWeeklyExerciseChartLocal = (goal, age, equipment, injuryType) => {
  const ageVal = parseInt(age) || 30;
  let intensity = "Moderate";
  let duration = "45 mins";
  if (ageVal > 60) {
    intensity = "Basic";
    duration = "30-45 mins";
  } else if (ageVal > 45) {
    intensity = "Moderate";
    duration = "45 mins";
  } else {
    intensity = (goal.includes("muscle") || goal.includes("sports")) ? "Advanced" : "Moderate";
    duration = "45-60 mins";
  }

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const weeklyChart = {};

  const warmupsPool = [
    { name: "Arm Circles", category: "warmup", desc: "Stand with feet shoulder-width, extend arms straight out, and rotate them in circles.", dumbbell_alt: "N/A", band_alt: "N/A" },
    { name: "Neck Rolls", category: "warmup", desc: "Slowly rotate your neck clockwise, then counter-clockwise to relieve tension.", dumbbell_alt: "N/A", band_alt: "N/A" },
    { name: "Torso Twists", category: "warmup", desc: "Twist your upper body side to side, letting arms swing loosely.", dumbbell_alt: "N/A", band_alt: "N/A" },
    { name: "Hip Circles", category: "warmup", desc: "Place hands on hips, rotate hips in large circles clockwise and counter-clockwise.", dumbbell_alt: "N/A", band_alt: "N/A" },
    { name: "Dynamic Leg Swings", category: "warmup", desc: "Hold a wall, swing one leg forward and backward in a controlled manner.", dumbbell_alt: "N/A", band_alt: "N/A" },
    { name: "Shoulder Rolls", category: "warmup", desc: "Lift shoulders up toward ears, roll them backward in circles, and lower them.", dumbbell_alt: "Light dumbbell shrugs", band_alt: "Banded shrugs" },
    { name: "Ankle Rotations", category: "warmup", desc: "Lift one foot off the ground and rotate the ankle in circular motions.", dumbbell_alt: "N/A", band_alt: "N/A" },
    { name: "Wrist Rotations", category: "warmup", desc: "Clasp hands together and rotate wrists to warm up the joints.", dumbbell_alt: "N/A", band_alt: "N/A" }
  ];

  const corePool = [
    { name: "Standard Plank", category: "strength", desc: "Hold straight body line resting on hands/forearms and toes. Squeeze core.", dumbbell_alt: "Weighted Plank", band_alt: "N/A" },
    { name: "Bird-Dog Pose", category: "mobility", desc: "On hands and knees, extend opposite arm and leg straight out.", dumbbell_alt: "N/A", band_alt: "N/A" },
    { name: "Deadbug", category: "strength", desc: "Lie on back, arms up, knees bent. Extend opposite arm/leg, return, repeat.", dumbbell_alt: "Weighted Deadbug", band_alt: "N/A" },
    { name: "Side Plank", category: "strength", desc: "Lie on side, lift hips up, supporting weight on forearm and feet.", dumbbell_alt: "N/A", band_alt: "N/A" },
    { name: "Pelvic Tilts", category: "recovery", desc: "Lie on back, knees bent, flatten lower back against floor, tilt pelvis.", dumbbell_alt: "N/A", band_alt: "N/A" }
  ];

  const stretchesPool = [
    { name: "Quadriceps Stretch", category: "mobility", desc: "Stand on one leg, pull other foot to glute. Hold for 30s.", dumbbell_alt: "N/A", band_alt: "Banded Assisted Quad Stretch" },
    { name: "Hamstring Stretch", category: "mobility", desc: "Sit on floor, extend one leg, reach forward toward toes. Hold for 30s.", dumbbell_alt: "N/A", band_alt: "Banded Assisted Hamstring Stretch" },
    { name: "Cobra Stretch", category: "mobility", desc: "Lie on stomach, press hands down, lift chest, arch back slightly.", dumbbell_alt: "N/A", band_alt: "N/A" },
    { name: "Seated Spinal Twist", category: "mobility", desc: "Sit cross-legged, twist torso to one side, looking over shoulder.", dumbbell_alt: "N/A", band_alt: "N/A" },
    { name: "Chest Opener Stretch", category: "mobility", desc: "Clasp hands behind back, squeeze shoulder blades, lift chest.", dumbbell_alt: "N/A", band_alt: "N/A" },
    { name: "Posterior Delt Stretch", category: "mobility", desc: "Pull one arm across chest, hold with opposite arm. Hold for 30s.", dumbbell_alt: "N/A", band_alt: "N/A" },
    { name: "Child's Pose", category: "mobility", desc: "Sit back on heels, reach arms forward on floor, forehead down.", dumbbell_alt: "N/A", band_alt: "N/A" }
  ];

  const inj = (injuryType || 'none').toLowerCase();

  days.forEach(day => {
    const exercises = [];

    // 1. Warmups (2)
    if (day === "Monday" || day === "Friday") {
      exercises.push(warmupsPool[4], warmupsPool[3]);
    } else if (day === "Wednesday" || day === "Saturday") {
      exercises.push(warmupsPool[0], warmupsPool[5]);
    } else {
      exercises.push(warmupsPool[1], warmupsPool[2]);
    }

    // 2. Primary (4)
    let primary = [];
    if (day === "Monday") {
      if (inj.includes('acl') || inj.includes('knee')) {
        primary = [
          { name: "Glute Bridges", category: "strength", desc: "Lie on back, knees bent, lift hips high, squeezing glutes.", dumbbell_alt: "Weighted Glute Bridges (hold dumbbell on hips)", band_alt: "Banded Glute Bridges (loop band above knees)" },
          { name: "Seated Leg Extensions", category: "strength", desc: "Sit on a chair, slowly extend one leg straight out, squeeze quad, lower.", dumbbell_alt: "Seated Extensions (clamp light dumbbell between feet)", band_alt: "Banded Leg Extensions (anchor band under chair)" },
          { name: "Straight Leg Raises", category: "strength", desc: "Lie flat, lift one leg to 45 degrees, keeping it straight. Hold, lower.", dumbbell_alt: "Ankle Weighted Leg Raises", band_alt: "Banded Leg Raises (band around ankles)" },
          { name: "Calf Raises", category: "strength", desc: "Stand on a flat surface, raise onto toes, squeeze calves, lower slowly.", dumbbell_alt: "Dumbbell Calf Raises (hold at sides)", band_alt: "Banded Calf Raises" }
        ];
      } else {
        primary = [
          { name: "Bodyweight Squats", category: "strength", desc: "Stand with feet shoulder-width, lower hips back and down, keeping knees behind toes.", dumbbell_alt: "Dumbbell Goblet Squats (hold one dumbbell at chest)", band_alt: "Banded Squats (stand on band, hold handles at shoulders)" },
          { name: "Forward Lunges", category: "strength", desc: "Step forward with one foot, lower hips until both knees are bent at 90 degrees.", dumbbell_alt: "Dumbbell Lunges (hold dumbbells at sides)", band_alt: "Banded Lunges" },
          { name: "Glute Bridges", category: "strength", desc: "Lie on back, knees bent, lift hips high, squeezing glutes.", dumbbell_alt: "Weighted Glute Bridges", band_alt: "Banded Glute Bridges" },
          { name: "Calf Raises", category: "strength", desc: "Stand on a flat surface, raise onto toes, squeeze calves, lower slowly.", dumbbell_alt: "Dumbbell Calf Raises", band_alt: "Banded Calf Raises" }
        ];
      }
    } else if (day === "Tuesday") {
      if (inj.includes('acl') || inj.includes('knee')) {
        primary = [
          { name: "Stationary Cycling", category: "cardio", desc: "Low-impact indoor pedaling at a moderate pace to promote knee mobility.", dumbbell_alt: "N/A (stick to stationary cycling)", band_alt: "Banded Hamstring Curls (lying down)" },
          { name: "Arm Ergometer / Upper Body Cardio", category: "cardio", desc: "Pedaling with arms to maintain cardiovascular output without knee strain.", dumbbell_alt: "Light Dumbbell Shadow Boxing", band_alt: "Banded Woodchops" },
          { name: "Shadow Boxing", category: "cardio", desc: "Throw controlled punches in the air at a fast pace while shuffling feet.", dumbbell_alt: "Light Dumbbell Punches", band_alt: "Banded Punches" },
          { name: "Low-Impact Swimming / Water Walking", category: "cardio", desc: "Walk briskly in chest-deep water to reduce joint load while building cardio.", dumbbell_alt: "N/A", band_alt: "N/A" }
        ];
      } else if (inj.includes('back')) {
        primary = [
          { name: "Brisk Flat Walking", category: "cardio", desc: "Walk on a flat, even surface at a brisk pace. Keep spine neutral.", dumbbell_alt: "Farmer's Walk (very light dumbbells)", band_alt: "Banded Walkouts" },
          { name: "Shadow Boxing", category: "cardio", desc: "Throw controlled punches in the air while keeping core locked and stable.", dumbbell_alt: "Light Dumbbell Punches", band_alt: "Banded Punches" },
          { name: "Arm Ergometer", category: "cardio", desc: "Pedaling with arms to maintain cardiovascular output.", dumbbell_alt: "N/A", band_alt: "N/A" },
          { name: "Brisk Walking on Treadmill (Flat)", category: "cardio", desc: "Maintain a steady brisk pace to support circulation without spinal impact.", dumbbell_alt: "N/A", band_alt: "N/A" }
        ];
      } else {
        primary = [
          { name: "Jogging / Outdoor Running", category: "cardio", desc: "Steady-state run at moderate intensity.", dumbbell_alt: "Weighted Carry (Farmer's walk)", band_alt: "Banded Running-in-place" },
          { name: "Burpees", category: "cardio", desc: "Drop to plank, perform push-up, jump back to feet and explode upwards.", dumbbell_alt: "Dumbbell Devil Press (light)", band_alt: "Banded Burpees" },
          { name: "Jumping Jacks", category: "cardio", desc: "Jump feet wide while raising arms, then jump back to start.", dumbbell_alt: "Light Dumbbell Press Jacks", band_alt: "Banded Pull-Jacks" },
          { name: "High Knees", category: "cardio", desc: "Run in place, lifting knees high to chest level dynamically.", dumbbell_alt: "N/A", band_alt: "N/A" }
        ];
      }
    } else if (day === "Wednesday") {
      if (inj.includes('shoulder')) {
        primary = [
          { name: "Bicep Curls", category: "strength", desc: "Keep elbows close to torso, curl weights while contracting biceps.", dumbbell_alt: "Dumbbell Curls", band_alt: "Banded Curls (stand on band)" },
          { name: "Hammer Curls", category: "strength", desc: "Curl weights with palms facing each other to target brachialis.", dumbbell_alt: "Dumbbell Hammer Curls", band_alt: "Banded Hammer Curls" },
          { name: "Wall Push-ups", category: "strength", desc: "Push-ups performed standing against a wall to reduce shoulder load.", dumbbell_alt: "Incline Dumbbell Press (very light, high incline)", band_alt: "Light Band Chest Press" },
          { name: "Seated Band Rows", category: "strength", desc: "Sit tall on floor, loop band around feet, pull handles to chest.", dumbbell_alt: "Seated Dumbbell Rows (chest supported)", band_alt: "Banded Seated Row" }
        ];
      } else {
        primary = [
          { name: "Standard Push-ups", category: "strength", desc: "Keep body in straight line, lower chest to floor, push back up.", dumbbell_alt: "Dumbbell Chest Press (lying on floor)", band_alt: "Banded Push-ups (band wrapped across upper back)" },
          { name: "Dumbbell Rows", category: "strength", desc: "Hinge forward at hips, pull dumbbell up to chest, keeping elbow close.", dumbbell_alt: "Dumbbell Row", band_alt: "Banded Row (anchored in front)" },
          { name: "Dumbbell Overhead Shoulder Press", category: "strength", desc: "Press dumbbells upwards from shoulder height until arms are straight.", dumbbell_alt: "Dumbbell Shoulder Press", band_alt: "Banded Overhead Press (stand on band)" },
          { name: "Tricep dips on chair", category: "strength", desc: "Place hands on edge of chair, slide hips off, bend elbows to lower body, push back up.", dumbbell_alt: "Dumbbell Kickbacks", band_alt: "Banded Tricep Extensions" }
        ];
      }
    } else if (day === "Thursday") {
      primary = [
        { name: "Cat-Cow Stretch", category: "mobility", desc: "On hands and knees, slowly arch your back (cow) then round it (cat).", dumbbell_alt: "N/A", band_alt: "N/A" },
        { name: "Bird-Dog Pose", category: "mobility", desc: "Extend opposite arm and leg straight out, keeping hips square and spine flat.", dumbbell_alt: "N/A", band_alt: "N/A" },
        { name: "Child's Pose", category: "mobility", desc: "Kneel, sit back on heels, and reach arms forward on floor, lowering forehead.", dumbbell_alt: "N/A", band_alt: "N/A" },
        { name: "Spinal Twist Stretch", category: "mobility", desc: "Lie on back, bring one knee across body to floor, stretching lower back.", dumbbell_alt: "N/A", band_alt: "N/A" }
      ];
    } else if (day === "Friday") {
      if (inj.includes('acl') || inj.includes('knee')) {
        primary = [
          { name: "Glute Bridges", category: "strength", desc: "Lie on back, knees bent, lift hips high, squeezing glutes.", dumbbell_alt: "Weighted Glute Bridges", band_alt: "Banded Glute Bridges" },
          { name: "Seated Band Rows", category: "strength", desc: "Sit tall on floor, loop band around feet, pull handles to chest.", dumbbell_alt: "Seated Dumbbell Rows", band_alt: "Banded Seated Row" },
          { name: "Straight Leg Raises", category: "strength", desc: "Lie flat, lift one leg to 45 degrees, keeping it straight. Hold, lower.", dumbbell_alt: "Ankle Weighted Leg Raises", band_alt: "Banded Leg Raises" },
          { name: "Wall Push-ups", category: "strength", desc: "Push-ups performed standing against a wall to reduce joint load.", dumbbell_alt: "Incline Dumbbell Press (very light)", band_alt: "Light Band Chest Press" }
        ];
      } else if (inj.includes('back')) {
        primary = [
          { name: "Wall Push-ups", category: "strength", desc: "Push-ups performed standing against a wall to reduce spinal load.", dumbbell_alt: "Incline Dumbbell Press (very light)", band_alt: "Light Band Chest Press" },
          { name: "Glute Bridges", category: "strength", desc: "Lie on back, knees bent, lift hips high, squeezing glutes.", dumbbell_alt: "Weighted Glute Bridges", band_alt: "Banded Glute Bridges" },
          { name: "Seated Band Rows", category: "strength", desc: "Sit tall on floor, loop band around feet, pull handles to chest.", dumbbell_alt: "Seated Dumbbell Rows (chest supported)", band_alt: "Banded Seated Row" },
          { name: "Plank (Forearms)", category: "strength", desc: "Hold straight body line resting on forearms and toes. Squeeze core.", dumbbell_alt: "N/A", band_alt: "N/A" }
        ];
      } else {
        primary = [
          { name: "Dumbbell/Kettlebell Swings", category: "strength", desc: "Hinge at hips, swing weight from between legs to shoulder height.", dumbbell_alt: "Dumbbell Swings", band_alt: "Banded Pull-Throughs" },
          { name: "Standard Push-ups", category: "strength", desc: "Keep body in straight line, lower chest to floor, push back up.", dumbbell_alt: "Dumbbell Chest Press (lying on floor)", band_alt: "Banded Push-ups" },
          { name: "Bodyweight Squats", category: "strength", desc: "Stand with feet shoulder-width, lower hips back and down.", dumbbell_alt: "Dumbbell Goblet Squats", band_alt: "Banded Squats" },
          { name: "Dumbbell Rows", category: "strength", desc: "Hinge forward at hips, pull dumbbell up to chest.", dumbbell_alt: "Dumbbell Row", band_alt: "Banded Row" }
        ];
      }
    } else if (day === "Saturday") {
      if (inj.includes('acl') || inj.includes('knee')) {
        primary = [
          { name: "Steady Outdoor Walk", category: "cardio", desc: "Walk outdoors at a comfortable pace. Aim for fresh air.", dumbbell_alt: "N/A", band_alt: "N/A" },
          { name: "Arm Ergometer / Upper Body Cardio", category: "cardio", desc: "Pedaling with arms to maintain cardiovascular output without knee strain.", dumbbell_alt: "Light Dumbbell Shadow Boxing", band_alt: "Banded Woodchops" },
          { name: "Shadow Boxing", category: "cardio", desc: "Throw controlled punches in the air at a fast pace while shuffling feet.", dumbbell_alt: "Light Dumbbell Punches", band_alt: "Banded Punches" },
          { name: "Low-Impact Swimming / Water Walking", category: "cardio", desc: "Walk briskly in chest-deep water to reduce joint load.", dumbbell_alt: "N/A", band_alt: "N/A" }
        ];
      } else {
        primary = [
          { name: "Steady Outdoor Walk / Light Jog", category: "cardio", desc: "Walk outdoors at a comfortable pace. Combine with light jogging intervals.", dumbbell_alt: "N/A", band_alt: "N/A" },
          { name: "Jumping Jacks", category: "cardio", desc: "Jump feet wide while raising arms, then jump back.", dumbbell_alt: "Light Dumbbell Press Jacks", band_alt: "Banded Pull-Jacks" },
          { name: "Side Shuffles", category: "cardio", desc: "Shuffle side-to-side in a low stance, staying on the balls of your feet.", dumbbell_alt: "N/A", band_alt: "N/A" },
          { name: "Shadow Boxing", category: "cardio", desc: "Throw controlled punches in the air while shuffling feet.", dumbbell_alt: "Light Dumbbell Punches", band_alt: "Banded Punches" }
        ];
      }
    } else {
      primary = [
        { name: "Full Body Mobility Routine", category: "recovery", desc: "Rotate joints (wrists, ankles, neck, hips) and practice deep breathing.", dumbbell_alt: "N/A", band_alt: "N/A" },
        { name: "Pelvic Tilts", category: "recovery", desc: "Lie on back, knees bent, flatten lower back against floor, squeeze glutes.", dumbbell_alt: "N/A", band_alt: "N/A" },
        { name: "Glute Bridge hold", category: "recovery", desc: "Lie on back, lift hips and hold for 10-15 seconds. Squeeze glutes.", dumbbell_alt: "N/A", band_alt: "N/A" },
        { name: "Sphinx Pose", category: "recovery", desc: "Lie on stomach, prop upper body up on forearms, stretch abdominal wall.", dumbbell_alt: "N/A", band_alt: "N/A" }
      ];
    }

    primary.forEach(ex => exercises.push(ex));

    // 3. Core (2)
    if (inj.includes('back')) {
      exercises.push(corePool[1], corePool[4]);
    } else if (inj.includes('shoulder')) {
      exercises.push(corePool[2], corePool[4]);
    } else {
      exercises.push(corePool[0], corePool[2]);
    }

    // 4. Cool-down & Stretching (2)
    if (inj.includes('shoulder')) {
      exercises.push(stretchesPool[0], stretchesPool[1]);
    } else if (inj.includes('back')) {
      exercises.push(stretchesPool[6], stretchesPool[1]);
    } else if (inj.includes('acl') || inj.includes('knee')) {
      exercises.push(stretchesPool[4], stretchesPool[5]);
    } else {
      exercises.push(stretchesPool[0], stretchesPool[1]);
    }

    const dayIntensity = day === "Sunday" ? "Light" : intensity;
    const dayDuration = day === "Sunday" ? "20-30 mins" : duration;
    
    weeklyChart[day] = {
      workout: day === "Sunday" ? "Rest & Active Recovery" : (day === "Monday" ? "Lower Body" : (day === "Tuesday" ? "Cardio & Conditioning" : (day === "Wednesday" ? "Upper Body Strength" : (day === "Thursday" ? "Spine & Joint Mobility" : (day === "Friday" ? "Full Body Conditioning" : "Aerobic Cardio"))))),
      exercises,
      intensity: dayIntensity,
      duration: dayDuration
    };
  });

  return weeklyChart;
};

// Helper to enrich food items with vitamins and amino acids local
const enrichFoodMicros = (foodItem) => {
  const nameL = foodItem.name.toLowerCase();
  
  // Defaults
  let vitamins = "Vitamin B-complex";
  let aminoAcids = "Glutamic Acid, Aspartic Acid";
  
  // 1. Cereals & Grains
  if (['idli', 'dosa', 'rice', 'chapati', 'roti', 'paratha', 'jowar', 'bajra', 'maize', 'poha', 'uppuma', 'upma', 'oats', 'porridge', 'bread', 'bun', 'puffed rice', 'khichdi', 'pulao'].some(x => nameL.includes(x))) {
    vitamins = "Vitamin B1, B2, B3, B9, Iron, Magnesium";
    aminoAcids = "Glutamic Acid, Proline, Aspartic Acid (Incomplete protein)";
    if (nameL.includes('ragi')) {
      vitamins = "Calcium, Vitamin B1, B2, B6, Iron, Magnesium";
      aminoAcids = "Methionine, Valine, Glutamic Acid (Rich amino profile)";
    } else if (nameL.includes('bajra')) {
      vitamins = "Iron, Zinc, Vitamin B3, B9, Magnesium";
      aminoAcids = "Leucine, Isoleucine, Glutamic Acid";
    }
  }
  // 2. Dals & Pulses
  else if (['dal', 'dhal', 'rajmah', 'kidney beans', 'chole', 'chana', 'chickpeas', 'sprouts', 'lentil', 'makhani'].some(x => nameL.includes(x))) {
    vitamins = "Vitamin B9 (Folate), B1, B6, Iron, Zinc, Potassium";
    aminoAcids = "Lysine, Threonine, Valine, Isoleucine, Leucine (Pairs with grains for complete protein)";
  }
  // 3. Dairy
  else if (['milk', 'curd', 'dahi', 'paneer', 'cheese', 'buttermilk', 'chass'].some(x => nameL.includes(x))) {
    vitamins = "Vitamin B12, B2, Vitamin D, Vitamin A, Calcium, Phosphorus";
    aminoAcids = "Leucine, Lysine, Isoleucine, Valine, Methionine (Complete protein, high BCAAs)";
  }
  // 4. Vegetables
  else if (['curry', 'aloo', 'baigan', 'bhindi', 'okra', 'cabbage', 'gobi', 'kaddu', 'pumpkin', 'paneer palak', 'palak', 'spinach', 'sarson', 'saag', 'veg', 'vegetable', 'salad', 'cucumber', 'tomato', 'carrot', 'beetroot'].some(x => nameL.includes(x))) {
    vitamins = "Vitamin A, Vitamin C, Vitamin K, Folate (B9), Iron, Potassium";
    aminoAcids = "Arginine, Glutamic Acid, Aspartic Acid (Traces)";
    if (nameL.includes('spinach') || nameL.includes('palak') || nameL.includes('saag')) {
      vitamins = "Iron, Calcium, Vitamin A, Vitamin C, Vitamin K, Folate";
    }
  }
  // 5. Fruits & Sweet Snacks
  else if (['apple', 'banana', 'dates', 'figs', 'grapes', 'guava', 'orange', 'pineapple', 'amla'].some(x => nameL.includes(x))) {
    vitamins = "Vitamin C, Vitamin A, Vitamin B6, Potassium, Magnesium";
    aminoAcids = "Alanine, Aspartic Acid, Arginine (Traces)";
    if (nameL.includes('orange') || nameL.includes('amla') || nameL.includes('guava')) {
      vitamins = "Vitamin C (High Antioxidant), Vitamin A, Potassium";
    } else if (nameL.includes('banana')) {
      vitamins = "Potassium (High), Vitamin B6, Vitamin C";
    } else if (nameL.includes('dates') || nameL.includes('figs')) {
      vitamins = "Iron, Potassium, Vitamin B6, Magnesium";
    }
  }
  // 6. Nuts
  else if (['almonds', 'cashew', 'walnut', 'groundnut', 'nuts'].some(x => nameL.includes(x))) {
    vitamins = "Vitamin E, Vitamin B6, Magnesium, Zinc, Copper";
    aminoAcids = "Arginine (High), Glutamic Acid, Leucine, Valine (Rich healthy fats)";
  }
  // 7. Non-Veg
  else if (['egg', 'chicken', 'fish', 'mutton', 'prawn', 'biryani', 'tandoori'].some(x => nameL.includes(x))) {
    vitamins = "Vitamin B12, Vitamin D, Vitamin B6, Selenium, Zinc, Iron";
    aminoAcids = "Lysine, Leucine, Isoleucine, Valine, Methionine (All 9 essential amino acids - Complete protein)";
    if (nameL.includes('fish')) {
      vitamins = "Omega-3 Fatty Acids, Vitamin D, Vitamin B12, Selenium";
    }
  }
  // 8. Fats & Oils
  else if (nameL.includes('ghee') || nameL.includes('butter')) {
    vitamins = "Vitamin A, E, K (Fat-soluble vitamins)";
    aminoAcids = "None (Pure fat source)";
  }

  return {
    ...foodItem,
    vitamins,
    amino_acids: aminoAcids
  };
};

const generateMedicalTipLocal = (medicalHistory, surgicalHistory, hormonalDisturbance, physiologicalCondition, nutritionalDeficiency) => {
  const medHist = (medicalHistory || '').toLowerCase();
  const surgHist = (surgicalHistory || '').toLowerCase();
  const hormonal = (hormonalDisturbance || '').toLowerCase();
  const phys = (physiologicalCondition || '').toLowerCase();
  const defic = (nutritionalDeficiency || '').toLowerCase();
  
  const tips = [];
  
  // 1. Diabetes or PCOS
  if (['diabetes', 'diabetic', 'sugar'].some(x => medHist.includes(x)) || ['pcos', 'pcod'].some(x => hormonal.includes(x))) {
    tips.push("you have Diabetes/PCOS condition, therefore you should include more of Vitamin B-complex, Magnesium, and low-glycemic fiber containing food which includes Ragi, Oats, Sprouts, Roasted Chana, and Spinach.");
  }
  // 2. Hypertension / BP
  if (['hypertension', 'bp', 'blood pressure'].some(x => medHist.includes(x))) {
    tips.push("you have Hypertension condition, therefore you should include more of Potassium and Magnesium containing food which includes Banana, Orange, Apples, Spinach (Palak), Almonds, and Walnuts.");
  }
  // 3. Thyroid
  if (medHist.includes('thyroid') || hormonal.includes('thyroid')) {
    tips.push("you have a Thyroid condition, therefore you should include more of Selenium, Zinc, and Vitamin D containing food which includes Almonds, Sprouts, Eggs, Fish, Lentils, and Paneer.");
  }
  // 4. Surgical Recovery
  if (surgHist.trim() && surgHist.trim() !== 'none') {
    tips.push("you have a surgical history, therefore you should include more of Vitamin C and complete proteins containing food which includes Orange, Amla, Guava, Eggs, Chicken, Fish, and Paneer.");
  }
  // 5. Physiological Condition
  if (phys === 'pregnancy' || phys === 'lactation') {
    tips.push("you are in pregnancy/lactation condition, therefore you should include more of Vitamin B9 (Folate), Iron, and Calcium containing food which includes Cow Milk, Curd, Spinach, Bajra, Oats, and Sprouts.");
  }
  // 6. Deficiencies
  if (defic.includes('iron')) {
    tips.push("you have an Iron deficiency, therefore you should include more of Iron and Vitamin C containing food which includes Spinach (Palak), Bajra Roti, Amla, Guava, and Dates.");
  }
  if (defic.includes('calcium')) {
    tips.push("you have a Calcium deficiency, therefore you should include more of Calcium and Vitamin D containing food which includes Ragi Porridge/Roti, Cow Milk, Curd, Paneer, and Buttermilk.");
  }
  if (defic.includes('vitamin_d') || defic.includes('vitamin d')) {
    tips.push("you have a Vitamin D deficiency, therefore you should include more of Vitamin D and Calcium containing food which includes Cow Milk, Curd, Paneer, Cheese, and Eggs.");
  }
  if (defic.includes('vitamin_b12') || defic.includes('vitamin b12')) {
    tips.push("you have a Vitamin B12 deficiency, therefore you should include more of Vitamin B12 containing food which includes Cow Milk, Curd, Paneer, Eggs, Chicken, and Fish.");
  }
  
  if (tips.length === 0) {
    tips.push("you have a normal profile, therefore you should maintain a balanced intake of Vitamin C, Vitamin E, and complete protein foods like fresh fruits, sprouts, mixed nuts, and lentils.");
  }
  
  return tips.map(tip => `Ex- ${tip}`).join(" \n");
};

// Seeded random helper for JS fallback
const createRandom = (seed) => {
  let s = seed;
  return () => {
    let x = Math.sin(s++) * 10000;
    return x - Math.floor(x);
  };
};

const generateDietLocal = (metrics) => {
  const age = parseFloat(metrics.age) || 30;
  const gender = metrics.gender || 'male';
  const weight = parseFloat(metrics.weight) || 70;
  const height = parseFloat(metrics.height) || 170;
  const activityLevel = metrics.activityLevel || 'light';
  const goal = metrics.goal || 'maintenance';
  const preference = metrics.dietType || 'vegetarian';
  const injuryType = metrics.injuryType || 'none';
  const activeMeals = metrics.activeMeals || ['breakfast', 'mid_morning_snack', 'lunch', 'evening_snack', 'dinner'];
  const physiologicalCondition = metrics.physiologicalCondition || 'none';
  const equipment = metrics.equipment || 'bodyweight';
  const medicalHistory = metrics.medicalHistory || '';
  const surgicalHistory = metrics.surgicalHistory || '';
  const hormonalDisturbance = metrics.hormonalDisturbance || '';
  const nutritionalDeficiency = metrics.nutritionalDeficiency || 'none';
  const addictions = metrics.addictions || 'None';
  const allergies = metrics.allergies || 'None';
  const religiousPreference = metrics.religiousPreference || 'None';
  const eatingCustoms = metrics.eatingCustoms || 'Standard (3-5 meals)';
  const resultsExpectedBy = metrics.resultsExpectedBy || '3 Months (Moderate)';
  const vratDays = metrics.vratDays || [];
  const vratType = metrics.vratType || 'No Grains (Navratri/Ekadashi)';
  const startDateStr = metrics.startDate || new Date().toISOString().split('T')[0];
  const startDate = new Date(startDateStr);
  const sleepSchedule = metrics.sleepSchedule || '';
  const workSchedule = metrics.workSchedule || '';

  const { bmi, category: bmiCategory, description: bmiDescription } = calculateBMILocal(weight, height);
  const { bmr, tdee } = calculateBMRLocal(age, gender, weight, height, activityLevel);

  // Physiological calories
  let physCalories = 0;
  if (physiologicalCondition === 'pregnancy') physCalories = 350;
  else if (physiologicalCondition === 'lactation') physCalories = 500;

  // Goal adjustments based on Results Expected By
  let goalCalories = 0;
  const goalLower = goal.toLowerCase();
  let deficitMultiplier = 1.0;
  if (resultsExpectedBy.includes('1 Month')) deficitMultiplier = 1.6;
  else if (resultsExpectedBy.includes('6 Months')) deficitMultiplier = 0.5;

  if (goalLower.includes('aggressive') || goalLower.includes('loss') || goalLower.includes('fat_loss')) goalCalories = -500 * deficitMultiplier;
  else if (goalLower.includes('muscle') || goalLower.includes('gain')) goalCalories = 300 * deficitMultiplier;
  else if (goalLower.includes('sports')) goalCalories = 400 * deficitMultiplier;

  let targetCalories = tdee + physCalories + goalCalories;
  targetCalories = Math.max(1200, Math.round(targetCalories));

  // Progressive protein target
  let proteinFactor = 1.1;
  if (age > 60) proteinFactor = Math.max(proteinFactor, 1.0);
  if (goalLower.includes('loss') || goalLower.includes('fat_loss')) proteinFactor = Math.max(proteinFactor, 1.4);
  if (goalLower.includes('muscle') || goalLower.includes('sports')) proteinFactor = Math.max(proteinFactor, 1.8);

  let proteinG = proteinFactor * weight;
  if (physiologicalCondition === 'pregnancy') proteinG += 25;
  else if (physiologicalCondition === 'lactation') proteinG += 20;
  proteinG = Math.round(proteinG);

  // Salad
  const saladCal = 59;
  const saladProt = 2.0;
  const saladCarbs = 13.6;
  const saladFats = 0.4;

  const mealsTargetCalories = Math.max(1000, targetCalories - saladCal);

  // Macro splits
  let carbPct = 0.60;
  let fatPct = 0.40;
  if (goalLower.includes('aggressive') || goalLower.includes('fat_loss')) {
    carbPct = 0.45;
    fatPct = 0.55;
  } else if (goalLower.includes('loss')) {
    carbPct = 0.50;
    fatPct = 0.50;
  } else if (goalLower.includes('gain')) {
    carbPct = 0.65;
    fatPct = 0.35;
  } else if (goalLower.includes('sports')) {
    carbPct = 0.70;
    fatPct = 0.30;
  }
  
  if (addictions.includes('Sweet Tooth')) {
    carbPct = Math.max(0.35, carbPct - 0.10);
    fatPct = fatPct + 0.10;
  }

  const proteinKcal = proteinG * 4;
  const nonProteinKcal = Math.max(0, targetCalories - proteinKcal);
  const carbsG = Math.round((nonProteinKcal * carbPct) / 4);
  const fatsG = Math.round((nonProteinKcal * fatPct) / 9);

  const waterMl = Math.round(weight * 35);

  const isNonVeg = preference.toLowerCase().includes('non');
  const isLoss = goalLower.includes('loss') || goalLower.includes('fat_loss');
  const isGain = goalLower.includes('gain') || goalLower.includes('muscle');

  const breakfastsPool = isNonVeg ? localFoods.breakfast : localFoods.breakfast.filter(x => x.is_veg === 1);
  const lunchDinnerPool = isNonVeg ? localFoods.lunch : localFoods.lunch.filter(x => x.is_veg === 1);
  const snacksPool = isNonVeg ? localFoods.snacks : localFoods.snacks.filter(x => x.is_veg === 1);

  // Adjust active meals based on eating customs
  let effectiveActiveMeals = [...activeMeals];
  if (eatingCustoms.includes('Intermittent Fasting')) {
    effectiveActiveMeals = ['lunch', 'evening_snack', 'dinner'];
  } else if (eatingCustoms.includes('OMAD')) {
    effectiveActiveMeals = ['dinner'];
  } else if (eatingCustoms.includes('Two Meals')) {
    effectiveActiveMeals = ['breakfast', 'dinner'];
  }

  // Normalizer meal splits
  const ratios = {
    breakfast: 35,
    mid_morning_snack: 10,
    lunch: 35,
    evening_snack: 10,
    dinner: 30
  };

  if (effectiveActiveMeals.includes('mid_morning_snack')) {
    ratios.lunch -= 5;
    ratios.dinner -= 5;
  }
  if (effectiveActiveMeals.includes('evening_snack')) {
    ratios.lunch -= 5;
    ratios.dinner -= 5;
  }

  ratios.lunch = Math.max(15, ratios.lunch);
  ratios.dinner = Math.max(15, ratios.dinner);

  const activeRatios = {};
  let totalActiveRatio = 0;
  effectiveActiveMeals.forEach(m => {
    if (ratios[m] !== undefined) {
      activeRatios[m] = ratios[m];
      totalActiveRatio += ratios[m];
    }
  });

  if (totalActiveRatio > 0) {
    Object.keys(activeRatios).forEach(m => {
      activeRatios[m] = activeRatios[m] / totalActiveRatio;
    });
  } else {
    effectiveActiveMeals.forEach(m => {
      activeRatios[m] = 1.0 / effectiveActiveMeals.length;
    });
  }

  const mealTargets = {};
  effectiveActiveMeals.forEach(m => {
    const pct = activeRatios[m] || 0.2;
    mealTargets[m] = {
      calories: mealsTargetCalories * pct,
      protein: proteinG * pct
    };
  });

  if (isLoss) {
    if (mealTargets.breakfast) {
      const extra = proteinG * 0.1;
      mealTargets.breakfast.protein += extra;
      const otherMeals = effectiveActiveMeals.filter(x => x !== 'breakfast');
      if (otherMeals.length > 0) {
        const deduct = extra / otherMeals.length;
        otherMeals.forEach(om => {
          mealTargets[om].protein = Math.max(5.0, mealTargets[om].protein - deduct);
        });
      }
    }
  } else if (isGain) {
    if (mealTargets.lunch) {
      const extra = proteinG * 0.1;
      mealTargets.lunch.protein += extra;
      const otherMeals = effectiveActiveMeals.filter(x => x !== 'lunch');
      if (otherMeals.length > 0) {
        const deduct = extra / otherMeals.length;
        otherMeals.forEach(om => {
          mealTargets[om].protein = Math.max(5.0, mealTargets[om].protein - deduct);
        });
      }
    }
  }

  const medHist = (medicalHistory || '').toLowerCase();
  const surgHist = (surgicalHistory || '').toLowerCase();
  const hormonal = (hormonalDisturbance || '').toLowerCase();

  const getTopItems = (pool, target, count = 4, slotKey = '') => {
    const scored = pool.map(food => {
      const nameL = food.name.toLowerCase();
      const cals = food.calories;
      const mult = target / Math.max(1, cals);
      let multPenalty = 0;
      if (mult < 0.5) multPenalty = (0.5 - mult) * 100;
      else if (mult > 2.5) multPenalty = (mult - 2.5) * 100;

      let score = multPenalty;
      if (isLoss) {
        score += cals * 0.1;
      } else {
        score -= cals * 0.1;
      }

      let boost = 0;
      
      // Allergies Filter
      if (allergies.includes('Dairy') && ['milk', 'curd', 'paneer', 'cheese', 'ghee', 'dahi', 'buttermilk'].some(x => nameL.includes(x))) return {score: 9999, food};
      if (allergies.includes('Gluten') && ['chapati', 'wheat', 'bread', 'oats', 'uppuma', 'upma'].some(x => nameL.includes(x))) return {score: 9999, food};
      if (allergies.includes('Nuts') && ['almond', 'walnut', 'peanut', 'groundnut'].some(x => nameL.includes(x))) return {score: 9999, food};
      if (allergies.includes('Egg') && ['egg'].some(x => nameL.includes(x))) return {score: 9999, food};

      // Religious Filter
      if ((religiousPreference.includes('Jain') || religiousPreference.includes('Swaminarayan')) && ['onion', 'garlic'].some(x => nameL.includes(x))) return {score: 9999, food};
      if (religiousPreference.includes('Jain') && ['potato', 'carrot', 'beetroot', 'aloo'].some(x => nameL.includes(x))) return {score: 9999, food};
      if (religiousPreference.includes('Brahmin') && ['egg', 'chicken', 'fish', 'mutton', 'meat'].some(x => nameL.includes(x))) return {score: 9999, food};
      if (religiousPreference.includes('Vegan') && ['milk', 'curd', 'paneer', 'cheese', 'ghee', 'egg', 'chicken', 'fish', 'mutton'].some(x => nameL.includes(x))) return {score: 9999, food};

      // Addictions Boost
      if (addictions.includes('Smoking') || addictions.includes('Alcohol')) {
        if (['orange', 'amla', 'guava', 'apple', 'spinach', 'almond'].some(x => nameL.includes(x))) boost += 200;
      }

      const injVal = (injuryType || 'none').toLowerCase();
      if (injVal === 'bone') {
        if (['ragi', 'milk', 'curd', 'dahi', 'paneer', 'cheese', 'buttermilk', 'chass'].some(x => nameL.includes(x))) {
          boost += 300;
        }
      } else if (injVal === 'muscle') {
        if (['almond', 'cashew', 'walnut', 'groundnut', 'chana', 'sprouts', 'egg', 'chicken', 'fish', 'mutton', 'dal', 'dhal', 'paneer', 'lentil', 'rajmah', 'chole'].some(x => nameL.includes(x))) {
          boost += 300;
        }
      } else if (injVal === 'wound') {
        if (['orange', 'amla', 'guava', 'pineapple', 'apple', 'grapes'].some(x => nameL.includes(x))) {
          boost += 300;
        }
      } else if (injVal === 'joint') {
        if (['walnut', 'almond', 'green tea', 'spinach', 'palak'].some(x => nameL.includes(x))) {
          boost += 300;
        }
      }

      // 1. Diabetes or PCOS
      if (['diabetes', 'diabetic', 'sugar'].some(x => medHist.includes(x)) || ['pcos', 'pcod'].some(x => hormonal.includes(x))) {
        if (['ragi', 'oats', 'barley', 'chana', 'sprouts', 'dal', 'dhal', 'green tea'].some(x => nameL.includes(x))) {
          boost += 300;
        }
        if (['rice', 'paratha', 'sugar'].some(x => nameL.includes(x))) {
          boost -= 300;
        }
      }

      // 2. Hypertension / BP
      if (['hypertension', 'bp', 'blood pressure'].some(x => medHist.includes(x))) {
        if (['banana', 'orange', 'apple', 'spinach', 'palak', 'almond', 'walnut'].some(x => nameL.includes(x))) {
          boost += 300;
        }
        if (['cheese', 'butter', 'tandoori'].some(x => nameL.includes(x))) {
          boost -= 300;
        }
      }

      // 3. Thyroid
      if (medHist.includes('thyroid') || hormonal.includes('thyroid')) {
        if (['almond', 'sprouts', 'chicken', 'fish', 'egg', 'lentil', 'dal', 'dhal', 'chana', 'paneer'].some(x => nameL.includes(x))) {
          boost += 300;
        }
      }

      // 4. Surgical Recovery
      if (surgHist.trim() && surgHist.trim() !== 'none') {
        if (['orange', 'amla', 'guava'].some(x => nameL.includes(x))) {
          boost += 300;
        }
        if (['almond', 'sprouts', 'chicken', 'fish', 'egg', 'lentil', 'dal', 'dhal', 'chana', 'paneer'].some(x => nameL.includes(x))) {
          boost += 300;
        }
      }

      if (isGain && ['lunch', 'dinner'].includes(slotKey)) {
        const ratio = (food.protein + food.fats) / Math.max(1, food.calories);
        boost += ratio * 500;
      }

      score -= boost;
      return { score, food };
    });

    scored.sort((a, b) => a.score - b.score);
    return scored.slice(0, Math.min(count, scored.length)).map(x => x.food);
  };

  const seedVal = age + weight + height;
  const lastBreakfasts = [];
  const lastSnacks = [];
  const lastLunchCombos = [];
  const lastDinnerCombos = [];

  const fifteenDays = [];

  for (let dayNum = 1; dayNum <= 15; dayNum++) {
    const dayMeals = [];
    const daySeed = seedVal + dayNum * 100;
    const rng = createRandom(daySeed);
    
    // Determine if today is a Vrat day based on real dates
    const currentDayDate = new Date(startDate);
    currentDayDate.setDate(startDate.getDate() + (dayNum - 1));
    const dayOfWeekName = currentDayDate.toLocaleDateString('en-US', { weekday: 'long' });
    
    let isVratDay = false;
    if (religiousPreference === 'Vrat (Fasting)' && vratDays.includes(dayOfWeekName)) {
        isVratDay = true;
    }


    effectiveActiveMeals.forEach(slotKey => {
      let slotTarget = mealTargets[slotKey].calories;
      const slotLabel = slotKey.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase());

      let currentPoolBreakfast = breakfastsPool;
      let currentPoolSnacks = snacksPool;
      let currentPoolLunch = lunchDinnerPool;

      if (isVratDay) {
        if (vratType.includes('Water Fast')) {
          slotTarget = 0;
        } else if (vratType.includes('Fruits & Milk')) {
           const fmFilter = f => ['apple', 'banana', 'orange', 'milk', 'curd', 'almond', 'walnut'].some(n => f.name.toLowerCase().includes(n));
           currentPoolBreakfast = breakfastsPool.filter(fmFilter);
           currentPoolSnacks = snacksPool.filter(fmFilter);
           currentPoolLunch = snacksPool.filter(fmFilter); // Use snacks pool (fruits/milk) for lunch/dinner too
        } else if (vratType.includes('No Grains')) {
           const ngFilter = f => !['wheat', 'rice', 'dal', 'chole', 'rajmah', 'chapati', 'bread', 'oats', 'poha', 'uppuma'].some(n => f.name.toLowerCase().includes(n));
           currentPoolBreakfast = breakfastsPool.filter(ngFilter);
           currentPoolSnacks = snacksPool.filter(ngFilter);
           currentPoolLunch = lunchDinnerPool.filter(ngFilter);
        }
      }

      if (['breakfast', 'mid_morning_snack', 'evening_snack'].includes(slotKey)) {
        const pool = slotKey === 'breakfast' ? (currentPoolBreakfast.length ? currentPoolBreakfast : snacksPool) : (currentPoolSnacks.length ? currentPoolSnacks : snacksPool);

        
        const topFoods = getTopItems(pool, slotTarget, 6, slotKey);

        const recentUsed = slotKey === 'breakfast' ? lastBreakfasts : lastSnacks;
        let available = topFoods.filter(f => !recentUsed.includes(f.name));
        if (available.length === 0) {
          available = topFoods;
        }

        // Use custom PRNG to choose food deterministically but with variety
        const food = available[Math.floor(rng() * available.length)] || pool[0];
        recentUsed.push(food.name);
        if (recentUsed.length > 3) {
          recentUsed.shift();
        }

        let mult = slotTarget / food.calories;
        mult = Math.max(0.5, Math.min(2.5, Math.round(mult * 10) / 10));

        const enrichedItem = enrichFoodMicros({
          name: food.name,
          calories: Math.round(food.calories * mult),
          protein: parseFloat((food.protein * mult).toFixed(1)),
          carbs: parseFloat((food.carbs * mult).toFixed(1)),
          fats: parseFloat((food.fats * mult).toFixed(1)),
          serving_size: scaleServingSize(food.serving_size, mult),
          is_veg: food.is_veg
        });

        const altFoods = topFoods.filter(f => f.name !== food.name).slice(0, 3);
        const alternatives = altFoods.map(f => {
          let aMult = slotTarget / f.calories;
          aMult = Math.max(0.5, Math.min(2.5, Math.round(aMult * 10) / 10));
          return {
            items: [
              enrichFoodMicros({
                name: f.name,
                calories: Math.round(f.calories * aMult),
                protein: parseFloat((f.protein * aMult).toFixed(1)),
                carbs: parseFloat((f.carbs * aMult).toFixed(1)),
                fats: parseFloat((f.fats * aMult).toFixed(1)),
                serving_size: scaleServingSize(f.serving_size, aMult),
                is_veg: f.is_veg
              })
            ]
          };
        });

        dayMeals.push({
          key: slotKey,
          label: slotLabel,
          target_kcal_pct: `${Math.round((activeRatios[slotKey] || 0.2) * 100)}%`,
          items: [enrichedItem],
          calories: enrichedItem.calories,
          protein: enrichedItem.protein,
          carbs: enrichedItem.carbs,
          fats: enrichedItem.fats,
          alternatives
        });
      } else {
        // lunch or dinner
        const carbsPool = lunchDinnerPool.filter(x => ['chapati', 'rice', 'khichdi', 'curd rice', 'roti'].some(w => x.name.toLowerCase().includes(w)));
        const sidesPool = lunchDinnerPool.filter(x => !['chapati', 'rice', 'khichdi', 'curd rice', 'roti', 'ghee', 'buttermilk', 'milk'].some(w => x.name.toLowerCase().includes(w)));

        const cPool = carbsPool.length > 0 ? carbsPool : lunchDinnerPool;
        const sPool = sidesPool.length > 0 ? sidesPool : lunchDinnerPool;

        const topCarbs = getTopItems(cPool, slotTarget * 0.45, 5, slotKey);
        const topSides = getTopItems(sPool, slotTarget * 0.55, 5, slotKey);

        const comboHistory = slotKey === 'lunch' ? lastLunchCombos : lastDinnerCombos;
        const validCombos = [];
        topCarbs.forEach(c => {
          topSides.forEach(s => {
            const comboId = `${c.name}|${s.name}`;
            if (!comboHistory.includes(comboId)) {
              validCombos.push({ c, s, comboId });
            }
          });
        });

        if (validCombos.length === 0) {
          topCarbs.forEach(c => {
            topSides.forEach(s => {
              validCombos.push({ c, s, comboId: `${c.name}|${s.name}` });
            });
          });
        }

        const picked = validCombos[Math.floor(rng() * validCombos.length)];
        comboHistory.push(picked.comboId);
        if (comboHistory.length > 4) {
          comboHistory.shift();
        }

        const combCal = picked.c.calories + picked.s.calories;
        let mult = slotTarget / combCal;
        mult = Math.max(0.5, Math.min(2.5, Math.round(mult * 10) / 10));

        const enrichedCarb = enrichFoodMicros({
          name: picked.c.name,
          calories: Math.round(picked.c.calories * mult),
          protein: parseFloat((picked.c.protein * mult).toFixed(1)),
          carbs: parseFloat((picked.c.carbs * mult).toFixed(1)),
          fats: parseFloat((picked.c.fats * mult).toFixed(1)),
          serving_size: scaleServingSize(picked.c.serving_size, mult),
          is_veg: picked.c.is_veg
        });

        const enrichedSide = enrichFoodMicros({
          name: picked.s.name,
          calories: Math.round(picked.s.calories * mult),
          protein: parseFloat((picked.s.protein * mult).toFixed(1)),
          carbs: parseFloat((picked.s.carbs * mult).toFixed(1)),
          fats: parseFloat((picked.s.fats * mult).toFixed(1)),
          serving_size: scaleServingSize(picked.s.serving_size, mult),
          is_veg: picked.s.is_veg
        });

        const altCarbs = topCarbs.filter(c => c.name !== picked.c.name).slice(0, 3);
        const altSides = topSides.filter(s => s.name !== picked.s.name).slice(0, 3);
        const alternatives = [];
        for (let i = 0; i < 3; i++) {
          const cItem = altCarbs[i % altCarbs.length] || topCarbs[0];
          const sItem = altSides[i % altSides.length] || topSides[0];
          const combCalA = cItem.calories + sItem.calories;
          let aMult = slotTarget / combCalA;
          aMult = Math.max(0.5, Math.min(2.5, Math.round(aMult * 10) / 10));

          alternatives.push({
            items: [
              enrichFoodMicros({
                name: cItem.name,
                calories: Math.round(cItem.calories * aMult),
                protein: parseFloat((cItem.protein * aMult).toFixed(1)),
                carbs: parseFloat((cItem.carbs * aMult).toFixed(1)),
                fats: parseFloat((cItem.fats * aMult).toFixed(1)),
                serving_size: scaleServingSize(cItem.serving_size, aMult),
                is_veg: cItem.is_veg
              }),
              enrichFoodMicros({
                name: sItem.name,
                calories: Math.round(sItem.calories * aMult),
                protein: parseFloat((sItem.protein * aMult).toFixed(1)),
                carbs: parseFloat((sItem.carbs * aMult).toFixed(1)),
                fats: parseFloat((sItem.fats * aMult).toFixed(1)),
                serving_size: scaleServingSize(sItem.serving_size, aMult),
                is_veg: sItem.is_veg
              })
            ]
          });
        }

        dayMeals.push({
          key: slotKey,
          label: slotLabel,
          target_kcal_pct: `${Math.round((activeRatios[slotKey] || 0.2) * 100)}%`,
          items: [enrichedCarb, enrichedSide],
          calories: enrichedCarb.calories + enrichedSide.calories,
          protein: parseFloat((enrichedCarb.protein + enrichedSide.protein).toFixed(1)),
          carbs: parseFloat((enrichedCarb.carbs + enrichedSide.carbs).toFixed(1)),
          fats: parseFloat((enrichedCarb.fats + enrichedSide.fats).toFixed(1)),
          alternatives
        });
      }
    });

    const actualCalories = dayMeals.reduce((sum, m) => sum + m.calories, 0);
    const actualProtein = parseFloat(dayMeals.reduce((sum, m) => sum + m.protein, 0).toFixed(1));
    const actualCarbs = parseFloat(dayMeals.reduce((sum, m) => sum + m.carbs, 0).toFixed(1));
    const actualFats = parseFloat(dayMeals.reduce((sum, m) => sum + m.fats, 0).toFixed(1));

    fifteenDays.push({
      meals: dayMeals,
      totals: {
        calories: actualCalories + saladCal,
        protein: parseFloat((actualProtein + saladProt).toFixed(1)),
        carbs: parseFloat((actualCarbs + saladCarbs).toFixed(1)),
        fats: parseFloat((actualFats + saladFats).toFixed(1))
      }
    });
  }

  const thirtyDayPlan = [];
  for (let d = 1; d <= 30; d++) {
    const sourceDay = fifteenDays[(d - 1) % 15];
    thirtyDayPlan.push({
      day: d,
      meals: JSON.parse(JSON.stringify(sourceDay.meals)),
      totals: sourceDay.totals
    });
  }

  // Legacy single day meal plan (Day 1) compatibility
  const day1Meals = thirtyDayPlan[0].meals;
  const day1Totals = thirtyDayPlan[0].totals;

  const legacyMealPlan = {};
  day1Meals.forEach(m => {
    legacyMealPlan[m.key] = m;
  });

  Object.keys(legacyMealPlan).forEach(k => {
    const m = legacyMealPlan[k];
    if (['breakfast', 'mid_morning_snack', 'evening_snack'].includes(k) && m.items && m.items.length > 0) {
      const item = m.items[0];
      legacyMealPlan[k] = {
        name: item.name,
        calories: m.calories,
        protein: m.protein,
        carbs: m.carbs,
        fats: m.fats,
        serving_size: item.serving_size,
        is_veg: item.is_veg,
        vitamins: item.vitamins,
        amino_acids: item.amino_acids
      };
    }
  });
  legacyMealPlan.meals = day1Meals;

  const fatRatio = ((day1Totals.fats + saladFats) * 9) / Math.max(1, day1Totals.calories);
  let gheeAdvisory = null;
  if (fatRatio < 0.20) {
    if (targetCalories < 1600) {
      gheeAdvisory = `Your diet plan's fat ratio is ${(fatRatio*100).toFixed(1)}% (less than the recommended 20%). We suggest adding 1 tsp of Ghee (45 kcal, 5g fat) to your Lunch or Dinner to support fat-soluble vitamin absorption.`;
    } else {
      gheeAdvisory = `Your diet plan's fat ratio is ${(fatRatio*100).toFixed(1)}% (less than the recommended 20%). We suggest adding 2 tsp of Ghee (90 kcal, 10g fat) to your Lunch or Dinner to support fat-soluble vitamin absorption.`;
    }
  }

  const exerciseChart = generateWeeklyExerciseChartLocal(goal, age, equipment, injuryType);
  const medicalTip = generateMedicalTipLocal(medicalHistory, surgicalHistory, hormonalDisturbance, physiologicalCondition, nutritionalDeficiency);

  return {
    bmi,
    bmr,
    tdee,
    target_calories: targetCalories,
    target_protein_g: proteinG,
    target_carbs_g: carbsG,
    target_fats_g: fatsG,
    water_ml: waterMl,
    meal_plan: legacyMealPlan,
    thirty_day_plan: thirtyDayPlan,
    medical_tip: medicalTip,
    ghee_advisory: gheeAdvisory,
    salad: {
      calories: saladCal,
      protein: saladProt,
      carbs: saladCarbs,
      fats: saladFats,
      description: "Standard daily healing salad: 1/2 cup each of Cucumber, Tomato, Carrot, Beetroot."
    },
    exercise_chart: exerciseChart,
    totals: day1Totals
  };
};

export const apiService = {
  async getFoods(query = '', category = '') {
    try {
      const url = `${BASE_URL}/foods?q=${encodeURIComponent(query)}&category=${encodeURIComponent(category)}`;
      const response = await fetch(url);
      const res = await response.json();
      if (res.success) return res.data;
      throw new Error(res.error);
    } catch (e) {
      console.warn("Using local foods database fallback.");
      let items = [...localFoods.breakfast, ...localFoods.lunch, ...localFoods.snacks];
      if (category) {
        items = items.filter(f => {
          if (category === 'breakfast') return localFoods.breakfast.some(x => x.name === f.name);
          if (category === 'lunch' || category === 'dinner') return localFoods.lunch.some(x => x.name === f.name);
          if (category === 'snacks') return localFoods.snacks.some(x => x.name === f.name);
          return true;
        });
      }
      if (query) {
        items = items.filter(f => f.name.toLowerCase().includes(query.toLowerCase()));
      }
      return items.map(f => enrichFoodMicros(f));
    }
  },

  async calculateBMI(weight, height) {
    try {
      const response = await fetch(`${BASE_URL}/calculate-bmi`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weight, height })
      });
      const res = await response.json();
      if (res.success) return res.data;
      throw new Error(res.error);
    } catch (e) {
      console.warn("Using local BMI calculations fallback.");
      return calculateBMILocal(weight, height);
    }
  },

  async calculateBMR(age, gender, weight, height, activityLevel) {
    try {
      const response = await fetch(`${BASE_URL}/calculate-bmr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ age, gender, weight, height, activity_level: activityLevel })
      });
      const res = await response.json();
      if (res.success) return res.data;
      throw new Error(res.error);
    } catch (e) {
      console.warn("Using local BMR calculations fallback.");
      return calculateBMRLocal(age, gender, weight, height, activityLevel);
    }
  },

  async predictWeight(weight, goal) {
    try {
      const response = await fetch(`${BASE_URL}/predict-weight`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weight, goal })
      });
      const res = await response.json();
      if (res.success) return res.data;
      throw new Error(res.error);
    } catch (e) {
      console.warn("Using local weight prediction fallback.");
      return predictWeightLocal(weight, goal);
    }
  },

  async generateDiet(metrics) {
    try {
      const response = await fetch(`${BASE_URL}/generate-diet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          age: metrics.age,
          gender: metrics.gender,
          weight: metrics.weight,
          height: metrics.height,
          activity_level: metrics.activityLevel,
          goal: metrics.goal,
          food_preference: metrics.dietType,
          injury_type: metrics.injuryType,
          active_meals: metrics.activeMeals,
          physiological_condition: metrics.physiologicalCondition,
          equipment: metrics.equipment,
          medical_history: metrics.medicalHistory,
          surgical_history: metrics.surgicalHistory,
          hormonal_disturbance: metrics.hormonalDisturbance,
          nutritional_deficiency: metrics.nutritionalDeficiency,
          religiousPreference: metrics.religiousPreference,
          allergies: metrics.allergies,
          eatingCustoms: metrics.eatingCustoms,
          vratDays: metrics.vratDays,
          vratType: metrics.vratType,
          resultsExpectedBy: metrics.resultsExpectedBy,
          startDate: metrics.startDate
        })
      });
      const res = await response.json();
      if (res.success) return res.data;
      throw new Error(res.error);
    } catch (e) {
      console.warn("Using local Diet Recommendation engine fallback.");
      return generateDietLocal(metrics);
    }
  },

  async swapMeal(category, currentItemName, targetCalories, preference = 'vegetarian') {
    try {
      const response = await fetch(`${BASE_URL}/meal-swap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, name: currentItemName, target_calories: targetCalories, food_preference: preference })
      });
      const res = await response.json();
      if (res.success) return res.data;
      throw new Error(res.error);
    } catch (e) {
      console.warn("Using local meal swapper fallback.");
      const isNonVeg = preference.toLowerCase().includes('non');
      const list = category === 'breakfast' ? localFoods.breakfast 
                 : (category === 'lunch' || category === 'dinner') ? localFoods.lunch 
                 : localFoods.snacks;
      
      let filteredList = isNonVeg ? list : list.filter(x => x.is_veg === 1);
      
      // Exclude current item
      let alts = filteredList.filter(x => x.name !== currentItemName);
      
      // Separating carbs/sides
      if (category === 'lunch' || category === 'dinner') {
        const isCarb = ['Chapati', 'Rice', 'Khichdi', 'Curd Rice'].some(x => currentItemName.toLowerCase().includes(x));
        if (isCarb) {
          alts = alts.filter(x => ['Chapati', 'Rice', 'Khichdi', 'Curd Rice'].some(w => x.name.toLowerCase().includes(w)));
        } else {
          alts = alts.filter(x => !['Chapati', 'Rice', 'Khichdi', 'Curd Rice'].some(w => x.name.toLowerCase().includes(w)));
        }
      }
      
      if (alts.length === 0) alts = filteredList.length > 0 ? filteredList : list;
      
      // 50% chance to return a combination of two items if we have enough options
      if (alts.length >= 2 && Math.random() > 0.4) {
        const idxA = Math.floor(Math.random() * alts.length);
        const itemA = alts[idxA];
        const altsB = alts.filter((_, i) => i !== idxA);
        if (altsB.length > 0) {
          const itemB = altsB[Math.floor(Math.random() * altsB.length)];
          const baseCarbs = itemA.carbs + itemB.carbs;
          const targetCarbs = (targetCalories * 0.5) / 4.0;
          let mult = targetCarbs / Math.max(1, baseCarbs);
          mult = Math.round(Math.max(0.4, Math.min(2.0, mult)) * 10) / 10;
          
          const enrichedA = enrichFoodMicros(itemA);
          const enrichedB = enrichFoodMicros(itemB);

          return {
            name: `${itemA.name} + ${itemB.name}`,
            calories: Math.round((itemA.calories + itemB.calories) * mult),
            protein: parseFloat(((itemA.protein + itemB.protein) * mult).toFixed(1)),
            carbs: parseFloat((baseCarbs * mult).toFixed(1)),
            fats: parseFloat(((itemA.fats + itemB.fats) * mult).toFixed(1)),
            serving_size: `${scaleServingSize(itemA.serving_size, mult)} + ${scaleServingSize(itemB.serving_size, mult)}`,
            is_veg: itemA.is_veg === 1 && itemB.is_veg === 1 ? 1 : 0,
            vitamins: `${enrichedA.vitamins} | ${enrichedB.vitamins}`,
            amino_acids: `${enrichedA.amino_acids} | ${enrichedB.amino_acids}`
          };
        }
      }
      
      const chosen = alts[Math.floor(Math.random() * alts.length)] || list[0];
      const mult = parseFloat((targetCalories / chosen.calories).toFixed(1)) || 1.0;
      const enriched = enrichFoodMicros(chosen);
      return {
        name: chosen.name,
        calories: Math.round(chosen.calories * mult),
        protein: parseFloat((chosen.protein * mult).toFixed(1)),
        carbs: parseFloat((chosen.carbs * mult).toFixed(1)),
        fats: parseFloat((chosen.fats * mult).toFixed(1)),
        serving_size: scaleServingSize(chosen.serving_size, mult),
        is_veg: chosen.is_veg,
        vitamins: enriched.vitamins,
        amino_acids: enriched.amino_acids
      };
    }
  },

  async chatbotMessage(message) {
    try {
      const response = await fetch(`${BASE_URL}/chatbot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message })
      });
      const res = await response.json();
      if (res.success) return res.reply;
      throw new Error(res.error);
    } catch (e) {
      console.warn("Using local chatbot fallback.");
      const msg = message.toLowerCase();
      
      if (msg.includes('hi') || msg.includes('hello') || msg.includes('hey')) {
        return "Hello! I am your local Nutritionist chatbot. How can I assist you with your diet plan today?";
      }
      
      if (msg.includes('replace') && msg.includes('with')) {
        return "You can replace items in your diet plan! For example, replacing Dosa with Oats reduces fat intake and increases fiber. Try asking for specific stats.";
      }
      
      if (msg.includes('dosa')) {
        return "Plain Dosa (1 piece) has 216 calories, 4.1g protein, 28.2g carbs, and 9.7g fats. It's safe for weight loss, but eat it in moderation and track the fat content!";
      }

      if (msg.includes('idli')) {
        return "2 Idlis have 130 calories, 4.6g protein, 27.6g carbs, and 0.2g fats. It's a great low-fat, steamed option for breakfast!";
      }

      if (msg.includes('paneer')) {
        return "100g of Paneer has 147 calories, 8.5g protein, 10.7g carbs, and 8.1g fats. It is a super source of protein for Indian vegetarians!";
      }

      if (msg.includes('water')) {
        return "Aim to drink 35ml of water per kg of weight. If you weigh 70kg, that's about 2.4L of water daily.";
      }

      return "I'm here to help with your nutrition query! Try asking about Indian foods (like 'dosa', 'idli', or 'paneer') or water intake recommendations.";
    }
  }
};
