import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  Flame, 
  Droplet, 
  Dumbbell, 
  Search, 
  Send, 
  Moon, 
  Sun, 
  ArrowRight, 
  User, 
  Calendar, 
  Plus, 
  RotateCcw, 
  FileText,
  Utensils,
  ChevronRight,
  ChevronDown,
  Sparkles,
  RefreshCw,
  Scale
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar
} from 'recharts';
import { apiService } from './utils/api';

function FoodTypeBadge({ isVeg }) {
  const colorClass = isVeg ? 'border-green-600 text-green-600' : 'border-red-700 text-red-700';
  const dotColorClass = isVeg ? 'bg-green-600' : 'bg-red-700';
  return (
    <div className={`w-4 h-4 border-2 flex items-center justify-center p-0.5 rounded-sm shrink-0 ${colorClass}`} title={isVeg ? "Vegetarian" : "Non-Vegetarian"}>
      <div className={`w-1.5 h-1.5 rounded-full ${dotColorClass}`} />
    </div>
  );
}

function WaterGlass({ filled, time, onClick }) {
  return (
    <button onClick={onClick} className="flex flex-col items-center group relative outline-none focus:outline-none">
      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mb-1.5 group-hover:text-blue-500 transition-colors">{time}</span>
      <div className="relative w-11 h-14 border-b-4 border-x-2 border-slate-400/80 dark:border-slate-500/80 rounded-b-xl rounded-t-sm overflow-hidden bg-slate-100/30 dark:bg-slate-800/30 shadow-inner flex items-end cursor-pointer group-hover:scale-105 transition-all duration-200">
        <div className="absolute bottom-0 left-0 w-full bg-gradient-to-t from-blue-600 to-blue-400 transition-all duration-500 ease-out" style={{ height: filled ? '80%' : '0%' }}>
          {filled && <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-[200%] h-5 bg-blue-400/30 rounded-[40%] animate-wave pointer-events-none" />}
          {filled && <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-[220%] h-5 bg-blue-300/40 rounded-[35%] animate-wave pointer-events-none" style={{ animationDuration: '6s', animationDelay: '-2s' }} />}
        </div>
        <div className="absolute top-1 left-1.5 w-0.5 h-10 bg-white/20 rounded-full pointer-events-none" />
        <div className="absolute bottom-1 right-1.5 w-1 h-1 bg-white/30 rounded-full pointer-events-none" />
      </div>
      <span className={`text-[9px] font-extrabold mt-1.5 px-1.5 py-0.5 rounded-full transition-all duration-200 ${filled ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-600'}`}>{filled ? '✓' : '250ml'}</span>
    </button>
  );
}

const getWaterTime = (index, totalCups) => {
  if (totalCups <= 1) return "08:00 AM";
  const startHour = 8; // 8:00 AM
  const endHour = 22;  // 10:00 PM
  const totalMinutes = (endHour - startHour) * 60;
  const minutesPerCup = totalMinutes / (totalCups - 1);
  const cupTimeMinutes = startHour * 60 + index * minutesPerCup;
  
  let hours = Math.floor(cupTimeMinutes / 60);
  const minutes = Math.round(cupTimeMinutes % 60);
  
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const strMinutes = minutes < 10 ? '0' + minutes : minutes;
  const strHours = hours < 10 ? '0' + hours : hours;
  
  return `${strHours}:${strMinutes} ${ampm}`;
};

export default function App() {
  // Theme state
  const [darkMode, setDarkMode] = useState(false);
  const [chartRenderKey, setChartRenderKey] = useState(0);

  const [step, setStep] = useState(1);
  const [heightUnit, setHeightUnit] = useState('cm');
  const [heightFt, setHeightFt] = useState('');
  const [heightIn, setHeightIn] = useState('');
  const [validationError, setValidationError] = useState('');
  const [showServingSizes, setShowServingSizes] = useState(false);
  const [showCaseHistory, setShowCaseHistory] = useState(false);

  // User input states (starting blank with placeholders)
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginCreds, setLoginCreds] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: 'male',
    address: '',
    contactNo: '',
    maritalStatus: '',
    occupation: '',
    sleepSchedule: '',
    workSchedule: '',
    addictions: 'None',
    dailyWaterIntake: '',
    height: '',
    weight: '',
    surgicalHistory: 'None',
    medicalHistory: 'None',
    physiologicalCondition: 'none',
    hormonalDisturbance: 'None',
    injuryHistory: 'none',
    allergies: 'None',
    nutritionalDeficiency: 'not_known',
    goal: 'weight_loss',
    expectedOutcome: '',
    resultsExpectedBy: '3 Months (Moderate)',
    dietType: 'vegetarian',
    religiousPreference: 'None',
    vratDays: [],
    vratType: 'No Grains (Navratri/Ekadashi)',
    eatingCustoms: 'Standard (3-5 meals)',
    exerciseSchedule: 'Morning',
    equipment: 'bodyweight',
    activeMeals: ['breakfast', 'mid_morning_snack', 'lunch', 'evening_snack', 'dinner'],
    activityLevel: 'light',
    injuryType: 'none',
    startDate: new Date().toISOString().split('T')[0]
  });

  // Keep legacy fields in sync for calculators compatibility
  useEffect(() => {
    setFormData(prev => ({
      ...prev,
      injuryType: prev.injuryHistory,
      activityLevel: prev.goal.includes('gain') || prev.goal.includes('sports') || prev.goal.includes('muscle') ? 'moderate' : 'light'
    }));
  }, [formData.injuryHistory, formData.goal]);

  // App UI State
  const [loading, setLoading] = useState(false);
  const [dietPlan, setDietPlan] = useState(null);
  const [dietViewMode, setDietViewMode] = useState('daily'); // 'daily' or 'monthly'
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(1);
  const [medicalDropdownOpen, setMedicalDropdownOpen] = useState(false);
  const [weightProj, setWeightProj] = useState([]);
  const [bmiData, setBmiData] = useState(null);
  const [bmrData, setBmrData] = useState(null);

  // Weekly exercise active day
  const [activeDay, setActiveDay] = useState('Monday');

  // Water Tracker State
  const [waterCups, setWaterCups] = useState(0); // 250ml per cup
  const [waterGoalCups, setWaterGoalCups] = useState(10); // fallback

  // Food Database Search State
  const [foodSearch, setFoodSearch] = useState('');
  const [foodCategory, setFoodCategory] = useState('');
  const [foodsList, setFoodsList] = useState([]);
  const [searchingFoods, setSearchingFoods] = useState(false);

  // Chatbot State
  const [chatOpen, setChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([
    { sender: 'bot', text: 'Hello! I am your Gyromotion nutritionist. How can I help you customize your Indian diet plan today?' }
  ]);
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Toggle Dark Mode class on document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatOpen]);

  // Trigger chart remount to recalculate ResponsiveContainer layout dimensions
  useEffect(() => {
    if (dietPlan && !loading) {
      const timer = setTimeout(() => {
        setChartRenderKey(prev => prev + 1);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [dietPlan, loading]);

  // Load standard food list on mount
  useEffect(() => {
    fetchFoodDatabase();
  }, [foodCategory]);

  const fetchFoodDatabase = async () => {
    setSearchingFoods(true);
    try {
      const data = await apiService.getFoods(foodSearch, foodCategory);
      setFoodsList(data);
    } catch (e) {
      console.error(e);
    } finally {
      setSearchingFoods(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchFoodDatabase();
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'weight' || name === 'height' || name === 'age' || name === 'dailyWaterIntake' ? parseFloat(value) || '' : value
    }));
  };

  const handleMealCheckboxChange = (mealKey) => {
    setFormData(prev => {
      const active = prev.activeMeals.includes(mealKey)
        ? prev.activeMeals.filter(m => m !== mealKey)
        : [...prev.activeMeals, mealKey];
      return { ...prev, activeMeals: active };
    });
  };

  const handleDeficiencyToggle = (defKey) => {
    setFormData(prev => {
      let current = prev.nutritionalDeficiency || '';
      let list = [];
      if (current && current !== 'none' && current !== 'not_known') {
        list = current.split(',').map(x => x.trim()).filter(Boolean);
      }
      if (defKey === 'none' || defKey === 'not_known') {
        return { ...prev, nutritionalDeficiency: defKey };
      }
      list = list.filter(x => x !== 'none' && x !== 'not_known');
      if (list.includes(defKey)) {
        list = list.filter(x => x !== defKey);
      } else {
        list.push(defKey);
      }
      const newStr = list.length > 0 ? list.join(',') : 'none';
      return { ...prev, nutritionalDeficiency: newStr };
    });
  };

  const validateStep = () => {
    if (step === 1) {
      if (!formData.name.trim()) return "Please enter your name.";
      if (!formData.age) return "Please enter your age.";
      const ageNum = parseInt(formData.age);
      if (ageNum < 1 || ageNum > 120) return "Age must be between 1 and 120.";
      if (!formData.contactNo.trim()) return "Please enter your contact number.";
      if (!/^\+?[0-9\- ]{8,15}$/.test(formData.contactNo.trim())) return "Please enter a valid contact number (8-15 digits).";
      if (!formData.address.trim()) return "Please enter your address/region.";
    }
    if (step === 2) {
      if (!formData.occupation.trim()) return "Please enter your occupation.";
      if (formData.dailyWaterIntake === '') return "Please enter your current daily water intake.";
      const waterNum = parseFloat(formData.dailyWaterIntake);
      if (waterNum < 0 || waterNum > 10) return "Water intake must be between 0 and 10 Liters.";
    }
    if (step === 3) {
      if (!formData.height) return "Please enter your height.";
      const hNum = parseFloat(formData.height);
      if (hNum < 50 || hNum > 250) return "Height must be between 50 and 250 cm.";
      if (!formData.weight) return "Please enter your weight.";
      const wNum = parseFloat(formData.weight);
      if (wNum < 10 || wNum > 300) return "Weight must be between 10 and 300 kg.";
    }
    if (step === 4) {
      if (formData.activeMeals.length === 0) return "Please select at least one active meal.";
    }
    return "";
  };

  const handleNext = () => {
    const error = validateStep();
    if (error) {
      setValidationError(error);
    } else {
      setValidationError('');
      setStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setValidationError('');
    setStep(prev => prev - 1);
  };

  const calculatePlan = async (e) => {
    if (e) e.preventDefault();
    if (step < 4) {
      handleNext();
      return;
    }
    setLoading(true);
    
    try {
      // 1. Calculate BMI
      const bmiRes = await apiService.calculateBMI(formData.weight, formData.height);
      setBmiData(bmiRes);
      
      // 2. Calculate BMR & TDEE
      const bmrRes = await apiService.calculateBMR(
        formData.age, 
        formData.gender, 
        formData.weight, 
        formData.height, 
        formData.activityLevel
      );
      setBmrData(bmrRes);

      // 3. Generate weight projection
      const weightRes = await apiService.predictWeight(formData.weight, formData.goal);
      setWeightProj(weightRes.projection);

      // 4. Generate Diet Plan
      const dietRes = await apiService.generateDiet(formData);
      setDietPlan(dietRes);
      
      // Calculate water cups (35ml per kg, cup size 250ml)
      const waterMl = formData.weight * 35;
      const cups = Math.round(waterMl / 250);
      setWaterGoalCups(cups);
      setWaterCups(0); // reset tracking

    } catch (err) {
      console.error("Error generating plan: ", err);
    } finally {
      setTimeout(() => {
        setLoading(false);
      }, 800); // Small timeout for animation feel
    }
  };

  const handleSwap = async (mealKey, index, currentItemName, targetCalories, dayIndex = 0) => {
    try {
      const swappedItem = await apiService.swapMeal(mealKey, currentItemName, targetCalories, formData.dietType);
      
      setDietPlan(prevPlan => {
        const updatedPlan = { ...prevPlan };
        if (!updatedPlan.thirty_day_plan || !updatedPlan.thirty_day_plan[dayIndex]) return prevPlan;

        const dayEntry = { ...updatedPlan.thirty_day_plan[dayIndex] };
        
        // 1. Update the items inside dayEntry.meals
        const updatedMeals = dayEntry.meals.map(m => {
          if (m.key === mealKey) {
            const newItems = [...m.items];
            const targetIdx = index !== null && index !== undefined ? index : 0;
            newItems[targetIdx] = swappedItem;
            
            return {
              ...m,
              items: newItems,
              calories: newItems.reduce((acc, item) => acc + item.calories, 0),
              protein: parseFloat(newItems.reduce((acc, item) => acc + item.protein, 0).toFixed(1)),
              carbs: parseFloat(newItems.reduce((acc, item) => acc + item.carbs, 0).toFixed(1)),
              fats: parseFloat(newItems.reduce((acc, item) => acc + item.fats, 0).toFixed(1))
            };
          }
          return m;
        });
        
        dayEntry.meals = updatedMeals;
        
        // 2. Recompute day totals
        const actualCalories = updatedMeals.reduce((acc, m) => acc + m.calories, 0);
        const actualProtein = parseFloat(updatedMeals.reduce((acc, m) => acc + m.protein, 0).toFixed(1));
        const actualCarbs = parseFloat(updatedMeals.reduce((acc, m) => acc + m.carbs, 0).toFixed(1));
        const actualFats = parseFloat(updatedMeals.reduce((acc, m) => acc + m.fats, 0).toFixed(1));
        
        const saladCal = updatedPlan.salad ? updatedPlan.salad.calories : 59;
        const saladProt = updatedPlan.salad ? updatedPlan.salad.protein : 2.0;
        const saladCarbs = updatedPlan.salad ? updatedPlan.salad.carbs : 13.6;
        const saladFats = updatedPlan.salad ? updatedPlan.salad.fats : 0.4;

        dayEntry.totals = {
          calories: actualCalories + saladCal,
          protein: parseFloat((actualProtein + saladProt).toFixed(1)),
          carbs: parseFloat((actualCarbs + saladCarbs).toFixed(1)),
          fats: parseFloat((actualFats + saladFats).toFixed(1))
        };
        
        // 3. Put updated day entry back
        updatedPlan.thirty_day_plan[dayIndex] = dayEntry;
        
        // 4. Update legacy meal_plan for compatibility if updating Day 1 (dayIndex === 0)
        if (dayIndex === 0) {
          const matchedMeal = updatedMeals.find(m => m.key === mealKey);
          if (matchedMeal) {
            if (mealKey === 'lunch' || mealKey === 'dinner') {
              updatedPlan.meal_plan[mealKey] = matchedMeal;
            } else {
              const firstItem = matchedMeal.items[0] || {};
              updatedPlan.meal_plan[mealKey] = {
                name: firstItem.name,
                calories: matchedMeal.calories,
                protein: matchedMeal.protein,
                carbs: matchedMeal.carbs,
                fats: matchedMeal.fats,
                serving_size: firstItem.serving_size,
                is_veg: firstItem.is_veg,
                vitamins: firstItem.vitamins,
                amino_acids: firstItem.amino_acids
              };
            }
          }
          updatedPlan.meal_plan.meals = updatedMeals;
          updatedPlan.totals = dayEntry.totals;
          
          // Recompute ghee advisory for Day 1
          const fatCalories = dayEntry.totals.fats * 9;
          const fatRatio = fatCalories / Math.max(1, dayEntry.totals.calories);
          let gheeAdvisory = null;
          if (fatRatio < 0.20) {
            const targetCalories = updatedPlan.target_calories;
            if (targetCalories < 1600) {
              gheeAdvisory = `Your diet plan's fat ratio is ${(fatRatio*100).toFixed(1)}% (less than the recommended 20%). We suggest adding 1 tsp of Ghee (45 kcal, 5g fat) to your Lunch or Dinner to support fat-soluble vitamin absorption.`;
            } else {
              gheeAdvisory = `Your diet plan's fat ratio is ${(fatRatio*100).toFixed(1)}% (less than the recommended 20%). We suggest adding 2 tsp of Ghee (90 kcal, 10g fat) to your Lunch or Dinner to support fat-soluble vitamin absorption.`;
            }
          }
          updatedPlan.ghee_advisory = gheeAdvisory;
        }
        
        return updatedPlan;
      });
    } catch (e) {
      console.error("Failed to swap meal:", e);
    }
  };

  const handleChatSubmit = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput;
    setChatMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
    setChatInput('');
    setChatLoading(true);

    try {
      const reply = await apiService.chatbotMessage(userMsg);
      setChatMessages(prev => [...prev, { sender: 'bot', text: reply }]);
    } catch (err) {
      console.error(err);
      setChatMessages(prev => [...prev, { sender: 'bot', text: "Sorry, I'm experiencing troubles connecting right now. Try checking my server." }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const chartStrokeColor = darkMode ? '#334155' : '#e2e8f0';
  const chartTextColor = darkMode ? '#94a3b8' : '#475569';

  // Macro pie chart helper
  const macroPieData = dietPlan ? [
    { name: 'Protein', value: parseFloat((dietPlan.totals.protein * 4).toFixed(1)), grams: dietPlan.totals.protein, color: '#10b981' }, // 4kcal/g
    { name: 'Carbohydrates', value: parseFloat((dietPlan.totals.carbs * 4).toFixed(1)), grams: dietPlan.totals.carbs, color: '#f59e0b' }, // 4kcal/g
    { name: 'Fats', value: parseFloat((dietPlan.totals.fats * 9).toFixed(1)), grams: dietPlan.totals.fats, color: '#ef4444' } // 9kcal/g
  ] : [];

  const handleLogin = (e) => {
    e.preventDefault();
    if (loginCreds.username === 'admin' && loginCreds.password === 'admin@123') {
      setIsAuthenticated(true);
      setLoginError('');
    } else {
      setLoginError('Invalid username or password');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-emerald-950/30">
        <div className="w-full max-w-md p-8 bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl border border-white/20 dark:border-slate-700/50 rounded-3xl shadow-2xl">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-12 h-12 flex items-center justify-center">
              <img src="/images/gyromotion-logo.png" alt="Gyromotion Logo" className="w-full h-full object-contain filter drop-shadow-md" />
            </div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-600 to-green-600 dark:from-emerald-400 dark:to-green-400">NutriPlan AI</h1>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Username</label>
              <input type="text" value={loginCreds.username} onChange={e => setLoginCreds({...loginCreds, username: e.target.value})} className="w-full px-4 py-3 rounded-xl glass-input text-slate-800 dark:text-white" required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Password</label>
              <input type="password" value={loginCreds.password} onChange={e => setLoginCreds({...loginCreds, password: e.target.value})} className="w-full px-4 py-3 rounded-xl glass-input text-slate-800 dark:text-white" required />
            </div>
            {loginError && <p className="text-red-500 text-sm font-medium">{loginError}</p>}
            <button type="submit" className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-lg shadow-emerald-200 dark:shadow-none transition-all">Sign In</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen transition-colors duration-300">
      
      {/* BACKGROUND DECORATIONS */}
      <div className="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-brand-100/30 to-transparent dark:from-brand-950/20 -z-10 blur-3xl pointer-events-none" />
      <div className="absolute top-[800px] right-0 w-[400px] h-[400px] bg-emerald-200/10 dark:bg-emerald-950/5 -z-10 rounded-full blur-3xl pointer-events-none" />

      {/* NAVBAR */}
      <nav className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/70 dark:bg-slate-900/70 border-b border-slate-200/50 dark:border-slate-800/50 transition-all duration-300 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4 md:space-x-8">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 flex items-center justify-center">
                <img src="/images/gyromotion-logo.png" alt="Gyromotion Logo" className="w-full h-full object-contain filter drop-shadow-sm" />
              </div>
              <div>
                <span className="font-display font-extrabold text-xl tracking-tight text-slate-800 dark:text-white">
                  Gyromotion <span className="bg-gradient-to-r from-emerald-500 to-green-600 bg-clip-text text-transparent">NutriPlan</span>
                </span>
              </div>
            </div>
            
            <div className="hidden md:flex items-center space-x-6 text-sm font-semibold text-slate-600 dark:text-slate-300">
              <a href="https://gyromotionphysio.in/#home" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Home</a>
              <a href="https://gyromotionphysio.in/#about" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">About</a>
              <a href="https://gyromotionphysio.in/#services" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Services</a>
              <a href="https://gyromotionphysio.in/#appointment" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">Book Appointment</a>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {dietPlan && (
              <button 
                onClick={() => setDietPlan(null)}
                className="hidden md:flex items-center space-x-1.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors py-2 px-3 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <RotateCcw size={16} />
                <span>Reset Calculator</span>
              </button>
            )}
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-800 bg-white/80 dark:bg-slate-900 shadow-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all duration-200"
              title="Toggle Dark/Light Mode"
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          </div>
        </div>
      </nav>

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">
        
        {/* LANDING PAGE / CALCULATOR FORM */}
        {!dietPlan && !loading && (
          <div className="space-y-16 animate-fade-in-up">
            
            {/* HERO SECTION */}
            <div className="text-center max-w-3xl mx-auto space-y-6">

              <h1 className="font-display font-extrabold text-4xl sm:text-5xl md:text-6xl tracking-tight text-slate-900 dark:text-white leading-[1.1]">
                Personalized Indian Diet Planner <br />
                <span className="bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 bg-clip-text text-transparent">
                  Powered by Gyromotion
                </span>
              </h1>
              <p className="text-base sm:text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto font-normal leading-relaxed">
                Smart meal plans, calorie tracking, and nutrition guidance tailored to your body, activity metrics, and vegetarian preferences.
              </p>
              
              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
                <a 
                  href="#calculator" 
                  className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold rounded-xl hover:shadow-lg hover:shadow-emerald-500/20 active:scale-98 transition-all duration-300 text-center"
                >
                  <span>Build Diet Plan</span>
                  <ArrowRight size={18} className="ml-2" />
                </a>
                <a 
                  href="#foods-database" 
                  className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold rounded-xl transition-all duration-200 text-center"
                >
                  <span>Explore Foods</span>
                </a>
              </div>
            </div>

            {/* FEATURES CARDS GRID */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              <div className="glass-card p-6 rounded-2xl border border-slate-200/50 hover:translate-y-[-4px] transition-all duration-300">
                <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
                  <Activity size={24} />
                </div>
                <h3 className="font-display font-bold text-lg text-slate-800 dark:text-white mb-2">Smart Calculators</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Instant calculation of your BMI, BMR, TDEE, protein intake, and optimal water targets in seconds.
                </p>
              </div>

              <div className="glass-card p-6 rounded-2xl border border-slate-200/50 hover:translate-y-[-4px] transition-all duration-300">
                <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 flex items-center justify-center mb-4">
                  <Utensils size={24} />
                </div>
                <h3 className="font-display font-bold text-lg text-slate-800 dark:text-white mb-2">Indian Meal Selections</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Custom meal cards for south Indian, gujarati, punjabi, vegan, and jain dietary targets, mapped dynamically.
                </p>
              </div>

              <div className="glass-card p-6 rounded-2xl border border-slate-200/50 hover:translate-y-[-4px] transition-all duration-300">
                <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
                  <Scale size={24} />
                </div>
                <h3 className="font-display font-bold text-lg text-slate-800 dark:text-white mb-2">12-Week Weight Projection</h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Chart your predicted weight loss/gain progress over three months based on caloric deficits.
                </p>
              </div>
            </div>

            {/* THE CALCULATOR */}
            <div id="calculator" className="max-w-3xl mx-auto glass-card rounded-3xl p-6 sm:p-10 border border-slate-200/60 dark:border-slate-800/40 shadow-xl scroll-mt-24">
              <div className="flex items-center space-x-3 mb-8 no-print">
                <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <Dumbbell size={24} className="animate-spin" style={{ animationDuration: '3s' }} />
                </div>
                <div>
                  <h2 className="font-display font-extrabold text-2xl text-slate-900 dark:text-white">Calculate Diet Plan</h2>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Enter your details below to generate a tailored recipe regime.</p>
                </div>
              </div>

              {/* STEP INDICATORS */}
              <div className="flex justify-between items-center mb-8 max-w-md mx-auto no-print">
                {[
                  { stepNum: 1, label: 'Identity' },
                  { stepNum: 2, label: 'Routine' },
                  { stepNum: 3, label: 'Medical' },
                  { stepNum: 4, label: 'Goals' }
                ].map((s) => (
                  <div key={s.stepNum} className="flex flex-col items-center flex-1 relative">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all duration-300 ${
                      step === s.stepNum
                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20 scale-110'
                        : step > s.stepNum
                        ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-450 dark:text-slate-555'
                    }`}>
                      {step > s.stepNum ? '✓' : s.stepNum}
                    </div>
                    <span className={`text-[10px] font-bold mt-1.5 uppercase tracking-wider ${
                      step === s.stepNum ? 'text-emerald-500' : 'text-slate-400 dark:text-slate-500'
                    }`}>
                      {s.label}
                    </span>
                    {s.stepNum < 4 && (
                      <div className={`hidden sm:block absolute top-4 left-[calc(50%+1.5rem)] right-[calc(-50%+1.5rem)] h-[2px] -z-10 ${
                        step > s.stepNum ? 'bg-emerald-500' : 'bg-slate-100 dark:bg-slate-800'
                      }`} />
                    )}
                  </div>
                ))}
              </div>

              {/* VALIDATION ERROR ALERTS */}
              {validationError && (
                <div className="p-3.5 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-xl text-rose-600 dark:text-rose-450 text-xs font-semibold mb-6 flex items-center space-x-2 animate-pulse no-print">
                  <span>⚠️</span>
                  <span>{validationError}</span>
                </div>
              )}

              <form onSubmit={calculatePlan} className="space-y-6">
                
                {/* STEP 1: IDENTITY */}
                {step === 1 && (
                  <div className="space-y-6 animate-fade-in-up">
                    <h3 className="font-display font-bold text-lg text-slate-800 dark:text-white border-b border-slate-200/40 dark:border-slate-800/40 pb-2">Step 1: Patient Identity & Profile</h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Patient Name</label>
                        <input 
                          type="text" 
                          name="name" 
                          value={formData.name}
                          onChange={handleInputChange}
                          placeholder="e.g. John Doe"
                          required
                          className="w-full px-4 py-3 rounded-xl glass-input text-slate-800 dark:text-white font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Age (years)</label>
                        <input 
                          type="number" 
                          name="age" 
                          value={formData.age}
                          onChange={handleInputChange}
                          min="1" 
                          max="120" 
                          placeholder="e.g. 25"
                          required
                          className="w-full px-4 py-3 rounded-xl glass-input text-slate-800 dark:text-white font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Gender</label>
                        <select 
                          name="gender" 
                          value={formData.gender}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl glass-input text-slate-800 dark:text-white font-medium"
                        >
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Marital Status</label>
                        <select 
                          name="maritalStatus" 
                          value={formData.maritalStatus}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl glass-input text-slate-800 dark:text-white font-medium"
                        >
                          <option value="single">Single</option>
                          <option value="married">Married</option>
                          <option value="divorced">Divorced</option>
                          <option value="widowed">Widowed</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Contact Number</label>
                        <input 
                          type="text" 
                          name="contactNo" 
                          value={formData.contactNo}
                          onChange={handleInputChange}
                          placeholder="e.g. 9876543210"
                          required
                          className="w-full px-4 py-3 rounded-xl glass-input text-slate-800 dark:text-white font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Address/Region (for regional food availability)</label>
                        <input 
                          type="text" 
                          name="address" 
                          value={formData.address}
                          onChange={handleInputChange}
                          placeholder="e.g. Gujarat, Punjab, South India"
                          required
                          className="w-full px-4 py-3 rounded-xl glass-input text-slate-800 dark:text-white font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 2: ROUTINE */}
                {step === 2 && (
                  <div className="space-y-6 animate-fade-in-up">
                    <h3 className="font-display font-bold text-lg text-slate-800 dark:text-white border-b border-slate-200/40 dark:border-slate-800/40 pb-2">Step 2: Occupation, Habits & Routine</h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Occupation</label>
                        <select
                          name="occupationSelect"
                          value={['IT/Software', 'Healthcare', 'Education', 'Engineering', 'Finance', 'Student', 'Homemaker'].includes(formData.occupation) ? formData.occupation : (formData.occupation ? 'Others' : '')}
                          onChange={(e) => {
                            if (e.target.value !== 'Others') {
                              setFormData(p => ({...p, occupation: e.target.value}));
                            } else {
                              setFormData(p => ({...p, occupation: ''}));
                            }
                          }}
                          className="w-full px-4 py-3 rounded-xl glass-input text-slate-800 dark:text-white font-medium mb-2"
                        >
                          <option value="">Select Occupation...</option>
                          <option value="IT/Software">IT/Software</option>
                          <option value="Healthcare">Healthcare</option>
                          <option value="Education">Education</option>
                          <option value="Engineering">Engineering</option>
                          <option value="Finance">Finance</option>
                          <option value="Student">Student</option>
                          <option value="Homemaker">Homemaker</option>
                          <option value="Others">Others</option>
                        </select>
                        {(!['IT/Software', 'Healthcare', 'Education', 'Engineering', 'Finance', 'Student', 'Homemaker', ''].includes(formData.occupation) || formData.occupation === '') && (
                          <input 
                            type="text" 
                            name="occupation" 
                            value={formData.occupation}
                            onChange={handleInputChange}
                            placeholder="Please specify your occupation"
                            className="w-full px-4 py-3 rounded-xl glass-input text-slate-800 dark:text-white font-medium placeholder:text-slate-400"
                          />
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Daily Water Intake Target (Liters)</label>
                        <input 
                          type="number" 
                          name="dailyWaterIntake" 
                          value={formData.dailyWaterIntake}
                          onChange={handleInputChange}
                          min="0" 
                          max="10" 
                          step="0.1"
                          placeholder="e.g. 2.5"
                          required
                          className="w-full px-4 py-3 rounded-xl glass-input text-slate-800 dark:text-white font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Sleep Schedule</label>
                        <div className="flex gap-2">
                          <input type="time" className="w-full px-4 py-3 rounded-xl glass-input text-slate-800 dark:text-white font-medium" onChange={(e) => setFormData(p => ({...p, sleepSchedule: e.target.value + ' - ' + (p.sleepSchedule.split(' - ')[1] || '')}))} />
                          <span className="self-center">to</span>
                          <input type="time" className="w-full px-4 py-3 rounded-xl glass-input text-slate-800 dark:text-white font-medium" onChange={(e) => setFormData(p => ({...p, sleepSchedule: (p.sleepSchedule.split(' - ')[0] || '') + ' - ' + e.target.value}))} />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Work Schedule</label>
                        <div className="flex gap-2">
                          <input type="time" className="w-full px-4 py-3 rounded-xl glass-input text-slate-800 dark:text-white font-medium" onChange={(e) => setFormData(p => ({...p, workSchedule: e.target.value + ' - ' + (p.workSchedule.split(' - ')[1] || '')}))} />
                          <span className="self-center">to</span>
                          <input type="time" className="w-full px-4 py-3 rounded-xl glass-input text-slate-800 dark:text-white font-medium" onChange={(e) => setFormData(p => ({...p, workSchedule: (p.workSchedule.split(' - ')[0] || '') + ' - ' + e.target.value}))} />
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Addictions / Daily Habits</label>
                      <select
                        name="addictions"
                        value={formData.addictions}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 rounded-xl glass-input text-slate-800 dark:text-white font-medium"
                      >
                        <option value="None">None</option>
                        <option value="Smoking">Smoking</option>
                        <option value="Alcohol">Alcohol</option>
                        <option value="Excessive Caffeine">Excessive Caffeine</option>
                        <option value="Sweet Tooth">Sweet Tooth</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* STEP 3: MEDICAL */}
                {step === 3 && (
                  <div className="space-y-6 animate-fade-in-up">
                    <h3 className="font-display font-bold text-lg text-slate-800 dark:text-white border-b border-slate-200/40 dark:border-slate-800/40 pb-2">Step 3: Medical Profile & Conditions</h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Height</label>
                          <div className="flex gap-2 bg-slate-200 dark:bg-slate-700 p-1 rounded-lg">
                            <button type="button" className={`px-2 py-1 text-xs rounded-md ${heightUnit === 'cm' ? 'bg-white dark:bg-slate-600 shadow-sm' : ''}`} onClick={() => setHeightUnit('cm')}>cm</button>
                            <button type="button" className={`px-2 py-1 text-xs rounded-md ${heightUnit === 'ft' ? 'bg-white dark:bg-slate-600 shadow-sm' : ''}`} onClick={() => setHeightUnit('ft')}>ft/in</button>
                          </div>
                        </div>
                        {heightUnit === 'cm' ? (
                          <input 
                            type="number" 
                            name="height" 
                            value={formData.height}
                            onChange={handleInputChange}
                            min="50" max="250" placeholder="e.g. 175" required
                            className="w-full px-4 py-3 rounded-xl glass-input text-slate-800 dark:text-white font-medium placeholder:text-slate-400"
                          />
                        ) : (
                          <div className="flex gap-2">
                            <input 
                              type="number" 
                              placeholder="ft" 
                              value={heightFt}
                              onChange={(e) => {
                                setHeightFt(e.target.value);
                                const totalCm = Math.round((parseInt(e.target.value || 0) * 30.48) + (parseInt(heightIn || 0) * 2.54));
                                setFormData(p => ({...p, height: totalCm}));
                              }}
                              className="w-1/2 px-4 py-3 rounded-xl glass-input text-slate-800 dark:text-white font-medium"
                            />
                            <input 
                              type="number" 
                              placeholder="in" 
                              value={heightIn}
                              onChange={(e) => {
                                setHeightIn(e.target.value);
                                const totalCm = Math.round((parseInt(heightFt || 0) * 30.48) + (parseInt(e.target.value || 0) * 2.54));
                                setFormData(p => ({...p, height: totalCm}));
                              }}
                              className="w-1/2 px-4 py-3 rounded-xl glass-input text-slate-800 dark:text-white font-medium"
                            />
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Weight (kg)</label>
                        <input 
                          type="number" 
                          name="weight" 
                          value={formData.weight}
                          onChange={handleInputChange}
                          min="10" 
                          max="300" 
                          placeholder="e.g. 70"
                          required
                          className="w-full px-4 py-3 rounded-xl glass-input text-slate-800 dark:text-white font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Special Physiological Condition</label>
                        <select 
                          name="physiologicalCondition" 
                          value={formData.physiologicalCondition}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl glass-input text-slate-800 dark:text-white font-medium"
                        >
                          <option value="none">None</option>
                          <option value="pregnancy">Pregnancy (+350 kcal, +25g Protein)</option>
                          <option value="lactation">Lactation (+500 kcal, +20g Protein)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Active Injury History (For Workout Safety)</label>
                        <select 
                          name="injuryHistory" 
                          value={formData.injuryHistory}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl glass-input text-slate-800 dark:text-white font-medium"
                        >
                          <option value="none">None (No active injuries)</option>
                          <option value="acl">ACL Tear (Lower-body safety filters)</option>
                          <option value="knee">Knee Pain (No deep bending/jumping)</option>
                          <option value="shoulder">Shoulder Injury (No overhead press/pushups)</option>
                          <option value="back">Back Pain (No deadlifts/spine loading)</option>
                          <option value="bone">Bone Fracture / Recovery (High Calcium boost)</option>
                          <option value="muscle">Muscle/Ligament Strain or Tear (High Protein boost)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Surgical History</label>
                        <input 
                          type="text" 
                          name="surgicalHistory" 
                          value={formData.surgicalHistory}
                          onChange={handleInputChange}
                          placeholder="e.g. Appendectomy (2022), None"
                          className="w-full px-4 py-3 rounded-xl glass-input text-slate-800 dark:text-white font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500"
                        />
                      </div>
                      <div className="relative">
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Medical History (Chronic Diseases)</label>
                        <button
                          type="button"
                          onClick={() => setMedicalDropdownOpen(!medicalDropdownOpen)}
                          className="w-full px-4 py-3 rounded-xl glass-input text-slate-850 dark:text-white font-medium text-left flex justify-between items-center outline-none focus:outline-none"
                        >
                          <span className="truncate">
                            {formData.medicalHistory ? formData.medicalHistory.split(',').map(x => x.trim().replace(/\b\w/g, c => c.toUpperCase())).join(', ') : 'None / Healthy Profile'}
                          </span>
                          <ChevronDown size={18} className={`transition-transform duration-200 ${medicalDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        
                        {medicalDropdownOpen && (
                          <>
                            <div className="fixed inset-0 z-30" onClick={() => setMedicalDropdownOpen(false)} />
                            <div className="absolute left-0 right-0 mt-2 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl z-40 max-h-60 overflow-y-auto space-y-1.5 animate-fade-in-up">
                              {[
                                { key: 'none', label: 'None / Healthy Profile' },
                                { key: 'diabetes', label: 'Diabetes' },
                                { key: 'hypertension', label: 'Hypertension (High BP)' },
                                { key: 'thyroid', label: 'Thyroid Condition' },
                                { key: 'pcos', label: 'PCOS / PCOD' },
                                { key: 'gerd', label: 'Acid Reflux / GERD' },
                                { key: 'cardiovascular', label: 'Cardiovascular (Heart) Disease' },
                                { key: 'fatty_liver', label: 'Fatty Liver' },
                                { key: 'obesity', label: 'Obesity' }
                              ].map(cond => {
                                const list = formData.medicalHistory ? formData.medicalHistory.split(',').map(x => x.trim().toLowerCase()).filter(Boolean) : [];
                                const isSelected = list.includes(cond.key);
                                
                                return (
                                  <label key={cond.key} className="flex items-center space-x-2.5 px-3 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={() => {
                                        let updated = [];
                                        if (cond.key === 'none') {
                                          updated = ['none'];
                                        } else {
                                          const filtered = list.filter(x => x !== 'none');
                                          if (filtered.includes(cond.key)) {
                                            updated = filtered.filter(x => x !== cond.key);
                                          } else {
                                            updated = [...filtered, cond.key];
                                          }
                                          if (updated.length === 0) {
                                            updated = ['none'];
                                          }
                                        }
                                        setFormData(prev => ({
                                          ...prev,
                                          medicalHistory: updated.join(', ')
                                        }));
                                      }}
                                      className="rounded text-emerald-500 focus:ring-emerald-500 w-4 h-4 border-slate-300"
                                    />
                                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-350">{cond.label}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Hormonal Disturbance</label>
                        <input 
                          type="text" 
                          name="hormonalDisturbance" 
                          value={formData.hormonalDisturbance}
                          onChange={handleInputChange}
                          placeholder="e.g. PCOS, Thyroid (Hypo), None"
                          className="w-full px-4 py-3 rounded-xl glass-input text-slate-800 dark:text-white font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Nutritional Deficiencies (Select All That Apply)</label>
                      <div className="flex flex-wrap gap-2.5">
                        {[
                          { key: 'not_known', label: 'Not Known' },
                          { key: 'vitamin_d', label: 'Vitamin D' },
                          { key: 'vitamin_b12', label: 'Vitamin B12' },
                          { key: 'iron', label: 'Iron (Anemia)' },
                          { key: 'calcium', label: 'Calcium' },
                          { key: 'none', label: 'None' }
                        ].map((def) => {
                          const isSelected = formData.nutritionalDeficiency.split(',').map(x => x.trim()).includes(def.key);
                          return (
                            <button
                              key={def.key}
                              type="button"
                              onClick={() => handleDeficiencyToggle(def.key)}
                              className={`px-4 py-2.5 rounded-xl border text-xs font-bold transition-all duration-200 ${
                                isSelected 
                                  ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-500/10' 
                                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800/80 text-slate-650 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                              }`}
                            >
                              {isSelected ? '✓ ' : '+ '} {def.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Allergies & Intolerances</label>
                      <input 
                        type="text" 
                        name="allergies" 
                        value={formData.allergies}
                        onChange={handleInputChange}
                        placeholder="e.g. Lactose Intolerance, Gluten Sensitive, None"
                        className="w-full px-4 py-3 rounded-xl glass-input text-slate-800 dark:text-white font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500"
                      />
                    </div>
                  </div>
                )}

                {/* STEP 4: GOAL & PREFERENCES */}
                {step === 4 && (
                  <div className="space-y-6 animate-fade-in-up">
                    <h3 className="font-display font-bold text-lg text-slate-800 dark:text-white border-b border-slate-200/40 dark:border-slate-800/40 pb-2">Step 4: Goals, Preferences & Meals</h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Diet & Fitness Goal</label>
                        <select 
                          name="goal" 
                          value={formData.goal}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl glass-input text-slate-800 dark:text-white font-medium"
                        >
                          <option value="weight_loss">Weight Loss (Caloric Deficit)</option>
                          <option value="aggressive_weight_loss">Aggressive Weight Loss (Strict Deficit)</option>
                          <option value="maintenance">Weight Maintenance</option>
                          <option value="muscle_gain">Muscle Gain (High Protein Surplus)</option>
                          <option value="weight_gain">Weight Gain (Calorie Surplus)</option>
                          <option value="sports">Sports Performance (High Carb/High Protein)</option>
                          <option value="recovery">Recovery after Injury/Surgery</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Diet Preference</label>
                        <select 
                          name="dietType" 
                          value={formData.dietType}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl glass-input text-slate-800 dark:text-white font-medium"
                        >
                          <option value="vegetarian">Indian Vegetarian (Standard)</option>
                          <option value="non veg">Indian Non Veg (Eggs, Chicken, Fish, Mutton)</option>
                          <option value="vegan">Vegan (No dairy/animal-products)</option>
                          <option value="jain">Jain (No root vegetables)</option>
                          <option value="punjabi">Punjabi Style Diet</option>
                          <option value="gujarati">Gujarati Style Diet</option>
                          <option value="south_indian">South Indian Style Diet</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Plan Start Date</label>
                        <input 
                          type="date" 
                          name="startDate" 
                          value={formData.startDate}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl glass-input text-slate-800 dark:text-white font-medium mb-4 focus:ring-2 focus:ring-indigo-500 transition-all shadow-sm bg-white/50 dark:bg-slate-800/50"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Religious Custom Preference</label>
                        <select 
                          name="religiousPreference" 
                          value={formData.religiousPreference}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl glass-input text-slate-800 dark:text-white font-medium mb-4"
                        >
                          <option value="None">None</option>
                          <option value="Jain (No Root Vegetables)">Jain (No Root Vegetables)</option>
                          <option value="Swaminarayan (No Onion/Garlic)">Swaminarayan (No Onion/Garlic)</option>
                          <option value="Vrat (Fasting)">Vrat (Fasting)</option>
                          <option value="Brahmin (Strict Vegetarian)">Brahmin (Strict Vegetarian)</option>
                          <option value="Vegan">Vegan</option>
                        </select>

                        {formData.religiousPreference === 'Vrat (Fasting)' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 p-4 bg-orange-50/50 dark:bg-orange-900/20 rounded-xl border border-orange-100 dark:border-orange-800/30">
                            <div className="col-span-1 sm:col-span-2">
                              <label className="block text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wider mb-2">Select Vrat Days</label>
                              <div className="flex flex-wrap gap-2">
                                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                                  <label key={day} className={`px-3 py-1.5 rounded-lg text-sm font-medium cursor-pointer border transition-colors ${formData.vratDays && formData.vratDays.includes(day) ? 'bg-orange-500 text-white border-orange-500' : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}>
                                    <input 
                                      type="checkbox" 
                                      className="hidden" 
                                      checked={formData.vratDays && formData.vratDays.includes(day)}
                                      onChange={(e) => {
                                        const current = formData.vratDays || [];
                                        if (e.target.checked) setFormData(p => ({...p, vratDays: [...current, day]}));
                                        else setFormData(p => ({...p, vratDays: current.filter(d => d !== day)}));
                                      }}
                                    />
                                    {day}
                                  </label>
                                ))}
                              </div>
                            </div>
                            <div>
                              <label className="block text-xs font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wider mb-2">Vrat Type</label>
                              <select name="vratType" value={formData.vratType} onChange={handleInputChange} className="w-full px-4 py-3 rounded-xl glass-input text-slate-800 dark:text-white font-medium">
                                <option value="Fruits & Milk Only">Fruits & Milk Only</option>
                                <option value="No Grains (Navratri/Ekadashi)">No Grains (Navratri/Ekadashi)</option>
                                <option value="Water Fast Only">Water Fast Only</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Eating Customs</label>
                        <select
                          name="eatingCustoms"
                          value={formData.eatingCustoms}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl glass-input text-slate-800 dark:text-white font-medium"
                        >
                          <option value="Standard (3-5 meals)">Standard (3-5 meals)</option>
                          <option value="Intermittent Fasting (16:8)">Intermittent Fasting (16:8)</option>
                          <option value="OMAD (One Meal a Day)">OMAD (One Meal a Day)</option>
                          <option value="Two Meals a Day">Two Meals a Day</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Expected Outcomes</label>
                        <select
                          name="expectedOutcome"
                          value={formData.expectedOutcome}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl glass-input text-slate-800 dark:text-white font-medium"
                        >
                          <option value="Weight Loss">Weight Loss</option>
                          <option value="Muscle Gain">Muscle Gain</option>
                          <option value="Recomposition (Burn Fat & Build Muscle)">Recomposition (Burn Fat & Build Muscle)</option>
                          <option value="General Health & Maintenance">General Health & Maintenance</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Results Expected By When</label>
                        <select
                          name="resultsExpectedBy"
                          value={formData.resultsExpectedBy}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl glass-input text-slate-800 dark:text-white font-medium"
                        >
                          <option value="1 Month (Aggressive)">1 Month (Aggressive)</option>
                          <option value="3 Months (Moderate)">3 Months (Moderate)</option>
                          <option value="6 Months (Sustainable)">6 Months (Sustainable)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Exercise / Activity Level</label>
                        <select 
                          name="activityLevel" 
                          value={formData.activityLevel}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl glass-input text-slate-800 dark:text-white font-medium"
                        >
                          <option value="sedentary">Sedentary (desk job, no exercise)</option>
                          <option value="light">Light Activity (light exercise 1-3 days/wk)</option>
                          <option value="moderate">Moderate Activity (exercise 3-5 days/wk)</option>
                          <option value="very_active">Very Active (heavy exercise 6-7 days/wk)</option>
                          <option value="extra_active">Extra Active (athletic physical training)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Workout Equipment Available</label>
                        <select 
                          name="equipment" 
                          value={formData.equipment}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 rounded-xl glass-input text-slate-800 dark:text-white font-medium"
                        >
                          <option value="bodyweight">Bodyweight / No Equipment</option>
                          <option value="dumbbells">Dumbbells only</option>
                          <option value="bands">Resistance Bands only</option>
                          <option value="all">Full Gym (Dumbbells + Bands)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">Active Meals to Include</label>
                      <div className="flex flex-wrap gap-2.5">
                        {[
                          { key: 'breakfast', label: 'Breakfast' },
                          { key: 'mid_morning_snack', label: 'Mid-Morning Snack' },
                          { key: 'lunch', label: 'Lunch' },
                          { key: 'evening_snack', label: 'Evening Snack' },
                          { key: 'dinner', label: 'Dinner' }
                        ].map((m) => {
                          const active = formData.activeMeals.includes(m.key);
                          return (
                            <button
                              type="button"
                              key={m.key}
                              onClick={() => handleMealCheckboxChange(m.key)}
                              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 border ${
                                active 
                                  ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm shadow-emerald-500/10' 
                                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-450 hover:bg-slate-50 dark:hover:bg-slate-800'
                              }`}
                            >
                              {active ? '✓ ' : '+ '} {m.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {/* NAVIGATION BUTTONS */}
                <div className="flex justify-between items-center pt-4 border-t border-slate-200/40 dark:border-slate-800/40 no-print">
                  {step > 1 ? (
                    <button
                      type="button"
                      onClick={handleBack}
                      className="px-5 py-3 bg-slate-100 dark:bg-slate-850 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold rounded-xl transition-all duration-150 text-xs sm:text-sm"
                    >
                      Back
                    </button>
                  ) : (
                    <div />
                  )}

                  {step < 4 ? (
                    <button
                      key="next-btn"
                      type="button"
                      onClick={handleNext}
                      className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl shadow-lg hover:shadow-emerald-500/20 hover:scale-[1.01] transition-all duration-150 flex items-center space-x-1.5 text-xs sm:text-sm"
                    >
                      <span>Next Step</span>
                      <ArrowRight size={16} />
                    </button>
                  ) : (
                    <button 
                      key="submit-btn"
                      type="button"
                      onClick={calculatePlan}
                      className="px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold rounded-xl shadow-lg hover:shadow-emerald-500/20 hover:scale-[1.01] active:scale-[0.99] transition-all duration-155 flex items-center justify-center space-x-2 text-xs sm:text-sm"
                    >
                      <Sparkles size={16} />
                      <span>Generate regime</span>
                    </button>
                  )}
                </div>

              </form>
            </div>
            
            {/* INLINE FOOD SEARCH */}
            <div id="foods-database" className="max-w-5xl mx-auto space-y-6 pt-4 scroll-mt-24">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="font-display font-extrabold text-2xl text-slate-800 dark:text-white">Indian Food Nutrition database</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Search calories, proteins, carbohydrates, and fats for vegetarian meals.</p>
                </div>
                
                {/* Category selectors */}
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'All Categories', value: '' },
                    { label: 'Breakfast', value: 'breakfast' },
                    { label: 'Lunch & Dinner', value: 'lunch' },
                    { label: 'Snacks', value: 'snacks' }
                  ].map((cat) => (
                    <button
                      key={cat.value}
                      onClick={() => setFoodCategory(cat.value)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
                        foodCategory === cat.value 
                        ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/10' 
                        : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Search Bar */}
              <form onSubmit={handleSearchSubmit} className="flex gap-3">
                <div className="relative flex-1">
                  <Search size={18} className="absolute left-4.5 top-3.5 text-slate-400 dark:text-slate-500" />
                  <input
                    type="text"
                    value={foodSearch}
                    onChange={(e) => setFoodSearch(e.target.value)}
                    placeholder="Search Indian foods (e.g., idli, dosa, paneer, sprouts)..."
                    className="w-full pl-12 pr-4 py-3 rounded-2xl glass-input text-slate-800 dark:text-white font-medium placeholder:text-slate-400 dark:placeholder:text-slate-500"
                  />
                </div>
                <button
                  type="submit"
                  className="px-6 py-3 bg-slate-900 dark:bg-emerald-600 hover:bg-slate-800 dark:hover:bg-emerald-700 text-white font-semibold rounded-2xl shadow-sm transition-all duration-150 flex items-center gap-1.5"
                >
                  <span>Search</span>
                </button>
              </form>

              {/* Foods cards list */}
              {searchingFoods ? (
                <div className="flex justify-center items-center py-16">
                  <RefreshCw className="animate-spin text-emerald-500" size={32} />
                </div>
              ) : foodsList.length === 0 ? (
                <div className="text-center py-12 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
                  <p className="text-slate-500 dark:text-slate-400 font-medium">No Indian food items found matching "{foodSearch}". Try another search term!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {foodsList.map((food, i) => (
                    <div 
                      key={food.id || i}
                      className="glass-card p-4 rounded-xl border border-slate-200/50 hover:border-emerald-300 dark:hover:border-emerald-900/60 transition-all duration-200 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex justify-between items-start mb-1.5 gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <h4 className="font-display font-bold text-slate-800 dark:text-white text-base leading-tight capitalize truncate" title={food.name}>{food.name}</h4>
                            <FoodTypeBadge isVeg={food.is_veg === 1} />
                          </div>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800/80 text-slate-500 dark:text-slate-400 shrink-0">
                            {food.category === 'lunch' || food.category === 'dinner' ? 'Main Meal' : food.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-3">Serving size: {food.serving_size}</p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-200/20 dark:border-slate-800/20 text-[10px] text-slate-500 dark:text-slate-400 space-y-0.5">
                        <p><span className="font-bold text-slate-650 dark:text-slate-400">Vitamins:</span> {food.vitamins || 'B-complex'}</p>
                        <p><span className="font-bold text-slate-650 dark:text-slate-400">Amino Acids:</span> {food.amino_acids || 'Glutamic Acid'}</p>
                      </div>
                      
                      <div className="border-t border-slate-200/40 dark:border-slate-800/40 pt-3 mt-1 flex justify-between items-center text-center">
                        <div>
                          <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Calories</p>
                          <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{Math.round(food.calories)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Protein</p>
                          <p className="text-sm font-bold text-blue-600 dark:text-blue-400">{food.protein}g</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Carbs</p>
                          <p className="text-sm font-bold text-amber-500">{food.carbs}g</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Fats</p>
                          <p className="text-sm font-bold text-rose-500">{food.fats}g</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* LOADING ANIMATION */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-32 space-y-6 animate-pulse">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-emerald-100 dark:border-emerald-950 border-t-emerald-500 animate-spin" />
              <Sparkles className="absolute inset-0 m-auto text-emerald-500 animate-bounce" size={24} />
            </div>
            <div className="text-center space-y-1.5">
              <h3 className="font-display font-extrabold text-xl text-slate-800 dark:text-white">Assembling custom diet algorithm...</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm">Calculating nutrient benchmarks and searching food options for {formData.name}.</p>
            </div>
          </div>
        )}

        {/* DIET PLAN & ANALYTICS DASHBOARD */}
        {dietPlan && !loading && (
          <div className="space-y-8 animate-fade-in-up">
            
            {/* DASHBOARD HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/40 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/30 p-6 rounded-2xl backdrop-blur-md no-print">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-green-500 flex items-center justify-center text-white shadow-md">
                  <User size={24} />
                </div>
                <div>
                  <h1 className="font-display font-extrabold text-2xl text-slate-800 dark:text-white">Welcome {formData.name || 'User'}!</h1>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                    Diet goal: <span className="font-semibold text-emerald-600 dark:text-emerald-400 capitalize">{formData.goal.replace('_', ' ')}</span> &bull; Diet preference: <span className="font-semibold text-emerald-600 dark:text-emerald-400 capitalize">{formData.dietType}</span>
                  </p>
                </div>
              </div>
              <div className="flex gap-2.5 w-full md:w-auto">
                <button
                  onClick={handlePrint}
                  className="flex-1 md:flex-initial inline-flex items-center justify-center px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl shadow-md shadow-emerald-500/10 transition-all duration-200 text-sm"
                >
                  <FileText size={16} className="mr-1.5" />
                  <span>Download PDF Report</span>
                </button>
                <button
                  onClick={() => setDietPlan(null)}
                  className="flex-1 md:flex-initial inline-flex items-center justify-center px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-all duration-200 text-sm"
                >
                  <RotateCcw size={16} className="mr-1.5" />
                  <span>Recalculate Plan</span>
                </button>
              </div>
            </div>

            {/* PRINT HEADER ONLY VISIBLE ON PDF PRINT */}
            <div className="hidden print:block border-b-2 border-emerald-500 pb-4 mb-6">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="font-display font-extrabold text-3xl text-slate-900">Gyromotion NutriPlan</h1>
                  <p className="text-sm text-slate-500 font-medium">Made by Pratham | Personalized Indian Diet Plan</p>
                  <p className="text-[10px] text-amber-600 font-bold mt-1">⚠️ NutriPlan is an AI and can make mistakes. Consult your Dietitian if in doubt.</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">Patient: {formData.name}</p>
                  <p className="text-xs text-slate-500">Age: {formData.age} | Current Weight: {formData.weight}kg</p>
                </div>
              </div>
            </div>

            {/* ANALYTICS ROW / METRIC CARDS */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              
              {/* BMI Card */}
              <div className="glass-card p-5 rounded-2xl border border-slate-200/50 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Body Mass Index</span>
                  <div className="flex items-baseline space-x-1.5 mt-1">
                    <span className="font-display font-extrabold text-2xl text-slate-800 dark:text-white">{bmiData?.bmi}</span>
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">kg/m²</span>
                  </div>
                </div>
                <div className="mt-3">
                  <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-400 border border-emerald-200/20">
                    {bmiData?.category}
                  </span>
                </div>
              </div>

              {/* BMR Card */}
              <div className="glass-card p-5 rounded-2xl border border-slate-200/50 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Basal Metabolic Rate</span>
                  <div className="flex items-baseline space-x-1.5 mt-1">
                    <span className="font-display font-extrabold text-2xl text-slate-800 dark:text-white">{bmrData?.bmr}</span>
                    <span className="text-xs font-semibold text-orange-600">kcal/day</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2">BMR is caloric burn at complete rest.</p>
              </div>

              {/* TDEE Card */}
              <div className="glass-card p-5 rounded-2xl border border-slate-200/50 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Total Energy Burn</span>
                  <div className="flex items-baseline space-x-1.5 mt-1">
                    <span className="font-display font-extrabold text-2xl text-slate-800 dark:text-white">{bmrData?.tdee}</span>
                    <span className="text-xs font-semibold text-amber-600">kcal/day</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2">TDEE accounts for your active multiplier.</p>
              </div>

              {/* Calorie Target Card */}
              <div className="glass-card p-5 rounded-2xl border border-slate-200/50 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Diet Calorie Target</span>
                  <div className="flex items-baseline space-x-1.5 mt-1">
                    <span className="font-display font-extrabold text-2xl text-slate-800 dark:text-white">{dietPlan?.target_calories}</span>
                    <span className="text-xs font-semibold text-rose-600">kcal/day</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2">Deficit configured to trigger fat loss.</p>
              </div>

              {/* Protein Target Card */}
              <div className="glass-card p-5 rounded-2xl border border-slate-200/50 col-span-2 md:col-span-1 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Protein Target</span>
                  <div className="flex items-baseline space-x-1.5 mt-1">
                    <span className="font-display font-extrabold text-2xl text-slate-800 dark:text-white">{dietPlan?.target_protein_g}</span>
                    <span className="text-xs font-semibold text-blue-600">grams/day</span>
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2">Derived at ~1.4g protein per kg weight.</p>
              </div>

            </div>

            {/* DASHBOARD CHARTS ROW */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Chart 1: Target Calories vs Actual Diet Calories */}
              <div className="glass-card p-6 rounded-3xl border border-slate-200/50 flex flex-col justify-between h-[340px]">
                <div>
                  <h3 className="font-display font-bold text-slate-800 dark:text-white text-base mb-1">Calorie Balance Summary</h3>
                  <div className="grid grid-cols-2 gap-4 mt-4 text-sm bg-slate-50/50 dark:bg-slate-800/30 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="flex flex-col">
                      <span className="text-slate-400 text-xs font-semibold uppercase">Target</span>
                      <span className="font-bold text-slate-700 dark:text-white">{dietPlan.target_calories} kcal</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-slate-400 text-xs font-semibold uppercase">Actual</span>
                      <span className="font-bold text-slate-700 dark:text-white">{dietPlan.totals.calories} kcal</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-slate-400 text-xs font-semibold uppercase">Difference</span>
                      <span className={`font-bold ${dietPlan.totals.calories - dietPlan.target_calories > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                        {dietPlan.totals.calories - dietPlan.target_calories > 0 ? '+' : ''}{(dietPlan.totals.calories - dietPlan.target_calories).toFixed(0)} kcal
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-slate-400 text-xs font-semibold uppercase">Status</span>
                      <span className={`font-bold ${Math.abs(dietPlan.totals.calories - dietPlan.target_calories) <= dietPlan.target_calories * 0.1 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {Math.abs(dietPlan.totals.calories - dietPlan.target_calories) <= dietPlan.target_calories * 0.1 ? '✓ Within tolerance' : '✗ Out of bounds'}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex-1 min-h-0 mt-4 print:hidden">
                  <ResponsiveContainer width="100%" height="100%" key={`calorie-${chartRenderKey}-${darkMode}`}>
                    <BarChart
                      data={[
                        { name: 'Target Target', kcal: dietPlan.target_calories, color: '#f43f5e' },
                        { name: 'Meal Plan Total', kcal: dietPlan.totals.calories, color: '#10b981' }
                      ]}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartStrokeColor} />
                      <XAxis dataKey="name" stroke={chartTextColor} fontSize={11} tickLine={false} />
                      <YAxis stroke={chartTextColor} fontSize={11} tickLine={false} />
                      <Tooltip cursor={{ fill: 'rgba(0, 0, 0, 0.03)' }} />
                      <Bar dataKey="kcal" radius={[8, 8, 0, 0]}>
                        <Cell fill="#f43f5e" />
                        <Cell fill="#10b981" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Chart 2: Macro Pie Distribution */}
              <div className="glass-card p-6 rounded-3xl border border-slate-200/50 flex flex-col justify-between h-[340px]">
                <div>
                  <h3 className="font-display font-bold text-slate-800 dark:text-white text-base mb-1">Macro Energy Distribution</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Macronutrient calorie splits for the recommended diet plan.</p>
                </div>
                <div className="flex-1 flex items-center justify-center min-h-0">
                  <div className="w-[180px] h-[180px] relative">
                    <ResponsiveContainer width="100%" height="100%" key={`macro-${chartRenderKey}-${darkMode}`}>
                      <PieChart>
                        <Pie
                          data={macroPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {macroPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value, name, props) => [`${value} kcal (${props.payload.grams}g)`, name]} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total</span>
                      <span className="text-base font-extrabold text-slate-700 dark:text-white">{dietPlan.totals.calories} kcal</span>
                    </div>
                  </div>
                </div>
                {/* Labels legend */}
                <div className="flex justify-around text-center text-xs mt-2 border-t border-slate-200/30 dark:border-slate-800/30 pt-3">
                  {macroPieData.map((item, idx) => (
                    <div key={idx}>
                      <span className="inline-block w-2.5 h-2.5 rounded-full mr-1.5 align-middle" style={{ backgroundColor: item.color }} />
                      <span className="text-slate-500 dark:text-slate-400 font-semibold">{item.name}</span>
                      <p className="font-bold text-slate-800 dark:text-white text-xs mt-0.5">{item.grams}g</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chart 3: 12-Week Weight Projection Curve */}
              <div className="glass-card p-6 rounded-3xl border border-slate-200/50 flex flex-col justify-between h-[340px]">
                <div>
                  <h3 className="font-display font-bold text-slate-800 dark:text-white text-base mb-1">12-Week Weight Projection</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mb-4">Estimated target progress curve targeting weight loss.</p>
                </div>
                <div className="flex-1 min-h-0">
                  <ResponsiveContainer width="100%" height="100%" key={`weight-${chartRenderKey}-${darkMode}`}>
                    <AreaChart
                      data={weightProj}
                      margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartStrokeColor} />
                      <XAxis dataKey="week" stroke={chartTextColor} fontSize={10} tickLine={false} />
                      <YAxis domain={['auto', 'auto']} stroke={chartTextColor} fontSize={10} tickLine={false} />
                      <Tooltip />
                      <Area type="monotone" dataKey="weight" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#weightGrad)" name="Weight (kg)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* WATER INTAKE TRACKER */}
            <div className="glass-card p-6 rounded-3xl border border-slate-200/50 flex flex-col md:flex-row justify-between items-center gap-6 no-print">
              <div className="flex items-center space-x-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-100 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center animate-bounce" style={{ animationDuration: '3s' }}>
                  <Droplet size={32} />
                </div>
                <div>
                  <h3 className="font-display font-bold text-slate-800 dark:text-white text-lg">Daily Water Intake Calculator</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Your suggested goal: <span className="font-semibold text-slate-800 dark:text-white">{formData.weight * 35}ml</span> ({waterGoalCups} cups of 250ml each).
                  </p>
                </div>
              </div>

              {/* Water Cups counter */}
              <div className="flex flex-col items-center md:items-end gap-3 w-full md:w-auto">
                <div className="flex items-center space-x-2">
                  <span className="text-2xl font-extrabold text-blue-600">{waterCups * 250}ml</span>
                  <span className="text-sm text-slate-400 dark:text-slate-500">/ {waterGoalCups * 250}ml</span>
                  {waterCups >= waterGoalCups && (
                    <span className="animate-bounce inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-400 border border-green-200">
                      🎉 Goal Reached!
                    </span>
                  )}
                </div>
                
                {/* Cups icons container */}
                <div className="flex items-center gap-4 flex-wrap justify-center md:justify-end">
                  {Array.from({ length: waterGoalCups }).map((_, i) => (
                    <WaterGlass
                      key={i}
                      filled={i < waterCups}
                      time={getWaterTime(i, waterGoalCups)}
                      onClick={() => setWaterCups(i + 1)}
                    />
                  ))}
                  
                  {/* Reset button */}
                  <button 
                    onClick={() => setWaterCups(0)}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-450 hover:text-slate-650 dark:hover:text-white transition-colors ml-1 shadow-sm"
                    title="Reset Water tracker"
                  >
                    <RotateCcw size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* WEEKLY DIET PLAN / MEAL PLANS CARDS */}
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h2 className="font-display font-extrabold text-2xl text-slate-800 dark:text-white">Meal Plan Recommendations</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Nutritionally calibrated portions for healthy Indian vegetarian macro metrics.</p>
                </div>

                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200/40 dark:border-slate-800/40 no-print">
                  <button
                    onClick={() => setDietViewMode('daily')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                      dietViewMode === 'daily'
                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/10'
                        : 'text-slate-650 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    Daily Plan
                  </button>
                  <button
                    onClick={() => setDietViewMode('monthly')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                      dietViewMode === 'monthly'
                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/10'
                        : 'text-slate-650 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white'
                    }`}
                  >
                    30-Day Calendar
                  </button>
                </div>
              </div>

              {/* ADVISORIES & GUIDELINES GRID */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                {/* Medical Tip / Advisory Card */}
                {dietPlan.medical_tip && (
                  <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-250 dark:border-emerald-900/60 rounded-2xl flex items-start space-x-3 text-emerald-800 dark:text-emerald-300 animate-fade-in-up md:col-span-2">
                    <span className="text-lg leading-none mt-0.5">⚕️</span>
                    <div>
                      <h4 className="font-bold text-sm">Personalized Dietary Recommendation Advisory</h4>
                      <p className="text-xs mt-0.5 leading-relaxed whitespace-pre-line">{dietPlan.medical_tip}</p>
                    </div>
                  </div>
                )}
                {/* Salad Recommendation Card */}
                <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 rounded-2xl flex items-start space-x-3 text-emerald-800 dark:text-emerald-300 animate-fade-in-up">
                  <span className="text-lg leading-none mt-0.5">🥗</span>
                  <div>
                    <h4 className="font-bold text-sm">Standard Healing Salad Recommendation</h4>
                    <p className="text-xs mt-0.5 leading-relaxed">{dietPlan.salad.description}</p>
                    <div className="flex flex-wrap gap-2.5 mt-2.5 text-[10px] font-extrabold uppercase">
                      <span className="bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 rounded text-emerald-700 dark:text-emerald-300">{dietPlan.salad.calories} kcal</span>
                      <span className="bg-blue-100 dark:bg-blue-900/40 px-2 py-0.5 rounded text-blue-700 dark:text-blue-300">P: {dietPlan.salad.protein}g</span>
                      <span className="bg-amber-100 dark:bg-amber-900/40 px-2 py-0.5 rounded text-amber-700 dark:text-amber-300">C: {dietPlan.salad.carbs}g</span>
                      <span className="bg-rose-100 dark:bg-rose-900/40 px-2 py-0.5 rounded text-rose-700 dark:text-rose-300">F: {dietPlan.salad.fats}g</span>
                    </div>
                  </div>
                </div>

                {/* Ghee Advisory Card */}
                {dietPlan.ghee_advisory && (
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-2xl flex items-start space-x-3 text-amber-800 dark:text-amber-300 animate-fade-in-up">
                    <span className="text-lg leading-none mt-0.5">🧈</span>
                    <div>
                      <h4 className="font-bold text-sm">Ghee Dietary Advisory</h4>
                      <p className="text-xs mt-0.5 leading-relaxed">{dietPlan.ghee_advisory}</p>
                    </div>
                  </div>
                )}

                {/* Weight Loss Guidelines Card */}
                {(formData.goal.includes('loss') || formData.goal.includes('fat_loss')) && (
                  <div className="p-4 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 rounded-2xl flex items-start space-x-3 text-blue-800 dark:text-blue-300 animate-fade-in-up">
                    <span className="text-lg leading-none mt-0.5">💡</span>
                    <div>
                      <h4 className="font-bold text-sm">Weight Loss Guidelines</h4>
                      <p className="text-xs mt-0.5 leading-relaxed">
                        To support healthy weight loss, focus on high-volume low-calorie foods (like salads and green vegetables), maintain a consistent sleep schedule (7-8 hours), hydrate well (minimum {waterGoalCups * 250}ml/day), and avoid processed sugars. Keep dinner lighter and high in fiber.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* MEALS GRID */}
              {dietViewMode === 'monthly' ? (
                <div className="space-y-6 no-print">
                  {/* Calendar Grid */}
                  <div className="glass-card rounded-3xl p-6 border border-slate-200/50 dark:border-slate-800/30">
                    <h3 className="font-display font-extrabold text-lg text-slate-800 dark:text-white mb-2">30-Day Monthly Diet Calendar</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Select a day to view its specific menu. The diet alternates between the primary menu and 3 custom combination plans.</p>
                    
                    <div className="space-y-6">
                      {[1, 2, 3, 4, 5].map((weekNum) => {
                        const startDay = (weekNum - 1) * 7 + 1;
                        if (startDay > 30) return null;
                        const endDay = Math.min(30, weekNum * 7);
                        const days = Array.from({ length: endDay - startDay + 1 }, (_, i) => startDay + i);
                        
                        return (
                          <div key={weekNum} className="space-y-2">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Week {weekNum}</h4>
                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
                              {days.map((d) => {
                                const dayIdx = d - 1;
                                const comboIdx = dayIdx % 4;
                                const isSelected = selectedCalendarDay === d;
                                
                                return (
                                  <button
                                    key={d}
                                    onClick={() => setSelectedCalendarDay(d)}
                                    className={`p-3.5 rounded-2xl border text-left transition-all duration-300 outline-none focus:outline-none ${
                                      isSelected
                                        ? 'bg-emerald-500/10 border-emerald-500 dark:border-emerald-500/80 shadow-md scale-[1.03]'
                                        : 'bg-slate-50/50 dark:bg-slate-900/20 border-slate-200/50 dark:border-slate-800/30 hover:border-slate-350 dark:hover:border-slate-750 hover:scale-[1.01]'
                                    }`}
                                  >
                                    <div className="flex justify-between items-start mb-1.5">
                                      <span className={`text-xs font-extrabold ${isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                        Day {d}
                                      </span>
                                      <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded-full ${
                                        comboIdx === 0
                                          ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400'
                                          : comboIdx === 1
                                          ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                                          : comboIdx === 2
                                          ? 'bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-400'
                                          : 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400'
                                      }`}>
                                        {comboIdx === 0 ? 'Primary' : `Combo ${comboIdx}`}
                                      </span>
                                    </div>
                                    <div className="text-[10px] text-slate-450 dark:text-slate-500 leading-tight truncate">
                                      {dietPlan.thirty_day_plan[dayIdx] && dietPlan.thirty_day_plan[dayIdx].meals.map(m => {
                                        return m.items.map(it => it.name).join(' + ');
                                      }).join(', ').substring(0, 30) + '...'}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Detailed Selected Day View */}
                  <div className="space-y-6 bg-slate-50/40 dark:bg-slate-900/10 p-6 rounded-3xl border border-slate-200/40 dark:border-slate-800/20">
                    <div className="flex justify-between items-center border-b border-slate-200/30 dark:border-slate-800/30 pb-4">
                      <div>
                        <h3 className="font-display font-extrabold text-xl text-slate-800 dark:text-white">
                          Day {selectedCalendarDay} Detailed Menu
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                          Showing combination: <span className="font-bold text-emerald-600 dark:text-emerald-400 capitalize">
                            {(selectedCalendarDay - 1) % 4 === 0 ? 'Primary Menu' : `Alternative Combo ${(selectedCalendarDay - 1) % 4}`}
                          </span>
                        </p>
                      </div>
                    </div>
                    
                    <div className={`grid grid-cols-1 ${
                      dietPlan.thirty_day_plan[selectedCalendarDay - 1].meals.length === 2 ? 'md:grid-cols-2' :
                      dietPlan.thirty_day_plan[selectedCalendarDay - 1].meals.length === 3 ? 'md:grid-cols-3' :
                      dietPlan.thirty_day_plan[selectedCalendarDay - 1].meals.length === 4 ? 'md:grid-cols-4' :
                      'md:grid-cols-5'
                    } gap-6`}>
                      {dietPlan.thirty_day_plan[selectedCalendarDay - 1].meals.map((meal, mealIdx) => {
                        const items = meal.items;
                        const mealCals = meal.calories;
                        const mealProts = meal.protein;
                        const mealCarbs = meal.carbs;
                        const mealFats = meal.fats;
                        
                        return (
                          <div key={meal.key} className="glass-card rounded-2xl border border-slate-200/50 p-5 flex flex-col justify-between hover:shadow-lg transition-all duration-300 relative group">
                            <div className="absolute top-4 right-4 text-[10px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-100/50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                              {meal.target_kcal_pct}
                            </div>
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Meal {mealIdx + 1}</span>
                              <h3 className="font-display font-extrabold text-lg text-slate-800 dark:text-white mt-1 mb-4 flex items-center gap-1.5">
                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                {meal.label}
                              </h3>
                              
                              <div className="space-y-2 mb-4">
                                {items.map((item, idx) => (
                                  <div key={idx} className="bg-slate-50/50 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 relative flex justify-between items-start">
                                    <div className="pr-4">
                                      <p className="font-bold text-slate-800 dark:text-slate-200 text-xs leading-snug flex items-center gap-1.5 capitalize">
                                        <span>{item.name}</span>
                                        <FoodTypeBadge isVeg={item.is_veg !== 0} />
                                      </p>
                                      <p className="text-[10px] text-slate-400">Portion: {item.serving_size}</p>
                                      <div className="text-[9px] text-slate-500 dark:text-slate-400 mt-1.5 space-y-0.5 border-t border-slate-200/20 pt-1">
                                        <p><span className="font-bold text-slate-660 dark:text-slate-455">Vitamins:</span> {item.vitamins}</p>
                                        <p><span className="font-bold text-slate-660 dark:text-slate-455">Amino Acids:</span> {item.amino_acids}</p>
                                      </div>
                                    </div>
                                    
                                    {/* Swap button */}
                                    <button 
                                      onClick={() => handleSwap(meal.key, idx, item.name, item.calories, selectedCalendarDay - 1)}
                                      className="p-1 rounded bg-slate-150 dark:bg-slate-800 text-slate-450 hover:text-emerald-500 no-print transition-colors self-start shrink-0 hover:bg-slate-255"
                                      title={`Swap ${item.name}`}
                                    >
                                      <RefreshCw size={10} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="border-t border-slate-200/40 dark:border-slate-800/40 pt-3 flex justify-between text-center text-[10px] font-semibold">
                              <div className="flex-1">
                                <span className="text-slate-450">kcal</span>
                                <p className="text-slate-700 dark:text-slate-300 font-bold">{mealCals}</p>
                              </div>
                              <div className="flex-1">
                                <span className="text-slate-450">prot</span>
                                <p className="text-slate-700 dark:text-slate-300 font-bold">{mealProts}g</p>
                              </div>
                              <div className="flex-1">
                                <span className="text-slate-450">carbs</span>
                                <p className="text-slate-700 dark:text-slate-300 font-bold">{mealCarbs}g</p>
                              </div>
                              <div className="flex-1">
                                <span className="text-slate-450">fats</span>
                                <p className="text-slate-700 dark:text-slate-300 font-bold">{mealFats}g</p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Day Navigation Controls */}
                  <div className="flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-200/50 dark:border-slate-800/50 no-print">
                    <button
                      onClick={() => setSelectedCalendarDay(prev => Math.max(1, prev - 1))}
                      disabled={selectedCalendarDay === 1}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40"
                    >
                      ← Previous Day
                    </button>
                    <span className="font-display font-extrabold text-base text-slate-800 dark:text-white">
                      Day {selectedCalendarDay} of 30
                    </span>
                    <button
                      onClick={() => setSelectedCalendarDay(prev => Math.min(30, prev + 1))}
                      disabled={selectedCalendarDay === 30}
                      className="px-4 py-2 rounded-xl text-xs font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-40"
                    >
                      Next Day →
                    </button>
                  </div>

                  <div className={`grid grid-cols-1 ${
                    dietPlan.thirty_day_plan[selectedCalendarDay - 1].meals.length === 2 ? 'md:grid-cols-2' :
                    dietPlan.thirty_day_plan[selectedCalendarDay - 1].meals.length === 3 ? 'md:grid-cols-3' :
                    dietPlan.thirty_day_plan[selectedCalendarDay - 1].meals.length === 4 ? 'md:grid-cols-4' :
                    'md:grid-cols-5'
                  } gap-6 no-print`}>
                    
                    {dietPlan.thirty_day_plan[selectedCalendarDay - 1].meals.map((meal, mealIdx) => {
                      const mealCals = meal.items.reduce((sum, item) => sum + item.calories, 0);
                      const mealProts = parseFloat(meal.items.reduce((sum, item) => sum + item.protein, 0).toFixed(1));
                      const mealCarbs = parseFloat(meal.items.reduce((sum, item) => sum + item.carbs, 0).toFixed(1));
                      const mealFats = parseFloat(meal.items.reduce((sum, item) => sum + item.fats, 0).toFixed(1));
                      
                      return (
                        <div key={meal.key} className="glass-card rounded-2xl border border-slate-200/50 p-5 flex flex-col justify-between hover:shadow-lg transition-all duration-300 relative group">
                          <div className="absolute top-4 right-4 text-[10px] font-bold text-emerald-600 uppercase tracking-widest bg-emerald-100/50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                            {meal.target_kcal_pct}
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Meal {mealIdx + 1}</span>
                            <h3 className="font-display font-extrabold text-lg text-slate-800 dark:text-white mt-1 mb-4 flex items-center gap-1.5">
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                              {meal.label}
                            </h3>
                            
                            <div className="space-y-2 mb-4">
                              {meal.items.map((item, idx) => (
                                <div key={idx} className="bg-slate-50/50 dark:bg-slate-900/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800/80 relative flex flex-col gap-1.5">
                                  <div className="flex justify-between items-start w-full">
                                    <div className="pr-4">
                                      <p className="font-bold text-slate-800 dark:text-slate-200 text-xs leading-snug flex items-center gap-1.5 capitalize">
                                        <span>{item.name}</span>
                                        <FoodTypeBadge isVeg={item.is_veg !== 0} />
                                      </p>
                                      <p className="text-[10px] text-slate-450 dark:text-slate-400">Portion: {item.serving_size}</p>
                                    </div>
                                    
                                    {/* Swap button */}
                                    <button 
                                      onClick={() => handleSwap(meal.key, idx, item.name, item.calories, selectedCalendarDay - 1)}
                                      className="p-1 rounded bg-slate-150 dark:bg-slate-800 text-slate-450 hover:text-emerald-500 no-print transition-colors self-start shrink-0 hover:bg-slate-255"
                                      title={`Swap ${item.name}`}
                                    >
                                      <RefreshCw size={10} />
                                    </button>
                                  </div>
                                  
                                  <div className="text-[9px] border-t border-slate-200/20 dark:border-slate-850 pt-1 text-slate-500 dark:text-slate-400 space-y-0.5">
                                    <p><span className="font-bold text-slate-650 dark:text-slate-400">Vitamins:</span> {item.vitamins}</p>
                                    <p><span className="font-bold text-slate-650 dark:text-slate-400">Amino Acids:</span> {item.amino_acids}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="border-t border-slate-200/40 dark:border-slate-800/40 pt-3 flex justify-between text-center text-[10px] font-semibold">
                            <div className="flex-1">
                              <span className="text-slate-450">kcal</span>
                              <p className="text-slate-700 dark:text-slate-300 font-bold">{mealCals}</p>
                            </div>
                            <div className="flex-1">
                              <span className="text-slate-450">prot</span>
                              <p className="text-slate-700 dark:text-slate-300 font-bold">{mealProts}g</p>
                            </div>
                            <div className="flex-1">
                              <span className="text-slate-450">carbs</span>
                              <p className="text-slate-700 dark:text-slate-300 font-bold">{mealCarbs}g</p>
                            </div>
                            <div className="flex-1">
                              <span className="text-slate-450">fats</span>
                              <p className="text-slate-700 dark:text-slate-300 font-bold">{mealFats}g</p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* ALTERNATIVE MEAL COMBINATIONS TABLE */}
            <div className="space-y-6">
              <div>
                <h2 className="font-display font-extrabold text-2xl text-slate-800 dark:text-white">Alternative Meal Combinations</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Discover alternate daily combination sets that match your target calorie limits.</p>
              </div>

              <div className="glass-card rounded-3xl p-6 border border-slate-200/50 dark:border-slate-800/30 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="border-b border-slate-200/50 dark:border-slate-800/50">
                        <th className="p-4 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-24">Combo Set</th>
                        {dietPlan.thirty_day_plan[selectedCalendarDay - 1].meals.map((meal) => (
                          <th key={meal.key} className="p-4 font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider capitalize">
                            {meal.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200/30 dark:divide-slate-800/30">
                      {[0, 1, 2].map((comboIdx) => (
                        <tr key={comboIdx} className="hover:bg-slate-50/30 dark:hover:bg-slate-900/10 transition-colors">
                          <td className="p-4 font-display font-bold text-slate-800 dark:text-white">
                            Combo {comboIdx + 1}
                          </td>
                          {dietPlan.thirty_day_plan[selectedCalendarDay - 1].meals.map((meal) => {
                            const altMeal = meal.alternatives && meal.alternatives[comboIdx];
                            if (!altMeal || !altMeal.items || altMeal.items.length === 0) {
                              return (
                                <td key={meal.key} className="p-4 text-slate-400 dark:text-slate-600 italic">
                                  No alternative available
                                </td>
                              );
                            }
                            const totalCal = altMeal.items.reduce((sum, item) => sum + item.calories, 0);
                            return (
                              <td key={meal.key} className="p-4 align-top min-w-[180px]">
                                <div className="space-y-1.5">
                                  <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                                    {altMeal.items.map((item, idx) => (
                                      <div key={idx} className="mb-1">
                                        <span className="inline-flex items-center gap-1.5 mr-2 capitalize">
                                          <span>{item.name}</span>
                                          <FoodTypeBadge isVeg={item.is_veg !== 0} />
                                        </span>
                                        <div className="text-[9px] text-slate-450 dark:text-slate-500 mt-0.5">
                                          Vitamins: {item.vitamins || 'B-complex'} <br />
                                          Amino Acids: {item.amino_acids || 'Glutamic Acid'}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  <div className="text-[10px] text-slate-400 dark:text-slate-500 leading-normal">
                                    {altMeal.items.map(item => item.serving_size).join(' + ')}
                                  </div>
                                  <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                    {totalCal} kcal
                                  </div>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* WEEKLY EXERCISE & REHABILITATION PLAN */}
            <div className="space-y-6 break-inside-avoid">
              <div className="no-print">
                <h2 className="font-display font-extrabold text-2xl text-slate-800 dark:text-white">Weekly Exercise & Rehabilitation Plan</h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Custom training program generated based on your age, equipment, and injury status.</p>
              </div>

              {/* Day selector tabs (screen only) */}
              <div className="no-print glass-card rounded-3xl p-6 border border-slate-200/50 dark:border-slate-800/30">
                <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-200/30 dark:border-slate-800/30 pb-4">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => (
                    <button
                      key={day}
                      onClick={() => setActiveDay(day)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                        activeDay === day 
                          ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/10 scale-105' 
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200/65 dark:hover:bg-slate-700/60'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>

                {/* Exercises List for Active Day */}
                {dietPlan.exercise_chart && dietPlan.exercise_chart[activeDay] && dietPlan.exercise_chart[activeDay].exercises && dietPlan.exercise_chart[activeDay].exercises.length > 0 ? (
                  <div>
                    {/* Workout Info Meta */}
                    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-6 bg-slate-50 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/40">
                      <div><span className="text-slate-400 font-normal">Workout Type:</span> <span className="text-slate-700 dark:text-slate-300 font-bold">{dietPlan.exercise_chart[activeDay].workout}</span></div>
                      <div className="hidden sm:block text-slate-300">|</div>
                      <div><span className="text-slate-400 font-normal">Intensity:</span> <span className="text-slate-700 dark:text-slate-300 font-bold">{dietPlan.exercise_chart[activeDay].intensity}</span></div>
                      <div className="hidden sm:block text-slate-300">|</div>
                      <div><span className="text-slate-400 font-normal">Duration:</span> <span className="text-slate-700 dark:text-slate-300 font-bold">{dietPlan.exercise_chart[activeDay].duration}</span></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {dietPlan.exercise_chart[activeDay].exercises.map((exercise, idx) => (
                        <div key={idx} className="bg-slate-50/50 dark:bg-slate-900/40 border border-slate-150 dark:border-slate-800/80 rounded-2xl p-5 flex flex-col sm:flex-row gap-5 hover:border-emerald-300 dark:hover:border-emerald-950 transition-all duration-300">
                          {/* Image Category Visual */}
                          <div className="w-full sm:w-28 h-28 rounded-xl overflow-hidden shrink-0 bg-slate-100 dark:bg-slate-950 flex items-center justify-center relative border border-slate-200 dark:border-slate-850">
                            {(() => {
                              const cat = exercise.category.toLowerCase();
                              if (cat === 'warmup') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-12 h-12 text-orange-500"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>;
                              if (cat === 'strength') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-12 h-12 text-red-500"><path d="M6.5 6.5h11M6.5 17.5h11M4 6.5v11M20 6.5v11M8.5 6.5v11M15.5 6.5v11"/></svg>;
                              if (cat === 'cardio') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-12 h-12 text-blue-500"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>;
                              if (cat === 'mobility') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-12 h-12 text-green-500"><path d="M12 2v20M5 12h14"/><circle cx="12" cy="12" r="10"/></svg>;
                              if (cat === 'recovery') return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-12 h-12 text-purple-500"><path d="M21.21 15.89A10 10 0 1 1 8 2.83M22 12A10 10 0 0 0 12 2v10z"/></svg>;
                              return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-12 h-12"><circle cx="12" cy="12" r="10"/></svg>;
                            })()}
                            <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 text-[9px] font-bold text-white rounded-md uppercase tracking-wider">
                              {exercise.category}
                            </span>
                          </div>

                          {/* Exercise Content */}
                          <div className="flex-1 flex flex-col justify-between">
                            <div>
                              <h4 className="font-display font-extrabold text-slate-800 dark:text-white text-sm mb-1">{exercise.name}</h4>
                              <p className="text-xs text-slate-555 dark:text-slate-400 leading-relaxed mb-3">{exercise.desc}</p>
                            </div>
                            
                            {/* Equipment Alternatives */}
                            <div className="border-t border-slate-200/40 dark:border-slate-800/40 pt-3 space-y-1 text-[11px]">
                              <p className="text-slate-650 dark:text-slate-350">
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">Dumbbell Alt:</span> {exercise.dumbbell_alt}
                              </p>
                              <p className="text-slate-650 dark:text-slate-350">
                                <span className="font-bold text-emerald-600 dark:text-emerald-400">Band Alt:</span> {exercise.band_alt}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <span className="text-3xl">🧘</span>
                    <h3 className="font-display font-bold text-slate-800 dark:text-white text-lg mt-3">Rest & Recovery Day</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">Allow muscles to repair and adapt. Hydrate well, perform gentle stretching, and focus on clean nutrition.</p>
                  </div>
                )}
              </div>

              {/* PRINT ONLY EXERCISE SCHEDULE (all 7 days list) */}
              <div className="hidden print:block space-y-6">
                <h2 className="text-xl font-bold border-b pb-2 mb-4">Weekly Exercise Schedule</h2>
                <div className="grid grid-cols-1 gap-6">
                  {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
                    const dayEx = dietPlan.exercise_chart && dietPlan.exercise_chart[day];
                    return (
                      <div key={day} className="break-inside-avoid">
                        <h3 className="font-bold text-sm text-emerald-700 uppercase tracking-wider mb-2 border-b pb-0.5">
                          {day} {dayEx && dayEx.workout ? ` - ${dayEx.workout} (${dayEx.intensity}, ${dayEx.duration})` : ''}
                        </h3>
                        {dayEx && dayEx.exercises && dayEx.exercises.length > 0 ? (
                          <div className="grid grid-cols-2 gap-4">
                            {dayEx.exercises.map((ex, idx) => (
                              <div key={idx} className="border p-3 rounded-lg text-[11px] bg-white">
                                <h4 className="font-bold text-slate-800">{ex.name} ({ex.category})</h4>
                                <p className="text-slate-500 mt-1">{ex.desc}</p>
                                <div className="mt-2 space-y-0.5 text-[10px]">
                                  <p><strong>Dumbbell Alt:</strong> {ex.dumbbell_alt}</p>
                                  <p><strong>Band Alt:</strong> {ex.band_alt}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic">Rest & Recovery Day</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* SERVING SIZE LOOKUP TABLE */}
            <div className="glass-card rounded-3xl p-6 border border-slate-200/50 dark:border-slate-800/30 no-print">
              <button 
                onClick={() => setShowServingSizes(!showServingSizes)}
                className="w-full flex justify-between items-center outline-none focus:outline-none"
              >
                <div className="flex items-center space-x-2">
                  <span className="p-2 bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 rounded-xl">
                    <Scale size={20} />
                  </span>
                  <div className="text-left">
                    <h3 className="font-display font-extrabold text-lg text-slate-800 dark:text-white">Standard Serving Size & Exchange Reference</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Check portion size translations for diet plan compliance.</p>
                  </div>
                </div>
                <div className={`p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-650 transition-transform duration-200 ${showServingSizes ? 'rotate-90' : ''}`}>
                  <ChevronRight size={18} />
                </div>
              </button>

              {showServingSizes && (
                <div className="mt-6 border-t border-slate-200/30 dark:border-slate-800/30 pt-6 animate-fade-in-up">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {[
                      { category: 'Cereals & Grains', items: [
                        { name: 'Chapati / Roti', size: '1 piece (30g raw weight)' },
                        { name: 'Rice (Plain)', size: '1 plate (168g cooked weight / 50g raw)' },
                        { name: 'Dosa', size: '1 piece (60g)' },
                        { name: 'Idli', size: '2 pieces (60g)' }
                      ]},
                      { category: 'Proteins & Dairy', items: [
                        { name: 'Dal / Lentils', size: '1 bowl (150g cooked / 30g raw)' },
                        { name: 'Paneer', size: '100g serving portion' },
                        { name: 'Sprouts', size: '1 cup (100g)' },
                        { name: 'Cow Milk', size: '1 glass (200ml)' },
                        { name: 'Curd / Dahi', size: '1 bowl (150g)' }
                      ]},
                      { category: 'Fats, Fruits & Nuts', items: [
                        { name: 'Ghee', size: '1 tsp (5g portion)' },
                        { name: 'Almonds', size: '12-15 pieces (28g)' },
                        { name: 'Walnuts', size: '1 oz (28g)' },
                        { name: 'Apple / Banana', size: '1 medium fruit (100g)' },
                        { name: 'Healing Salad', size: '1 plate (150g / half portions each)' }
                      ]}
                    ].map((group, gIdx) => (
                      <div key={gIdx} className="bg-slate-50/50 dark:bg-slate-900/40 p-4 rounded-2xl border border-slate-150 dark:border-slate-800/60">
                        <h4 className="font-display font-bold text-slate-800 dark:text-white text-sm mb-3 border-b border-slate-200/40 dark:border-slate-800/40 pb-1.5">{group.category}</h4>
                        <div className="space-y-2">
                          {group.items.map((item, itemIdx) => (
                            <div key={itemIdx} className="flex justify-between text-xs">
                              <span className="font-semibold text-slate-700 dark:text-slate-350">{item.name}</span>
                              <span className="text-slate-450 text-right">{item.size}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* PRINT-ONLY SERVING SIZES TABLE */}
            <div className="hidden print:block space-y-4 break-inside-avoid">
              <h2 className="text-xl font-bold border-b pb-2 mb-4">Serving Size Reference</h2>
              <table className="w-full text-left border-collapse text-[11px]">
                <thead>
                  <tr className="border-b">
                    <th className="py-2">Category</th>
                    <th className="py-2">Food Item</th>
                    <th className="py-2">Standard Serving Portion</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { category: 'Cereals', item: 'Chapati / Roti', portion: '1 piece (30g raw weight)' },
                    { category: 'Cereals', item: 'Rice (Plain)', portion: '1 plate (168g cooked weight / 50g raw)' },
                    { category: 'Cereals', item: 'Dosa / Idli', portion: '1 Dosa (60g) / 2 Idlis (60g)' },
                    { category: 'Proteins', item: 'Dal / Lentils', portion: '1 bowl (150g cooked / 30g raw)' },
                    { category: 'Proteins', item: 'Paneer / Sprouts', portion: '100g Paneer / 1 cup Sprouts (100g)' },
                    { category: 'Dairy', item: 'Cow Milk / Curd', portion: '1 glass Milk (200ml) / 1 bowl Curd (150g)' },
                    { category: 'Fats', item: 'Ghee', portion: '1 tsp (5g portion)' },
                    { category: 'Nuts', item: 'Almonds / Walnuts', portion: '12-15 Almonds (28g) / 1 oz Walnuts (28g)' },
                    { category: 'Vegetables', item: 'Healing Salad', portion: '1 plate (150g / half portions each)' }
                  ].map((row, rIdx) => (
                    <tr key={rIdx} className="border-b border-slate-100">
                      <td className="py-1.5 font-bold">{row.category}</td>
                      <td className="py-1.5">{row.item}</td>
                      <td className="py-1.5 text-slate-500">{row.portion}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* PRINT-ONLY 30-DAY MONTHLY DIET CALENDAR TABLE */}
            <div className="hidden print:block space-y-4 pt-6">
              <h2 className="text-xl font-bold border-b pb-2 mb-4">Patient 30-Day Monthly Diet Calendar</h2>
              {dietPlan.medical_tip && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-xs font-semibold mb-4 leading-normal whitespace-pre-line">
                  <strong>Personalized Dietary Advisory:</strong><br/>
                  {dietPlan.medical_tip}
                </div>
              )}
              <p className="text-[10px] text-slate-500 mb-4">A complete 30-day structured monthly diet plan cycling your personalized macros and custom combination menus.</p>
              
              <table className="w-full text-left border-collapse text-[9px] border">
                <thead>
                  <tr className="bg-slate-100 border-b">
                    <th className="py-1.5 border px-1.5 font-bold w-12 text-center">Day</th>
                    <th className="py-1.5 border px-1.5 font-bold">Breakfast</th>
                    <th className="py-1.5 border px-1.5 font-bold">Mid-Morning Snack</th>
                    <th className="py-1.5 border px-1.5 font-bold">Lunch</th>
                    <th className="py-1.5 border px-1.5 font-bold">Evening Snack</th>
                    <th className="py-1.5 border px-1.5 font-bold">Dinner</th>
                  </tr>
                </thead>
                <tbody>
                  {dietPlan.thirty_day_plan.map((dayPlan) => {
                    const d = dayPlan.day;
                    return (
                      <tr key={d} className="border-b">
                        <td className="py-1.5 border px-1.5 font-bold text-center">Day {d}</td>
                        {['breakfast', 'mid_morning_snack', 'lunch', 'evening_snack', 'dinner'].map((mKey) => {
                          const meal = dayPlan.meals.find(m => m.key === mKey);
                          if (!meal) {
                            return <td key={mKey} className="py-1.5 border px-1.5 text-center text-slate-400">-</td>;
                          }
                          return (
                            <td key={mKey} className="py-1.5 border px-1.5 text-slate-700 align-top">
                              <div className="font-bold">{meal.items.map(it => it.name).join(' + ')}</div>
                              <div className="text-[8px] text-slate-450 leading-tight">({meal.items.map(it => it.serving_size).join(' + ')})</div>
                              <div className="text-[8px] text-slate-500 mt-1 border-t border-slate-100 pt-0.5 leading-snug">
                                <strong>Vits:</strong> {meal.items.map(it => it.vitamins).join(', ')}<br/>
                                <strong>AAs:</strong> {meal.items.map(it => it.amino_acids).join(', ')}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* CASE HISTORY ACCORDION */}
            <div className="glass-card rounded-3xl p-6 border border-slate-200/50 dark:border-slate-800/30 no-print">
              <button 
                onClick={() => setShowCaseHistory(!showCaseHistory)}
                className="w-full flex justify-between items-center outline-none focus:outline-none"
              >
                <div className="flex items-center space-x-2">
                  <span className="p-2 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 rounded-xl">
                    <User size={20} />
                  </span>
                  <div className="text-left">
                    <h3 className="font-display font-extrabold text-lg text-slate-800 dark:text-white">Patient Assessment Case History</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Review the comprehensive 26-field assessment records submitted.</p>
                  </div>
                </div>
                <div className={`p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-650 transition-transform duration-200 ${showCaseHistory ? 'rotate-90' : ''}`}>
                  <ChevronRight size={18} />
                </div>
              </button>

              {showCaseHistory && (
                <div className="mt-6 border-t border-slate-200/30 dark:border-slate-800/30 pt-6 animate-fade-in-up">
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 text-xs">
                    
                    {/* Column 1: Personal Details */}
                    <div className="space-y-2">
                      <h4 className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Personal Identity</h4>
                      <p><span className="font-semibold text-slate-600 dark:text-slate-400">Name:</span> {formData.name}</p>
                      <p><span className="font-semibold text-slate-600 dark:text-slate-400">Age:</span> {formData.age} years</p>
                      <p><span className="font-semibold text-slate-600 dark:text-slate-400">Gender:</span> <span className="capitalize">{formData.gender}</span></p>
                      <p><span className="font-semibold text-slate-600 dark:text-slate-400">Marital Status:</span> <span className="capitalize">{formData.maritalStatus}</span></p>
                      <p><span className="font-semibold text-slate-600 dark:text-slate-400">Contact No:</span> {formData.contactNo}</p>
                      <p><span className="font-semibold text-slate-600 dark:text-slate-400">Address/Region:</span> {formData.address}</p>
                    </div>

                    {/* Column 2: Occupation & Schedule */}
                    <div className="space-y-2">
                      <h4 className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Routine & Habits</h4>
                      <p><span className="font-semibold text-slate-600 dark:text-slate-400">Occupation:</span> {formData.occupation}</p>
                      <p><span className="font-semibold text-slate-600 dark:text-slate-400">Sleep Schedule:</span> {formData.sleepSchedule || 'N/A'}</p>
                      <p><span className="font-semibold text-slate-600 dark:text-slate-400">Work Schedule:</span> {formData.workSchedule || 'N/A'}</p>
                      <p><span className="font-semibold text-slate-600 dark:text-slate-400">Addictions/Habits:</span> {formData.addictions || 'None'}</p>
                      <p><span className="font-semibold text-slate-600 dark:text-slate-400">Daily Water:</span> {formData.dailyWaterIntake} L</p>
                    </div>

                    {/* Column 3: Medical Profile */}
                    <div className="space-y-2">
                      <h4 className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Medical Profile</h4>
                      <p><span className="font-semibold text-slate-600 dark:text-slate-400">Height / Weight:</span> {formData.height}cm / {formData.weight}kg</p>
                      <p><span className="font-semibold text-slate-600 dark:text-slate-400">Physiol. Condition:</span> <span className="capitalize">{formData.physiologicalCondition}</span></p>
                      <p><span className="font-semibold text-slate-600 dark:text-slate-400">Injury History:</span> <span className="capitalize">{formData.injuryHistory}</span></p>
                      <p><span className="font-semibold text-slate-600 dark:text-slate-400">Surgical History:</span> {formData.surgicalHistory || 'None'}</p>
                      <p><span className="font-semibold text-slate-600 dark:text-slate-400">Medical History:</span> {formData.medicalHistory || 'None'}</p>
                      <p><span className="font-semibold text-slate-600 dark:text-slate-400">Hormonal Disturbance:</span> {formData.hormonalDisturbance || 'None'}</p>
                    </div>

                    {/* Column 4: Goal & Nutrition */}
                    <div className="space-y-2">
                      <h4 className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">Goals & Preferences</h4>
                      <p><span className="font-semibold text-slate-600 dark:text-slate-400">Main Goal:</span> <span className="capitalize">{formData.goal.replace('_', ' ')}</span></p>
                      <p><span className="font-semibold text-slate-600 dark:text-slate-400">Diet Preference:</span> <span className="capitalize">{formData.dietType}</span></p>
                      <p><span className="font-semibold text-slate-600 dark:text-slate-400">Religious Preference:</span> <span className="capitalize">{formData.religiousPreference}</span></p>
                      <p><span className="font-semibold text-slate-600 dark:text-slate-400">Eating Customs:</span> {formData.eatingCustoms || 'Standard'}</p>
                      <p><span className="font-semibold text-slate-600 dark:text-slate-400">Exercise Level:</span> <span className="capitalize">{formData.activityLevel}</span></p>
                      <p><span className="font-semibold text-slate-600 dark:text-slate-400">Allergies/Intolerances:</span> {formData.allergies || 'None'}</p>
                      <p><span className="font-semibold text-slate-600 dark:text-slate-400">Nutri. Deficiency:</span> <span>{formData.nutritionalDeficiency.split(',').map(x => x.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())).join(', ')}</span></p>
                      <p><span className="font-semibold text-slate-600 dark:text-slate-400">Results Expected By:</span> {formData.resultsExpectedBy || 'N/A'}</p>
                    </div>

                  </div>
                </div>
              )}
            </div>

            {/* PRINT-ONLY CASE HISTORY TABLE */}
            <div className="hidden print:block space-y-4 break-inside-avoid">
              <h2 className="text-xl font-bold border-b pb-2 mb-4">Patient Assessment Case History</h2>
              <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-[11px] bg-white">
                <div><strong>Patient Name:</strong> {formData.name}</div>
                <div><strong>Age:</strong> {formData.age} years</div>
                <div><strong>Gender:</strong> <span className="capitalize">{formData.gender}</span></div>
                <div><strong>Contact Number:</strong> {formData.contactNo}</div>
                <div><strong>Address/Region:</strong> {formData.address}</div>
                <div><strong>Marital Status:</strong> <span className="capitalize">{formData.maritalStatus}</span></div>
                <div><strong>Occupation:</strong> {formData.occupation}</div>
                <div><strong>Sleep Schedule:</strong> {formData.sleepSchedule || 'Standard'}</div>
                <div><strong>Work Schedule:</strong> {formData.workSchedule || 'Standard'}</div>
                <div><strong>Addictions/Habits:</strong> {formData.addictions || 'None'}</div>
                <div><strong>Daily Water Intake:</strong> {formData.dailyWaterIntake} L</div>
                <div><strong>Height / Weight:</strong> {formData.height} cm / {formData.weight} kg</div>
                <div><strong>Physiological Condition:</strong> <span className="capitalize">{formData.physiologicalCondition}</span></div>
                <div><strong>Injury History:</strong> <span className="capitalize">{formData.injuryHistory}</span></div>
                <div><strong>Surgical History:</strong> {formData.surgicalHistory || 'None'}</div>
                <div><strong>Medical History:</strong> {formData.medicalHistory || 'None'}</div>
                <div><strong>Hormonal Disturbance:</strong> {formData.hormonalDisturbance || 'None'}</div>
                <div><strong>Allergies & Intolerances:</strong> {formData.allergies || 'None'}</div>
                <div><strong>Nutritional Deficiency:</strong> <span>{formData.nutritionalDeficiency.split(',').map(x => x.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())).join(', ')}</span></div>
                <div><strong>Main Goal:</strong> <span className="capitalize">{formData.goal.replace('_', ' ')}</span></div>
                <div><strong>Eating Customs:</strong> {formData.eatingCustoms || 'Standard'}</div>
                <div><strong>Religious Preference:</strong> <span className="capitalize">{formData.religiousPreference}</span></div>
                <div><strong>Expected Outcome:</strong> {formData.expectedOutcome || 'N/A'}</div>
                <div><strong>Results Expected By:</strong> {formData.resultsExpectedBy || 'N/A'}</div>
                <div><strong>Diet Preference:</strong> <span className="capitalize">{formData.dietType}</span></div>
                <div><strong>Exercise Schedule:</strong> {formData.exerciseSchedule || 'Standard'}</div>
              </div>
            </div>

            {/* FOOD EXPLORER ACCORDION ELEMENT */}
            <div className="glass-card rounded-3xl p-6 border border-slate-200/50 no-print">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                <div>
                  <h3 className="font-display font-extrabold text-xl text-slate-800 dark:text-white">Indian Vegetarian Nutrition Directory</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Click headers to filter specific meals.</p>
                </div>
                
                {/* Inline filter */}
                <div className="flex gap-2">
                  {['', 'breakfast', 'lunch', 'snacks'].map((categoryKey) => (
                    <button
                      key={categoryKey}
                      onClick={() => setFoodCategory(categoryKey)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 ${
                        foodCategory === categoryKey 
                        ? 'bg-slate-900 dark:bg-emerald-600 text-white' 
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {categoryKey === '' ? 'All' : categoryKey}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dynamic scroll table */}
              <div className="max-h-[300px] overflow-y-auto border border-slate-200/40 dark:border-slate-800/40 rounded-2xl">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead className="sticky top-0 bg-slate-100 dark:bg-slate-900 font-bold text-slate-600 dark:text-slate-400 border-b border-slate-200/50 dark:border-slate-800/50">
                    <tr>
                      <th className="p-3">Food Item</th>
                      <th className="p-3">Serving Size</th>
                      <th className="p-3">Calories</th>
                      <th className="p-3">Protein</th>
                      <th className="p-3">Carbohydrates</th>
                      <th className="p-3">Fats</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200/40 dark:divide-slate-800/40">
                    {foodsList.map((food, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 text-slate-700 dark:text-slate-300">
                        <td className="p-3 font-semibold capitalize flex items-center gap-1.5">
                          <span>{food.name}</span>
                          <FoodTypeBadge isVeg={food.is_veg === 1} />
                        </td>
                        <td className="p-3 text-slate-400">{food.serving_size}</td>
                        <td className="p-3 font-bold text-emerald-600 dark:text-emerald-400">{Math.round(food.calories)} kcal</td>
                        <td className="p-3 font-bold text-blue-500">{food.protein}g</td>
                        <td className="p-3 text-amber-500">{food.carbs}g</td>
                        <td className="p-3 text-rose-500">{food.fats}g</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

      </main>

      {/* FOOTER */}
      <footer className="w-full border-t border-slate-200/50 dark:border-slate-800/40 bg-white/20 dark:bg-slate-950/20 py-8 text-center text-xs text-slate-400 dark:text-slate-500 mt-16 no-print">
        <p className="mb-2 font-semibold text-slate-500 dark:text-slate-400">Made by Pratham</p>
        <p className="mb-2">&copy; 2026 Gyromotion NutriPlan. Designed under premium fitness standards.</p>
        <div className="max-w-xl mx-auto mt-3 px-4 py-2 bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/50 rounded-lg">
          <p className="text-[11px] text-amber-700 dark:text-amber-500 font-medium tracking-wide">⚠️ Disclaimer: NutriPlan is an AI and can make mistakes. Consult your Dietitian if in doubt.</p>
        </div>
      </footer>

      {/* FLOATING CHATBOT WIDGET */}
      <div className="fixed bottom-6 right-6 z-50 no-print flex flex-col items-end">
        {chatOpen && (
          <div className="w-[340px] sm:w-[380px] h-[480px] rounded-3xl glass-card border border-slate-200/70 dark:border-slate-800/50 shadow-2xl flex flex-col overflow-hidden mb-3 animate-fade-in-up">
            
            {/* Chat header */}
            <div className="bg-gradient-to-r from-emerald-500 to-green-600 p-4 text-white flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                  <Sparkles size={16} />
                </div>
                <div>
                  <h4 className="font-display font-extrabold text-sm leading-tight">Gyromotion NutriPlan Bot</h4>
                  <p className="text-[10px] text-emerald-100 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-200 animate-ping" />
                    Online &bull; Active Nutritionist
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setChatOpen(false)}
                className="text-white/80 hover:text-white font-bold text-sm bg-white/10 rounded-lg w-7 h-7 flex items-center justify-center hover:bg-white/20"
              >
                &times;
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.map((msg, i) => (
                <div 
                  key={i} 
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] p-3 rounded-2xl text-xs leading-relaxed ${
                    msg.sender === 'user'
                    ? 'bg-emerald-500 text-white rounded-br-none shadow-sm shadow-emerald-500/10'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-bl-none border border-slate-200/50 dark:border-slate-700/40'
                  }`}>
                    {msg.text.split('\n').map((para, idx) => (
                      <p key={idx} className={idx > 0 ? 'mt-2' : ''}>{para}</p>
                    ))}
                  </div>
                </div>
              ))}
              
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 p-3 rounded-2xl rounded-bl-none border border-slate-200/50 dark:border-slate-700/40">
                    <RefreshCw className="animate-spin text-slate-400" size={14} />
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Chat Input */}
            <form onSubmit={handleChatSubmit} className="p-3 border-t border-slate-200/40 dark:border-slate-800/40 bg-white/50 dark:bg-slate-900/50 flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask e.g. 'Can I eat dosa for weight loss?'..."
                className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-800 dark:text-white outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                className="p-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow transition-colors flex items-center justify-center"
              >
                <Send size={14} />
              </button>
            </form>

          </div>
        )}

        {/* Chat Toggle Button */}
        <button
          onClick={() => setChatOpen(!chatOpen)}
          className="w-14 h-14 rounded-full bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-xl hover:shadow-emerald-500/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-300"
          title="Open Gyromotion Nutrition Chatbot"
        >
          <Sparkles size={24} className={chatOpen ? 'rotate-45 transition-transform duration-300' : 'transition-transform duration-300'} />
        </button>
      </div>

    </div>
  );
}
