"""ดึงข้อมูลเกมจริงจาก SteamSpy API แล้วบันทึกเป็น CSV ให้ใช้กับเว็บแอปและ notebook ได้ทันที

รัน:
    pip install requests
    python scripts/fetch_steam_data.py --pages 1 --details 300

--pages    จำนวนหน้าของ request=all (หน้าละ 1,000 เกม เรียงตามยอดผู้เล่น) — API จำกัด 1 ครั้ง/นาที
--details  จำนวนเกมที่ดึงรายละเอียดเพิ่ม (แนวเกม ภาษา แท็ก) — API จำกัด 1 ครั้ง/วินาที
--release  ดึงวันวางขายจาก Steam Store API ด้วย (ช้าลง ~1.5 วินาที/เกม)

ผลลัพธ์: data/steam_real.csv (คอลัมน์ชุดเดียวกับ data/games.csv เท่าที่หาได้)

ข้อควรรู้สำหรับเขียนในรายงาน:
- owners ของ SteamSpy เป็น "ช่วง" (เช่น 1,000,000 .. 2,000,000) สคริปต์ใช้ค่ากึ่งกลางเป็นค่าประมาณ
- estimated_revenue_usd เป็นค่าประมาณคร่าว ๆ (ผู้เล่น x ราคา x 0.5 ส่วนลดเฉลี่ย x 0.7 หลังหักส่วนแบ่ง Steam)
  ไม่ใช่รายได้จริงของบริษัท
"""
import argparse
import csv
import re
import time
from datetime import datetime
from pathlib import Path

import requests

STEAMSPY = "https://steamspy.com/api.php"
STORE = "https://store.steampowered.com/api/appdetails"
OUT = Path(__file__).resolve().parent.parent / "data" / "steam_real.csv"
COLUMNS = [
    "app_id", "name", "developer", "publisher", "release_date", "primary_genre", "price_usd", "price_range",
    "is_free", "early_access", "multiplayer", "thai_language", "owners_estimate", "positive_reviews",
    "negative_reviews", "review_pct", "avg_playtime_hours", "peak_ccu", "estimated_revenue_usd", "success",
]
GENRE_SKIP = {"Free to Play", "Early Access", "Indie", "Massively Multiplayer"}


def get_json(url, params, retries=3):
    for attempt in range(retries):
        try:
            r = requests.get(url, params=params, timeout=30)
            r.raise_for_status()
            return r.json()
        except (requests.RequestException, ValueError) as e:
            print(f"  ! {e} (ลองใหม่ครั้งที่ {attempt + 1})")
            time.sleep(5 * (attempt + 1))
    return None


def owners_mid(text):
    """'1,000,000 .. 2,000,000' -> 1500000"""
    nums = [int(n.replace(",", "")) for n in re.findall(r"[\d,]+", text or "")]
    return sum(nums) // len(nums) if nums else None


def price_range(p):
    if p == 0:
        return "Free"
    for lim, lab in [(5, "< $5"), (10, "$5-10"), (20, "$10-20"), (40, "$20-40")]:
        if p < lim:
            return lab
    return "$40+"


def parse_release(text):
    for fmt in ("%d %b, %Y", "%b %d, %Y", "%d %B, %Y", "%B %d, %Y", "%b %Y"):
        try:
            return datetime.strptime(text.strip(), fmt).date().isoformat()
        except (ValueError, AttributeError):
            pass
    return ""


def to_row(app, detail=None, release=""):
    """แปลงข้อมูล SteamSpy 1 เกม ให้อยู่ในรูปแบบคอลัมน์เดียวกับชุดเดโม่"""
    detail = detail or {}
    price = int(app.get("price") or 0) / 100
    pos, neg = int(app.get("positive") or 0), int(app.get("negative") or 0)
    review = round(pos / (pos + neg) * 100, 1) if pos + neg else None
    owners = owners_mid(app.get("owners"))
    genres = [g.strip() for g in (detail.get("genre") or "").split(",") if g.strip()]
    tags = detail.get("tags") or {}
    tag_names = set(tags) if isinstance(tags, dict) else set()
    primary = next((g for g in genres if g not in GENRE_SKIP), genres[0] if genres else "")
    free = price == 0
    revenue = int(owners * price * 0.5 * 0.7) if owners and not free else None
    return {
        "app_id": app.get("appid"),
        "name": app.get("name"),
        "developer": app.get("developer"),
        "publisher": app.get("publisher"),
        "release_date": release,
        "primary_genre": primary,
        "price_usd": price,
        "price_range": price_range(price),
        "is_free": "Free" if free else "Paid",
        "early_access": ("Yes" if "Early Access" in genres else "No") if detail else "",
        "multiplayer": ("Yes" if tag_names & {"Multiplayer", "Online Co-Op", "PvP", "Co-op", "MMO"} else "No") if detail else "",
        "thai_language": ("Yes" if "Thai" in (detail.get("languages") or "") else "No") if detail else "",
        "owners_estimate": owners,
        "positive_reviews": pos,
        "negative_reviews": neg,
        "review_pct": review,
        "avg_playtime_hours": round(int(app.get("average_forever") or 0) / 60, 1),
        "peak_ccu": app.get("ccu"),
        "estimated_revenue_usd": revenue,
        "success": "Hit" if review is not None and owners and review >= 80 and owners >= 100_000 else "Not hit",
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--pages", type=int, default=1)
    ap.add_argument("--details", type=int, default=300)
    ap.add_argument("--release", action="store_true")
    args = ap.parse_args()

    apps = {}
    for page in range(args.pages):
        print(f"ดึงรายชื่อเกมหน้า {page + 1}/{args.pages} ...")
        data = get_json(STEAMSPY, {"request": "all", "page": page})
        if not data:
            break
        apps.update(data)
        if page < args.pages - 1:
            time.sleep(61)  # SteamSpy จำกัด request=all ไว้ 1 ครั้งต่อนาที
    if not apps:
        raise SystemExit("ดึงข้อมูลไม่สำเร็จ — ตรวจสอบอินเทอร์เน็ต หรือ SteamSpy อาจปิดปรับปรุงชั่วคราว")

    ordered = sorted(apps.values(), key=lambda a: owners_mid(a.get("owners")) or 0, reverse=True)
    rows = []
    for i, app in enumerate(ordered):
        detail, release = None, ""
        if i < args.details:
            detail = get_json(STEAMSPY, {"request": "appdetails", "appid": app["appid"]})
            time.sleep(1.05)
            if args.release:
                store = get_json(STORE, {"appids": app["appid"], "l": "english"}) or {}
                info = store.get(str(app["appid"]), {})
                if info.get("success"):
                    release = parse_release(info["data"].get("release_date", {}).get("date", ""))
                time.sleep(1.5)
            if (i + 1) % 25 == 0:
                print(f"  รายละเอียด {i + 1}/{min(args.details, len(ordered))}")
        rows.append(to_row(app, detail, release))

    OUT.parent.mkdir(exist_ok=True)
    with open(OUT, "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=COLUMNS)
        w.writeheader()
        w.writerows(rows)
    print(f"บันทึก {len(rows):,} เกม -> {OUT}")


if __name__ == "__main__":
    main()
