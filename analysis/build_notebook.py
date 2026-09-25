"""สร้าง game_market_analysis.ipynb (แก้เนื้อหาที่ไฟล์นี้ แล้วรันใหม่)
    python analysis/build_notebook.py
    jupyter nbconvert --to notebook --execute --inplace analysis/game_market_analysis.ipynb
"""
from pathlib import Path
import nbformat as nbf

md, code = nbf.v4.new_markdown_cell, nbf.v4.new_code_cell
cells = [
md("""# 🎮 Steam Game Market Analysis
**โปรเจคจบสาย Data Analyst — วิเคราะห์ตลาดเกมบน Steam**

### คำถามทางธุรกิจ (Business Questions)
สมมติว่าเราเป็นนักวิเคราะห์ให้ **สตูดิโอเกมอินดี้ไทย** ที่กำลังตัดสินใจว่าจะสร้างเกมถัดไปแบบไหน

1. ตลาดเกมบน Steam เติบโตอย่างไร? การแข่งขันสูงขึ้นแค่ไหน?
2. **แนวเกมไหนน่าลงทุน** — คู่แข่งน้อยแต่ผลตอบแทนดี?
3. **ตั้งราคาเท่าไรดี** สำหรับเกมอินดี้?
4. Indie vs AA vs AAA — รายได้กระจุกตัวแค่ไหน?
5. Free-to-Play คุ้มกว่าขายขาดไหม?
6. **ปัจจัยอะไรสัมพันธ์กับการเป็นเกมฮิต** (Multiplayer, ภาษาไทย, Early Access, Steam Deck)?

> ข้อมูล: `data/games.csv` (ข้อมูลสังเคราะห์สำหรับฝึก) — เปลี่ยน `DATA_FILE` เป็น `data/steam_real.csv` ที่ได้จาก `scripts/fetch_steam_data.py` เพื่อใช้ข้อมูลจริง
>
> นิยาม **Hit** = รีวิวเชิงบวก ≥ 80% และผู้เล่น ≥ 100,000 คน"""),
code("""import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
from pathlib import Path

ROOT = Path.cwd() if (Path.cwd() / "data").exists() else Path.cwd().parent
DATA_FILE = ROOT / "data" / "games.csv"          # หรือ ROOT / "data" / "steam_real.csv"
FIG_DIR = ROOT / "analysis" / "figures"
FIG_DIR.mkdir(parents=True, exist_ok=True)

plt.rcParams.update({"figure.figsize": (9, 4.5), "axes.spines.top": False, "axes.spines.right": False,
                     "axes.grid": True, "grid.alpha": .3, "figure.dpi": 110})
BLUE, ORANGE, GREEN, GRAY = "#2a78d6", "#eb6834", "#1baf7a", "#b4bac4"

def save(name):
    plt.tight_layout()
    plt.savefig(FIG_DIR / f"{name}.png", dpi=150, bbox_inches="tight")
    plt.show()

pd.options.display.float_format = "{:,.2f}".format
df_raw = pd.read_csv(DATA_FILE)
print(df_raw.shape)
df_raw.head()"""),
md("## 1. สำรวจและทำความสะอาดข้อมูล (Data Cleaning)"),
code("""print("ชนิดข้อมูล:\\n", df_raw.dtypes, "\\n")
print("ค่าว่างต่อคอลัมน์:\\n", df_raw.isna().sum()[lambda s: s > 0], "\\n")
print("แถวซ้ำ:", df_raw.duplicated().sum())"""),
code("""df = df_raw.drop_duplicates().copy()
df["release_date"] = pd.to_datetime(df["release_date"], errors="coerce")
df["release_year"] = df["release_date"].dt.year

# ค่าว่าง: playtime เติมด้วยมัธยฐานของแนวเกมเดียวกัน, คอลัมน์ข้อความเติม "Unknown"
if "avg_playtime_hours" in df:
    df["avg_playtime_hours"] = df.groupby("primary_genre")["avg_playtime_hours"].transform(lambda s: s.fillna(s.median()))
for c in ["steam_deck", "thai_language"]:
    if c in df:
        df[c] = df[c].fillna("Unknown")
df = df.dropna(subset=["owners_estimate", "review_pct"])
df["is_hit"] = (df["success"] == "Hit").astype(int)

log = f"เดิม {len(df_raw):,} แถว → ลบแถวซ้ำ {df_raw.duplicated().sum()} แถว → เหลือ {len(df):,} แถว"
print(log)
df.describe().T"""),
md("""**ข้อสังเกต:** `owners_estimate` และ `estimated_revenue_usd` มีค่าเฉลี่ยสูงกว่ามัธยฐานหลายเท่า → ข้อมูล **เบ้ขวามาก (long tail)**
จึงควรสรุปด้วย **มัธยฐาน** และพล็อตด้วย **log scale**"""),
code("""fig, axes = plt.subplots(1, 2, figsize=(11, 4))
axes[0].hist(df["owners_estimate"], bins=50, color=BLUE)
axes[0].set_title("Owners (linear scale)")
axes[1].hist(np.log10(df["owners_estimate"].clip(lower=1)), bins=40, color=BLUE)
axes[1].set_title("Owners (log10 scale)")
axes[1].set_xlabel("log10(owners)  e.g. 4 = 10,000, 6 = 1,000,000")
save("01_owners_distribution")"""),
md("## 2. ตลาดเติบโตอย่างไร? (Q1)"),
code("""yearly = df.groupby("release_year").agg(
    games=("app_id", "size"),
    median_owners=("owners_estimate", "median"),
    hit_rate=("is_hit", "mean"),
)
yearly["games_growth_%"] = yearly["games"].pct_change() * 100
display(yearly)

fig, axes = plt.subplots(1, 2, figsize=(11, 4))
axes[0].bar(yearly.index, yearly["games"], color=BLUE)
axes[0].set_title("New releases per year")
axes[1].plot(yearly.index, yearly["median_owners"], color=ORANGE, marker="o", lw=2)
axes[1].set_title("Median owners per game (by release year)")
save("02_market_growth")"""),
md("""**Insight:** จำนวนเกมใหม่เพิ่มขึ้นทุกปี แต่ผู้เล่นต่อเกม (มัธยฐาน) ไม่ได้เพิ่มตาม → **การแข่งขันสูงขึ้น** เกมใหม่ต้องแย่งความสนใจมากขึ้น
(หมายเหตุ: เกมที่ออกนานกว่าก็มีเวลาสะสมผู้เล่นนานกว่า ควรกล่าวถึงข้อจำกัดนี้ในรายงาน)"""),
md("## 3. แนวเกมไหนน่าลงทุน? (Q2) — Opportunity Matrix"),
code("""genre = df.groupby("primary_genre").agg(
    games=("app_id", "size"),
    median_owners=("owners_estimate", "median"),
    median_revenue=("estimated_revenue_usd", "median"),
    avg_review=("review_pct", "mean"),
    hit_rate=("is_hit", "mean"),
).sort_values("hit_rate", ascending=False)
genre["market_share_%"] = genre["games"] / genre["games"].sum() * 100
display(genre)

fig, ax = plt.subplots(figsize=(9, 6))
ax.scatter(genre["games"], genre["hit_rate"] * 100, s=genre["median_owners"] / genre["median_owners"].max() * 900 + 40,
           color=BLUE, alpha=.6, edgecolor="white", linewidth=2)
for g, r in genre.iterrows():
    ax.annotate(g, (r["games"], r["hit_rate"] * 100), xytext=(6, 4), textcoords="offset points", fontsize=9)
ax.axvline(genre["games"].median(), color=GRAY, ls="--")
ax.axhline(genre["hit_rate"].median() * 100, color=GRAY, ls="--")
ax.set_xlabel("Number of games (competition)")
ax.set_ylabel("Hit rate (%)")
ax.set_title("Genre opportunity matrix  (top-left = less competition, higher hit rate; bubble = median owners)")
save("03_genre_opportunity")"""),
md("""**Insight:** แนวเกมที่อยู่ **มุมซ้ายบน** (คู่แข่งน้อย + อัตราฮิตสูง) คือโอกาส เช่น Roguelike และ Survival (Strategy อัตราฮิตสูงแต่คู่แข่งเริ่มมาก)
ส่วนแนวที่มีเกมมากแต่อัตราฮิตต่ำ (เช่น Casual) คือ **ตลาดแข่งขันสูง (Red ocean)**"""),
md("## 4. ตั้งราคาเท่าไรดี? (Q3)"),
code("""order = [p for p in ["Free", "< $5", "$5-10", "$10-20", "$20-40", "$40+"] if p in df["price_range"].unique()]
tier_filter = df["developer_tier"].eq("Indie") if "developer_tier" in df else slice(None)
indie = df[tier_filter]
price = indie.groupby("price_range").agg(
    games=("app_id", "size"),
    avg_review=("review_pct", "mean"),
    median_owners=("owners_estimate", "median"),
    median_revenue=("estimated_revenue_usd", "median"),
    hit_rate=("is_hit", "mean"),
).reindex(order)
display(price)

fig, axes = plt.subplots(1, 2, figsize=(11, 4))
axes[0].bar(price.index, price["avg_review"], color=BLUE)
axes[0].set_ylim(price["avg_review"].min() - 5, price["avg_review"].max() + 2)
axes[0].set_title("Indie: average review % by price")
axes[1].bar(price.index, price["median_revenue"], color=GREEN)
axes[1].set_title("Indie: median est. revenue (USD) by price")
save("04_indie_pricing")"""),
md("## 5. Indie vs AA vs AAA — รายได้กระจุกตัวแค่ไหน? (Q4)"),
code("""if "developer_tier" in df:
    tier = df.groupby("developer_tier").agg(games=("app_id", "size"), revenue=("estimated_revenue_usd", "sum"),
                                            median_revenue=("estimated_revenue_usd", "median"), hit_rate=("is_hit", "mean"))
    tier["share_games_%"] = tier["games"] / tier["games"].sum() * 100
    tier["share_revenue_%"] = tier["revenue"] / tier["revenue"].sum() * 100
    display(tier)

# Pareto: เกม top X% ครองรายได้กี่ %
rev = df["estimated_revenue_usd"].dropna().sort_values(ascending=False).reset_index(drop=True)
cum = rev.cumsum() / rev.sum() * 100
pct_games = (np.arange(1, len(rev) + 1) / len(rev)) * 100
for p in [1, 10, 20]:
    print(f"เกม top {p}% ครองรายได้ {cum.iloc[int(len(rev) * p / 100) - 1]:.1f}% ของทั้งตลาด")

fig, ax = plt.subplots()
ax.plot(pct_games, cum, color=BLUE, lw=2)
ax.plot([0, 100], [0, 100], color=GRAY, ls="--", label="equal distribution")
ax.set_xlabel("% of games (sorted by revenue)")
ax.set_ylabel("% of total revenue")
ax.set_title("Revenue concentration (Pareto / Lorenz curve)")
ax.legend()
save("05_revenue_pareto")"""),
md("""**Insight:** รายได้กระจุกตัวสูงมาก — เกมจำนวนน้อยครองรายได้ส่วนใหญ่ของตลาด (**hit-driven market**)
สำหรับสตูดิโออินดี้ ความเสี่ยงสูง ควรควบคุมต้นทุนการพัฒนาให้คุ้มทุนได้แม้ยอดขายระดับมัธยฐาน"""),
md("## 6. Free-to-Play vs ขายขาด (Q5)"),
code("""f2p = df.groupby("is_free").agg(games=("app_id", "size"), median_owners=("owners_estimate", "median"),
                                 avg_review=("review_pct", "mean"), median_revenue=("estimated_revenue_usd", "median"),
                                 hit_rate=("is_hit", "mean"))
f2p["revenue_per_owner"] = f2p["median_revenue"] / f2p["median_owners"]
f2p"""),
md("**Insight:** เกม F2P ได้ผู้เล่นมากกว่าหลายเท่า แต่รีวิวเฉลี่ยต่ำกว่า และ **รายได้ต่อผู้เล่นต่ำกว่ามาก** (ดู `revenue_per_owner`) — ต้องมีระบบหารายได้ (monetization) ที่ดีและทีมดูแลระยะยาว ซึ่งยากสำหรับสตูดิโอเล็ก"),
md("## 7. ปัจจัยที่สัมพันธ์กับการเป็นเกมฮิต (Q6)"),
code("""factors = [c for c in ["multiplayer", "thai_language", "early_access", "steam_deck", "is_free", "developer_tier"] if c in df]
rows = []
for c in factors:
    for v, g in df.groupby(c):
        rows.append({"factor": c, "value": v, "games": len(g), "hit_rate_%": g["is_hit"].mean() * 100})
fx = pd.DataFrame(rows)
overall = df["is_hit"].mean() * 100
fx["vs_overall_pp"] = fx["hit_rate_%"] - overall
print(f"อัตราฮิตรวม = {overall:.1f}%")
display(fx.sort_values("vs_overall_pp", ascending=False))

sub = fx[fx["games"] >= 30].sort_values("vs_overall_pp")
fig, ax = plt.subplots(figsize=(9, 6))
ax.barh(sub["factor"] + " = " + sub["value"].astype(str), sub["vs_overall_pp"],
        color=[GREEN if v > 0 else ORANGE for v in sub["vs_overall_pp"]])
ax.axvline(0, color="black", lw=.8)
ax.set_xlabel(f"Hit rate difference vs overall ({overall:.1f}%), percentage points")
ax.set_title("Which features are associated with hits?")
save("06_hit_factors")"""),
code("""num_cols = ["price_usd", "review_pct", "avg_playtime_hours", "owners_estimate", "peak_ccu", "estimated_revenue_usd"]
num_cols = [c for c in num_cols if c in df]
corr = df[num_cols].assign(log_owners=np.log10(df["owners_estimate"].clip(lower=1))).corr(method="spearman")
fig, ax = plt.subplots(figsize=(7, 6))
im = ax.imshow(corr, cmap="RdBu", vmin=-1, vmax=1)
ax.set_xticks(range(len(corr)), corr.columns, rotation=45, ha="right")
ax.set_yticks(range(len(corr)), corr.columns)
for i in range(len(corr)):
    for j in range(len(corr)):
        ax.text(j, i, f"{corr.iloc[i, j]:.2f}", ha="center", va="center", fontsize=8,
                color="white" if abs(corr.iloc[i, j]) > .5 else "black")
ax.grid(False)
fig.colorbar(im, ax=ax, shrink=.8)
ax.set_title("Spearman correlation (robust to long tail)")
save("07_correlation")"""),
md("""> ⚠️ **Correlation ≠ Causation** — เช่น เกมที่รองรับภาษาไทยอาจฮิตกว่าเพราะเป็นเกมทุนสูงอยู่แล้ว (ตัวแปรกวน: `developer_tier`)
> ลองแยกวิเคราะห์เฉพาะ Indie เพื่อควบคุมตัวแปรนี้"""),
code("""if "developer_tier" in df:
    ind = df[df["developer_tier"] == "Indie"]
    display(pd.concat({c: ind.groupby(c)["is_hit"].mean().mul(100).round(1) for c in ["multiplayer", "thai_language", "early_access"]}))"""),
md("## 8. สรุปตัวเลขสำคัญ (สำหรับใส่ในบทสรุป / KPI ในแดชบอร์ด)"),
code("""best_genre = genre.index[0]
best_price = price["median_revenue"].idxmax()
summary = pd.Series({
    "จำนวนเกมที่วิเคราะห์": f"{len(df):,}",
    "อัตราเกมฮิตรวม": f"{overall:.1f}%",
    "มัธยฐานผู้เล่นต่อเกม": f"{df['owners_estimate'].median():,.0f}",
    "มัธยฐานรายได้ประมาณการ (USD)": f"{df['estimated_revenue_usd'].median():,.0f}",
    "เกม top 10% ครองรายได้": f"{cum.iloc[int(len(rev) * .1) - 1]:.1f}%",
    "แนวเกมอัตราฮิตสูงสุด": f"{best_genre} ({genre.loc[best_genre, 'hit_rate'] * 100:.1f}%)",
    "ช่วงราคาอินดี้ที่รายได้มัธยฐานสูงสุด": best_price,
})
summary.to_frame("ค่า")"""),
code("""# Export ตารางสรุปไปใช้ต่อใน Power BI / Excel / รายงาน
out = ROOT / "analysis" / "output"
out.mkdir(exist_ok=True)
genre.to_csv(out / "genre_summary.csv", encoding="utf-8-sig")
price.to_csv(out / "indie_price_summary.csv", encoding="utf-8-sig")
fx.to_csv(out / "hit_factors.csv", index=False, encoding="utf-8-sig")
df.to_csv(out / "games_clean.csv", index=False, encoding="utf-8-sig")
print("บันทึกแล้ว:", [p.name for p in out.iterdir()])"""),
md("""## 9. ข้อเสนอแนะ (Recommendations) — ตัวอย่าง
เขียนให้ **ตรวจสอบกับตัวเลขข้างบนทุกครั้ง** หากเปลี่ยนเป็นข้อมูลจริง

1. **แนวเกม:** เลือกแนวที่คู่แข่งน้อยแต่อัตราฮิตสูง (มุมซ้ายบนของ Opportunity matrix) แทนแนวที่ตลาดล้น
2. **ราคา:** เกมอินดี้ควรตั้งราคาในช่วงที่รีวิวและรายได้มัธยฐานดีที่สุด ไม่ควรตั้งถูกเกินไปเพราะไม่ได้ช่วยให้ขายได้มากขึ้นอย่างมีนัย
3. **ฟีเจอร์:** การรองรับ **ภาษาไทย/หลายภาษา** สัมพันธ์กับอัตราฮิตที่สูงกว่าชัดเจน แม้จะดูเฉพาะเกมอินดี้ ส่วน Multiplayer และ Steam Deck ต่างกันเพียงเล็กน้อย (~1 จุด %) จึงไม่ควรใช้เป็นเหตุผลหลัก
4. **Early Access:** เกมที่อยู่ใน Early Access มีอัตราฮิตต่ำกว่า — ถ้าจะใช้ ต้องมีแผนอัปเดตที่ชัดเจนเพื่อรักษารีวิว
5. **ความเสี่ยง:** ตลาดเป็นแบบ hit-driven ควรวางงบให้คุ้มทุนที่ยอดขายระดับมัธยฐาน และทดสอบตลาดก่อน (เช่น demo / wishlist / Early Access)

### ข้อจำกัด
- ยอดผู้เล่นและรายได้เป็น **ค่าประมาณ** (SteamSpy ให้เป็นช่วง) ไม่ใช่ยอดขายจริง
- ความสัมพันธ์ที่พบเป็น correlation ไม่ได้พิสูจน์ว่าเป็นสาเหตุ
- เกมที่ออกก่อนมีเวลาสะสมผู้เล่นนานกว่า (time bias)"""),
]

nb = nbf.v4.new_notebook(cells=cells, metadata={"kernelspec": {"name": "python3", "display_name": "Python 3", "language": "python"},
                                                "language_info": {"name": "python"}})
path = Path(__file__).with_name("game_market_analysis.ipynb")
nbf.write(nb, path)
print("->", path)
