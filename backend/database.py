import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), 'nutriplan.db')

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initialize database tables and seed initial Indian food nutrition data."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # Drop tables if they exist for clean initialization
    cursor.execute("DROP TABLE IF EXISTS Foods")
    cursor.execute("DROP TABLE IF EXISTS MealPlans")

    # Create Foods Table
    cursor.execute("""
        CREATE TABLE Foods (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT NOT NULL, -- 'breakfast', 'lunch', 'dinner', 'snacks'
            calories REAL NOT NULL,
            protein REAL NOT NULL,
            carbs REAL NOT NULL,
            fats REAL NOT NULL,
            serving_size TEXT NOT NULL,
            is_veg INTEGER DEFAULT 1 -- 1 for veg, 0 for non-veg (no beef)
        )
    """)

    # Create MealPlans Table (cached meal plans for user reference or analytics)
    cursor.execute("""
        CREATE TABLE MealPlans (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            breakfast TEXT,
            lunch TEXT,
            dinner TEXT,
            snacks TEXT,
            total_calories REAL,
            total_protein REAL
        )
    """)

    # Seed Food Database
    # List of Indian food items based on NIN exchange lists (strictly no beef)
    seed_foods = [
        # --- BREAKFAST ---
        ("Idli", "breakfast", 130, 4.6, 27.6, 0.2, "2 Idlis (136g)", 1),
        ("Plain Dosa", "breakfast", 216, 4.1, 28.2, 9.7, "2 Dosas (100g)", 1),
        ("Onion Dosa", "breakfast", 337, 7.3, 47.8, 13.0, "1 Dosa (132g)", 1),
        ("Masala Dosa", "breakfast", 212, 4.6, 29.4, 8.4, "1 Dosa (101g)", 1),
        ("Rice Uppuma", "breakfast", 397, 7.0, 54.4, 16.8, "1 plate (260g)", 1),
        ("Poha (Beaten Rice)", "breakfast", 114, 1.8, 26.3, 0.2, "1 cup (30g)", 1),
        ("Puffed Rice (Kurmura)", "breakfast", 107, 1.6, 24.6, 0.2, "2 cups (28g)", 1),
        ("Oats / Oatmeal", "breakfast", 101, 3.6, 17.6, 1.8, "1 cup (25g)", 1),
        ("Wheat Uppuma", "breakfast", 163, 3.8, 24.7, 5.4, "1 plate (128g)", 1),
        ("Rava Idli", "breakfast", 212, 5.0, 28.7, 8.5, "2 Idlis (114g)", 1),
        ("Ragi Porridge (Calcium Rich)", "breakfast", 120, 3.5, 22.0, 1.5, "1 bowl (200g)", 1),
        ("Ragi Roti (Calcium Rich)", "breakfast", 150, 4.0, 30.0, 1.5, "1 piece (60g)", 1),
        ("Barley Porridge", "breakfast", 110, 3.0, 24.0, 1.0, "1 bowl (200g)", 1),
        ("Bread Toasted", "breakfast", 120, 4.0, 23.6, 1.0, "2 Slices (46g)", 1),
        ("Bun", "breakfast", 100, 2.3, 17.5, 2.3, "1 no (31g)", 1),
        ("Chai (with Milk & 1 tsp Sugar)", "breakfast", 65, 1.5, 8.0, 2.0, "1 cup (150ml)", 1),
        ("Coffee (with Milk)", "breakfast", 78, 1.9, 13.8, 1.7, "1 cup (150ml)", 1),
        ("Cow Milk (Calcium Rich)", "breakfast", 120, 6.0, 9.0, 4.5, "1 glass (200ml)", 1),
        
        # --- LUNCH ---
        ("Chapati", "lunch", 193, 5.0, 30.8, 5.5, "2 Chapatis (57g)", 1),
        ("Rice (Plain)", "lunch", 198, 4.0, 46.9, 0.3, "1 plate (168g)", 1),
        ("Sambhar Bhath", "lunch", 405, 13.5, 76.2, 5.1, "1.5 plates (485g)", 1),
        ("Curd Bhath", "lunch", 221, 6.0, 33.3, 7.0, "1 plate (253g)", 1),
        ("Khichdi", "lunch", 270, 7.0, 48.0, 5.0, "1 bowl (200g)", 1),
        ("Pulao with peas", "lunch", 400, 8.0, 59.5, 14.4, "1 plate (252g)", 1),
        ("Pulao with potatoes", "lunch", 405, 5.5, 62.7, 14.7, "1 plate (263g)", 1),
        ("Plain Paratha", "lunch", 304, 4.5, 27.3, 19.6, "1 Paratha (56g)", 1),
        ("Paratha stuffed with peas", "lunch", 322, 6.5, 33.4, 18.0, "1 Paratha (97g)", 1),
        ("Paratha stuffed with potato", "lunch", 307, 5.1, 33.6, 17.0, "1 Paratha (80g)", 1),
        ("Jowar Roti", "lunch", 252, 7.5, 52.5, 1.3, "2 rotis (150g)", 1),
        ("Bajra Roti (Iron Rich)", "lunch", 150, 4.0, 30.0, 1.5, "1 piece (60g)", 1),
        ("Maize Roti", "lunch", 314, 9.6, 56.4, 5.5, "2 rotis (142g)", 1),
        ("Ragi Roti (Calcium Rich)", "lunch", 150, 4.0, 30.0, 1.5, "1 piece (60g)", 1),
        
        ("Bengal Gram Dhal", "lunch", 284, 9.0, 25.2, 16.4, "1 cup (151g)", 1),
        ("Green Gram Dhal", "lunch", 171, 7.0, 18.4, 7.7, "1 cup (142g)", 1),
        ("Red Gram Dhal", "lunch", 110, 6.4, 16.4, 2.0, "0.5 cup (96g)", 1),
        ("Rajmah (Kidney Beans)", "lunch", 102, 4.7, 10.7, 3.4, "100g", 1),
        ("Chole (Chickpeas)", "lunch", 74, 4.3, 3.3, 4.1, "100g", 1),
        ("Dal Makhani", "lunch", 164, 8.2, 20.5, 5.5, "100g", 1),
        
        ("Aloo Curry", "lunch", 105, 1.2, 14.4, 5.0, "100g", 1),
        ("Baigan Ka Bhartha", "lunch", 70, 1.2, 5.7, 4.7, "100g", 1),
        ("Bhindi (Okra)", "lunch", 161, 3.9, 12.1, 10.7, "100g", 1),
        ("Cabbage (Patta Gobi)", "lunch", 131, 2.3, 7.0, 5.0, "100g", 1),
        ("Kaddu (Pumpkin)", "lunch", 67, 1.6, 6.7, 3.8, "100g", 1),
        ("Palak Paneer", "lunch", 380, 14.0, 46.0, 15.0, "262g", 1),
        ("Mutter Paneer", "lunch", 147, 8.5, 10.7, 8.1, "100g", 1),
        ("Shahi Paneer", "lunch", 263, 10.0, 8.0, 18.0, "95g", 1),
        ("Sarson ka Saag", "lunch", 90, 11.0, 6.0, 3.0, "142g", 1),
        ("Mixed Vegetable Curry", "lunch", 134, 4.3, 15.6, 6.0, "127g", 1),
        ("Curd (Dahi)", "lunch", 100, 5.0, 6.0, 5.0, "1 bowl (150g)", 1),
        ("Buttermilk (Chass)", "lunch", 45, 2.0, 3.0, 2.5, "1 glass (200ml)", 1),
        
        # --- DINNER ---
        ("Chapati", "dinner", 193, 5.0, 30.8, 5.5, "2 Chapatis (57g)", 1),
        ("Rice (Plain)", "dinner", 198, 4.0, 46.9, 0.3, "1 plate (168g)", 1),
        ("Khichdi", "dinner", 270, 7.0, 48.0, 5.0, "1 bowl (200g)", 1),
        ("Bengal Gram Dhal", "dinner", 284, 9.0, 25.2, 16.4, "1 cup (151g)", 1),
        ("Green Gram Dhal", "dinner", 171, 7.0, 18.4, 7.7, "1 cup (142g)", 1),
        ("Red Gram Dhal", "dinner", 110, 6.4, 16.4, 2.0, "0.5 cup (96g)", 1),
        ("Rajmah (Kidney Beans)", "dinner", 102, 4.7, 10.7, 3.4, "100g", 1),
        ("Chole (Chickpeas)", "dinner", 74, 4.3, 3.3, 4.1, "100g", 1),
        ("Aloo Curry", "dinner", 105, 1.2, 14.4, 5.0, "100g", 1),
        ("Bhindi (Okra)", "dinner", 161, 3.9, 12.1, 10.7, "100g", 1),
        ("Cabbage (Patta Gobi)", "dinner", 131, 2.3, 7.0, 5.0, "100g", 1),
        ("Mutter Paneer", "dinner", 147, 8.5, 10.7, 8.1, "100g", 1),
        ("Curd (Dahi)", "dinner", 100, 5.0, 6.0, 5.0, "1 bowl (150g)", 1),
        ("Buttermilk (Chass)", "dinner", 45, 2.0, 3.0, 2.5, "1 glass (200ml)", 1),
        ("Ragi Roti (Calcium Rich)", "dinner", 150, 4.0, 30.0, 1.5, "1 piece (60g)", 1),
        ("Bajra Roti (Iron Rich)", "dinner", 150, 4.0, 30.0, 1.5, "1 piece (60g)", 1),
        
        # --- SNACKS ---
        ("Roasted Chana", "snacks", 110, 6.0, 18.0, 2.0, "1 cup (30g)", 1),
        ("Sprouts Salad", "snacks", 120, 8.0, 20.0, 0.5, "1 cup (100g)", 1),
        ("Apple", "snacks", 42, 0.2, 9.9, 0.3, "1 medium (66g)", 1),
        ("Banana", "snacks", 99, 1.2, 23.0, 0.2, "1 large (100g)", 1),
        ("Dates", "snacks", 80, 0.9, 19.1, 0.1, "1 oz (28g)", 1),
        ("Figs Dried", "snacks", 150, 2.0, 34.2, 0.6, "6 pieces (50g)", 1),
        ("Grapes", "snacks", 44, 0.8, 10.2, 0.1, "1 bunch (140g)", 1),
        ("Guava", "snacks", 66, 1.5, 14.5, 0.2, "1 medium (100g)", 1),
        ("Orange", "snacks", 54, 1.0, 12.1, 0.2, "1 medium (100g)", 1),
        ("Pineapple", "snacks", 98, 0.6, 23.0, 0.4, "2 slices (168g)", 1),
        ("Amla", "snacks", 30, 0.5, 7.0, 0.1, "2 medium (90g)", 1),
        ("Almonds", "snacks", 186, 5.9, 3.0, 16.7, "12-15 nos (28g)", 1),
        ("Cashewnuts", "snacks", 169, 6.0, 6.3, 13.3, "15 nos (28g)", 1),
        ("Walnuts", "snacks", 195, 4.4, 3.1, 18.3, "1 oz (28g)", 1),
        ("Groundnuts (roasted)", "snacks", 155, 7.6, 5.8, 11.3, "1 oz (28g)", 1),
        ("Ghee", "snacks", 45, 0.0, 0.0, 5.0, "1 tsp (5g)", 1),
        ("Cheese", "snacks", 112, 7.1, 0.6, 9.1, "1 cube (28g)", 1),
        ("Tea (with Milk)", "snacks", 64, 0.7, 13.5, 0.8, "1 cup (150ml)", 1),
        ("Coffee (with Milk)", "snacks", 78, 1.9, 13.8, 1.7, "1 cup (150ml)", 1),
        ("Green Tea (Antioxidants)", "snacks", 2, 0.0, 0.5, 0.0, "1 cup (200ml)", 1),
        ("Buttermilk (Chass)", "snacks", 45, 2.0, 3.0, 2.5, "1 glass (200ml)", 1),
        ("Biscuits", "snacks", 64, 1.6, 9.9, 2.0, "2 nos (19g)", 1),
        
        # --- NON VEG BREAKFAST ---
        ("Egg Bhurji", "breakfast", 210, 14.0, 4.0, 15.0, "1 plate (2 Eggs)", 0),
        ("Boiled Eggs", "breakfast", 155, 13.0, 1.1, 11.0, "2 Eggs", 0),
        
        # --- NON VEG LUNCH/DINNER ---
        ("Chicken Curry", "lunch", 240, 26.0, 6.0, 12.0, "1 bowl (150g)", 0),
        ("Chicken Curry", "dinner", 240, 26.0, 6.0, 12.0, "1 bowl (150g)", 0),
        ("Fish Curry", "lunch", 190, 22.0, 4.0, 9.0, "1 bowl (150g)", 0),
        ("Fish Curry", "dinner", 190, 22.0, 4.0, 9.0, "1 bowl (150g)", 0),
        ("Mutton Curry", "lunch", 310, 24.0, 5.0, 22.0, "1 bowl (150g)", 0),
        ("Mutton Curry", "dinner", 310, 24.0, 5.0, 22.0, "1 bowl (150g)", 0),
        ("Chicken Biryani", "lunch", 360, 22.0, 48.0, 10.0, "1 plate (250g)", 0),
        ("Tandoori Chicken", "lunch", 220, 30.0, 3.0, 9.0, "1 portion (150g)", 0),
        ("Prawn Masala", "lunch", 180, 20.0, 4.0, 8.0, "1 bowl (150g)", 0),
        ("Chicken Biryani", "dinner", 360, 22.0, 48.0, 10.0, "1 plate (250g)", 0),
        ("Tandoori Chicken", "dinner", 220, 30.0, 3.0, 9.0, "1 portion (150g)", 0),
        ("Prawn Masala", "dinner", 180, 20.0, 4.0, 8.0, "1 bowl (150g)", 0)
    ]

    cursor.executemany("""
        INSERT INTO Foods (name, category, calories, protein, carbs, fats, serving_size, is_veg)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, seed_foods)

    conn.commit()
    conn.close()
    print("Database initialized and seeded successfully.")

if __name__ == "__main__":
    init_db()
