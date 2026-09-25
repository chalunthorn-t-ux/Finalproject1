/* Data Analyst Studio — ทำงานในเบราว์เซอร์ทั้งหมด ไม่มี backend */
(() => {
  "use strict";

  // ------------------------------------------------------------------ state
  const state = {
    name: "",
    original: null,   // { columns, rows } ชุดต้นฉบับ (ใช้ตอน reset)
    columns: [],
    rows: [],
    types: {},        // col -> "number" | "date" | "text"
    log: [],
    table: { page: 0, pageSize: 50, sortCol: null, sortDir: 1, query: "" },
    dashFilters: {},
    dashMeasure: null,
    dashAgg: null,
  };
  const charts = {};

  const $ = (sel) => document.querySelector(sel);
  const el = (tag, attrs = {}, html = "") => {
    const e = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
    if (html) e.innerHTML = html;
    return e;
  };
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const isEmpty = (v) => v === null || v === undefined || String(v).trim() === "";
  const toNum = (v) => {
    if (isEmpty(v)) return NaN;
    if (typeof v === "number") return v;
    return Number(String(v).replace(/,/g, ""));
  };
  const DATE_RE = /^\d{4}-\d{2}-\d{2}/;
  const fmt = (n, d = 2) => {
    if (n === null || n === undefined || Number.isNaN(n)) return "–";
    const abs = Math.abs(n);
    if (abs >= 1e6) return (n / 1e6).toLocaleString("th-TH", { maximumFractionDigits: 2 }) + " ล้าน";
    return n.toLocaleString("th-TH", { maximumFractionDigits: abs >= 100 ? 0 : d });
  };
  const pct = (n) => (Number.isNaN(n) ? "–" : (n * 100).toFixed(1) + "%");

  function toast(msg) {
    const t = $("#toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => t.classList.remove("show"), 2200);
  }

  // ------------------------------------------------------------------ palette (dataviz reference palette)
  const PALETTE = {
    light: ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"],
    dark: ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#008300", "#9085e9", "#e66767"],
  };
  const isDark = () => {
    const t = document.documentElement.dataset.theme;
    if (t) return t === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  };
  const colors = () => (isDark() ? PALETTE.dark : PALETTE.light);
  const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const OTHER_GRAY = () => (isDark() ? "#6b7280" : "#b4bac4");

  function applyChartDefaults() {
    if (!window.Chart) return;
    Chart.defaults.font.family = "Sarabun, system-ui, sans-serif";
    Chart.defaults.color = cssVar("--muted");
    Chart.defaults.borderColor = isDark() ? "rgba(255,255,255,.08)" : "rgba(0,0,0,.06)";
    Chart.defaults.plugins.legend.labels.boxWidth = 12;
    Chart.defaults.plugins.tooltip.mode = "index";
    Chart.defaults.plugins.tooltip.intersect = false;
    Chart.defaults.maintainAspectRatio = false;
  }

  // ------------------------------------------------------------------ data loading
  function inferTypes(columns, rows) {
    const types = {};
    const sample = rows.slice(0, 500);
    columns.forEach((c) => {
      const vals = sample.map((r) => r[c]).filter((v) => !isEmpty(v));
      if (!vals.length) return (types[c] = "text");
      const numShare = vals.filter((v) => !Number.isNaN(toNum(v))).length / vals.length;
      const dateShare = vals.filter((v) => DATE_RE.test(String(v))).length / vals.length;
      types[c] = dateShare > 0.9 ? "date" : numShare > 0.9 ? "number" : "text";
    });
    return types;
  }

  function normalize(columns, rows, types) {
    return rows.map((r) => {
      const o = {};
      columns.forEach((c) => {
        const v = r[c];
        if (isEmpty(v)) o[c] = null;
        else if (types[c] === "number") o[c] = toNum(v);
        else o[c] = String(v).trim();
      });
      return o;
    });
  }

  function loadData(name, columns, rawRows) {
    const types = inferTypes(columns, rawRows);
    const rows = normalize(columns, rawRows, types);
    state.name = name;
    state.columns = [...columns];
    state.rows = rows;
    state.types = types;
    state.original = { columns: [...columns], rows: rows.map((r) => ({ ...r })), types: { ...types } };
    state.log = [];
    state.table = { page: 0, pageSize: 50, sortCol: null, sortDir: 1, query: "" };
    state.dashFilters = {};
    state.dashMeasure = null;
    state.dashAgg = null;
    $("#tableSearch").value = "";
    dataChanged();
    toast(`โหลด "${name}" แล้ว: ${rows.length.toLocaleString()} แถว`);
    switchTab("dashboard");
  }

  function loadDemo(key) {
    const ds = window.DEMO_DATASETS[key];
    const rows = ds.rows.map((arr) => Object.fromEntries(ds.columns.map((c, i) => [c, arr[i]])));
    loadData(ds.title, ds.columns, rows);
  }

  function loadFile(file) {
    if (!window.Papa) return toast("โหลดไลบรารี PapaParse ไม่สำเร็จ (ต้องต่ออินเทอร์เน็ต)");
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const cols = (res.meta.fields || []).filter((c) => c && c.trim());
        if (!cols.length || !res.data.length) return toast("ไม่พบข้อมูลในไฟล์");
        loadData(file.name, cols, res.data);
      },
      error: (err) => toast("อ่านไฟล์ไม่สำเร็จ: " + err.message),
    });
  }

  // ------------------------------------------------------------------ helpers for analysis
  const numericCols = () => state.columns.filter((c) => state.types[c] === "number");
  const dateCols = () => state.columns.filter((c) => state.types[c] === "date");
  function categoricalCols(maxUnique = 40, rows = state.rows) {
    return state.columns.filter((c) => {
      if (state.types[c] !== "text") return false;
      const u = new Set();
      for (const r of rows) {
        if (r[c] !== null) u.add(r[c]);
        if (u.size > maxUnique) return false;
      }
      return u.size >= 2;
    });
  }
  function isIdLike(c) {
    return /(^id$|_id$|^id_|รหัส)/i.test(c);
  }
  function mainMeasure() {
    const nums = numericCols().filter((c) => !isIdLike(c));
    if (state.dashMeasure && nums.includes(state.dashMeasure)) return state.dashMeasure;
    const prefs = [/revenue|sales|ยอดขาย|รายได้/i, /amount|total|ยอด/i, /salary|income|เงินเดือน/i, /profit|กำไร/i, /price|ราคา/i];
    for (const re of prefs) { const hit = nums.find((c) => re.test(c)); if (hit) return hit; }
    return nums[0] || null;
  }
  // ผลรวมเหมาะกับยอดเงิน/จำนวน ส่วนค่าอย่างเงินเดือน อายุ คะแนน ควรใช้ค่าเฉลี่ย
  function defaultAgg(measure) {
    if (!measure) return "count";
    return /(revenue|sales|amount|total|profit|cost|quantity|qty|seats|ยอด|รายได้|กำไร|จำนวน)/i.test(measure) ? "sum" : "avg";
  }
  const AGG_TH = { sum: "ผลรวม", avg: "ค่าเฉลี่ย", count: "จำนวน" };

  // ตัวแปรเป้าหมายแบบ 2 ค่า (เช่น ลาออก/อยู่ต่อ) — เลือกจากชื่อก่อน, ไม่ใช้คอลัมน์เพศเป็นค่าเริ่มต้น
  function binaryTarget(cats) {
    const bin = cats.filter((c) => new Set(state.rows.map((r) => r[c]).filter((v) => v !== null)).size === 2);
    const named = bin.find((c) => /(attrition|churn|left|status|complete|convert|target|label|default|success|hit|ลาออก|สำเร็จ|สถานะ)/i.test(c));
    return named || bin.find((c) => !/(gender|sex|เพศ)/i.test(c)) || null;
  }
  function minorityValue(col) {
    const counts = new Map();
    state.rows.forEach((r) => r[col] !== null && counts.set(r[col], (counts.get(r[col]) || 0) + 1));
    return [...counts.entries()].sort((a, b) => a[1] - b[1])[0][0];
  }

  function stats(values) {
    const v = values.filter((x) => typeof x === "number" && !Number.isNaN(x)).sort((a, b) => a - b);
    const n = v.length;
    if (!n) return { n: 0 };
    const sum = v.reduce((a, b) => a + b, 0);
    const mean = sum / n;
    const q = (p) => {
      const i = (n - 1) * p, lo = Math.floor(i), hi = Math.ceil(i);
      return v[lo] + (v[hi] - v[lo]) * (i - lo);
    };
    const std = Math.sqrt(v.reduce((a, b) => a + (b - mean) ** 2, 0) / (n > 1 ? n - 1 : 1));
    return { n, sum, mean, min: v[0], max: v[n - 1], median: q(0.5), q1: q(0.25), q3: q(0.75), std };
  }

  // ข้อมูลเบ้ขวามาก (long tail) เช่น ยอดผู้เล่น รายได้
  function isSkewed(col) {
    const s = stats(state.rows.map((r) => r[col]));
    return s.n > 0 && s.min >= 0 && s.median > 0 && s.mean > 2 * s.median;
  }
  // "สูงกว่า 26%" หรือ "มากกว่า 12.3 เท่า"
  function diffText(a, b) {
    if (!b) return "";
    const r = a / b;
    if (r >= 2) return `มากกว่า ${r.toFixed(1)} เท่า`;
    if (r <= 0.5) return `น้อยกว่า ${(1 / r).toFixed(1)} เท่า`;
    return `${r >= 1 ? "สูงกว่า" : "ต่ำกว่า"} ${pct(Math.abs(r - 1))}`;
  }

  function aggregate(values, agg) {
    if (agg === "count") return values.length;
    const nums = values.filter((x) => typeof x === "number" && !Number.isNaN(x));
    if (!nums.length) return null;
    if (agg === "sum") return nums.reduce((a, b) => a + b, 0);
    if (agg === "avg") return nums.reduce((a, b) => a + b, 0) / nums.length;
    if (agg === "min") return Math.min(...nums);
    if (agg === "max") return Math.max(...nums);
    return null;
  }

  // group key: สำหรับคอลัมน์วันที่ รวมเป็นรายเดือน (YYYY-MM)
  function keyOf(row, col) {
    const v = row[col];
    if (v === null) return "(ว่าง)";
    if (state.types[col] === "date") return String(v).slice(0, 7);
    return String(v);
  }

  function groupBy(rows, col, valCol, agg, skipNull = false) {
    const m = new Map();
    for (const r of rows) {
      if (skipNull && r[col] === null) continue;
      const k = keyOf(r, col);
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(valCol ? r[valCol] : 1);
    }
    return [...m.entries()].map(([k, vals]) => [k, aggregate(vals, valCol ? agg : "count")]);
  }

  function pearson(a, b) {
    let n = 0, sa = 0, sb = 0, saa = 0, sbb = 0, sab = 0;
    for (let i = 0; i < a.length; i++) {
      const x = a[i], y = b[i];
      if (x === null || y === null || Number.isNaN(x) || Number.isNaN(y)) continue;
      n++; sa += x; sb += y; saa += x * x; sbb += y * y; sab += x * y;
    }
    if (n < 3) return NaN;
    const cov = sab - (sa * sb) / n;
    const den = Math.sqrt((saa - (sa * sa) / n) * (sbb - (sb * sb) / n));
    return den ? cov / den : NaN;
  }

  const rowKey = (r) => JSON.stringify(state.columns.map((c) => r[c]));

  // ------------------------------------------------------------------ tabs
  function switchTab(name) {
    document.querySelectorAll("#tabs button").forEach((b) => b.classList.toggle("active", b.dataset.tab === name));
    document.querySelectorAll(".tab").forEach((s) => s.classList.toggle("active", s.id === "tab-" + name));
    renderTab(name);
  }
  const currentTab = () => document.querySelector("#tabs button.active").dataset.tab;

  function renderTab(name) {
    const needsData = !["home", "sources"].includes(name);
    if (needsData && !state.rows.length) {
      const sec = $("#tab-" + name);
      if (!sec.querySelector(".nodata")) sec.prepend(el("div", { class: "panel nodata" }, "⚠️ ยังไม่มีข้อมูล — ไปที่แท็บ <b>เริ่มต้น</b> เพื่อเลือกชุดข้อมูลเดโม่หรืออัปโหลด CSV"));
      return;
    }
    document.querySelectorAll(".nodata").forEach((n) => n.remove());
    ({
      table: renderTable, profile: renderProfile, clean: renderClean, dashboard: renderDashboard,
      builder: renderBuilder, pivot: renderPivot, insights: renderInsights,
    }[name] || (() => {}))();
  }

  function dataChanged() {
    $("#datasetInfo").textContent = state.rows.length
      ? `${state.name} · ${state.rows.length.toLocaleString()} แถว × ${state.columns.length} คอลัมน์`
      : "ยังไม่ได้โหลดข้อมูล";
    fillSelectors();
    renderTab(currentTab());
  }

  // ------------------------------------------------------------------ home
  function renderHome() {
    const box = $("#demoCards");
    Object.entries(window.DEMO_DATASETS || {}).forEach(([key, ds]) => {
      const c = el("div", { class: "card clickable" },
        `<h3>${esc(ds.title)}</h3><p>${esc(ds.description)}</p>
         <span class="tag">${ds.rows.length.toLocaleString()} แถว</span><span class="tag">${ds.columns.length} คอลัมน์</span>
         <p><a href="data/${key}.csv" download onclick="event.stopPropagation()">⬇️ ดาวน์โหลด CSV</a></p>`);
      c.addEventListener("click", () => loadDemo(key));
      box.appendChild(c);
    });

    const dz = $("#dropzone"), fi = $("#fileInput");
    fi.addEventListener("change", () => fi.files[0] && loadFile(fi.files[0]));
    ["dragenter", "dragover"].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add("drag"); }));
    ["dragleave", "drop"].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove("drag"); }));
    dz.addEventListener("drop", (e) => e.dataTransfer.files[0] && loadFile(e.dataTransfer.files[0]));
  }

  // ------------------------------------------------------------------ table
  function filteredTableRows() {
    const { query, sortCol, sortDir } = state.table;
    let rows = state.rows;
    if (query) {
      const q = query.toLowerCase();
      rows = rows.filter((r) => state.columns.some((c) => r[c] !== null && String(r[c]).toLowerCase().includes(q)));
    }
    if (sortCol) {
      rows = [...rows].sort((a, b) => {
        const x = a[sortCol], y = b[sortCol];
        if (x === null) return 1;
        if (y === null) return -1;
        return (x > y ? 1 : x < y ? -1 : 0) * sortDir;
      });
    }
    return rows;
  }

  function renderTable() {
    const rows = filteredTableRows();
    const { page, pageSize, sortCol, sortDir } = state.table;
    const pages = Math.max(1, Math.ceil(rows.length / pageSize));
    if (page >= pages) state.table.page = pages - 1;
    const slice = rows.slice(state.table.page * pageSize, (state.table.page + 1) * pageSize);

    const head = "<tr>" + state.columns.map((c) =>
      `<th data-col="${esc(c)}" title="ชนิด: ${state.types[c]}">${esc(c)} ${sortCol === c ? (sortDir > 0 ? "▲" : "▼") : ""}</th>`).join("") + "</tr>";
    const body = slice.map((r) => "<tr>" + state.columns.map((c) => {
      const v = r[c];
      if (v === null) return '<td class="empty"></td>';
      return state.types[c] === "number" ? `<td class="num">${v.toLocaleString("th-TH")}</td>` : `<td>${esc(v)}</td>`;
    }).join("") + "</tr>").join("");
    $("#dataTable").innerHTML = `<thead>${head}</thead><tbody>${body}</tbody>`;
    $("#tableCount").textContent = `${rows.length.toLocaleString()} แถว`;

    $("#pager").innerHTML = `<button class="btn ghost" data-p="prev">‹ ก่อนหน้า</button>
      <span>หน้า ${state.table.page + 1} / ${pages}</span>
      <button class="btn ghost" data-p="next">ถัดไป ›</button>`;
  }

  function initTable() {
    $("#tableSearch").addEventListener("input", (e) => { state.table.query = e.target.value; state.table.page = 0; renderTable(); });
    $("#dataTable").addEventListener("click", (e) => {
      const th = e.target.closest("th");
      if (!th) return;
      const c = th.dataset.col;
      state.table.sortDir = state.table.sortCol === c ? -state.table.sortDir : 1;
      state.table.sortCol = c;
      renderTable();
    });
    $("#pager").addEventListener("click", (e) => {
      const p = e.target.dataset.p;
      if (!p) return;
      state.table.page = Math.max(0, state.table.page + (p === "next" ? 1 : -1));
      renderTable();
    });
    $("#exportCsv").addEventListener("click", () => downloadCsv(state.columns, filteredTableRows(), "cleaned_data.csv"));
  }

  function downloadCsv(columns, rows, filename) {
    const data = rows.map((r) => (Array.isArray(r) ? r : columns.map((c) => r[c])));
    const csv = window.Papa ? Papa.unparse({ fields: columns, data }) : [columns, ...data].map((r) => r.join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const a = el("a", { href: URL.createObjectURL(blob), download: filename });
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  // ------------------------------------------------------------------ profile
  function renderProfile() {
    const rows = state.rows;
    const totalCells = rows.length * state.columns.length;
    let missing = 0;
    const seen = new Set();
    let dups = 0;
    rows.forEach((r) => {
      state.columns.forEach((c) => r[c] === null && missing++);
      const k = rowKey(r);
      seen.has(k) ? dups++ : seen.add(k);
    });
    $("#profileKpis").innerHTML = [
      ["จำนวนแถว", rows.length.toLocaleString()],
      ["จำนวนคอลัมน์", state.columns.length],
      ["ตัวเลข / วันที่ / ข้อความ", `${numericCols().length} / ${dateCols().length} / ${state.columns.length - numericCols().length - dateCols().length}`],
      ["ค่าว่างทั้งหมด", missing.toLocaleString(), pct(missing / totalCells) + " ของเซลล์ทั้งหมด"],
      ["แถวซ้ำ", dups.toLocaleString()],
    ].map(([l, v, s]) => `<div class="kpi"><div class="label">${l}</div><div class="value">${v}</div>${s ? `<div class="sub">${s}</div>` : ""}</div>`).join("");

    const head = "<tr><th>คอลัมน์</th><th>ชนิด</th><th>ไม่ว่าง</th><th>ค่าว่าง</th><th>ค่าไม่ซ้ำ</th><th>ต่ำสุด</th><th>สูงสุด</th><th>เฉลี่ย</th><th>มัธยฐาน</th><th>SD</th><th>Outliers (IQR)</th><th>ค่าที่พบบ่อยสุด</th></tr>";
    const body = state.columns.map((c) => {
      const vals = rows.map((r) => r[c]);
      const nonNull = vals.filter((v) => v !== null);
      const miss = vals.length - nonNull.length;
      const freq = new Map();
      nonNull.forEach((v) => freq.set(v, (freq.get(v) || 0) + 1));
      const top = [...freq.entries()].sort((a, b) => b[1] - a[1])[0];
      let s = {}, outliers = "–";
      if (state.types[c] === "number") {
        s = stats(nonNull);
        const iqr = s.q3 - s.q1;
        outliers = nonNull.filter((v) => v < s.q1 - 1.5 * iqr || v > s.q3 + 1.5 * iqr).length.toLocaleString();
      } else if (state.types[c] === "date") {
        const sorted = nonNull.slice().sort();
        s = { min: sorted[0], max: sorted[sorted.length - 1] };
      }
      const show = (v) => (typeof v === "number" ? fmt(v) : esc(v ?? "–"));
      return `<tr><td><b>${esc(c)}</b></td><td>${state.types[c]}</td><td class="num">${nonNull.length.toLocaleString()}</td>
        <td class="num ${miss ? "empty" : ""}">${miss.toLocaleString()} (${pct(miss / vals.length)})</td>
        <td class="num">${freq.size.toLocaleString()}</td><td>${show(s.min)}</td><td>${show(s.max)}</td>
        <td class="num">${show(s.mean)}</td><td class="num">${show(s.median)}</td><td class="num">${show(s.std)}</td>
        <td class="num">${outliers}</td><td>${top ? `${esc(top[0])} (${top[1].toLocaleString()})` : "–"}</td></tr>`;
    }).join("");
    $("#profileTable").innerHTML = `<thead>${head}</thead><tbody>${body}</tbody>`;

    // correlation matrix
    const nums = numericCols().filter((c) => !isIdLike(c)).slice(0, 12);
    if (nums.length < 2) {
      $("#corrTable").innerHTML = "<tr><td>ต้องมีคอลัมน์ตัวเลขอย่างน้อย 2 คอลัมน์</td></tr>";
      return;
    }
    const cols = nums.map((c) => rows.map((r) => r[c]));
    const cell = (r) => {
      if (Number.isNaN(r)) return "<td>–</td>";
      // diverging: blue (+) / red (−) with neutral midpoint
      const a = Math.min(1, Math.abs(r)) * 0.75;
      const bg = r >= 0 ? `rgba(42,120,214,${a})` : `rgba(227,73,72,${a})`;
      return `<td style="background:${bg};${a > 0.45 ? "color:#fff" : ""}" title="${r.toFixed(3)}">${r.toFixed(2)}</td>`;
    };
    $("#corrTable").innerHTML = `<thead><tr><th></th>${nums.map((c) => `<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>` +
      nums.map((c, i) => `<tr><th>${esc(c)}</th>${nums.map((_, j) => cell(i === j ? 1 : pearson(cols[i], cols[j]))).join("")}</tr>`).join("") + "</tbody>";
  }

  // ------------------------------------------------------------------ clean
  function logStep(msg) {
    state.log.push(msg);
    dataChanged();
    toast(msg);
  }

  function renderClean() {
    const seen = new Set();
    let dups = 0;
    state.rows.forEach((r) => { const k = rowKey(r); seen.has(k) ? dups++ : seen.add(k); });
    $("#dupInfo").textContent = `พบแถวซ้ำ ${dups.toLocaleString()} แถว (ทุกคอลัมน์ตรงกัน)`;
    $("#cleanLog").innerHTML = state.log.length
      ? state.log.map((l) => `<li>${esc(l)}</li>`).join("")
      : '<li class="muted">ยังไม่มีการเปลี่ยนแปลง</li>';
  }

  function initClean() {
    $("#removeDup").addEventListener("click", () => {
      const seen = new Set();
      const before = state.rows.length;
      state.rows = state.rows.filter((r) => { const k = rowKey(r); if (seen.has(k)) return false; seen.add(k); return true; });
      logStep(`ลบแถวซ้ำ ${(before - state.rows.length).toLocaleString()} แถว`);
    });

    $("#applyMissing").addEventListener("click", () => {
      const c = $("#missingCol").value, action = $("#missingAction").value;
      const missing = state.rows.filter((r) => r[c] === null).length;
      if (!missing) return toast(`คอลัมน์ ${c} ไม่มีค่าว่าง`);
      if (action === "drop") {
        state.rows = state.rows.filter((r) => r[c] !== null);
        return logStep(`ลบ ${missing} แถวที่ ${c} ว่าง`);
      }
      let fill;
      const nonNull = state.rows.map((r) => r[c]).filter((v) => v !== null);
      if (action === "mean" || action === "median") {
        if (state.types[c] !== "number") return toast("ค่าเฉลี่ย/มัธยฐานใช้ได้กับคอลัมน์ตัวเลขเท่านั้น");
        const s = stats(nonNull);
        fill = Math.round((action === "mean" ? s.mean : s.median) * 100) / 100;
      } else if (action === "mode") {
        const f = new Map();
        nonNull.forEach((v) => f.set(v, (f.get(v) || 0) + 1));
        fill = [...f.entries()].sort((a, b) => b[1] - a[1])[0][0];
      } else {
        const raw = $("#missingCustom").value;
        if (raw === "") return toast("กรุณาระบุค่าที่ต้องการเติม");
        fill = state.types[c] === "number" ? toNum(raw) : raw;
        if (Number.isNaN(fill)) return toast("คอลัมน์นี้เป็นตัวเลข กรุณาใส่ตัวเลข");
      }
      state.rows.forEach((r) => { if (r[c] === null) r[c] = fill; });
      logStep(`เติมค่าว่าง ${missing} ช่องในคอลัมน์ ${c} ด้วย "${fill}" (${$("#missingAction").selectedOptions[0].text})`);
    });

    $("#applyFilter").addEventListener("click", () => {
      const c = $("#filterCol").value, op = $("#filterOp").value, raw = $("#filterVal").value;
      if (raw === "") return toast("กรุณาระบุค่า");
      const num = state.types[c] === "number";
      const val = num ? toNum(raw) : raw;
      const test = (v) => {
        if (v === null) return false;
        switch (op) {
          case "eq": return num ? v === val : String(v) === val;
          case "neq": return num ? v !== val : String(v) !== val;
          case "gt": return v > val;
          case "lt": return v < val;
          case "contains": return String(v).toLowerCase().includes(String(raw).toLowerCase());
        }
      };
      const before = state.rows.length;
      state.rows = state.rows.filter((r) => test(r[c]));
      logStep(`กรอง ${c} ${$("#filterOp").selectedOptions[0].text} "${raw}" เหลือ ${state.rows.length.toLocaleString()} จาก ${before.toLocaleString()} แถว`);
    });

    $("#applyDropCol").addEventListener("click", () => {
      const c = $("#dropCol").value;
      if (!c || !confirm(`ลบคอลัมน์ "${c}" ?`)) return;
      state.columns = state.columns.filter((x) => x !== c);
      state.rows.forEach((r) => delete r[c]);
      delete state.types[c];
      logStep(`ลบคอลัมน์ ${c}`);
    });

    $("#applyCalc").addEventListener("click", () => {
      const name = $("#calcName").value.trim(), expr = $("#calcExpr").value.trim();
      if (!name || !expr) return toast("กรุณาใส่ชื่อคอลัมน์และสูตร");
      if (state.columns.includes(name)) return toast("มีคอลัมน์ชื่อนี้แล้ว");
      // อนุญาตเฉพาะ [คอลัมน์] ตัวเลข และเครื่องหมายคำนวณ เพื่อความปลอดภัย
      const refs = [];
      const unknown = [...expr.matchAll(/\[([^\]]+)\]/g)].map((m) => m[1]).find((col) => !state.columns.includes(col));
      if (unknown) return toast(`ไม่พบคอลัมน์ ${unknown}`);
      const js = expr.replace(/\[([^\]]+)\]/g, (_, col) => {
        refs.push(col);
        return `v[${refs.length - 1}]`;
      });
      if (!/^[\d\s+\-*/().v\[\]]*$/.test(js)) return toast("สูตรใช้ได้เฉพาะ [คอลัมน์] ตัวเลข และ + - * / ( )");
      let fn;
      try { fn = new Function("v", `return (${js});`); } catch { return toast("สูตรไม่ถูกต้อง"); }
      state.rows.forEach((r) => {
        const v = refs.map((c) => (r[c] === null ? NaN : Number(r[c])));
        const out = fn(v);
        r[name] = Number.isFinite(out) ? Math.round(out * 10000) / 10000 : null;
      });
      state.columns.push(name);
      state.types[name] = "number";
      logStep(`เพิ่มคอลัมน์คำนวณ ${name} = ${expr}`);
    });

    $("#resetData").addEventListener("click", () => {
      if (!state.original) return;
      state.columns = [...state.original.columns];
      state.rows = state.original.rows.map((r) => ({ ...r }));
      state.types = { ...state.original.types };
      state.log = [];
      dataChanged();
      toast("คืนค่าข้อมูลต้นฉบับแล้ว");
    });
  }

  // ------------------------------------------------------------------ selectors
  function fillSelectors() {
    const opt = (cols, blank) => (blank ? `<option value="">${blank}</option>` : "") + cols.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join("");
    const keep = (id, html) => { const s = $(id); const prev = s.value; s.innerHTML = html; if ([...s.options].some((o) => o.value === prev)) s.value = prev; };
    const all = state.columns, nums = numericCols(), groupable = [...dateCols(), ...categoricalCols(200)];
    keep("#missingCol", opt(all));
    keep("#filterCol", opt(all));
    keep("#dropCol", opt(all));

    keep("#bX", opt([...groupable, ...nums]));
    keep("#bY", opt(nums, "(นับจำนวนแถว)"));
    keep("#bSeries", opt(categoricalCols(12), "(ไม่แยก)"));
    if (!$("#bY").value && mainMeasure()) $("#bY").value = mainMeasure();

    keep("#pRow", opt([...categoricalCols(200), ...dateCols()]));
    keep("#pCol", opt(categoricalCols(30), "(ไม่มี)"));
    keep("#pVal", opt(nums, "(นับจำนวนแถว)"));
    if (!$("#pVal").value && mainMeasure()) $("#pVal").value = mainMeasure();
  }

  // ------------------------------------------------------------------ charts
  function makeChart(id, canvas, config) {
    if (charts[id]) charts[id].destroy();
    charts[id] = new Chart(canvas, config);
    return charts[id];
  }

  function barDataset(label, data, color) {
    return { label, data, backgroundColor: color, borderColor: cssVar("--surface"), borderWidth: 0, borderRadius: 4, maxBarThickness: 36 };
  }

  // จำกัดหมวดหมู่ (pie/doughnut) เป็น top N + "อื่น ๆ"
  function topWithOther(pairs, n) {
    const sorted = [...pairs].sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
    if (sorted.length <= n) return sorted;
    const rest = sorted.slice(n - 1).reduce((a, [, v]) => a + (v ?? 0), 0);
    return [...sorted.slice(0, n - 1), ["อื่น ๆ", rest]];
  }

  function pieConfig(pairs, type = "doughnut") {
    const p = topWithOther(pairs, 7);
    const pal = colors();
    return {
      type,
      data: {
        labels: p.map((x) => x[0]),
        datasets: [{ data: p.map((x) => x[1]), backgroundColor: p.map((x, i) => (x[0] === "อื่น ๆ" ? OTHER_GRAY() : pal[i])), borderColor: cssVar("--surface"), borderWidth: 2 }],
      },
      options: { plugins: { legend: { position: "right" }, tooltip: { mode: "nearest", intersect: true } } },
    };
  }

  function histogram(values, bins = 20) {
    const v = values.filter((x) => typeof x === "number" && !Number.isNaN(x));
    if (!v.length) return { labels: [], counts: [] };
    const min = Math.min(...v), max = Math.max(...v);
    const w = (max - min) / bins || 1;
    const counts = new Array(bins).fill(0);
    v.forEach((x) => counts[Math.min(bins - 1, Math.floor((x - min) / w))]++);
    return { labels: counts.map((_, i) => `${fmt(min + i * w)}–${fmt(min + (i + 1) * w)}`), counts };
  }

  // histogram บนสเกล log10 สำหรับข้อมูล long tail
  function logHistogram(values, bins = 20) {
    const v = values.filter((x) => typeof x === "number" && x > 0);
    if (!v.length) return { labels: [], counts: [] };
    const lo = Math.log10(Math.min(...v)), hi = Math.log10(Math.max(...v));
    const w = (hi - lo) / bins || 1;
    const counts = new Array(bins).fill(0);
    v.forEach((x) => counts[Math.min(bins - 1, Math.floor((Math.log10(x) - lo) / w))]++);
    return { labels: counts.map((_, i) => `${fmt(10 ** (lo + i * w))}–${fmt(10 ** (lo + (i + 1) * w))}`), counts };
  }

  // ------------------------------------------------------------------ dashboard
  function dashRows() {
    return state.rows.filter((r) => Object.entries(state.dashFilters).every(([c, v]) => !v || keyOf(r, c) === v));
  }

  function renderDashboard() {
    const cats = categoricalCols(25).filter((c) => !isIdLike(c));
    const nums = numericCols().filter((c) => !isIdLike(c));
    const measure = mainMeasure();
    const date = dateCols()[0];
    const dashAgg = state.dashAgg || defaultAgg(measure);

    // filters row
    const fbox = $("#dashFilters");
    fbox.innerHTML = "";
    if (nums.length) {
      const ms = el("select", { id: "dashMeasure" }, nums.map((c) => `<option ${c === measure ? "selected" : ""}>${esc(c)}</option>`).join(""));
      ms.addEventListener("change", () => { state.dashMeasure = ms.value; state.dashAgg = null; renderDashboard(); });
      const l = el("label", {}, "ตัวชี้วัดหลัก ");
      l.appendChild(ms);
      fbox.appendChild(l);
      const as = el("select", {}, ["sum", "avg", "count"].map((a) => `<option value="${a}" ${a === dashAgg ? "selected" : ""}>${AGG_TH[a]}</option>`).join(""));
      as.addEventListener("change", () => { state.dashAgg = as.value; renderDashboard(); });
      const l2 = el("label", {}, "สรุปด้วย ");
      l2.appendChild(as);
      fbox.appendChild(l2);
    }
    cats.slice(0, 4).forEach((c) => {
      const vals = [...new Set(state.rows.map((r) => r[c]).filter((v) => v !== null))].sort();
      const s = el("select", {}, `<option value="">ทั้งหมด</option>` + vals.map((v) => `<option ${state.dashFilters[c] === v ? "selected" : ""}>${esc(v)}</option>`).join(""));
      s.addEventListener("change", () => { state.dashFilters[c] = s.value; renderDashboard(); });
      const l = el("label", {}, esc(c) + " ");
      l.appendChild(s);
      fbox.appendChild(l);
    });
    if (Object.values(state.dashFilters).some(Boolean)) {
      const b = el("button", { class: "btn ghost" }, "ล้างตัวกรอง");
      b.addEventListener("click", () => { state.dashFilters = {}; renderDashboard(); });
      fbox.appendChild(b);
    }

    const rows = dashRows();

    // KPIs
    const kpis = [["จำนวนรายการ", rows.length.toLocaleString(), state.rows.length !== rows.length ? `จากทั้งหมด ${state.rows.length.toLocaleString()}` : ""]];
    if (measure) {
      const s = stats(rows.map((r) => r[measure]));
      kpis.push([`ผลรวม ${measure}`, fmt(s.sum)], [`เฉลี่ย ${measure}`, fmt(s.mean), `มัธยฐาน ${fmt(s.median)}`]);
      if (date) {
        const years = [...new Set(rows.map((r) => r[date] && r[date].slice(0, 4)).filter(Boolean))].sort();
        if (years.length >= 2) {
          const [py, ly] = years.slice(-2);
          const sumY = (y) => rows.filter((r) => r[date] && r[date].startsWith(y)).reduce((a, r) => a + (r[measure] || 0), 0);
          const g = sumY(ly) / sumY(py) - 1;
          kpis.push([`การเติบโต ${ly} vs ${py}`, `<span style="color:${g >= 0 ? "var(--good)" : "var(--bad)"}">${g >= 0 ? "▲" : "▼"} ${pct(Math.abs(g))}</span>`, `${measure}`]);
        }
      }
    }
    nums.filter((c) => c !== measure).slice(0, 2).forEach((c) => kpis.push([`เฉลี่ย ${c}`, fmt(stats(rows.map((r) => r[c])).mean)]));
    // อัตราของคอลัมน์ 2 ค่า เช่น attrition
    const binary = binaryTarget(cats);
    if (binary) {
      const minority = minorityValue(binary);
      const rate = rows.filter((r) => r[binary] === minority).length / (rows.length || 1);
      kpis.push([`อัตรา "${minority}"`, pct(rate), binary]);
    }
    $("#dashKpis").innerHTML = kpis.map(([l, v, s]) => `<div class="kpi"><div class="label">${esc(l)}</div><div class="value">${v}</div>${s ? `<div class="sub">${esc(s)}</div>` : ""}</div>`).join("");

    // charts
    const grid = $("#dashCharts");
    Object.keys(charts).filter((k) => k.startsWith("dash")).forEach((k) => { charts[k].destroy(); delete charts[k]; });
    grid.innerHTML = "";
    const addCard = (id, title) => {
      const card = el("div", { class: "chart-card" }, `<h3>${esc(title)}</h3><div class="canvas-box"><canvas></canvas></div>`);
      grid.appendChild(card);
      return card.querySelector("canvas");
    };
    const agg = dashAgg;
    const aggLabel = measure && agg !== "count" ? `${AGG_TH[agg]} ${measure}` : "จำนวนรายการ";
    const valCol = agg === "count" ? null : measure;
    const pal = colors();

    if (date) {
      const pairs = groupBy(rows, date, valCol, agg, true).sort((a, b) => a[0].localeCompare(b[0]));
      makeChart("dash-trend", addCard("dash-trend", `แนวโน้ม${aggLabel} รายเดือน`), {
        type: "line",
        data: { labels: pairs.map((p) => p[0]), datasets: [{ label: aggLabel, data: pairs.map((p) => p[1]), borderColor: pal[0], backgroundColor: pal[0], borderWidth: 2, pointRadius: 0, pointHoverRadius: 5, tension: 0.25 }] },
        options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } },
      });
    }

    cats.slice(0, 4).forEach((c, i) => {
      const pairs = groupBy(rows, c, valCol, agg, true).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
      const id = "dash-cat-" + i;
      // สัดส่วน (โดนัท) ใช้ได้เฉพาะค่าที่บวกกันได้ ไม่ใช่ค่าเฉลี่ย
      if (pairs.length <= 5 && i % 2 === 1 && agg !== "avg") {
        makeChart(id, addCard(id, `สัดส่วน${aggLabel} ตาม ${c}`), pieConfig(pairs));
      } else {
        const top = pairs.slice(0, 12);
        makeChart(id, addCard(id, `${aggLabel} ตาม ${c}${pairs.length > 12 ? " (Top 12)" : ""}`), {
          type: "bar",
          data: { labels: top.map((p) => p[0]), datasets: [barDataset(aggLabel, top.map((p) => p[1]), pal[0])] },
          options: { indexAxis: "y", plugins: { legend: { display: false } } },
        });
      }
    });

    if (measure) {
      const skew = isSkewed(measure);
      const h = skew ? logHistogram(rows.map((r) => r[measure])) : histogram(rows.map((r) => r[measure]));
      makeChart("dash-hist", addCard("dash-hist", `การกระจายของ ${measure} (Histogram${skew ? ", log scale" : ""})`), {
        type: "bar",
        data: { labels: h.labels, datasets: [{ ...barDataset("จำนวน", h.counts, pal[0]), barPercentage: 1, categoryPercentage: 0.95, borderRadius: 2 }] },
        options: { plugins: { legend: { display: false } }, scales: { x: { ticks: { maxRotation: 45, autoSkip: true, maxTicksLimit: 8 } } } },
      });
    }

    // stacked: binary target by first categorical
    if (binary) {
      const by = cats.find((c) => c !== binary);
      if (by) {
        const vals = [...new Set(state.rows.map((r) => r[binary]).filter((v) => v !== null))];
        const groups = [...new Set(rows.map((r) => r[by]).filter((v) => v !== null))].sort();
        makeChart("dash-binary", addCard("dash-binary", `${binary} แยกตาม ${by} (%)`), {
          type: "bar",
          data: {
            labels: groups,
            datasets: vals.map((v, i) => barDataset(v, groups.map((g) => {
              const inG = rows.filter((r) => r[by] === g);
              return (inG.filter((r) => r[binary] === v).length / (inG.length || 1)) * 100;
            }), pal[i])).map((d) => ({ ...d, borderWidth: 1, borderColor: cssVar("--surface") })),
          },
          options: { scales: { x: { stacked: true }, y: { stacked: true, max: 100, ticks: { callback: (v) => v + "%" } } }, plugins: { tooltip: { callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)}%` } } } },
        });
      }
    }
  }

  // ------------------------------------------------------------------ chart builder
  function renderBuilder() {
    const type = $("#bType").value, x = $("#bX").value, y = $("#bY").value, agg = y ? $("#bAgg").value : "count";
    const series = $("#bSeries").value, topN = Math.max(3, +$("#bTop").value || 15);
    const canvas = $("#builderChart");
    const logY = $("#bLog").checked;
    if (!x) return;
    const pal = colors();
    const aggName = y ? `${$("#bAgg").selectedOptions[0].text} ${y}` : "จำนวน";

    // enable only the controls that matter
    $("#bY").disabled = type === "hist";
    $("#bSeries").disabled = ["pie", "doughnut", "hist", "scatter"].includes(type);
    $("#bAgg").disabled = ["hist", "scatter"].includes(type) || !y;

    if (type === "hist") {
      const col = state.types[x] === "number" ? x : y;
      if (!col) return toast("Histogram ต้องใช้คอลัมน์ตัวเลข");
      const h = histogram(state.rows.map((r) => r[col]), topN);
      return makeChart("builder", canvas, {
        type: "bar",
        data: { labels: h.labels, datasets: [{ ...barDataset("จำนวน", h.counts, pal[0]), barPercentage: 1, categoryPercentage: 0.95, borderRadius: 2 }] },
        options: { plugins: { legend: { display: false }, title: { display: true, text: `การกระจายของ ${col}` } } },
      });
    }

    if (type === "scatter") {
      if (!y) return toast("Scatter ต้องเลือกค่า Y เป็นตัวเลข");
      if (state.types[x] !== "number") {
        const nx = numericCols().find((c) => !isIdLike(c) && c !== y);
        if (!nx) return toast("Scatter ต้องใช้แกน X และ Y เป็นตัวเลข");
        $("#bX").value = nx;
        return renderBuilder();
      }
      const logX = logY && isSkewed(x), logYY = logY && isSkewed(y);
      const pts = state.rows.filter((r) => r[x] !== null && r[y] !== null).slice(0, 3000).map((r) => ({ x: r[x], y: r[y] }));
      const r = pearson(state.rows.map((r) => r[x]), state.rows.map((r) => r[y]));
      return makeChart("builder", canvas, {
        type: "scatter",
        data: { datasets: [{ label: `${y} vs ${x}`, data: pts, backgroundColor: pal[0] + "99", pointRadius: 4, pointHoverRadius: 6 }] },
        options: {
          plugins: { legend: { display: false }, title: { display: true, text: `${y} vs ${x}  (r = ${r.toFixed(2)})` }, tooltip: { mode: "nearest", intersect: true } },
          scales: { x: { type: logX ? "logarithmic" : "linear", title: { display: true, text: x + (logX ? " (log)" : "") } }, y: { type: logYY ? "logarithmic" : "linear", title: { display: true, text: y + (logYY ? " (log)" : "") } } },
        },
      });
    }

    const isTime = state.types[x] === "date";
    let pairs = groupBy(state.rows, x, y, agg);
    pairs = isTime || state.types[x] === "number" ? pairs.sort((a, b) => (a[0] > b[0] ? 1 : -1)) : pairs.sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
    if (type === "pie" || type === "doughnut") {
      const cfg = pieConfig(pairs, type);
      cfg.options.plugins.title = { display: true, text: `${aggName} ตาม ${x}` };
      return makeChart("builder", canvas, cfg);
    }
    if (!isTime) pairs = pairs.slice(0, topN);
    const labels = pairs.map((p) => p[0]);

    let datasets;
    if (series) {
      const sVals = groupBy(state.rows, series, y, agg).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0)).map((p) => p[0]);
      const shown = sVals.slice(0, 8); // ไม่เกิน 8 สี — ที่เหลือรวมเป็น "อื่น ๆ"
      const hasOther = sVals.length > 8;
      const groups = [...shown, ...(hasOther ? ["อื่น ๆ"] : [])];
      datasets = groups.map((sv, i) => {
        const inS = state.rows.filter((r) => (sv === "อื่น ๆ" && hasOther ? !shown.includes(keyOf(r, series)) : keyOf(r, series) === sv));
        const m = new Map(groupBy(inS, x, y, agg));
        const color = sv === "อื่น ๆ" ? OTHER_GRAY() : pal[i];
        const d = labels.map((l) => m.get(l) ?? null);
        return type === "line"
          ? { label: sv, data: d, borderColor: color, backgroundColor: color, borderWidth: 2, pointRadius: 0, pointHoverRadius: 5, tension: 0.25 }
          : { ...barDataset(sv, d, color), borderWidth: 1, borderColor: cssVar("--surface") };
      });
    } else {
      const d = pairs.map((p) => p[1]);
      datasets = [type === "line"
        ? { label: aggName, data: d, borderColor: pal[0], backgroundColor: pal[0], borderWidth: 2, pointRadius: 3, pointHoverRadius: 6, tension: 0.25 }
        : barDataset(aggName, d, pal[0])];
    }
    makeChart("builder", canvas, {
      type,
      data: { labels, datasets },
      options: {
        plugins: { legend: { display: !!series }, title: { display: true, text: `${aggName} ตาม ${x}${series ? ` แยกตาม ${series}` : ""}` } },
        scales: { x: { stacked: !!series && type === "bar" }, y: logY ? { type: "logarithmic" } : { stacked: !!series && type === "bar", beginAtZero: true } },
      },
    });
  }

  function initBuilder() {
    ["#bType", "#bX", "#bY", "#bAgg", "#bSeries", "#bTop", "#bLog"].forEach((id) => $(id).addEventListener("change", renderBuilder));
    $("#bDownload").addEventListener("click", () => {
      if (!charts.builder) return;
      const a = el("a", { href: charts.builder.toBase64Image("image/png", 1), download: "chart.png" });
      a.click();
    });
  }

  // ------------------------------------------------------------------ pivot
  let lastPivot = null;
  function renderPivot() {
    const rowC = $("#pRow").value, colC = $("#pCol").value, val = $("#pVal").value;
    const agg = val ? $("#pAgg").value : "count";
    if (!rowC) return;
    const valLabel = val ? `${$("#pAgg").selectedOptions[0].text} ${val}` : "จำนวน";
    const cell = new Map(), rowKeys = new Set(), colKeys = new Set();
    for (const r of state.rows) {
      const rk = keyOf(r, rowC), ck = colC ? keyOf(r, colC) : valLabel;
      rowKeys.add(rk); colKeys.add(ck);
      const k = rk + "\u0000" + ck;
      if (!cell.has(k)) cell.set(k, []);
      cell.get(k).push(val ? r[val] : 1);
    }
    const rk = [...rowKeys].sort(), ck = [...colKeys].sort();
    const rowAll = new Map(), colAll = new Map(), all = [];
    for (const r of state.rows) {
      const a = keyOf(r, rowC), b = colC ? keyOf(r, colC) : valLabel, v = val ? r[val] : 1;
      (rowAll.get(a) || rowAll.set(a, []).get(a)).push(v);
      (colAll.get(b) || colAll.set(b, []).get(b)).push(v);
      all.push(v);
    }
    const matrix = rk.map((a) => ck.map((b) => (cell.has(a + "\u0000" + b) ? aggregate(cell.get(a + "\u0000" + b), agg) : null)));
    const flat = matrix.flat().filter((v) => v !== null);
    const mx = Math.max(...flat), mn = Math.min(...flat);
    const heat = $("#pHeat").checked;
    const [cr, cg, cb] = isDark() ? [57, 135, 229] : [42, 120, 214];
    const td = (v) => {
      if (v === null) return "<td></td>";
      const a = heat && mx > mn ? ((v - mn) / (mx - mn)) * 0.7 : 0;
      return `<td style="${a ? `background:rgba(${cr},${cg},${cb},${a.toFixed(2)});` : ""}${a > 0.45 ? "color:#fff" : ""}">${fmt(v)}</td>`;
    };
    const showTotal = ck.length > 1;
    $("#pivotTable").innerHTML =
      `<thead><tr><th>${esc(rowC)} \\ ${esc(colC || "")}</th>${ck.map((c) => `<th>${esc(c)}</th>`).join("")}${showTotal ? "<th>รวม</th>" : ""}</tr></thead><tbody>` +
      rk.map((a, i) => `<tr><td>${esc(a)}</td>${matrix[i].map(td).join("")}${showTotal ? `<td><b>${fmt(aggregate(rowAll.get(a), agg))}</b></td>` : ""}</tr>`).join("") +
      `<tr class="total"><td>รวม</td>${ck.map((b) => `<td>${fmt(aggregate(colAll.get(b), agg))}</td>`).join("")}${showTotal ? `<td>${fmt(aggregate(all, agg))}</td>` : ""}</tr></tbody>`;
    lastPivot = { columns: [rowC, ...ck], rows: rk.map((a, i) => [a, ...matrix[i]]) };
  }

  function initPivot() {
    ["#pRow", "#pCol", "#pVal", "#pAgg", "#pHeat"].forEach((id) => $(id).addEventListener("change", renderPivot));
    $("#pExport").addEventListener("click", () => lastPivot && downloadCsv(lastPivot.columns, lastPivot.rows, "pivot.csv"));
  }

  // ------------------------------------------------------------------ insights
  function renderInsights() {
    const out = [];
    const add = (kind, html) => out.push(`<div class="insight"><div class="kind">${kind}</div>${html}</div>`);
    const measure = mainMeasure();
    const date = dateCols()[0];
    const cats = categoricalCols(25).filter((c) => !isIdLike(c));
    const rows = state.rows;
    const agg = defaultAgg(measure);
    const valCol = agg === "count" ? null : measure;
    const what = valCol ? `${AGG_TH[agg]} ${esc(measure)}` : "จำนวน";
    const binary = binaryTarget(cats);

    // 1) กลุ่มที่สูงสุด/ต่ำสุดของแต่ละหมวด
    cats.filter((c) => c !== binary).slice(0, 6).forEach((c) => {
      const pairs = groupBy(rows, c, valCol, agg, true).sort((a, b) => b[1] - a[1]);
      if (pairs.length < 2) return;
      const total = pairs.reduce((a, p) => a + p[1], 0);
      const share = (v) => (agg === "avg" ? "" : ` (${pct(v / total)})`);
      const [top, second] = pairs;
      const last = pairs[pairs.length - 1];
      add("เปรียบเทียบกลุ่ม", `<b>${esc(c)}</b>: "${esc(top[0])}" มี${what}สูงสุด ${fmt(top[1])}${share(top[1])} — ${diffText(top[1], second[1])} เมื่อเทียบกับอันดับ 2 "${esc(second[0])}"` +
        (pairs.length > 2 ? ` — ต่ำสุดคือ "${esc(last[0])}" ${fmt(last[1])}${share(last[1])}` : ""));
    });

    // 2) แนวโน้มตามเวลา
    if (date && measure) {
      const byYear = groupBy(rows.filter((r) => r[date]), date, measure, "sum").reduce((m, [k, v]) => m.set(k.slice(0, 4), (m.get(k.slice(0, 4)) || 0) + v), new Map());
      const years = [...byYear.keys()].sort();
      if (years.length >= 2) {
        const [a, b] = years.slice(-2);
        const g = byYear.get(b) / byYear.get(a) - 1;
        add("แนวโน้ม", `${esc(measure)} ปี ${b} ${g >= 0 ? "เพิ่มขึ้น" : "ลดลง"} <b>${pct(Math.abs(g))}</b> เมื่อเทียบกับปี ${a} (${fmt(byYear.get(a))} → ${fmt(byYear.get(b))})`);
      }
      const byMonth = new Map();
      rows.forEach((r) => { if (r[date]) { const m = r[date].slice(5, 7); byMonth.set(m, (byMonth.get(m) || 0) + (r[measure] || 0)); } });
      const months = [...byMonth.entries()].sort((x, y) => y[1] - x[1]);
      if (months.length >= 6) {
        const TH = ["", "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
        const avg = [...byMonth.values()].reduce((a, b) => a + b, 0) / byMonth.size;
        add("ฤดูกาล", `เดือนที่ ${esc(measure)} สูงที่สุด (รวมทุกปี): <b>${months.slice(0, 3).map(([m]) => TH[+m]).join(", ")}</b> — เดือนสูงสุดสูงกว่าค่าเฉลี่ยรายเดือน ${pct(months[0][1] / avg - 1)} ส่วนเดือนต่ำสุดคือ ${TH[+months[months.length - 1][0]]}`);
      }
    }

    // 3) อัตราของตัวแปร 2 ค่า (เช่น ลาออก) แยกตามกลุ่ม
    if (binary) {
      const target = minorityValue(binary);
      const overall = rows.filter((r) => r[binary] === target).length / rows.length;
      const findings = [];
      cats.filter((c) => c !== binary).forEach((c) => {
        const groups = new Map();
        rows.forEach((r) => { if (r[c] === null) return; const g = groups.get(r[c]) || [0, 0]; g[0]++; if (r[binary] === target) g[1]++; groups.set(r[c], g); });
        groups.forEach(([n, k], g) => { if (n >= 20) findings.push({ c, g, rate: k / n, n }); });
      });
      findings.sort((a, b) => b.rate - a.rate);
      add("ตัวแปรเป้าหมาย", `อัตรา "${esc(target)}" ใน <b>${esc(binary)}</b> โดยรวม = ${pct(overall)}. กลุ่มที่สูงที่สุด: ` +
        findings.slice(0, 3).map((f) => `${esc(f.c)} = "${esc(f.g)}" (${pct(f.rate)}, n=${f.n})`).join(" · "));
      const diffs = [];
      numericCols().filter((c) => !isIdLike(c)).forEach((c) => {
        const a = stats(rows.filter((r) => r[binary] === target).map((r) => r[c]));
        const b = stats(rows.filter((r) => r[binary] !== null && r[binary] !== target).map((r) => r[c]));
        const effect = a.n && b.n ? Math.abs(a.mean - b.mean) / (b.std || 1) : 0;
        if (effect > 0.3) diffs.push({ c, a, b, effect, useMedian: isSkewed(c) });
      });
      diffs.sort((x, y) => y.effect - x.effect).slice(0, 4).forEach(({ c, a, b, useMedian }) => {
        const [va, vb, lab] = useMedian ? [a.median, b.median, "มัธยฐาน"] : [a.mean, b.mean, "ค่าเฉลี่ย"];
        add("ความแตกต่าง", `กลุ่ม "${esc(target)}" มี${lab} <b>${esc(c)}</b> = ${fmt(va)} เทียบกับ ${fmt(vb)} ในกลุ่มอื่น (${diffText(va, vb)})`);
      });
    }

    // ข้อมูลเบ้ (long tail) — ค่าเฉลี่ยถูกดึงด้วยค่าสูงสุดไม่กี่ตัว
    if (measure) {
      const s = stats(rows.map((r) => r[measure]));
      if (s.n && s.median > 0 && s.mean > 2 * s.median) {
        const sorted = rows.map((r) => r[measure]).filter((v) => v !== null).sort((a, b) => b - a);
        const top = sorted.slice(0, Math.max(1, Math.round(sorted.length * 0.1))).reduce((a, b) => a + b, 0);
        add("การกระจาย", `<b>${esc(measure)}</b> เบ้ขวามาก (long tail): ค่าเฉลี่ย ${fmt(s.mean)} แต่มัธยฐานเพียง ${fmt(s.median)} — 10% แรกครองสัดส่วน <b>${pct(top / s.sum)}</b> ของทั้งหมด ควรรายงานด้วยมัธยฐาน และใช้ log scale เวลาพล็อต`);
      }
    }

    // 4) ความสัมพันธ์
    const nums = numericCols().filter((c) => !isIdLike(c)).slice(0, 12);
    const pairs = [];
    for (let i = 0; i < nums.length; i++) for (let j = i + 1; j < nums.length; j++) {
      const r = pearson(rows.map((x) => x[nums[i]]), rows.map((x) => x[nums[j]]));
      if (!Number.isNaN(r)) pairs.push([nums[i], nums[j], r]);
    }
    pairs.sort((a, b) => Math.abs(b[2]) - Math.abs(a[2])).filter((p) => Math.abs(p[2]) >= 0.3 && Math.abs(p[2]) < 0.999).slice(0, 3)
      .forEach(([a, b, r]) => add("ความสัมพันธ์", `<b>${esc(a)}</b> กับ <b>${esc(b)}</b> มีความสัมพันธ์${r > 0 ? "เชิงบวก" : "เชิงลบ"}${Math.abs(r) > 0.7 ? "สูง" : "ปานกลาง"} (r = ${r.toFixed(2)}) — อย่าลืมว่า correlation ≠ causation`));

    // 5) คุณภาพข้อมูล
    const miss = state.columns.map((c) => [c, rows.filter((r) => r[c] === null).length]).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
    if (miss.length) add("คุณภาพข้อมูล", `มีค่าว่างใน ${miss.length} คอลัมน์: ` + miss.slice(0, 5).map(([c, n]) => `${esc(c)} (${n})`).join(", ") + ` — จัดการได้ในแท็บ "ทำความสะอาด"`);
    const skewed = [];
    numericCols().filter((c) => !isIdLike(c)).forEach((c) => {
      if (isSkewed(c)) return skewed.push(c);
      const s = stats(rows.map((r) => r[c]));
      const iqr = s.q3 - s.q1;
      const lo = Math.max(s.min, s.q1 - 1.5 * iqr), hi = Math.min(s.max, s.q3 + 1.5 * iqr);
      const n = rows.filter((r) => r[c] !== null && (r[c] > s.q3 + 1.5 * iqr || r[c] < s.q1 - 1.5 * iqr)).length;
      if (iqr > 0 && n / rows.length > 0.02 && out.filter((h) => h.includes("ค่าผิดปกติ")).length < 3) {
        add("ค่าผิดปกติ", `<b>${esc(c)}</b> มี outlier ${n.toLocaleString()} ค่า (${pct(n / rows.length)}) นอกช่วง ${fmt(lo)} – ${fmt(hi)}`);
      }
    });
    if (skewed.length > 1) add("การกระจาย", `คอลัมน์ที่เบ้ขวามาก (ค่าเฉลี่ย > 2 เท่าของมัธยฐาน): ${skewed.map((c) => `<b>${esc(c)}</b>`).join(", ")} — ค่าสูงมากเป็นลักษณะปกติของข้อมูลแบบ long tail ไม่ใช่ข้อผิดพลาด จึงไม่ควรลบทิ้ง`);

    $("#insightList").innerHTML = out.join("") || '<div class="panel">ไม่พบ insight ที่ชัดเจน ลองเพิ่มคอลัมน์หมวดหมู่หรือตัวเลข</div>';
  }

  // ------------------------------------------------------------------ sources
  function renderSources() {
    const q = $("#sourceSearch").value.trim().toLowerCase();
    $("#sourceList").innerHTML = (window.DATA_SOURCES || []).map((g) => {
      const items = g.items.filter((s) => !q || [s.name, s.desc, ...s.tags].join(" ").toLowerCase().includes(q));
      if (!items.length) return "";
      return `<div class="source-group"><h2>${esc(g.group)}</h2><div class="cards">` + items.map((s) => `
        <div class="card source"><a class="title" href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.name)} ↗</a>
        <p>${esc(s.desc)}</p><div>${s.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div></div>`).join("") + "</div></div>";
    }).join("") || '<p class="muted">ไม่พบแหล่งข้อมูลที่ค้นหา</p>';
  }

  function renderIdeas() {
    $("#ideaList").innerHTML = (window.PROJECT_IDEAS || []).map((i) => `
      <div class="card"><h3>${esc(i.title)}</h3><p><b>ข้อมูล:</b> ${esc(i.data)}</p><p><b>คำถาม:</b> ${esc(i.q)}</p>
      <div>${i.tools.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div></div>`).join("");
  }

  // ------------------------------------------------------------------ theme
  function initTheme() {
    try { const t = localStorage.getItem("das-theme"); if (t) document.documentElement.dataset.theme = t; } catch { /* storage blocked */ }
    $("#themeToggle").addEventListener("click", () => {
      const next = isDark() ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      try { localStorage.setItem("das-theme", next); } catch { /* storage blocked */ }
      applyChartDefaults();
      renderTab(currentTab());
    });
  }

  // ------------------------------------------------------------------ init
  document.addEventListener("DOMContentLoaded", () => {
    initTheme();
    applyChartDefaults();
    document.querySelectorAll("#tabs button").forEach((b) => b.addEventListener("click", () => switchTab(b.dataset.tab)));
    renderHome();
    initTable();
    initClean();
    initBuilder();
    initPivot();
    renderSources();
    renderIdeas();
    $("#sourceSearch").addEventListener("input", renderSources);
  });
})();
