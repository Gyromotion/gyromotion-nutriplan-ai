# Gyromotion NutriPlan AI

Gyromotion NutriPlan AI is a modern, high-protein personalized Indian vegetarian diet planner and nutrition tracking web application. It calculates BMI, BMR, daily water requirements, macro distributions, and projects a 12-week weight trajectory curve. It also features a food directory and an interactive AI chatbot for nutritional advice and meal swapping.

No registration or accounts needed—works instantly.

---

## 🚀 Instant Local Run (No Node.js Required)

If you do not have Node.js installed, the Flask server is pre-configured to compile and serve the complete glassmorphic React/Tailwind frontend immediately.

### 1. Set Up and Install Python Dependencies
Open your shell, go to the `backend/` folder, and install requirements:
```bash
cd backend
pip install -r requirements.txt
```

### 2. Initialize the SQLite Database
Seed the database with the preloaded Indian foods (Idlis, Dosas, Upma, Paneer, Rajma, Fruits, Sprouts):
```bash
python database.py
```

### 3. Launch the Server
Start the Flask backend:
```bash
python app.py
```

### 4. Open in Browser
Open your browser and navigate to:
👉 **[http://localhost:5000](http://localhost:5000)**

---

## 🛠️ Modular React Development Mode (Requires Node.js)

If you want to run the codebase using modular components and Vite development tools:

### 1. Launch the Flask Backend
Make sure the backend API is running on port 5000:
```bash
cd backend
python app.py
```

### 2. Set Up and Start React Client
In a new terminal window, navigate to the `frontend/` directory, install dependencies, and run Vite:
```bash
cd frontend
npm install
npm run dev
```

### 3. Open client
Open the dev server URL in your browser:
👉 **[http://localhost:5173](http://localhost:5173)**

---

## 📦 Production Deployment

### Frontend (Vercel)
The `frontend/` folder is configured with Vite, Tailwind v3, and React. To deploy on Vercel:
1. Connect your GitHub repository.
2. Select the `frontend` folder as the root directory.
3. Configure the build command as `npm run build` and output directory as `dist`.
4. Define the `VITE_API_URL` environment variable if your backend is hosted online.

### Backend (Render / Railway)
The `backend/` folder is ready to deploy to Render or Railway.
1. Specify Python version and build command (`pip install -r requirements.txt`).
2. Run command: `gunicorn app:app` or `python app.py`.
3. The database `nutriplan.db` is an SQLite database; for a persistent backend on Render, use a disk volume or connect to a hosted PostgreSQL database.

---

## 📁 Directory Structure
```
gyromotion-nutriplan-ai/
├── backend/
│   ├── app.py                  # Flask Main App & APIs
│   ├── database.py             # SQLite Seeding script
│   ├── requirements.txt        # Backend dependencies
│   ├── nutriplan.db            # SQLite database file
│   └── templates/
│       └── index.html          # Embedded Single-Page App
├── frontend/
│   ├── index.html              # React entry HTML
│   ├── package.json            # React dependencies
│   ├── tailwind.config.js      # Tailwind configurations
│   ├── postcss.config.js       # CSS processor config
│   ├── vite.config.js          # Vite server config
│   └── src/
│       ├── main.jsx            # React root script
│       ├── index.css           # Global Tailwind directives
│       ├── App.jsx             # Main Dashboard components
│       └── utils/
│           └── api.js          # API Integration & fallbacks
└── README.md                   # Installation Guide
```
