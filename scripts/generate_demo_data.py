"""สร้างข้อมูลเดโม่ (สังเคราะห์) สำหรับ Data Analyst Studio

รัน:  python scripts/generate_demo_data.py
ผลลัพธ์: data/*.csv และ data/demo-data.js (ให้เว็บเปิดได้แม้เปิดไฟล์ตรง ๆ แบบ file://)

ข้อมูลทั้งหมดเป็นข้อมูลสมมติ และจงใจใส่ค่าว่าง/แถวซ้ำเล็กน้อยไว้ฝึกทำความสะอาดข้อมูล
"""
import csv
import json
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
