# 📊 Data Analyst Studio

เว็บแอปสำหรับทำ **โปรเจคจบสาย Data Analyst** — โหลดข้อมูล สำรวจ ทำความสะอาด วิเคราะห์ สร้างแดชบอร์ด และสรุป Insight ได้ครบในเบราว์เซอร์ ไม่ต้องติดตั้งเซิร์ฟเวอร์

> ทำด้วย HTML + CSS + JavaScript ล้วน (ใช้ [Chart.js](https://www.chartjs.org/) และ [PapaParse](https://www.papaparse.com/) ผ่าน CDN) และมีสคริปต์ Python สำหรับสร้างข้อมูลเดโม่

## 🚀 วิธีใช้งาน

**แบบง่ายที่สุด:** ดับเบิลคลิก `index.html` เปิดในเบราว์เซอร์ (ต้องต่ออินเทอร์เน็ตเพื่อโหลด Chart.js)

**แบบรันเซิร์ฟเวอร์ในเครื่อง:**
```bash
python -m http.server 8000
# แล้วเปิด http://localhost:8000
```

**เผยแพร่ออนไลน์ฟรี (ใส่ใน Portfolio ได้):** GitHub → Settings → Pages → Source: `Deploy from a branch` → เลือก branch แล้วกด Save

## ✨ ฟีเจอร์

| แท็บ | ทำอะไรได้ | ใช้ในรายงานบทไหน |
|---|---|---|
| 🏠 เริ่มต้น | เลือกข้อมูลเดโม่ 3 ชุด หรือลากไฟล์ CSV ของตัวเองมาวาง | บทที่ 3 แหล่งข้อมูล |
| 📋 ตารางข้อมูล | ดูข้อมูล ค้นหา เรียงลำดับ แบ่งหน้า Export CSV ที่ทำความสะอาดแล้ว | ภาคผนวก |
| 🔍 โปรไฟล์ข้อมูล | ชนิดคอลัมน์, ค่าว่าง, ค่าไม่ซ้ำ, min/max/mean/median/SD, Outlier (IQR), Correlation matrix | บทที่ 3–4 สำรวจข้อมูล (EDA) |
| 🧹 ทำความสะอาด | ลบแถวซ้ำ, จัดการค่าว่าง (ลบ/เติม mean/median/mode), กรองข้อมูล, ลบคอลัมน์, **สร้างคอลัมน์คำนวณ** เช่น `[profit] / [revenue] * 100` พร้อม **Cleaning log** อัตโนมัติ | บทที่ 3 การเตรียมข้อมูล |
| 📈 แดชบอร์ด | สร้างอัตโนมัติ: KPI, แนวโน้มรายเดือน, การเติบโต YoY, Top N ตามหมวด, สัดส่วน, Histogram, อัตราตัวแปรเป้าหมาย (เช่น % ลาออก) + ตัวกรองแบบ Slicer | บทที่ 4 ผลการวิเคราะห์ |
| 🛠️ สร้างกราฟ | Bar / Line / Pie / Doughnut / Scatter (พร้อมค่า r) / Histogram เลือกแกน การรวม แยกสีตามกลุ่ม ดาวน์โหลด PNG | บทที่ 4 |
| 🧮 Pivot | Pivot table แถว × คอลัมน์ พร้อมผลรวม และ Heatmap, Export CSV | บทที่ 4 |
| 💡 Insights | ค้นหาข้อค้นพบอัตโนมัติ: กลุ่มสูงสุด/ต่ำสุด, แนวโน้มปีต่อปี, ฤดูกาล, ปัจจัยที่สัมพันธ์กับตัวแปรเป้าหมาย, correlation, คุณภาพข้อมูล | บทที่ 5 สรุปผล |
| 🌐 แหล่งข้อมูล | รวมแหล่งข้อมูลจริง (ไทย + ต่างประเทศ) พร้อมไอเดียหัวข้อโปรเจค | บทที่ 1 |

ข้อมูลทั้งหมดประมวลผลในเบราว์เซอร์ ไม่ถูกส่งออกไปที่ใด รองรับธีมมืด/สว่าง และหน้าจอมือถือ

## 🗂️ ข้อมูลเดโม่ (ข้อมูลสังเคราะห์)

| ไฟล์ | เนื้อหา | ตัวอย่างคำถามวิเคราะห์ |
|---|---|---|
| `data/sales.csv` | คำสั่งซื้อ 3,000 รายการ ปี 2024–2025: ภาค, จังหวัด, ช่องทาง (หน้าร้าน/Shopee/Lazada…), หมวดสินค้า, ยอดขาย, ต้นทุน, กำไร, คะแนนรีวิว | ช่องทางไหนกำไรดีสุด? ยอดขายช่วง 11.11/12.12 เพิ่มขึ้นเท่าไร? |
| `data/hr.csv` | พนักงาน 800 คน: แผนก, ตำแหน่ง, อายุงาน, เงินเดือน, คะแนนประเมิน, ความพึงพอใจ, OT, **สถานะลาออก** | ปัจจัยอะไรทำให้พนักงานลาออก? |
| `data/training.csv` | การลงทะเบียนคอร์สอบรม 1,500 รายการ: หมวดคอร์ส, รูปแบบเรียน, ประเภทลูกค้า, ช่องทางที่รู้จัก, ยอดเงิน, ความพึงพอใจ | ช่องทางการตลาดไหนคุ้มที่สุด? คอร์สไหนมาแรง? |

ข้อมูลถูก**ใส่ค่าว่างและแถวซ้ำไว้เล็กน้อยโดยตั้งใจ** เพื่อให้ฝึกขั้นตอน Data Cleaning ได้จริง

สร้างข้อมูลใหม่ (เปลี่ยน seed / จำนวนแถว ได้ในสคริปต์):
```bash
python scripts/generate_demo_data.py
```

## 🌐 แหล่งข้อมูลแนะนำ

**ไทย**
- [data.go.th](https://data.go.th) — ศูนย์กลางข้อมูลเปิดภาครัฐ (หลายพันชุด)
- [สำนักงานสถิติแห่งชาติ](https://www.nso.go.th) — ประชากร แรงงาน รายได้ครัวเรือน
- [สถิติกรมการขนส่งทางบก](https://web.dlt.go.th/statistics/) — รถจดทะเบียนใหม่ แยกเชื้อเพลิง (วิเคราะห์ตลาด EV)
- [Air4Thai](http://air4thai.pcd.go.th) — ค่าฝุ่น PM2.5 รายสถานี
- [ธนาคารแห่งประเทศไทย](https://www.bot.or.th) — อัตราแลกเปลี่ยน ดอกเบี้ย เงินเฟ้อ
- [SET](https://www.set.or.th) — ข้อมูลหุ้นและงบการเงิน
- [กระทรวงการท่องเที่ยวและกีฬา](https://www.mots.go.th) — สถิตินักท่องเที่ยว
- [กทม. Open Data](https://data.bangkok.go.th) — ข้อมูลเมือง

**ต่างประเทศ**
- [Kaggle Datasets](https://www.kaggle.com/datasets) · [Google Dataset Search](https://datasetsearch.research.google.com)
- [Maven Analytics Data Playground](https://mavenanalytics.io/data-playground) — ชุดข้อมูลธุรกิจสำหรับทำ Portfolio
- [Tableau Sample Data](https://public.tableau.com/app/learn/sample-data) — Superstore
- [World Bank](https://data.worldbank.org) · [Our World in Data](https://ourworldindata.org) · [UCI ML Repository](https://archive.ics.uci.edu)
- ชุดยอดนิยม: [IBM HR Attrition](https://www.kaggle.com/datasets/pavansubhasht/ibm-hr-analytics-attrition-dataset), [Olist E-Commerce](https://www.kaggle.com/datasets/olistbr/brazilian-ecommerce), [AdventureWorks](https://learn.microsoft.com/en-us/sql/samples/adventureworks-install-configure)
- สายรถ/เกม: [US Fuel Economy](https://www.fueleconomy.gov/feg/download.shtml), [SteamSpy API](https://steamspy.com/api.php), [RAWG API](https://rawg.io/apidocs)

รายการเต็มพร้อมคำอธิบายอยู่ในแท็บ **🌐 แหล่งข้อมูล** ของแอป (แก้ไขได้ที่ `js/sources.js`)

## 📝 โครงรายงานโปรเจคที่แนะนำ

1. **บทนำ** — ปัญหา/คำถามทางธุรกิจ 3–5 ข้อ, วัตถุประสงค์, ขอบเขต
2. **ทฤษฎีที่เกี่ยวข้อง** — Data Analytics process, สถิติเชิงพรรณนา, Data visualization, KPI
3. **วิธีดำเนินงาน** — แหล่งข้อมูล, Data dictionary (จากแท็บโปรไฟล์), ขั้นตอนทำความสะอาด (จาก Cleaning log)
4. **ผลการวิเคราะห์** — แดชบอร์ด, กราฟ, Pivot ตอบคำถามแต่ละข้อ
5. **สรุปและข้อเสนอแนะ** — Insight + ข้อเสนอเชิงธุรกิจที่ทำได้จริง + ข้อจำกัด

💡 เคล็ดลับ: ใช้แอปนี้สำรวจข้อมูลให้เร็ว แล้วต่อยอดทำแดชบอร์ดจริงใน **Power BI / Excel** หรือเขียนวิเคราะห์ลึกด้วย **Python (pandas)** จะทำให้โปรเจคแข็งแรงขึ้นมาก

## 📁 โครงสร้างไฟล์

```
├── index.html                  หน้าเว็บหลัก
├── css/style.css               สไตล์ (รองรับธีมมืด + มือถือ)
├── js/app.js                   ตรรกะทั้งหมดของแอป
├── js/sources.js               รายการแหล่งข้อมูล + ไอเดียโปรเจค
├── data/*.csv                  ข้อมูลเดโม่
├── data/demo-data.js           ข้อมูลเดโม่แบบ JS (ให้เปิดไฟล์ตรง ๆ ได้)
└── scripts/generate_demo_data.py   สคริปต์สร้างข้อมูลเดโม่
```
