// แหล่งข้อมูลแนะนำสำหรับโปรเจค Data Analyst
window.DATA_SOURCES = [
  {
    group: "🇹🇭 แหล่งข้อมูลไทย (ภาครัฐ / Open Data)",
    items: [
      { name: "ศูนย์กลางข้อมูลเปิดภาครัฐ (data.go.th)", url: "https://data.go.th", desc: "รวมชุดข้อมูลเปิดจากหน่วยงานรัฐหลายพันชุด ดาวน์โหลด CSV/Excel ได้ทันที", tags: ["ทุกหมวด", "CSV", "ฟรี"] },
      { name: "สำนักงานสถิติแห่งชาติ (NSO)", url: "https://www.nso.go.th", desc: "สถิติประชากร แรงงาน รายได้ครัวเรือน การใช้ ICT ของคนไทย", tags: ["ประชากร", "แรงงาน", "เศรษฐกิจ"] },
      { name: "สถิติประชากร กรมการปกครอง", url: "https://stat.bora.dopa.go.th", desc: "จำนวนประชากรรายจังหวัด/อำเภอ รายเดือน แยกเพศ-อายุ", tags: ["ประชากร", "จังหวัด"] },
      { name: "ธนาคารแห่งประเทศไทย (BOT)", url: "https://www.bot.or.th", desc: "อัตราแลกเปลี่ยน อัตราดอกเบี้ย เงินเฟ้อ สินเชื่อ ข้อมูลอนุกรมเวลา", tags: ["การเงิน", "Time series"] },
      { name: "ตลาดหลักทรัพย์แห่งประเทศไทย (SET)", url: "https://www.set.or.th", desc: "ราคาหุ้น งบการเงินบริษัทจดทะเบียน สถิติการซื้อขาย", tags: ["หุ้น", "การเงิน"] },
      { name: "สถิติกรมการขนส่งทางบก", url: "https://web.dlt.go.th/statistics/", desc: "จำนวนรถจดทะเบียนใหม่ แยกประเภท/เชื้อเพลิง/จังหวัด — ใช้วิเคราะห์ตลาดรถ EV ได้", tags: ["รถยนต์", "EV", "จังหวัด"] },
      { name: "Air4Thai กรมควบคุมมลพิษ", url: "http://air4thai.pcd.go.th", desc: "ค่าฝุ่น PM2.5 และคุณภาพอากาศรายสถานี รายชั่วโมง", tags: ["สิ่งแวดล้อม", "PM2.5", "Time series"] },
      { name: "กรมอุตุนิยมวิทยา", url: "https://www.tmd.go.th", desc: "อุณหภูมิ ปริมาณฝน สภาพอากาศรายวัน", tags: ["อากาศ", "Time series"] },
      { name: "กระทรวงการท่องเที่ยวและกีฬา", url: "https://www.mots.go.th", desc: "สถิตินักท่องเที่ยวต่างชาติ/ไทย รายได้การท่องเที่ยวรายจังหวัด", tags: ["ท่องเที่ยว", "จังหวัด"] },
      { name: "กรุงเทพมหานคร Open Data", url: "https://data.bangkok.go.th", desc: "ข้อมูลเมือง: ขยะ น้ำท่วม เรื่องร้องเรียน Traffy Fondue ฯลฯ", tags: ["เมือง", "กทม."] },
      { name: "ระบบสถิติการค้า กระทรวงพาณิชย์", url: "https://tradereport.moc.go.th", desc: "มูลค่านำเข้า-ส่งออกรายสินค้า รายประเทศ", tags: ["การค้า", "ส่งออก"] },
    ],
  },
  {
    group: "🌍 แหล่งข้อมูลต่างประเทศ / คลังชุดข้อมูล",
    items: [
      { name: "Kaggle Datasets", url: "https://www.kaggle.com/datasets", desc: "ชุดข้อมูลนับแสนชุด ทุกหัวข้อ พร้อม Notebook ตัวอย่างการวิเคราะห์", tags: ["ทุกหมวด", "Portfolio"] },
      { name: "Google Dataset Search", url: "https://datasetsearch.research.google.com", desc: "เสิร์ชเอนจินสำหรับค้นหาชุดข้อมูลจากทั่วโลก", tags: ["ค้นหา"] },
      { name: "Maven Analytics Data Playground", url: "https://mavenanalytics.io/data-playground", desc: "ชุดข้อมูลธุรกิจที่สะอาดพร้อมใช้ ออกแบบมาเพื่อฝึกทำ Portfolio สาย DA", tags: ["ธุรกิจ", "Portfolio", "มือใหม่"] },
      { name: "Tableau Sample Data (Superstore ฯลฯ)", url: "https://public.tableau.com/app/learn/sample-data", desc: "ชุดข้อมูลตัวอย่างยอดนิยม เช่น Superstore สำหรับ Sales Dashboard", tags: ["ยอดขาย", "มือใหม่"] },
      { name: "World Bank Open Data", url: "https://data.worldbank.org", desc: "ตัวชี้วัดเศรษฐกิจ สังคม ของทุกประเทศ ย้อนหลังหลายสิบปี", tags: ["เศรษฐกิจ", "เปรียบเทียบประเทศ"] },
      { name: "Our World in Data", url: "https://ourworldindata.org", desc: "ข้อมูลสุขภาพ พลังงาน สิ่งแวดล้อม พร้อมกราฟและ CSV", tags: ["สุขภาพ", "พลังงาน"] },
      { name: "UCI Machine Learning Repository", url: "https://archive.ics.uci.edu", desc: "ชุดข้อมูลคลาสสิกสำหรับการวิเคราะห์และ ML (เช่น Online Retail, Bank Marketing)", tags: ["ML", "วิชาการ"] },
      { name: "Awesome Public Datasets (GitHub)", url: "https://github.com/awesomedata/awesome-public-datasets", desc: "รายชื่อแหล่งข้อมูลสาธารณะจัดหมวดหมู่ไว้ครบ", tags: ["รวมลิงก์"] },
      { name: "NYC TLC Trip Record Data", url: "https://www.nyc.gov/site/tlc/about/tlc-trip-record-data.page", desc: "ข้อมูลการเดินทางแท็กซี่นิวยอร์กขนาดใหญ่ ฝึก Big data / SQL", tags: ["ขนส่ง", "ข้อมูลใหญ่"] },
    ],
  },
  {
    group: "🎯 ชุดข้อมูลแนะนำตามหัวข้อ",
    items: [
      { name: "IBM HR Analytics Attrition", url: "https://www.kaggle.com/datasets/pavansubhasht/ibm-hr-analytics-attrition-dataset", desc: "ข้อมูลพนักงาน 1,470 คน วิเคราะห์ปัจจัยการลาออก", tags: ["HR"] },
      { name: "Brazilian E-Commerce (Olist)", url: "https://www.kaggle.com/datasets/olistbr/brazilian-ecommerce", desc: "คำสั่งซื้อจริง 100k รายการ หลายตาราง เหมาะฝึก SQL Join + Dashboard", tags: ["E-commerce", "SQL"] },
      { name: "AdventureWorks (Microsoft)", url: "https://learn.microsoft.com/en-us/sql/samples/adventureworks-install-configure", desc: "ฐานข้อมูลตัวอย่างบริษัทขายจักรยาน ใช้คู่กับ SQL Server / Power BI", tags: ["SQL", "Power BI"] },
      { name: "US Fuel Economy Data", url: "https://www.fueleconomy.gov/feg/download.shtml", desc: "อัตราสิ้นเปลืองน้ำมันและข้อมูลสเปกรถยนต์ทุกรุ่นตั้งแต่ปี 1984", tags: ["รถยนต์"] },
      { name: "SteamSpy API", url: "https://steamspy.com/api.php", desc: "ข้อมูลเกมบน Steam: ยอดผู้เล่นโดยประมาณ ราคา แท็ก", tags: ["เกม", "API"] },
      { name: "RAWG Video Games Database API", url: "https://rawg.io/apidocs", desc: "ฐานข้อมูลเกม 500k+ เกม คะแนน แพลตฟอร์ม ประเภท (ต้องสมัคร API key ฟรี)", tags: ["เกม", "API"] },
    ],
  },
];

window.PROJECT_IDEAS = [
  { title: "Sales Performance Dashboard", data: "ชุดเดโม่ ยอดขาย / Superstore / Olist", q: "ภาคไหน ช่องทางไหน สินค้าไหนทำกำไรสูงสุด? ยอดขายมีฤดูกาลไหม?", tools: ["Excel", "Power BI", "Python"] },
  { title: "HR Attrition Analysis", data: "ชุดเดโม่ HR / IBM HR Attrition", q: "ปัจจัยใดสัมพันธ์กับการลาออก? OT และความพึงพอใจมีผลแค่ไหน?", tools: ["Python", "Power BI"] },
  { title: "วิเคราะห์ตลาดรถยนต์ไฟฟ้า (EV) ในไทย", data: "สถิติกรมการขนส่งทางบก", q: "ยอดจดทะเบียน EV เติบโตเท่าไร? จังหวัดไหนนำ? เทียบกับรถน้ำมันอย่างไร?", tools: ["Excel", "Python"] },
  { title: "Steam Game Market Analysis", data: "SteamSpy / Kaggle Steam datasets", q: "แนวเกมและช่วงราคาไหนได้รับความนิยม/รีวิวดีที่สุด?", tools: ["Python", "SQL"] },
  { title: "PM2.5 กับฤดูกาลในประเทศไทย", data: "Air4Thai + กรมอุตุฯ", q: "ช่วงเดือนไหนฝุ่นสูงสุด? ภาคไหนได้รับผลกระทบมาก?", tools: ["Python", "Excel"] },
  { title: "Training Center Marketing Analysis", data: "ชุดเดโม่ คอร์สอบรม", q: "ช่องทางการตลาดไหนคุ้มที่สุด? คอร์สไหนควรเปิดรอบเพิ่ม?", tools: ["Excel", "Power BI"] },
  { title: "Tourism Recovery Thailand", data: "กระทรวงการท่องเที่ยวฯ / data.go.th", q: "การท่องเที่ยวฟื้นตัวหลังโควิดเท่าไร? สัญชาติไหนมามากที่สุด?", tools: ["Power BI", "Python"] },
];
