"""สร้างข้อมูลเดโม่ (สังเคราะห์) สำหรับ Data Analyst Studio

รัน:  python scripts/generate_demo_data.py
ผลลัพธ์: data/*.csv และ data/demo-data.js (ให้เว็บเปิดได้แม้เปิดไฟล์ตรง ๆ แบบ file://)

ข้อมูลทั้งหมดเป็นข้อมูลสมมติ และจงใจใส่ค่าว่าง/แถวซ้ำเล็กน้อยไว้ฝึกทำความสะอาดข้อมูล
"""
import csv
import json
import math
import random
from datetime import date, timedelta
from pathlib import Path

random.seed(42)
ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
DATA.mkdir(exist_ok=True)


def rand_date(start: date, end: date) -> date:
    return start + timedelta(days=random.randint(0, (end - start).days))


def dirty(rows, cols, missing_rate=0.01, dup_count=15):
    """ใส่ค่าว่างและแถวซ้ำ เพื่อใช้ฝึกขั้นตอน Data Cleaning"""
    for r in rows:
        for c in cols:
            if random.random() < missing_rate:
                r[c] = ""
    rows.extend(dict(r) for r in random.sample(rows, dup_count))
    random.shuffle(rows)
    return rows


# ---------------------------------------------------------------- 1) ยอดขาย
REGIONS = {
    "ภาคกลาง": ["กรุงเทพมหานคร", "นนทบุรี", "ปทุมธานี", "นครปฐม"],
    "ภาคเหนือ": ["เชียงใหม่", "เชียงราย", "พิษณุโลก"],
    "ภาคอีสาน": ["ขอนแก่น", "นครราชสีมา", "อุดรธานี", "อุบลราชธานี"],
    "ภาคใต้": ["ภูเก็ต", "สงขลา", "สุราษฎร์ธานี"],
    "ภาคตะวันออก": ["ชลบุรี", "ระยอง", "จันทบุรี"],
}
REGION_W = [0.42, 0.14, 0.18, 0.12, 0.14]
PRODUCTS = {
    "อิเล็กทรอนิกส์": [("หูฟังไร้สาย", 1290), ("พาวเวอร์แบงก์", 690), ("สมาร์ทวอทช์", 3490), ("ลำโพงบลูทูธ", 1590)],
    "คอมพิวเตอร์": [("เมาส์เกมมิ่ง", 890), ("คีย์บอร์ดแมคคานิคอล", 2490), ("จอมอนิเตอร์ 24\"", 4290), ("SSD 1TB", 2190)],
    "เครื่องใช้ในบ้าน": [("หม้อทอดไร้น้ำมัน", 2590), ("เครื่องฟอกอากาศ", 4990), ("กาต้มน้ำไฟฟ้า", 590)],
    "แฟชั่น": [("เสื้อยืด", 290), ("กางเกงยีนส์", 890), ("รองเท้าผ้าใบ", 1890), ("กระเป๋าเป้", 990)],
    "ความงาม": [("ครีมกันแดด", 450), ("เซรั่มบำรุงผิว", 790), ("ลิปสติก", 350)],
}
CHANNELS = ["หน้าร้าน", "เว็บไซต์", "Shopee", "Lazada", "LINE Shopping"]
CHANNEL_W = [0.3, 0.15, 0.25, 0.2, 0.1]
PAYMENTS = ["เงินสด", "โอนผ่านแอป", "บัตรเครดิต", "เก็บเงินปลายทาง"]

sales = []
start, end = date(2024, 1, 1), date(2025, 12, 31)
for i in range(1, 3001):
    d = rand_date(start, end)
    # ฤดูกาล: ปลายปี (11.11, 12.12) ขายดีกว่า — สุ่มซ้ำเพื่อดึงวันไปช่วงนั้น
    if random.random() < 0.18:
        d = date(random.choice([2024, 2025]), random.choice([11, 12]), random.randint(1, 28))
    region = random.choices(list(REGIONS), REGION_W)[0]
    cat = random.choice(list(PRODUCTS))
    prod, price = random.choice(PRODUCTS[cat])
    qty = random.choices([1, 2, 3, 4, 5], [0.55, 0.22, 0.12, 0.07, 0.04])[0]
    channel = random.choices(CHANNELS, CHANNEL_W)[0]
    discount = random.choice([0, 0, 0, 0.05, 0.1, 0.15]) if channel != "หน้าร้าน" else random.choice([0, 0, 0.05])
    growth = 1.12 if d.year == 2025 else 1.0  # ปี 2025 ราคาเฉลี่ยสูงขึ้นเล็กน้อย
    revenue = round(price * qty * (1 - discount) * growth, 2)
    cost = round(price * qty * random.uniform(0.55, 0.75), 2)
    sales.append({
        "order_id": f"ORD{i:05d}",
        "order_date": d.isoformat(),
        "region": region,
        "province": random.choice(REGIONS[region]),
        "channel": channel,
        "category": cat,
        "product": prod,
        "quantity": qty,
        "unit_price": price,
        "discount": discount,
        "revenue": revenue,
        "cost": cost,
        "profit": round(revenue - cost, 2),
        "customer_type": random.choices(["ลูกค้าใหม่", "ลูกค้าประจำ"], [0.4, 0.6])[0],
        "payment_method": random.choice(PAYMENTS),
        "rating": random.choices([1, 2, 3, 4, 5], [0.03, 0.05, 0.17, 0.4, 0.35])[0],
    })
sales.sort(key=lambda r: r["order_date"])
sales = dirty(sales, ["province", "payment_method", "rating", "customer_type"])

# ---------------------------------------------------------------- 2) HR
DEPTS = {
    "ขาย": (["พนักงานขาย", "หัวหน้าทีมขาย", "ผู้จัดการฝ่ายขาย"], 18000),
    "การตลาด": (["Marketing Executive", "Content Creator", "ผู้จัดการการตลาด"], 22000),
    "IT": (["Developer", "Data Analyst", "IT Support", "IT Manager"], 30000),
    "บัญชี": (["เจ้าหน้าที่บัญชี", "นักวิเคราะห์การเงิน", "ผู้จัดการบัญชี"], 21000),
    "บุคคล": (["เจ้าหน้าที่ HR", "Recruiter", "ผู้จัดการ HR"], 20000),
    "ปฏิบัติการ": (["พนักงานคลังสินค้า", "หัวหน้างาน", "ผู้จัดการโรงงาน"], 15000),
}
hr = []
for i in range(1, 801):
    dept = random.choices(list(DEPTS), [0.25, 0.12, 0.15, 0.1, 0.08, 0.3])[0]
    positions, base = DEPTS[dept]
    level = random.choices(range(len(positions)), [0.7, 0.22, 0.08][: len(positions)] + [0.05] * (len(positions) - 3))[0]
    years = max(0, int(random.gauss(5 + level * 3, 3)))
    age = min(60, max(21, 22 + years + random.randint(0, 12)))
    salary = round(base * (1 + level * 0.8) * (1 + years * 0.04) * random.uniform(0.9, 1.15), -2)
    overtime = random.choices(["มี", "ไม่มี"], [0.3, 0.7])[0]
    satisfaction = random.randint(1, 5)
    perf = round(min(5, max(1, random.gauss(3.4, 0.7))), 1)
    # โอกาสลาออกสูงขึ้นเมื่อ: OT, ความพึงพอใจต่ำ, อายุงานน้อย
    p_leave = 0.08 + (0.12 if overtime == "มี" else 0) + (0.15 if satisfaction <= 2 else 0) + (0.08 if years < 2 else 0)
    hr.append({
        "employee_id": f"EMP{i:04d}",
        "department": dept,
        "position": positions[level],
        "gender": random.choice(["ชาย", "หญิง"]),
        "age": age,
        "education": random.choices(["ปวส.", "ปริญญาตรี", "ปริญญาโท"], [0.2, 0.65, 0.15])[0],
        "years_at_company": years,
        "monthly_salary": int(salary),
        "performance_score": perf,
        "job_satisfaction": satisfaction,
        "overtime": overtime,
        "training_hours": random.randint(0, 60),
        "work_mode": random.choices(["ออฟฟิศ", "Hybrid", "WFH"], [0.55, 0.35, 0.1])[0],
        "attrition": "ลาออก" if random.random() < p_leave else "อยู่ต่อ",
    })
hr = dirty(hr, ["education", "training_hours", "performance_score"], dup_count=8)

# ---------------------------------------------------------------- 3) คอร์สอบรม
COURSES = {
    "Excel": [("Excel Basic", 3500), ("Excel Advanced", 4500), ("Excel Dashboard", 4900)],
    "Power BI": [("Power BI Desktop", 5500), ("DAX Formula", 5900)],
    "Python": [("Python for Beginner", 5900), ("Python Data Analysis", 6900), ("Machine Learning", 8900)],
    "SQL": [("SQL Fundamentals", 4900), ("SQL for Data Analyst", 5500)],
    "Office": [("Word Professional", 2900), ("PowerPoint Design", 3200)],
    "AI Tools": [("ChatGPT for Work", 3900), ("AI Automation", 5900)],
}
SOURCES = ["Facebook", "Google Search", "เพื่อนแนะนำ", "LINE OA", "TikTok", "องค์กรส่งมา"]
training = []
for i in range(1, 1501):
    d = rand_date(date(2024, 1, 1), date(2025, 12, 31))
    cat = random.choices(list(COURSES), [0.3, 0.2, 0.2, 0.12, 0.08, 0.1 + (0.1 if d.year == 2025 else 0)])[0]
    course, price = random.choice(COURSES[cat])
    mode = random.choices(["Onsite", "Online Live", "E-Learning"], [0.45, 0.35, 0.2])[0]
    seats = random.choices([1, 2, 3, 5, 10], [0.6, 0.15, 0.1, 0.1, 0.05])[0]
    corp = seats >= 5 or random.random() < 0.15
    pay_price = price * (0.8 if mode == "E-Learning" else 1)
    training.append({
        "enroll_id": f"ENR{i:05d}",
        "enroll_date": d.isoformat(),
        "course_category": cat,
        "course_name": course,
        "learning_mode": mode,
        "customer_type": "องค์กร" if corp else "บุคคลทั่วไป",
        "seats": seats,
        "price_per_seat": int(pay_price),
        "total_amount": int(pay_price * seats * (0.9 if seats >= 5 else 1)),
        "lead_source": "องค์กรส่งมา" if corp and random.random() < 0.5 else random.choice(SOURCES[:-1]),
        "satisfaction": round(min(5, max(2.5, random.gauss(4.4, 0.4))), 1),
        "completed": random.choices(["สำเร็จ", "ไม่สำเร็จ"], [0.9, 0.1])[0],
    })
training.sort(key=lambda r: r["enroll_date"])
training = dirty(training, ["lead_source", "satisfaction"], dup_count=10)


# ---------------------------------------------------------------- 4) ตลาดเกม (สไตล์ Steam)
# ค่าในคอลัมน์เป็นภาษาอังกฤษ เพื่อให้กราฟ matplotlib แสดงผลได้โดยไม่ต้องตั้งฟอนต์ไทย
GENRES = {
    # genre: (review bonus, popularity bonus, avg playtime h, multiplayer prob)
    "Action": (0, 0.3, 12, 0.35), "Adventure": (1, 0.0, 10, 0.1), "RPG": (2, 0.4, 45, 0.25),
    "Strategy": (1, 0.1, 40, 0.4), "Simulation": (-1, 0.2, 30, 0.2), "Casual": (-3, -0.4, 5, 0.1),
    "Puzzle": (3, -0.6, 6, 0.05), "Roguelike": (6, 0.5, 25, 0.2), "Survival": (1, 0.7, 35, 0.8),
    "Horror": (-1, 0.1, 6, 0.3), "Racing": (-2, -0.2, 15, 0.6), "Sports": (-8, -0.3, 20, 0.7),
}
GENRE_W = [0.2, 0.13, 0.1, 0.08, 0.1, 0.12, 0.07, 0.05, 0.05, 0.05, 0.03, 0.02]
TIERS = {"Indie": (8.6, 0.8), "AA": (11.0, 0.15), "AAA": (13.2, 0.05)}  # (log-owners base, share)
W1 = ["Shadow", "Neon", "Pixel", "Iron", "Crystal", "Lost", "Star", "Dark", "Tiny", "Wild", "Eternal", "Cyber",
      "Dragon", "Void", "Silent", "Golden", "Rogue", "Frozen", "Solar", "Mystic", "Broken", "Hidden", "Last", "Steel"]
W2 = ["Kingdom", "Legends", "Frontier", "Odyssey", "Dungeon", "Horizon", "Tactics", "Island", "Protocol", "Empire",
      "Survivors", "Chronicles", "Racer", "Arena", "Village", "Hunter", "Factory", "Tower", "Ocean", "Colony", "League"]


def price_range(p):
    if p == 0:
        return "Free"
    for lim, lab in [(5, "< $5"), (10, "$5-10"), (20, "$10-20"), (40, "$20-40")]:
        if p < lim:
            return lab
    return "$40+"


games, used = [], set()
for i in range(1, 2501):
    # จำนวนเกมที่ออกใหม่บน Steam เพิ่มขึ้นทุกปี -> สุ่มปีแบบถ่วงน้ำหนัก
    year = random.choices(range(2016, 2026), [5, 6, 7, 8, 9, 10, 11, 12, 13, 14])[0]
    rel = rand_date(date(year, 1, 1), date(year, 12, 31))
    genre = random.choices(list(GENRES), GENRE_W)[0]
    rev_b, pop_b, play_h, mp_p = GENRES[genre]
    tier = random.choices(list(TIERS), [t[1] for t in TIERS.values()])[0]
    q = random.gauss(0, 1)  # คุณภาพแฝงของเกม
    free = random.random() < {"Indie": 0.08, "AA": 0.12, "AAA": 0.15}[tier]
    if free:
        price = 0.0
    elif tier == "AAA":
        price = random.choice([49.99, 59.99, 59.99, 69.99])
    elif tier == "AA":
        price = random.choice([19.99, 24.99, 29.99, 39.99])
    else:
        price = random.choices([0.99, 2.99, 4.99, 9.99, 14.99, 19.99, 24.99], [0.08, 0.14, 0.2, 0.25, 0.18, 0.1, 0.05])[0]
    early = tier == "Indie" and random.random() < 0.18
    multiplayer = random.random() < mp_p
    thai = random.random() < {"Indie": 0.06, "AA": 0.2, "AAA": 0.55}[tier]
    # ราคาอินดี้ช่วง $10-20 มักถูกมองว่าคุ้ม -> รีวิวดีกว่าเล็กน้อย
    sweet = 2 if tier == "Indie" and 9 < price < 21 else 0
    review = 74 + 9 * q + rev_b + sweet - (4 if early else 0) - (6 if free else 0) + random.gauss(0, 5)
    review = round(min(99, max(18, review)), 1)
    log_own = TIERS[tier][0] + 1.1 * q + pop_b + (1.6 if free else 0) + (0.4 if multiplayer else 0) \
        + (0.3 if thai else 0) + 0.06 * (2025 - year) + random.gauss(0, 1.3)
    owners = int(min(8e7, max(200, math.exp(log_own))) // 100 * 100)
    total_rev = max(1, int(owners * random.uniform(0.015, 0.04)))
    positive = int(total_rev * review / 100)
    playtime = round(max(0.3, random.lognormvariate(math.log(play_h), 0.6) * (1.3 if multiplayer else 1)), 1)
    # รายได้ประมาณการ: ยอดผู้เล่น x ราคา x ส่วนลดเฉลี่ย x ส่วนแบ่งหลังหัก Steam 30%
    revenue = owners * price * random.uniform(0.45, 0.65) * 0.7 if not free else owners * random.uniform(0.3, 2.5) * 0.7
    name = f"{random.choice(W1)} {random.choice(W2)}"
    while name in used:
        name += random.choice([" II", " Remastered", ": Origins", " 2", " Deluxe"])
    used.add(name)
    games.append({
        "app_id": 100000 + i * 37,
        "name": name,
        "release_date": rel.isoformat(),
        "primary_genre": genre,
        "developer_tier": tier,
        "price_usd": price,
        "price_range": price_range(price),
        "is_free": "Free" if free else "Paid",
        "early_access": "Yes" if early else "No",
        "multiplayer": "Yes" if multiplayer else "No",
        "thai_language": "Yes" if thai else "No",
        "steam_deck": random.choices(["Verified", "Playable", "Unsupported"], [0.35, 0.4, 0.25])[0],
        "owners_estimate": owners,
        "positive_reviews": positive,
        "negative_reviews": total_rev - positive,
        "review_pct": review,
        "avg_playtime_hours": playtime,
        "peak_ccu": int(owners * random.uniform(0.0005, 0.004) * (2 if multiplayer else 1)),
        "estimated_revenue_usd": int(revenue),
        "success": "Hit" if review >= 80 and owners >= 100_000 else "Not hit",
    })
games.sort(key=lambda r: r["release_date"])
games = dirty(games, ["steam_deck", "avg_playtime_hours", "thai_language"], missing_rate=0.008, dup_count=12)

# ---------------------------------------------------------------- เขียนไฟล์
DATASETS = {
    "sales": {
        "title": "ยอดขายร้านค้าปลีก (Retail Sales)",
        "description": "คำสั่งซื้อ 3,000 รายการ ปี 2024–2025 แยกภาค/จังหวัด/ช่องทาง/หมวดสินค้า เหมาะกับ Sales Dashboard, วิเคราะห์ฤดูกาล, กำไรต่อช่องทาง",
        "rows": sales,
    },
    "hr": {
        "title": "ข้อมูลพนักงาน (HR Analytics)",
        "description": "พนักงาน 800 คน พร้อมสถานะลาออก เหมาะกับวิเคราะห์ Attrition, โครงสร้างเงินเดือน, ปัจจัยความพึงพอใจ",
        "rows": hr,
    },
    "training": {
        "title": "การลงทะเบียนคอร์สอบรม (Training Enrollment)",
        "description": "การลงทะเบียน 1,500 รายการ ปี 2024–2025 เหมาะกับวิเคราะห์คอร์สยอดนิยม, ช่องทางการตลาด, รายได้ตามรูปแบบการเรียน",
        "rows": training,
    },
    "games": {
        "title": "ตลาดเกม Steam (Game Market)",
        "description": "เกม 2,500 เกม ปี 2016–2025: แนวเกม ราคา ระดับผู้พัฒนา ยอดผู้เล่น รีวิว รายได้ประมาณการ เหมาะกับวิเคราะห์แนวเกมที่น่าลงทุน ราคาที่เหมาะสม และปัจจัยที่ทำให้เกมฮิต",
        "rows": games,
    },
}

js_payload = {}
for key, ds in DATASETS.items():
    rows = ds["rows"]
    cols = list(rows[0].keys())
    with open(DATA / f"{key}.csv", "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=cols)
        w.writeheader()
        w.writerows(rows)
    js_payload[key] = {"title": ds["title"], "description": ds["description"], "columns": cols,
                       "rows": [[r[c] for c in cols] for r in rows]}
    print(f"{key}: {len(rows)} rows -> data/{key}.csv")

with open(DATA / "demo-data.js", "w", encoding="utf-8") as f:
    f.write("// สร้างอัตโนมัติจาก scripts/generate_demo_data.py — อย่าแก้ไขด้วยมือ\n")
    f.write("window.DEMO_DATASETS = ")
    json.dump(js_payload, f, ensure_ascii=False, separators=(",", ":"))
    f.write(";\n")
print("-> data/demo-data.js")
