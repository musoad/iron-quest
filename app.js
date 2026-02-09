/* ======================================================
   IRON QUEST – app.js (FULL, CONSOLIDATED, STABLE)
   - IndexedDB (Entries + Metrics)
   - Tabs/Router robust (Browser + iOS Home Screen)
   - Weekly Plan + Overrides + Auto-Balance + Quick Log
   - Calendar weekly view (tap day -> entries)
   - Log retroactive + Edit/Delete
   - Stars 1200/1600/2000
   - Mutations + Weekly Reward + Achievements
   - Bossfights locked by week + checklist + auto-logs
   - Skilltrees: skill points + XP multipliers
   - Daily Quests incl supplements (retro via selected calendar date)
   - Autosave Draft in Log (per date) without data loss
   - NEW: Streak system + Recomposition Index + BP + chart
   - PWA Auto-update banner
====================================================== */

console.log("IRON QUEST loaded ✅");

/* =========================
   BASIC HELPERS
========================= */
const $ = (id) => document.getElementById(id);
const isoDate = (d) => new Date(d).toISOString().slice(0, 10);
const clampWeek = (w) => Math.max(1, Math.min(12, w || 1));

function loadJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

/* =========================
   PWA AUTO UPDATE BANNER
========================= */
function showUpdateBanner(version){
  if (document.getElementById("updateBanner")) return;
  const bar = document.createElement("div");
  bar.id = "updateBanner";
  bar.style.cssText = `
    position:fixed; left:12px; right:12px; bottom:12px; z-index:9999;
    background:#111; color:#fff; padding:12px 14px; border-radius:16px;
    box-shadow:0 12px 34px rgba(0,0,0,.35);
    display:flex; align-items:center; justify-content:space-between; gap:12px;
  `;
  bar.innerHTML = `
    <div style="min-width:0;">
      <div style="font-weight:800;">Update verfügbar</div>
      <div style="opacity:.85; font-size:12px;">Version: ${version || "neu"} • Tippe auf „Neu laden“</div>
    </div>
    <button id="btnReloadNow" style="padding:10px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.25);background:#222;color:#fff;">
      Neu laden
    </button>
  `;
  document.body.appendChild(bar);
  document.getElementById("btnReloadNow").onclick = () => location.reload();
}

function initServiceWorkerUpdates(){
  if (!("serviceWorker" in navigator)) return;

  navigator.serviceWorker.addEventListener("message", (e)=>{
    if (e.data?.type === "SW_UPDATED") showUpdateBanner(e.data.version);
  });

  navigator.serviceWorker.register("sw.js")
    .then((reg)=>{
      if (reg.waiting) showUpdateBanner("waiting");
      reg.addEventListener("updatefound", ()=>{
        const sw = reg.installing;
        if (!sw) return;
        sw.addEventListener("statechange", ()=>{
          if (sw.state === "installed" && navigator.serviceWorker.controller) {
            showUpdateBanner("installed");
          }
        });
      });
    })
    .catch((e)=>console.warn("SW register failed", e));
}

/* =========================
   KEYS
========================= */
const KEY_START   = "ironquest_startdate_v40";
const KEY_MUT     = "ironquest_mutations_v40";
const KEY_QUESTS  = "ironquest_dailyquests_v40";
const KEY_BOSS    = "ironquest_boss_v40";
const KEY_BOSSCHK = "ironquest_boss_checks_v40";
const KEY_ACH     = "ironquest_weeklyach_v40";
const KEY_CAL     = "ironquest_calendar_v40";
const KEY_SKILL   = "ironquest_skilltree_v40";
const KEY_PLANOVR = "ironquest_plan_overrides_v40";
const KEY_WKREW   = "ironquest_week_rewards_v40";
const LOG_DRAFT_KEY = "ironquest_log_draft_v4";

/* =========================
   INDEXEDDB
========================= */
const DB_NAME = "ironquest_db";
const DB_VERSION = 6;
const STORE_ENTRIES = "entries";
const STORE_METRICS = "metrics";

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;

      // entries store
      if (!db.objectStoreNames.contains(STORE_ENTRIES)) {
        const s = db.createObjectStore(STORE_ENTRIES, { keyPath: "id", autoIncrement: true });
        s.createIndex("date", "date", { unique: false });
        s.createIndex("week", "week", { unique: false });
      } else {
        const s = req.transaction.objectStore(STORE_ENTRIES);
        if (!s.indexNames.contains("date")) s.createIndex("date", "date", { unique: false });
        if (!s.indexNames.contains("week")) s.createIndex("week", "week", { unique: false });
      }

      // metrics store (keyed by date)
      if (!db.objectStoreNames.contains(STORE_METRICS)) {
        db.createObjectStore(STORE_METRICS, { keyPath: "date" });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGetAll(store) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}
async function idbGet(store, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readonly");
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}
async function idbAdd(store, entry) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).add(entry);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}
async function idbPut(store, entry) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).put(entry);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}
async function idbDelete(store, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).delete(key);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}
async function idbClear(store) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, "readwrite");
    tx.objectStore(store).clear();
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}
async function idbAddMany(store, entries) {
  for (const e of entries) await idbAdd(store, e);
}

/* =========================
   TIME / WEEK
========================= */
function daysBetween(a, b) {
  return Math.floor((new Date(b) - new Date(a)) / 86400000);
}
function getWeekNumber(startISO, dateISO) {
  const diff = daysBetween(startISO, dateISO);
  return diff < 0 ? 0 : Math.floor(diff / 7) + 1;
}
function ensureStartDate() {
  let start = localStorage.getItem(KEY_START);
  if (!start) {
    start = isoDate(new Date());
    localStorage.setItem(KEY_START, start);
  }
  if ($("startDateDash")) $("startDateDash").value = start;
  return start;
}
function setStartDateLocal(newISO) {
  localStorage.setItem(KEY_START, newISO);
  if ($("startDateDash")) $("startDateDash").value = newISO;
}
function currentWeekFor(dateISO) {
  const start = ensureStartDate();
  return clampWeek(getWeekNumber(start, dateISO));
}
async function recalcAllEntryWeeks() {
  const start = ensureStartDate();
  const all = await idbGetAll(STORE_ENTRIES);
  for (const e of all) {
    const nw = clampWeek(getWeekNumber(start, e.date));
    if (e.week !== nw) {
      e.week = nw;
      await idbPut(STORE_ENTRIES, e);
    }
  }
}
function resetWeekBoundSystems() {
  localStorage.removeItem(KEY_MUT);
  localStorage.removeItem(KEY_ACH);
  localStorage.removeItem(KEY_BOSS);
  localStorage.removeItem(KEY_BOSSCHK);
}

/* =========================
   SORT
========================= */
function sortEntriesDesc(entries) {
  return entries.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return (b.id ?? 0) - (a.id ?? 0);
  });
}

/* =========================
   TAB ROUTER (fixes dead buttons)
========================= */
function showTab(tabKey){
  const tabs = document.querySelectorAll("[id^='tab-']");
  tabs.forEach(t => t.classList.add("hide"));
  const el = document.getElementById(`tab-${tabKey}`);
  if (el) el.classList.remove("hide");
  location.hash = tabKey;
}

function initTabRouter(){
  // Buttons: data-tab="dash|plan|log|calendar|skill|boss|recomp"
  document.querySelectorAll("[data-tab]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const key = btn.getAttribute("data-tab");
      if (key) showTab(key);
    });
  });

  // Hash navigation
  window.addEventListener("hashchange", ()=>{
    const key = (location.hash || "").replace("#","") || "dash";
    showTab(key);
  });

  const initial = (location.hash || "").replace("#","") || "dash";
  showTab(initial);
}

/* =========================
   STARS (fixed rule)
========================= */
function getStarThresholds(){ return { one: 1200, two: 1600, three: 2000 }; }
function starsForDay(xp, thr){
  if (xp >= thr.three) return "⭐⭐⭐";
  if (xp >= thr.two) return "⭐⭐";
  if (xp >= thr.one) return "⭐";
  return "—";
}

/* =========================
   LEVEL SYSTEM (slower)
========================= */
function xpNeededForNextLevel(level) {
  const l = Math.max(1, level);
  return Math.round(520 + 160 * l + 44 * (l ** 1.75));
}
function levelFromTotalXp(totalXp) {
  let lvl = 1;
  let xp = Math.max(0, Math.round(totalXp || 0));
  while (true) {
    const need = xpNeededForNextLevel(lvl);
    if (xp >= need) { xp -= need; lvl += 1; }
    else break;
    if (lvl > 999) break;
  }
  return { lvl, into: xp, need: xpNeededForNextLevel(lvl) };
}
function titleForLevel(lvl) {
  if (lvl >= 60) return "Mythic";
  if (lvl >= 40) return "Legend";
  if (lvl >= 25) return "Elite";
  if (lvl >= 15) return "Veteran";
  if (lvl >= 8) return "Krieger";
  return "Anfänger";
}

/* =========================
   STREAK SYSTEM (⭐ day = >=1200 xp)
========================= */
function computeDailyXpMap(entries){
  const map = {};
  for (const e of entries) map[e.date] = (map[e.date] || 0) + (e.xp || 0);
  return map;
}
function computeStreak(entries){
  const thr = getStarThresholds();
  const dayXp = computeDailyXpMap(entries);
  const dates = Object.keys(dayXp).sort(); // asc

  let best = 0;
  let run = 0;

  for (let i=0;i<dates.length;i++){
    const d = dates[i];
    const ok = (dayXp[d] || 0) >= thr.one;
    if (!ok) { run = 0; continue; }
    if (i === 0) run = 1;
    else {
      const prev = dates[i-1];
      const diff = daysBetween(prev, d);
      run = (diff === 1) ? (run + 1) : 1;
    }
    best = Math.max(best, run);
  }

  // current streak backwards from today
  const today = isoDate(new Date());
  let cur = 0;
  let cursor = today;
  while ((dayXp[cursor] || 0) >= thr.one){
    cur++;
    cursor = isoDate(new Date(new Date(cursor).getTime() - 86400000));
  }

  return { current: cur, best };
}

/* =========================
   MUTATIONS
========================= */
const MUTATIONS = [
  { id:"tempo", name:"Tempo Week", desc:"Langsame Exzentrik, saubere ROM.", effect:"STR/STA XP +10%", mult:{ STR:1.10, STA:1.10 } },
  { id:"corefocus", name:"Core Focus", desc:"Core & Kontrolle.", effect:"MOB XP +25%", mult:{ MOB:1.25 } },
  { id:"engine", name:"Engine Mode", desc:"Konditionierung Boost.", effect:"END XP +15%", mult:{ END:1.15 } },
  { id:"neatboost", name:"NEAT Boost", desc:"Alltag zählt mehr.", effect:"NEAT XP +20%", mult:{ NEAT:1.20 } },
  { id:"unilateral", name:"Unilateral Blessing", desc:"Stabilität.", effect:"STA XP +15%", mult:{ STA:1.15 } },
];
function loadMutMap(){ return loadJSON(KEY_MUT, {}); }
function saveMutMap(m){ saveJSON(KEY_MUT, m); }

function getMutationForWeek(week) {
  const w = clampWeek(week);
  const map = loadMutMap();
  if (!map[w]) {
    const choice = MUTATIONS[Math.floor(Math.random() * MUTATIONS.length)];
    map[w] = choice.id;
    saveMutMap(map);
  }
  return MUTATIONS.find(m => m.id === map[w]) || MUTATIONS[0];
}

function mutationXpMultiplierForType(type, mutation) {
  if (type === "NEAT" && mutation?.mult?.NEAT) return mutation.mult.NEAT;
  if (type === "Mehrgelenkig" && mutation?.mult?.STR) return mutation.mult.STR;
  if (type === "Unilateral" && mutation?.mult?.STA) return mutation.mult.STA;
  if (type === "Conditioning" && mutation?.mult?.END) return mutation.mult.END;
  if (type === "Core" && mutation?.mult?.MOB) return mutation.mult.MOB;
  if (type === "Komplexe") {
    const ms = [mutation?.mult?.STR, mutation?.mult?.STA, mutation?.mult?.END, mutation?.mult?.MOB].filter(Boolean);
    return ms.length ? ms.reduce((a,b)=>a+b,0)/ms.length : 1;
  }
  return 1;
}

/* =========================
   ADAPTIVE (recommendations only)
========================= */
function computeWeekDayXP(entries, weekNum) {
  const dayXP = {};
  for (const e of entries) {
    if (e.week !== weekNum) continue;
    dayXP[e.date] = (dayXP[e.date] || 0) + (e.xp || 0);
  }
  return dayXP;
}
function getAdaptiveModifiers(entries, curWeek) {
  const prev = curWeek - 1;
  if (prev < 1) return { setDelta: 0, repDelta: 0, note: "Startwoche: neutral." };

  const thr = getStarThresholds();
  const dayXP = computeWeekDayXP(entries, prev);
  const days = Object.keys(dayXP);

  const trainDays = days.filter(d => dayXP[d] >= thr.one).length;
  const twoStarDays = days.filter(d => dayXP[d] >= thr.two).length;
  const threeStarDays = days.filter(d => dayXP[d] >= thr.three).length;

  if (trainDays >= 5 && threeStarDays >= 2) return { setDelta:+1, repDelta:+2, note:`Elite Woche (W${prev}) → +1 Satz & +2 Reps.` };
  if (trainDays >= 4 && (twoStarDays >= 2 || threeStarDays >= 1)) return { setDelta:+1, repDelta:+1, note:`Starke Woche (W${prev}) → +1 Satz & +1 Rep.` };
  if (trainDays <= 2) return { setDelta:-1, repDelta:-1, note:`Schwache Woche (W${prev}) → Deload.` };
  return { setDelta:0, repDelta:0, note:`Stabil (W${prev}) → neutral.` };
}
function applySetDeltaText(text, delta) {
  const nums = text.match(/\d+/g)?.map(n => parseInt(n,10));
  if (!nums || nums.length === 0) return text;
  const newNums = nums.map(n => Math.max(1, n + delta));
  let i = 0;
  return text.replace(/\d+/g, () => String(newNums[i++]));
}

/* =========================
   EXERCISES (expanded)
========================= */
const EXERCISES = [
  // PUSH
  { name:"DB Floor Press (neutral)", type:"Mehrgelenkig", group:"Tag 1 – Push", cat:"Brust/Trizeps" },
  { name:"DB Bench Press (Floor alt)", type:"Mehrgelenkig", group:"Tag 1 – Push", cat:"Brust" },
  { name:"Arnold Press", type:"Mehrgelenkig", group:"Tag 1 – Push", cat:"Schulter" },
  { name:"DB Overhead Press", type:"Mehrgelenkig", group:"Tag 1 – Push", cat:"Schulter" },
  { name:"Deficit Push-Ups", type:"Mehrgelenkig", group:"Tag 1 – Push", cat:"Brust" },
  { name:"Close-Grip Push-Ups", type:"Mehrgelenkig", group:"Tag 1 – Push", cat:"Trizeps" },
  { name:"Overhead Trizeps Extension", type:"Mehrgelenkig", group:"Tag 1 – Push", cat:"Trizeps" },
  { name:"DB Skull Crushers (Floor)", type:"Mehrgelenkig", group:"Tag 1 – Push", cat:"Trizeps" },
  { name:"DB Lateral Raises", type:"Mehrgelenkig", group:"Tag 1 – Push", cat:"Schulter" },

  // PULL
  { name:"1-Arm DB Row (Pause oben)", type:"Unilateral", group:"Tag 2 – Pull", cat:"Rücken" },
  { name:"1-Arm DB Row (Elbow close)", type:"Unilateral", group:"Tag 2 – Pull", cat:"Lat" },
  { name:"Renegade Rows", type:"Unilateral", group:"Tag 2 – Pull", cat:"Rücken/Core" },
  { name:"Reverse Flys (langsam)", type:"Mehrgelenkig", group:"Tag 2 – Pull", cat:"Rear Delt" },
  { name:"DB Pullover (Floor)", type:"Mehrgelenkig", group:"Tag 2 – Pull", cat:"Lat" },
  { name:"Cross-Body Hammer Curl", type:"Mehrgelenkig", group:"Tag 2 – Pull", cat:"Bizeps" },
  { name:"DB Supinated Curl", type:"Mehrgelenkig", group:"Tag 2 – Pull", cat:"Bizeps" },
  { name:"Farmer’s Carry (DB)", type:"Unilateral", group:"Tag 2 – Pull", cat:"Grip/Traps" },

  // LEGS + CORE
  { name:"Bulgarian Split Squats", type:"Unilateral", group:"Tag 3 – Beine & Core", cat:"Quads/Glute" },
  { name:"DB Romanian Deadlift", type:"Mehrgelenkig", group:"Tag 3 – Beine & Core", cat:"Hamstrings/Glute" },
  { name:"Goblet Squat", type:"Mehrgelenkig", group:"Tag 3 – Beine & Core", cat:"Quads" },
  { name:"Cossack Squats", type:"Unilateral", group:"Tag 3 – Beine & Core", cat:"Adduktoren/Hip" },
  { name:"Hip Thrust (Floor)", type:"Mehrgelenkig", group:"Tag 3 – Beine & Core", cat:"Glute" },
  { name:"Dead Bug", type:"Core", group:"Tag 3 – Beine & Core", cat:"Core" },
  { name:"Side Plank + Leg Raise", type:"Core", group:"Tag 3 – Beine & Core", cat:"Core" },
  { name:"Standing DB Calf Raises", type:"Core", group:"Tag 3 – Beine & Core", cat:"Calves" },

  // FULL BODY / COMPLEX
  { name:"Komplex: Deadlift", type:"Komplexe", group:"Tag 4 – Ganzkörper", cat:"Complex" },
  { name:"Komplex: Clean", type:"Komplexe", group:"Tag 4 – Ganzkörper", cat:"Complex" },
  { name:"Komplex: Front Squat", type:"Komplexe", group:"Tag 4 – Ganzkörper", cat:"Complex" },
  { name:"Komplex: Push Press", type:"Komplexe", group:"Tag 4 – Ganzkörper", cat:"Complex" },
  { name:"DB Thrusters", type:"Komplexe", group:"Tag 4 – Ganzkörper", cat:"Fullbody" },
  { name:"Plank Shoulder Taps", type:"Core", group:"Tag 4 – Ganzkörper", cat:"Core" },

  // CONDITIONING
  { name:"Burpees", type:"Conditioning", group:"Tag 5 – Conditioning & Core", cat:"Metcon" },
  { name:"Mountain Climbers", type:"Conditioning", group:"Tag 5 – Conditioning & Core", cat:"Metcon" },
  { name:"High Knees", type:"Conditioning", group:"Tag 5 – Conditioning & Core", cat:"Metcon" },
  { name:"Jumping Jacks", type:"Conditioning", group:"Tag 5 – Conditioning & Core", cat:"Metcon" },
  { name:"Russian Twists (DB)", type:"Core", group:"Tag 5 – Conditioning & Core", cat:"Core" },
  { name:"Hollow Body Hold", type:"Core", group:"Tag 5 – Conditioning & Core", cat:"Core" },

  // NEAT
  { name:"Walking Desk (Laufband 3 km/h)", type:"NEAT", group:"NEAT / Alltag", cat:"NEAT" },

  // REST
  { name:"Ruhetag (Recovery + Mobility)", type:"Rest", group:"Ruhetag", cat:"Recovery" },
];

function typeForExercise(exName) {
  return EXERCISES.find(e => e.name === exName)?.type ?? "Mehrgelenkig";
}
function metaForExercise(exName){
  return EXERCISES.find(e => e.name === exName) || null;
}
function isWalkType(type){ return type === "NEAT"; }
function isRestType(type){ return type === "Rest"; }

function buildExerciseDropdown() {
  const sel = $("exercise");
  if (!sel) return;
  const prev = sel.value;
  sel.innerHTML = "";

  const map = {};
  EXERCISES.forEach(ex => {
    map[ex.group] ??= {};
    map[ex.group][ex.cat] ??= [];
    map[ex.group][ex.cat].push(ex);
  });

  Object.keys(map).forEach(groupName => {
    const og = document.createElement("optgroup");
    og.label = groupName;
    Object.keys(map[groupName]).forEach(cat => {
      map[groupName][cat].forEach(ex => {
        const opt = document.createElement("option");
        opt.value = ex.name;
        opt.textContent = ex.name;
        og.appendChild(opt);
      });
    });
    sel.appendChild(og);
  });

  if (prev && [...sel.options].some(o => o.value === prev)) sel.value = prev;
  else sel.selectedIndex = 0;
}

/* =========================
   RECOMMENDATIONS (display only)
========================= */
function overridesForExercise(exName) {
  if (!exName) return null;
  if (exName.includes("Farmer")) return { setsText:"2–3 Runden", setsValue:3, repsText:"30–60s pro Runde" };
  if (exName.includes("Lateral")) return { setsText:"3 Sätze", setsValue:3, repsText:"12–20 Wdh" };
  if (exName.includes("Calf")) return { setsText:"3–4 Sätze", setsValue:4, repsText:"15–25 Wdh" };
  if (exName.includes("Ruhetag")) return { setsText:"—", setsValue:null, repsText:"10–20 Min Mobility + Spaziergang" };
  return null;
}
function weekBlock(week){ const w = clampWeek(week); return w<=4?1:(w<=8?2:3); }
function blockName(block){ return block===1?"Block 1 (Technik/ROM)":(block===2?"Block 2 (Volumen/Progress)":"Block 3 (Dichte/Intensität)"); }
function weeklyProgressHint(week){
  const b = weekBlock(week);
  if (b===1) return "Technik/ROM, Progress über Wiederholungen.";
  if (b===2) return "Mehr Volumen, Progress über Reps oder schwerer.";
  return "Dichte/Intensität (Tempo/kurzere Pausen).";
}
function baseRecommendedSets(type, week) {
  const b = weekBlock(week);
  if (type === "NEAT") return { text:"Minuten statt Sätze", value:null };
  if (type === "Rest") return { text:"—", value:null };
  if (type === "Conditioning") return b === 1 ? { text:"4–5 Runden", value:4 } : { text:"5–6 Runden", value:5 };
  if (type === "Core") return b === 1 ? { text:"3 Sätze", value:3 } : { text:"4 Sätze", value:4 };
  if (type === "Komplexe") return b === 1 ? { text:"4–5 Runden", value:4 } : { text:"5–6 Runden", value:5 };
  return b === 1 ? { text:"3–4 Sätze", value:4 } : { text:"4–5 Sätze", value:5 };
}
function baseRecommendedReps(type, week) {
  const b = weekBlock(week);
  if (type === "NEAT") return "Minuten (z. B. 30–60)";
  if (type === "Rest") return "Mobility: Schulter/T-Spine/Hüfte";
  if (type === "Core") return b === 1 ? "30–45s/Satz" : "40–60s/Satz";
  if (type === "Conditioning") return b === 1 ? "30–40s/60s" : "40–45s/45s";
  if (type === "Komplexe") return b === 1 ? "6–8 Wdh/Move" : "6 Wdh/Move";
  return b === 1 ? "10–12 Wdh/Satz" : (b===2 ? "8–10 Wdh/Satz" : "6–8 Wdh/Satz");
}
function recommendedSetsForExercise(exName, type, week, adaptive) {
  const ov = overridesForExercise(exName);
  const base = ov ? { text: ov.setsText, value: ov.setsValue } : baseRecommendedSets(type, week);
  if (type === "NEAT" || type === "Rest") return base;
  const d = adaptive?.setDelta ?? 0;
  if (!d) return base;
  return { text: applySetDeltaText(base.text, d) + " (adaptive)", value: base.value == null ? null : Math.max(1, base.value + d) };
}
function recommendedRepsForExercise(exName, type, week, adaptive) {
  const ov = overridesForExercise(exName);
  if (ov) return ov.repsText;
  const base = baseRecommendedReps(type, week);
  const d = adaptive?.repDelta ?? 0;
  if (!d || type === "NEAT" || type === "Rest") return base;
  const nums = base.match(/\d+/g)?.map(n => parseInt(n,10));
  if (!nums) return base;
  let i = 0;
  const shifted = base.replace(/\d+/g, () => String(Math.max(1, nums[i++] + d)));
  return shifted + " (adaptive)";
}

/* =========================
   XP SYSTEM (per exercise)
========================= */
const XP_PER_EXERCISE = {
  "Mehrgelenkig": 180,
  "Unilateral": 200,
  "Core": 140,
  "Conditioning": 240,
  "Komplexe": 260,
  "Rest": 0,
  "NEAT": 0
};
function neatXP(minutes) { return Math.max(0, Math.round((minutes || 0) * 2.5)); } // 60=150

/* =========================
   QUESTS (retro via selected date)
========================= */
const QUESTS = [
  { id:"steps10k",   name:"10.000 Schritte", xp:70, note:"NEAT", slot:"any" },
  { id:"mobility10", name:"10 Min Mobility", xp:40, note:"ROM", slot:"any" },
  { id:"water",      name:"2,5–3L Wasser",   xp:22, note:"Hydration", slot:"any" },
  { id:"sleep",      name:"7h+ Schlaf",      xp:45, note:"Recovery", slot:"any" },
  { id:"supp_d3",      name:"Vitamin D3", xp:10, note:"morgens", slot:"am" },
  { id:"supp_crea",    name:"Kreatin 5g", xp:10, note:"morgens", slot:"am" },
  { id:"supp_mag",     name:"Magnesium",  xp:10, note:"abends",  slot:"pm" },
  { id:"supp_omega3",  name:"Omega-3",    xp:10, note:"abends",  slot:"pm" },
];

function loadQuestState(){ return loadJSON(KEY_QUESTS, {}); }
function saveQuestState(s){ saveJSON(KEY_QUESTS, s); }
function isQuestDoneForDay(qState, questId, dayISO){ return qState?.[dayISO]?.[questId] === true; }

/* =========================
   CALENDAR STATE
========================= */
function loadCalendarState(){
  return loadJSON(KEY_CAL, { weekOffset: 0, selectedDate: isoDate(new Date()) });
}
function saveCalendarState(st){ saveJSON(KEY_CAL, st); }
function getSelectedDayISO(){
  const st = loadCalendarState();
  return st.selectedDate || isoDate(new Date());
}

async function setQuestDoneForDay(questId, dayISO, done){
  const qState = loadQuestState();
  qState[dayISO] ??= {};
  const already = qState[dayISO][questId] === true;
  if (done && already) return;

  if (done) qState[dayISO][questId] = true;
  else delete qState[dayISO][questId];
  saveQuestState(qState);

  if (done) {
    const q = QUESTS.find(x => x.id === questId);
    const week = currentWeekFor(dayISO);
    await idbAdd(STORE_ENTRIES,{
      date: dayISO,
      week,
      exercise:`Daily Quest: ${q?.name ?? questId}`,
      type:"Quest",
      detail:`${q?.slot === "am" ? "AM" : q?.slot === "pm" ? "PM" : "Any"}`,
      xp:q?.xp ?? 0
    });
  }
}

function renderQuests(){
  const dayISO = getSelectedDayISO();
  const qState = loadQuestState();
  const ul = $("questList");
  if (!ul) return;
  ul.innerHTML = "";

  const info = document.createElement("li");
  info.innerHTML = `<div class="hint"><b>Quests-Datum:</b> ${dayISO} (Kalender → Tag auswählen)</div>`;
  ul.appendChild(info);

  function renderGroup(title, list){
    const head = document.createElement("li");
    head.innerHTML = `<div class="hint"><b>${title}</b></div>`;
    ul.appendChild(head);

    list.forEach(q=>{
      const done = isQuestDoneForDay(qState, q.id, dayISO);
      const li = document.createElement("li");
      li.innerHTML = `
        <div class="checkItem">
          <button type="button" class="qbtn ${done ? "done":""}" data-q="${q.id}">
            ${done ? "✓" : "+"}
          </button>
          <div class="checkMain">
            <div class="checkTitle">${q.name}</div>
            <div class="checkSub">${q.note}</div>
          </div>
          <div class="xpBadge">+${q.xp} XP</div>
        </div>
      `;
      ul.appendChild(li);
    });
  }

  renderGroup("Morgens (Supplements)", QUESTS.filter(q=>q.slot==="am"));
  renderGroup("Abends (Supplements)", QUESTS.filter(q=>q.slot==="pm"));
  renderGroup("Jederzeit", QUESTS.filter(q=>q.slot==="any"));

  ul.querySelectorAll("button[data-q]").forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      const qid = btn.getAttribute("data-q");
      const done = isQuestDoneForDay(loadQuestState(), qid, dayISO);
      if (done) {
        alert("Quest schon erledigt (Eintrag bleibt).");
        return;
      }
      await setQuestDoneForDay(qid, dayISO, true);
      await renderAll();
    });
  });
}

/* =========================
   BOSSES (locked by week + checklist)
========================= */
const BOSSES = [
  { week: 2, name: "The Foundation Beast", xp: 650, reward: "1 Joker + Titel",
    workout: ["DB Goblet Squat – 5×10 (3s runter)","DB Floor Press – 5×8","DB Row – 5×10 (Pause oben)","Pause strikt 90s"]},
  { week: 4, name: "The Asymmetry Lord", xp: 800, reward: "+1 STA + Unilateral XP +10% (1 Woche)",
    workout: ["Bulgarian Split Squat – 4×8 je Seite","1-Arm DB Row – 4×10 je Seite","Side Plank – 3×45s je Seite","Regel: schwache Seite beginnt"]},
  { week: 6, name: "The Core Guardian", xp: 900, reward: "Core 1 Woche doppelt",
    workout: ["Hollow Hold – 4×40s","Plank Shoulder Taps – 4×30","Goblet Squat Hold – 3×45s","Pausen max. 60s"]},
  { week: 8, name: "The Conditioning Reaper", xp: 1100, reward: "+1 END",
    workout: ["5 Runden: 30s Burpees","30s Mountain Climbers","30s High Knees","Pause 60s"]},
  { week: 10, name: "The Iron Champion", xp: 1400, reward: "+1 Attribut deiner Wahl",
    workout: ["Komplex 6 Runden (je 6 Wdh)","Deadlift → Clean → Front Squat → Push Press","Hanteln nicht absetzen","Technik vor Tempo"]},
  { week: 12, name: "FINAL: Iron Overlord", xp: 2400, reward: "Titel: IRON OVERLORD SLAYER",
    workout: ["Goblet Squat – 4×12","DB Floor Press – 4×10","1-Arm DB Row – 4×10","Bulgarian Split Squat – 3×8","Plank – 3×60s"]},
];

function defaultBoss(){
  const obj = {};
  BOSSES.forEach(b => obj[b.week] = { cleared:false, clearedAt:null });
  return obj;
}
function loadBoss(){ return loadJSON(KEY_BOSS, defaultBoss()); }
function saveBoss(b){ saveJSON(KEY_BOSS, b); }

function loadBossChecks(){ return loadJSON(KEY_BOSSCHK, {}); }
function saveBossChecks(s){ saveJSON(KEY_BOSSCHK, s); }

function bossCheckKey(week, dateISO){ return `${week}|${dateISO}`; }
function getBossChecksFor(week, dateISO){
  const all = loadBossChecks();
  return all[bossCheckKey(week, dateISO)] ?? {};
}
function setBossCheckFor(week, dateISO, idx, value){
  const all = loadBossChecks();
  const k = bossCheckKey(week, dateISO);
  all[k] ??= {};
  all[k][idx] = value;
  saveBossChecks(all);
}
function allBossChecksDone(week, dateISO, workoutLen){
  const checks = getBossChecksFor(week, dateISO);
  for (let i=0;i<workoutLen;i++){
    if (!checks[i]) return false;
  }
  return true;
}
function splitXP(total, n){
  const base = Math.floor(total / n);
  const rem = total - base * n;
  const arr = Array(n).fill(base);
  arr[n-1] += rem;
  return arr;
}
function getBossForWeek(w){ return BOSSES.find(b => b.week === w) || null; }

function renderBoss(curWeek){
  const today = isoDate(new Date());
  const bossState = loadBoss();
  const ul = $("bossList");
  if (!ul) return;
  ul.innerHTML = "";

  BOSSES.forEach(b => {
    const st = bossState[b.week] ?? { cleared:false, clearedAt:null };
    const isWeek = (curWeek === b.week);
    const locked = !isWeek;
    const doneChecks = allBossChecksDone(b.week, today, b.workout.length);
    const canClear = isWeek && doneChecks;

    const li = document.createElement("li");
    li.innerHTML = `
      <div class="bossrow">
        <div style="min-width:0;">
          <div><b>Week ${b.week}:</b> ${b.name}</div>
          <div class="hint">Reward: ${b.reward} • +${b.xp} XP</div>
          ${st.clearedAt ? `<div class="hint">Cleared am: ${st.clearedAt}</div>` : ""}
          ${locked ? `<div class="hint">🔒 Locked – nur in Woche ${b.week}</div>` : `<div class="hint">✅ Woche aktiv</div>`}
        </div>
        <div class="row" style="margin:0; align-items:flex-start;">
          <span class="badge ${locked ? "lock" : (st.cleared ? "ok":"no")}">${locked ? "LOCKED" : (st.cleared ? "CLEARED":"OPEN")}</span>
          <button type="button" class="secondary" style="width:auto; padding:10px 12px;" data-week="${b.week}" ${canClear ? "" : "disabled"}>Clear</button>
        </div>
      </div>

      <div class="hint" style="margin-top:10px;"><b>Boss-Workout Checkliste (heute):</b></div>
      <ul class="checklist" id="bosschk_${b.week}"></ul>
      <div class="hint">Clear wird erst aktiv, wenn alle Punkte abgehakt sind.</div>
    `;
    ul.appendChild(li);

    const chkUl = li.querySelector(`#bosschk_${b.week}`);
    const checks = getBossChecksFor(b.week, today);
    const xpParts = splitXP(b.xp, b.workout.length);

    b.workout.forEach((line, idx) => {
      const checked = !!checks[idx];
      const row = document.createElement("li");
      row.innerHTML = `
        <div class="checkItem">
          <input type="checkbox" ${checked ? "checked":""} ${locked ? "disabled":""}>
          <div class="checkMain">
            <div class="checkTitle">${line}</div>
            <div class="checkSub">${b.name}</div>
          </div>
          <div class="xpBadge">+${xpParts[idx]} XP</div>
        </div>
      `;
      chkUl.appendChild(row);

      row.querySelector("input").addEventListener("change", async (e) => {
        setBossCheckFor(b.week, today, idx, e.target.checked);
        await renderAll();
      });
    });
  });

  ul.querySelectorAll("button[data-week]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const week = parseInt(btn.getAttribute("data-week"), 10);
      const boss = BOSSES.find(x => x.week === week);
      if (!boss) return;

      const today = isoDate(new Date());
      const w = currentWeekFor(today);

      if (w !== week) return alert(`LOCKED. Aktuell W${w}. Dieser Boss ist nur in W${week}.`);
      if (!allBossChecksDone(week, today, boss.workout.length)) return alert("Erst alle Checkboxen abhaken!");

      const xpParts = splitXP(boss.xp, boss.workout.length);
      const entriesToAdd = boss.workout.map((line, idx) => ({
        date: today, week: w,
        exercise: `Boss W${week}: ${line}`,
        type: "Boss-Workout",
        detail: `${boss.name} • Reward: ${boss.reward}`,
        xp: xpParts[idx]
      }));
      entriesToAdd.push({ date: today, week: w, exercise: `Bossfight CLEARED: ${boss.name}`, type: "Boss", detail: `W${week} Clear`, xp: 0 });

      await idbAddMany(STORE_ENTRIES, entriesToAdd);

      const bs = loadBoss();
      bs[week] = { cleared:true, clearedAt: today };
      saveBoss(bs);

      await renderAll();
      alert(`Bossfight cleared! +${boss.xp} XP ✅`);
    });
  });
}

/* =========================
   WEEKLY ACHIEVEMENTS + WEEKLY REWARD
========================= */
const ACHIEVEMENTS = [
  { id:"noskip", name:"No Skip Week", xp:650, rule:"5 Trainingstage (≥⭐)" },
  { id:"perfect", name:"Perfect Run", xp:750, rule:"5 Tage ⭐⭐ oder ⭐⭐⭐" },
  { id:"threestar", name:"3-Star Hunter", xp:550, rule:"mind. 2× ⭐⭐⭐" },
  { id:"questmaster", name:"Quest Master", xp:450, rule:"mind. 6 Quests (inkl. Supplements)" },
];
function loadWeeklyAch(){ return loadJSON(KEY_ACH, {}); }
function saveWeeklyAch(s){ saveJSON(KEY_ACH, s); }

function countDailyQuestsInWeek(weekNum){
  const q = loadQuestState();
  let count = 0;
  const start = ensureStartDate();
  for (const dayISO of Object.keys(q)){
    const w = clampWeek(getWeekNumber(start, dayISO));
    if (w === weekNum) count += Object.values(q[dayISO] || {}).filter(Boolean).length;
  }
  return count;
}
function countTrainingDaysInWeek(entries, weekNum){
  const days = new Set();
  for (const e of entries){
    if (e.week !== weekNum) continue;
    if (e.type === "Quest" || e.type === "Rest" || e.type === "NEAT") continue;
    days.add(e.date);
  }
  return days.size;
}
function loadWeekRewards(){ return loadJSON(KEY_WKREW, {}); }
function saveWeekRewards(s){ saveJSON(KEY_WKREW, s); }
function rewardActiveForWeek(week){
  const map = loadWeekRewards();
  return map?.[week] === true;
}
async function updateWeeklyReward(entries, weekNum){
  if (!weekNum || weekNum < 1) return;
  const map = loadWeekRewards();
  const trainingDays = countTrainingDaysInWeek(entries, weekNum);
  const next = clampWeek(weekNum + 1);

  if (trainingDays >= 5 && !map[next]) {
    map[next] = true;
    saveWeekRewards(map);
    const today = isoDate(new Date());
    await idbAdd(STORE_ENTRIES,{ date: today, week: weekNum, exercise:`Weekly Reward Unlocked`, type:"Reward", detail:`W${next}: +5% XP Bonus`, xp:0 });
  }
}
async function evaluateWeeklyAchievements(entries, weekNum){
  if (!weekNum) return { earned:[], newlyEarned:[], trainDays:0, threeStarDays:0 };

  const thr = getStarThresholds();
  const dayXP = computeWeekDayXP(entries, weekNum);
  const dates = Object.keys(dayXP);

  const trainDaysByStars = dates.filter(d => dayXP[d] >= thr.one).length;
  const twoPlusDays = dates.filter(d => dayXP[d] >= thr.two).length;
  const threeStarDays = dates.filter(d => dayXP[d] >= thr.three).length;
  const questCount = countDailyQuestsInWeek(weekNum);

  const shouldEarn = [];
  if (trainDaysByStars >= 5) shouldEarn.push("noskip");
  if (twoPlusDays >= 5) shouldEarn.push("perfect");
  if (threeStarDays >= 2) shouldEarn.push("threestar");
  if (questCount >= 6) shouldEarn.push("questmaster");

  const achState = loadWeeklyAch();
  achState[weekNum] ??= {};
  const newlyEarned = [];

  for (const id of shouldEarn){
    if (!achState[weekNum][id]) {
      achState[weekNum][id] = true;
      newlyEarned.push(id);
    }
  }
  saveWeeklyAch(achState);

  if (newlyEarned.length){
    const today = isoDate(new Date());
    for (const id of newlyEarned){
      const a = ACHIEVEMENTS.find(x => x.id === id);
      if (!a) continue;
      await idbAdd(STORE_ENTRIES,{ date: today, week: weekNum, exercise: `Achievement: ${a.name}`, type: "Achievement", detail: a.rule, xp: a.xp });
    }
  }

  await updateWeeklyReward(entries, weekNum);
  return { earned: shouldEarn, newlyEarned, trainDays: trainDaysByStars, threeStarDays };
}

/* =========================
   SKILLTREE (XP multipliers + points)
========================= */
const TREES = [
  { key:"multi", name:"Mehrgelenkig (STR)", gateType:"Mehrgelenkig", domList:"tree-multi" },
  { key:"uni",   name:"Unilateral (STA)",   gateType:"Unilateral",   domList:"tree-uni" },
  { key:"core",  name:"Core (MOB)",         gateType:"Core",         domList:"tree-core" },
  { key:"cond",  name:"Conditioning (END)", gateType:"Conditioning", domList:"tree-cond" },
  { key:"comp",  name:"Komplexe (ELITE)",   gateType:"Komplexe",     domList:"tree-comp" },
];
function defaultNodesForTree(treeKey){
  return [
    { id:`${treeKey}_t1a`, tier:1, cost:1, name:"Tier 1: Foundation I", unlocked:false },
    { id:`${treeKey}_t1b`, tier:1, cost:1, name:"Tier 1: Foundation II", unlocked:false },
    { id:`${treeKey}_t1c`, tier:1, cost:1, name:"Tier 1: Foundation III", unlocked:false },
    { id:`${treeKey}_t2a`, tier:2, cost:2, name:"Tier 2: Advanced I", unlocked:false },
    { id:`${treeKey}_t2b`, tier:2, cost:2, name:"Tier 2: Advanced II", unlocked:false },
    { id:`${treeKey}_t3a`, tier:3, cost:3, name:"Tier 3: Mastery", unlocked:false },
    { id:`${treeKey}_cap`, tier:4, cost:5, name:"Capstone: Ascension", unlocked:false },
  ];
}
function loadSkillState(){
  const fallback = { spent: 0, nodes: Object.fromEntries(TREES.map(t => [t.key, defaultNodesForTree(t.key)])) };
  const st = loadJSON(KEY_SKILL, fallback);
  for (const t of TREES){
    if (!st.nodes?.[t.key]) st.nodes[t.key] = defaultNodesForTree(t.key);
  }
  if (typeof st.spent !== "number") st.spent = 0;
  return st;
}
function saveSkillState(st){ saveJSON(KEY_SKILL, st); }

function countUnlocked(nodes, tier){ return nodes.filter(n => n.tier === tier && n.unlocked).length; }
function isNodeAvailable(nodes, node){
  if (node.unlocked) return false;
  if (node.tier === 1) return true;
  if (node.tier === 2) return countUnlocked(nodes, 1) >= 2;
  if (node.tier === 3) return countUnlocked(nodes, 2) >= 2;
  if (node.tier === 4) return countUnlocked(nodes, 3) >= 1;
  return false;
}

function computeSkillPointsEarned(entries){
  const start = ensureStartDate();
  const dayXP = {};
  for (const e of entries) dayXP[e.date] = (dayXP[e.date] || 0) + (e.xp || 0);

  let points = 0;
  for (const dayISO of Object.keys(dayXP)){
    const w = clampWeek(getWeekNumber(start, dayISO));
    const thr = getStarThresholds();
    const s = starsForDay(dayXP[dayISO] || 0, thr);
    if (s === "⭐") points += 1;
    else if (s === "⭐⭐") points += 2;
    else if (s === "⭐⭐⭐") points += 3;
  }
  const bossClears = entries.filter(e => e.type === "Boss" && String(e.exercise || "").startsWith("Bossfight CLEARED")).length;
  points += bossClears * 3;

  const ach = entries.filter(e => e.type === "Achievement").length;
  points += ach;

  return points;
}
function computeSkillPointsAvailable(entries){
  const earned = computeSkillPointsEarned(entries);
  const st = loadSkillState();
  const spent = st.spent || 0;
  return { earned, spent, available: Math.max(0, earned - spent) };
}
function getActiveTreeGates(entries, currentWeek){
  const typesThisWeek = new Set(entries.filter(e => e.week === currentWeek).map(e => e.type));
  return Object.fromEntries(TREES.map(t => [t.key, typesThisWeek.has(t.gateType)]));
}

// XP effect: +2% per unlocked node, +5% extra capstone
function skillMultiplierForType(type){
  const st = loadSkillState();
  const mapKey =
    type === "Mehrgelenkig" ? "multi" :
    type === "Unilateral" ? "uni" :
    type === "Core" ? "core" :
    type === "Conditioning" ? "cond" :
    type === "Komplexe" ? "comp" : null;

  if (!mapKey) return 1;

  const nodes = st.nodes?.[mapKey] || [];
  const unlockedCount = nodes.filter(n => n.unlocked).length;
  const hasCap = nodes.find(n => n.id.endsWith("_cap"))?.unlocked === true;

  let mult = 1 + unlockedCount * 0.02;
  if (hasCap) mult += 0.05;
  if (mapKey === "comp" && hasCap) mult += 0.03; // small global bonus
  return mult;
}

function ensureDashboardSkillPill(){
  const host = document.getElementById("dashPills") || document.querySelector("#tab-dash");
  if (!host) return;
  if (document.getElementById("skillPointsAvail")) return;

  const pill = document.createElement("div");
  pill.className = "pill";
  pill.innerHTML = `<b>Skillpunkte verfügbar:</b> <span id="skillPointsAvail">0</span>`;
  host.appendChild(pill);
}

function renderSkillTrees(entries, curWeek){
  const st = loadSkillState();
  const sp = computeSkillPointsAvailable(entries);
  const gates = getActiveTreeGates(entries, curWeek);

  for (const tree of TREES){
    const ul = $(tree.domList);
    if (!ul) continue;
    ul.innerHTML = "";

    const gateOk = !!gates[tree.key];
    const head = document.createElement("li");
    head.innerHTML = `<div class="hint"><b>${tree.name}</b> • Gate: ${gateOk ? "✅ aktiv" : "🔒 gesperrt (diese Woche nicht trainiert)"}</div>`;
    ul.appendChild(head);

    const nodes = st.nodes[tree.key];
    nodes.forEach(node => {
      const available = isNodeAvailable(nodes, node);
      const canBuy = gateOk && available && (sp.available >= node.cost);

      const li = document.createElement("li");
      const status = node.unlocked ? "✅ unlocked" : (available ? "🔓 verfügbar" : "🔒 locked");
      li.innerHTML = `
        <div class="entryRow">
          <div style="min-width:0;">
            <div><b>${node.name}</b></div>
            <div class="hint">Cost: ${node.cost} SP • ${status} • Effekt: +2% XP (Capstone extra)</div>
          </div>
          <div class="row" style="margin:0; align-items:flex-start;">
            <button class="secondary" style="width:auto; padding:10px 12px;" data-node="${node.id}" ${canBuy ? "" : "disabled"}>
              ${node.unlocked ? "Unlocked" : "Unlock"}
            </button>
          </div>
        </div>
      `;
      ul.appendChild(li);
    });
  }

  document.querySelectorAll("[data-node]").forEach(btn => {
    btn.onclick = async () => {
      const id = btn.getAttribute("data-node");
      const st2 = loadSkillState();
      const sp2 = computeSkillPointsAvailable(entries);
      const gates2 = getActiveTreeGates(entries, curWeek);

      let found = null, treeKey = null;
      for (const t of TREES){
        const nodes = st2.nodes[t.key];
        const n = nodes.find(x => x.id === id);
        if (n) { found = n; treeKey = t.key; break; }
      }
      if (!found) return;

      if (!gates2[treeKey]) return alert("Tree gesperrt – trainiere den Typ diese Woche.");
      if (found.unlocked) return;
      const nodes = st2.nodes[treeKey];
      if (!isNodeAvailable(nodes, found)) return alert("Noch locked – erfülle Tier-Voraussetzungen.");
      if (sp2.available < found.cost) return alert("Nicht genug Skillpunkte.");

      found.unlocked = true;
      st2.spent = (st2.spent || 0) + found.cost;
      saveSkillState(st2);

      await renderAll();
    };
  });
}

/* =========================
   PLAN OVERRIDES + DEFAULT PLAN (Wed+Sun Rest)
========================= */
function loadPlanOverrides(){ return loadJSON(KEY_PLANOVR, {}); }
function savePlanOverrides(s){ saveJSON(KEY_PLANOVR, s); }

const PLAN_DEFAULT = {
  "Mon": ["DB Floor Press (neutral)","Arnold Press","Deficit Push-Ups","Overhead Trizeps Extension","DB Lateral Raises"],
  "Tue": ["1-Arm DB Row (Pause oben)","Renegade Rows","Reverse Flys (langsam)","DB Supinated Curl","Farmer’s Carry (DB)"],
  "Wed": ["Ruhetag (Recovery + Mobility)"],
  "Thu": ["Bulgarian Split Squats","DB Romanian Deadlift","Goblet Squat","Dead Bug","Standing DB Calf Raises"],
  "Fri": ["Komplex: Deadlift","Komplex: Clean","Komplex: Front Squat","Komplex: Push Press","Plank Shoulder Taps"],
  "Sat": ["Burpees","Mountain Climbers","High Knees","Russian Twists (DB)","Hollow Body Hold"],
  "Sun": ["Ruhetag (Recovery + Mobility)"],
};
function getWeekPlan(week){
  const ovr = loadPlanOverrides();
  const w = String(week);
  const base = JSON.parse(JSON.stringify(PLAN_DEFAULT));
  if (!ovr[w]) return base;
  for (const k of Object.keys(ovr[w])) base[k] = ovr[w][k];
  return base;
}
function groupForPlanDayKey(dayKey){
  if (dayKey === "Mon") return "Tag 1 – Push";
  if (dayKey === "Tue") return "Tag 2 – Pull";
  if (dayKey === "Thu") return "Tag 3 – Beine & Core";
  if (dayKey === "Fri") return "Tag 4 – Ganzkörper";
  if (dayKey === "Sat") return "Tag 5 – Conditioning & Core";
  return "Ruhetag";
}
function exercisesForGroup(groupName){
  return EXERCISES.filter(e => e.group === groupName && e.type !== "Rest");
}

/* =========================
   Auto-Balance + Quick-Log (integrated)
========================= */
const PLAN_DAY_KEYS = [
  { id:"day1", label:"Plan-Day 1 (Push)", key:"Mon" },
  { id:"day2", label:"Plan-Day 2 (Pull)", key:"Tue" },
  { id:"day3", label:"Plan-Day 3 (Beine & Core)", key:"Thu" },
  { id:"day4", label:"Plan-Day 4 (Ganzkörper)", key:"Fri" },
  { id:"day5", label:"Plan-Day 5 (Conditioning)", key:"Sat" },
];
const BALANCE_PRESETS = [
  { id:"reset", label:"Reset (Standard Plan)" },
  { id:"back_less_push", label:"Mehr Rücken / weniger Push" },
  { id:"more_legs", label:"Mehr Beine" },
  { id:"more_core", label:"Mehr Core/Mobility" },
  { id:"more_engine", label:"Mehr Conditioning" },
];
function pickByNameFallback(candidates, includesList, fallbackName){
  for (const inc of includesList){
    const found = candidates.find(x => x.name?.toLowerCase().includes(inc.toLowerCase()));
    if (found) return found.name;
  }
  return fallbackName;
}
function applyAutoBalancePreset(week, presetId){
  const w = clampWeek(week);
  const overrides = loadPlanOverrides();
  const wKey = String(w);

  if (presetId === "reset"){
    if (overrides[wKey]) delete overrides[wKey];
    savePlanOverrides(overrides);
    return;
  }

  const plan = getWeekPlan(w);
  const newPlan = JSON.parse(JSON.stringify(plan));

  const pushPool = EXERCISES.filter(e => e.group === "Tag 1 – Push" && e.type !== "Rest");
  const pullPool = EXERCISES.filter(e => e.group === "Tag 2 – Pull" && e.type !== "Rest");
  const legsPool = EXERCISES.filter(e => e.group === "Tag 3 – Beine & Core" && e.type !== "Rest");
  const condPool = EXERCISES.filter(e => e.group === "Tag 5 – Conditioning & Core" && e.type !== "Rest");

  if (presetId === "back_less_push"){
    const back1 = pickByNameFallback(pullPool, ["reverse fly", "pullover", "row"], "Reverse Flys (langsam)");
    const back2 = pickByNameFallback(pullPool, ["pullover", "row"], "DB Pullover (Floor)");
    if (Array.isArray(newPlan.Mon) && newPlan.Mon.length >= 5){
      newPlan.Mon[3] = back2;
      newPlan.Mon[4] = back1;
    }
  }

  if (presetId === "more_legs"){
    const squat = pickByNameFallback(legsPool, ["goblet squat"], "Goblet Squat");
    const hinge = pickByNameFallback(legsPool, ["romanian deadlift", "rdl"], "DB Romanian Deadlift");
    const glute = pickByNameFallback(legsPool, ["hip thrust"], "Hip Thrust (Floor)");
    const uni = pickByNameFallback(legsPool, ["bulgarian"], "Bulgarian Split Squats");
    const calf = pickByNameFallback(legsPool, ["calf"], "Standing DB Calf Raises");
    newPlan.Thu = [uni, squat, hinge, glute, calf];
  }

  if (presetId === "more_core"){
    if (Array.isArray(newPlan.Thu) && newPlan.Thu.length >= 5) newPlan.Thu[3] = "Dead Bug";
    if (Array.isArray(newPlan.Sat) && newPlan.Sat.length >= 5) newPlan.Sat[4] = "Plank Shoulder Taps";
  }

  if (presetId === "more_engine"){
    const eng1 = pickByNameFallback(condPool, ["burpees"], "Burpees");
    const eng2 = pickByNameFallback(condPool, ["mountain"], "Mountain Climbers");
    const eng3 = pickByNameFallback(condPool, ["high knees"], "High Knees");
    const eng4 = pickByNameFallback(condPool, ["jumping jacks"], "Jumping Jacks");
    const core = "Hollow Body Hold";
    newPlan.Sat = [eng1, eng2, eng3, eng4, core];
  }

  overrides[wKey] ??= {};
  overrides[wKey].Mon = newPlan.Mon;
  overrides[wKey].Tue = newPlan.Tue;
  overrides[wKey].Thu = newPlan.Thu;
  overrides[wKey].Fri = newPlan.Fri;
  overrides[wKey].Sat = newPlan.Sat;
  savePlanOverrides(overrides);
}

function injectAutoBalanceUI(curWeek){
  const planContent = $("planContent");
  if (!planContent) return;
  if (planContent.querySelector("#autoBalancePanel")) return;

  const panel = document.createElement("div");
  panel.id = "autoBalancePanel";
  panel.className = "pill";
  panel.style.marginBottom = "12px";
  panel.innerHTML = `
    <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
      <b>Auto-Balance:</b>
      <select id="balancePreset" style="min-width:220px;">
        ${BALANCE_PRESETS.map(p => `<option value="${p.id}">${p.label}</option>`).join("")}
      </select>
      <button id="applyBalance" class="secondary" style="width:auto; padding:10px 12px;">Apply</button>
      <button id="resetBalance" class="secondary" style="width:auto; padding:10px 12px;">Reset</button>
      <span class="hint">Overrides nur für diese Woche.</span>
    </div>
  `;
  planContent.prepend(panel);

  panel.querySelector("#applyBalance").addEventListener("click", async ()=>{
    const preset = panel.querySelector("#balancePreset").value;
    applyAutoBalancePreset(curWeek, preset);
    await renderAll();
  });
  panel.querySelector("#resetBalance").addEventListener("click", async ()=>{
    applyAutoBalancePreset(curWeek, "reset");
    await renderAll();
  });
}

function injectQuickLogUI(){
  const tab = document.querySelector("#tab-log");
  if (!tab) return;

  const addBtn = $("add");
  if (!addBtn) return;
  const host = addBtn.closest(".card") || addBtn.parentElement;
  if (!host) return;
  if (document.getElementById("planQuickPanel")) return;

  const panel = document.createElement("div");
  panel.id = "planQuickPanel";
  panel.className = "pill";
  panel.style.marginBottom = "12px";
  panel.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:10px;">
      <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
        <b>Quick Log:</b>
        <select id="planDaySelect" style="min-width:240px;">
          ${PLAN_DAY_KEYS.map(d => `<option value="${d.key}">${d.label}</option>`).join("")}
        </select>
        <button id="planFill" class="secondary" style="width:auto; padding:10px 12px;">Auto-Fill</button>
        <button id="planAutoLog" class="secondary" style="width:auto; padding:10px 12px;">Auto-Log (alle Übungen)</button>
      </div>
      <div id="planPreview" class="hint"></div>
    </div>
  `;
  host.prepend(panel);

  panel.querySelector("#planFill").addEventListener("click", async ()=>{
    const dateISO = $("date")?.value || isoDate(new Date());
    const week = currentWeekFor(dateISO);
    const plan = getWeekPlan(week);
    const key = panel.querySelector("#planDaySelect").value;
    const list = (plan[key] || []).filter(Boolean);
    if (!list.length) return alert("Keine Übungen im Plan-Day gefunden.");

    const exSel = $("exercise");
    if (exSel) exSel.value = list[0];
    const prev = $("planPreview");
    if (prev) prev.textContent = `W${week} ${key}: ${list.join(" • ")}`;
    await renderAll();
  });

  panel.querySelector("#planAutoLog").addEventListener("click", async ()=>{
    const dateISO = $("date")?.value || isoDate(new Date());
    const week = currentWeekFor(dateISO);
    const plan = getWeekPlan(week);
    const key = panel.querySelector("#planDaySelect").value;
    const list = (plan[key] || []).filter(Boolean);
    if (!list.length) return alert("Keine Übungen im Plan-Day gefunden.");

    const ok = confirm(`Auto-Log für ${dateISO} (W${week})?\n\n${list.length} Übungen:\n- ${list.join("\n- ")}`);
    if (!ok) return;

    const allEntries = sortEntriesDesc(await idbGetAll(STORE_ENTRIES));
    const adaptive = getAdaptiveModifiers(allEntries, week);
    const mutation = getMutationForWeek(week);
    const rewardMult = rewardActiveForWeek(week) ? 1.05 : 1.0;

    let total = 0;
    const entriesToAdd = [];

    for (const exName of list){
      const type = typeForExercise(exName);
      let base = 0;
      if (type === "NEAT") base = neatXP(60);
      else if (type === "Rest") base = 0;
      else base = XP_PER_EXERCISE[type] ?? 0;

      const mutMult = mutationXpMultiplierForType(type, mutation);
      const skillMult = skillMultiplierForType(type);
      const xp = Math.round(base * mutMult * skillMult * rewardMult);
      total += xp;

      const setRec = recommendedSetsForExercise(exName, type, week, adaptive).text;
      const repRec = recommendedRepsForExercise(exName, type, week, adaptive);

      entriesToAdd.push({
        date: dateISO,
        week,
        exercise: exName,
        type,
        detail: `Auto-Log • Empf: ${setRec} / ${repRec} • Mut x${mutMult.toFixed(2)} • Skill x${skillMult.toFixed(2)} • Reward x${rewardMult.toFixed(2)}`,
        xp
      });
    }

    await idbAddMany(STORE_ENTRIES, entriesToAdd);
    await renderAll();
    alert(`Auto-Log ✅ ${list.length} Übungen • +${total} XP`);
  });
}

/* =========================
   WEEKLY PLAN RENDER
========================= */
function renderWeeklyPlan(curWeek, entries){
  const content = $("planContent");
  if (!content) return;

  const start = ensureStartDate();
  const w = clampWeek(curWeek || 1);
  const plan = getWeekPlan(w);
  const mutation = getMutationForWeek(w);
  const adaptive = getAdaptiveModifiers(entries, w);
  const boss = getBossForWeek(w);
  const thr = getStarThresholds();

  let html = "";
  html += `<div class="row2">
    <div class="pill"><b>Start:</b> ${start}</div>
    <div class="pill"><b>Woche:</b> W${w}</div>
    <div class="pill"><b>Block:</b> ${blockName(weekBlock(w))}</div>
  </div>`;
  html += `<div class="pill"><b>Mutation:</b> ${mutation.name} – ${mutation.effect}</div>`;
  html += `<div class="pill"><b>Adaptive:</b> ${adaptive.note}</div>`;
  html += `<div class="row2">
    <div class="pill"><b>Sterne:</b> ⭐ ${thr.one} • ⭐⭐ ${thr.two} • ⭐⭐⭐ ${thr.three}</div>
    <div class="pill"><b>Ruhetage:</b> Mittwoch & Sonntag</div>
  </div>`;
  if (boss) html += `<div class="pill"><b>Boss:</b> ${boss.name} (+${boss.xp} XP)</div>`;
  html += `<div class="divider"></div>`;

  const dayNames = [
    ["Mon","Montag (Tag 1 – Push)"],
    ["Tue","Dienstag (Tag 2 – Pull)"],
    ["Wed","Mittwoch (Ruhetag)"],
    ["Thu","Donnerstag (Tag 3 – Beine & Core)"],
    ["Fri","Freitag (Tag 4 – Ganzkörper)"],
    ["Sat","Samstag (Tag 5 – Conditioning)"],
    ["Sun","Sonntag (Ruhetag)"],
  ];

  dayNames.forEach(([key,label])=>{
    const exList = plan[key] || [];
    html += `<div class="planDay"><h3>${label}</h3><ul class="planList">`;

    if (key === "Wed" || key === "Sun"){
      html += `<li><b>Ruhetag</b><br><span class="small">10–20 Min Mobility + Spaziergang. Optional: Walking Desk 30–60 Min.</span></li>`;
      html += `</ul></div>`;
      return;
    }

    const group = groupForPlanDayKey(key);
    const options = exercisesForGroup(group);

    exList.forEach((exName, idx)=>{
      const type = typeForExercise(exName);
      const setRec = recommendedSetsForExercise(exName, type, w, adaptive).text;
      const repRec = recommendedRepsForExercise(exName, type, w, adaptive);

      // status indicator icons: 🟢 if logged today? ⚪ else
      const icon = "⚪";

      let sel = `<select class="swapSel" data-day="${key}" data-idx="${idx}">`;
      options.forEach(o=>{
        sel += `<option value="${o.name}" ${o.name===exName?"selected":""}>${o.name}</option>`;
      });
      sel += `</select>`;

      html += `<li>
        <div style="display:grid; gap:8px;">
          <div style="display:flex; gap:8px; align-items:center;"><span>${icon}</span><b>${exName}</b></div>
          <div class="small">${type} • ${setRec} • ${repRec}</div>
          <div class="small">Swap: ${sel}</div>
        </div>
      </li>`;
    });

    html += `</ul></div>`;
  });

  html += `<div class="planDay"><h3>NEAT (optional)</h3>
    <ul class="planList">
      <li><b>Walking Desk 3 km/h</b><br><span class="small">XP = Minuten × 2.5</span></li>
    </ul>
  </div>`;

  content.innerHTML = html;

  injectAutoBalanceUI(w);

  content.querySelectorAll("select.swapSel").forEach(sel=>{
    sel.addEventListener("change", async ()=>{
      const day = sel.getAttribute("data-day");
      const idx = parseInt(sel.getAttribute("data-idx"), 10);
      const val = sel.value;

      const ovr = loadPlanOverrides();
      const wKey = String(w);
      ovr[wKey] ??= {};
      ovr[wKey][day] = (ovr[wKey][day] || (PLAN_DEFAULT[day] || [])).slice();
      ovr[wKey][day][idx] = val;
      savePlanOverrides(ovr);

      await renderAll();
    });
  });
}

/* =========================
   CALENDAR (weekly view + day entries)
========================= */
function startOfWeekMonday(dateISO){
  const d = new Date(dateISO);
  const day = d.getDay();
  const diffToMon = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diffToMon);
  return isoDate(d);
}
function addDays(dateISO, n){
  const d = new Date(dateISO);
  d.setDate(d.getDate() + n);
  return isoDate(d);
}
function rangeLabel(mondayISO){
  const sunISO = addDays(mondayISO, 6);
  return `${mondayISO} – ${sunISO}`;
}
const DOW = ["Mo","Di","Mi","Do","Fr","Sa","So"];

function renderDayEntries(entries, dateISO2){
  const ul = $("dayEntries");
  const title = $("dayTitle");
  const dayXpEl = $("dayXp");
  const starsEl = $("dayStars");
  if (!ul) return;

  const dayEntries = entries.filter(e => e.date === dateISO2).sort((a,b)=>(b.id??0)-(a.id??0));
  const dayXp = dayEntries.reduce((s,e)=>s+(e.xp||0),0);
  const thr = getStarThresholds();

  if (title) title.textContent = `Tages-Einträge: ${dateISO2}`;
  if (dayXpEl) dayXpEl.textContent = dayXp;
  if (starsEl) starsEl.textContent = starsForDay(dayXp, thr);

  ul.innerHTML = "";
  if (!dayEntries.length) {
    ul.innerHTML = `<li>Noch keine Einträge an diesem Tag.</li>`;
    return;
  }

  dayEntries.forEach(e=>{
    const li = document.createElement("li");
    li.innerHTML = `
      <div class="entryRow">
        <div style="min-width:0;">
          <div class="entryTitle"><b>${e.exercise}</b></div>
          <div class="hint">${e.type} • ${e.detail || ""}</div>
          <div class="hint">ID: ${e.id} • W${e.week}</div>
        </div>
        <div class="row" style="margin:0; align-items:flex-start;">
          <span class="badge">${e.xp} XP</span>
          <button class="secondary" style="width:auto; padding:10px 12px;" data-edit="${e.id}">Edit</button>
          <button class="danger" style="width:auto; padding:10px 12px;" data-del="${e.id}">Delete</button>
        </div>
      </div>
    `;
    ul.appendChild(li);
  });

  ul.querySelectorAll("button[data-edit]").forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      const id = parseInt(btn.getAttribute("data-edit"),10);
      await startEditEntry(id);
    });
  });
  ul.querySelectorAll("button[data-del]").forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      const id = parseInt(btn.getAttribute("data-del"),10);
      await deleteEntryById(id);
    });
  });
}

function renderCalendar(entries){
  const grid = $("calGrid");
  if (!grid) return;

  const start = ensureStartDate();
  const today = isoDate(new Date());
  const curWeek = clampWeek(getWeekNumber(start, today));

  const st = loadCalendarState();
  const targetWeek = clampWeek(curWeek + (st.weekOffset || 0));

  const weekStart = addDays(start, (targetWeek - 1) * 7);
  const monday = startOfWeekMonday(weekStart);

  if ($("calWeekTitle")) $("calWeekTitle").textContent = `Woche ${targetWeek}`;
  if ($("calRange")) $("calRange").textContent = rangeLabel(monday);

  const dayXP = {};
  for (let i=0;i<7;i++){
    const day = addDays(monday, i);
    dayXP[day] = 0;
  }
  for (const e of entries){
    if (dayXP[e.date] != null) dayXP[e.date] += (e.xp || 0);
  }

  let selected = st.selectedDate || today;
  if (dayXP[selected] == null) selected = monday;

  grid.innerHTML = "";
  const thr = getStarThresholds();

  for (let i=0;i<7;i++){
    const dateISO2 = addDays(monday, i);
    const xp = dayXP[dateISO2] || 0;
    const stStars = starsForDay(xp, thr);

    const cell = document.createElement("div");
    cell.className = "calCell" + (dateISO2 === selected ? " active":"");
    cell.innerHTML = `
      <div class="calTop">
        <div class="calDow">${DOW[i]}</div>
        <div class="calDate">${dateISO2.slice(5)}</div>
      </div>
      <div class="calXP"><b>${xp}</b> XP</div>
      <div class="calStars">${stStars}</div>
    `;
    cell.addEventListener("click", async ()=>{
      const st2 = loadCalendarState();
      st2.selectedDate = dateISO2;
      saveCalendarState(st2);
      if ($("date")) $("date").value = dateISO2;
      await renderAll();
    });
    grid.appendChild(cell);
  }

  renderDayEntries(entries, selected);
}

/* =========================
   ENTRIES LIST (Log screen)
========================= */
function renderAllEntriesList(entries){
  const list = $("list");
  if (!list) return;

  list.innerHTML = "";
  if (!entries.length){
    list.innerHTML = `<li>Noch keine Einträge.</li>`;
    return;
  }

  entries.forEach(e=>{
    const li = document.createElement("li");
    li.innerHTML = `
      <div class="entryRow">
        <div style="min-width:0;">
          <div class="entryTitle"><b>${e.date}</b> (W${e.week}) • <b>${e.exercise}</b></div>
          <div class="hint">${e.type} • ${e.detail || ""}</div>
        </div>
        <div class="row" style="margin:0; align-items:flex-start;">
          <span class="badge">${e.xp} XP</span>
          <button class="secondary" style="width:auto; padding:10px 12px;" data-edit="${e.id}">Edit</button>
          <button class="danger" style="width:auto; padding:10px 12px;" data-del="${e.id}">Delete</button>
        </div>
      </div>
    `;
    list.appendChild(li);
  });

  list.querySelectorAll("button[data-edit]").forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      const id = parseInt(btn.getAttribute("data-edit"),10);
      await startEditEntry(id);
    });
  });
  list.querySelectorAll("button[data-del]").forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      const id = parseInt(btn.getAttribute("data-del"),10);
      await deleteEntryById(id);
    });
  });
}

/* =========================
   EDIT / DELETE ENTRY
========================= */
async function startEditEntry(id){
  const all = await idbGetAll(STORE_ENTRIES);
  const e = all.find(x => x.id === id);
  if (!e) return alert("Eintrag nicht gefunden.");

  if ($("editId")) $("editId").value = String(e.id);
  if ($("logFormTitle")) $("logFormTitle").textContent = "Eintrag bearbeiten";
  if ($("add")) $("add").textContent = "Änderungen speichern";
  $("cancelEdit")?.classList.remove("hide");

  if ($("date")) $("date").value = e.date;
  if ($("exercise")) $("exercise").value = e.exercise;

  const mSets = (e.detail||"").match(/Sets:\s*(\d+)/i);
  const mReps = (e.detail||"").match(/Reps:\s*(\d+)/i);
  const mMin  = (e.detail||"").match(/Min:\s*(\d+)/i);

  if ($("sets") && mSets) $("sets").value = mSets[1];
  if ($("reps") && mReps) $("reps").value = mReps[1];
  if ($("walkMin") && mMin) $("walkMin").value = mMin[1];

  showTab("log");
  await renderAll();
}
async function deleteEntryById(id){
  const ok = confirm("Diesen Eintrag wirklich löschen?");
  if (!ok) return;
  await idbDelete(STORE_ENTRIES, id);
  await renderAll();
}
function resetEditMode(){
  if ($("editId")) $("editId").value = "";
  if ($("logFormTitle")) $("logFormTitle").textContent = "Neuer Eintrag (rückwirkend möglich)";
  if ($("add")) $("add").textContent = "Eintrag speichern";
  $("cancelEdit")?.classList.add("hide");
}

/* =========================
   LOG DRAFT AUTOSAVE (per date)
========================= */
function loadLogDraft(){
  try { return JSON.parse(localStorage.getItem(LOG_DRAFT_KEY)) || {}; }
  catch { return {}; }
}
function saveLogDraft(draft){
  localStorage.setItem(LOG_DRAFT_KEY, JSON.stringify(draft));
}
function clearLogDraft(dateISO){
  const draft = loadLogDraft();
  if (draft[dateISO]) {
    delete draft[dateISO];
    saveLogDraft(draft);
  }
}
function autosaveLogDraft(){
  const dateISO = $("date")?.value;
  if (!dateISO) return;

  const draft = loadLogDraft();
  draft[dateISO] = {
    date: dateISO,
    exercise: $("exercise")?.value || "",
    sets: $("sets")?.value || "",
    reps: $("reps")?.value || "",
    walkMin: $("walkMin")?.value || "",
    planDay: document.getElementById("planDaySelect")?.value || ""
  };
  saveLogDraft(draft);
}
function restoreLogDraft(){
  const dateISO = $("date")?.value;
  if (!dateISO) return;

  const draft = loadLogDraft();
  const d = draft[dateISO];
  if (!d) return;

  if ($("exercise") && d.exercise) $("exercise").value = d.exercise;
  if ($("sets") && d.sets) $("sets").value = d.sets;
  if ($("reps") && d.reps) $("reps").value = d.reps;
  if ($("walkMin") && d.walkMin) $("walkMin").value = d.walkMin;

  const planSel = document.getElementById("planDaySelect");
  if (planSel && d.planDay) planSel.value = d.planDay;
}

/* =========================
   LOG UI (recommended) + preview
========================= */
function ensureRepsInput(){
  if ($("reps")) return;
  const setsRow = $("setsRow");
  if (!setsRow) return;

  const wrap = document.createElement("div");
  wrap.innerHTML = `
    <label>Wiederholungen pro Satz
      <input id="reps" type="number" min="0" step="1" inputmode="numeric" placeholder="z. B. 10">
    </label>
  `;
  setsRow.appendChild(wrap);
}

function updateCalcPreview(week, mutation){
  const exName = $("exercise")?.value;
  const type = typeForExercise(exName);

  let base = 0;
  if (type === "NEAT") {
    const minutes = Math.max(1, parseInt($("walkMin")?.value || "0", 10));
    base = neatXP(minutes);
  } else if (type === "Rest") {
    base = 0;
  } else {
    base = XP_PER_EXERCISE[type] ?? 0;
  }

  const mutMult = mutationXpMultiplierForType(type, mutation);
  const skillMult = skillMultiplierForType(type);
  const rewardMult = rewardActiveForWeek(week) ? 1.05 : 1.0;

  const xp = Math.round(base * mutMult * skillMult * rewardMult);

  if ($("calcXp")) $("calcXp").textContent = xp;
  if ($("calcInfo")) $("calcInfo").textContent = `Base ${base} • Mut x${mutMult.toFixed(2)} • Skill x${skillMult.toFixed(2)} • Reward x${rewardMult.toFixed(2)}`;
}

async function updateLogUI(entries){
  ensureRepsInput();

  if ($("logStart")) $("logStart").textContent = ensureStartDate();

  const dateISO2 = $("date")?.value || isoDate(new Date());
  const week = currentWeekFor(dateISO2);
  if ($("logWeek")) $("logWeek").textContent = `W${week}`;

  const mutation = getMutationForWeek(week);
  const adaptive = getAdaptiveModifiers(entries, week);

  const exName = $("exercise")?.value;
  const type = typeForExercise(exName);

  if ($("autoType")) $("autoType").textContent = type;

  const setRec = recommendedSetsForExercise(exName, type, week, adaptive);
  const repRec = recommendedRepsForExercise(exName, type, week, adaptive);

  if ($("recommendedSets")) $("recommendedSets").textContent = setRec.text;
  if ($("recommendedReps")) $("recommendedReps").textContent = repRec;

  const isWalk = isWalkType(type);
  const isRest = isRestType(type);

  $("walkingRow")?.classList.toggle("hide", !isWalk);
  $("setsRow")?.classList.toggle("hide", isWalk || isRest);

  // don't override user typing
  if (!isWalk && !isRest && $("sets") && setRec.value) {
    const el = $("sets");
    const raw = (el.value ?? "").trim();
    if (document.activeElement !== el && (raw === "" || parseInt(raw,10) <= 0)) el.value = String(setRec.value);
  }
  if (!isWalk && !isRest && $("reps")) {
    const el = $("reps");
    const raw = (el.value ?? "").trim();
    if (document.activeElement !== el && raw === "") {
      const n = (repRec.match(/\d+/) || [])[0];
      if (n) el.value = n;
    }
  }

  if ($("logAdaptive")) {
    const mutMult = mutationXpMultiplierForType(type, mutation);
    const skillMult = skillMultiplierForType(type);
    const rewardMult = rewardActiveForWeek(week) ? 1.05 : 1.0;
    $("logAdaptive").textContent =
      `W${week} • Mut x${mutMult.toFixed(2)} • Skill x${skillMult.toFixed(2)} • Reward x${rewardMult.toFixed(2)} • Adaptive nur Empfehlungen`;
  }

  updateCalcPreview(week, mutation);
}

/* =========================
   SAVE / UPDATE ENTRY
   XP per exercise (sets/reps only logged)
========================= */
async function saveOrUpdateEntry(){
  const dateISO2 = $("date")?.value || isoDate(new Date());
  const week = currentWeekFor(dateISO2);

  const exName = $("exercise")?.value || "Unbekannt";
  const type = typeForExercise(exName);

  const entries = sortEntriesDesc(await idbGetAll(STORE_ENTRIES));
  const adaptive = getAdaptiveModifiers(entries, week);
  const mutation = getMutationForWeek(week);

  const setRec = recommendedSetsForExercise(exName, type, week, adaptive).text;
  const repRec = recommendedRepsForExercise(exName, type, week, adaptive);

  const sets = parseInt(($("sets")?.value || "").trim(), 10);
  const reps = parseInt(($("reps")?.value || "").trim(), 10);

  let base = 0;
  if (type === "NEAT") {
    const minutes = Math.max(1, parseInt($("walkMin")?.value || "0", 10));
    base = neatXP(minutes);
  } else if (type === "Rest") {
    base = 0;
  } else {
    base = XP_PER_EXERCISE[type] ?? 0;
  }

  const mutMult = mutationXpMultiplierForType(type, mutation);
  const skillMult = skillMultiplierForType(type);
  const rewardMult = rewardActiveForWeek(week) ? 1.05 : 1.0;

  const xp = Math.round(base * mutMult * skillMult * rewardMult);

  let detail = `Empf: ${setRec} / ${repRec}`;
  if (type === "NEAT") {
    const minutes = Math.max(1, parseInt($("walkMin")?.value || "0", 10));
    detail = `Min: ${minutes} • ${detail}`;
  } else if (type !== "Rest") {
    if (!Number.isNaN(sets)) detail = `Sets: ${sets} • ` + detail;
    if (!Number.isNaN(reps)) detail = `Reps: ${reps} • ` + detail;
  } else {
    detail = `Recovery • Mobility 10–20 Min`;
  }
  detail += ` • Mut x${mutMult.toFixed(2)} • Skill x${skillMult.toFixed(2)} • Reward x${rewardMult.toFixed(2)}`;

  const editId = parseInt(($("editId")?.value ?? "").trim(), 10);

  if (editId) {
    await idbPut(STORE_ENTRIES,{ id: editId, date: dateISO2, week, exercise: exName, type, detail, xp });
    resetEditMode();
    alert(`Gespeichert (Edit): ${dateISO2} • +${xp} XP ✅`);
  } else {
    await idbAdd(STORE_ENTRIES,{ date: dateISO2, week, exercise: exName, type, detail, xp });
    alert(`Gespeichert: ${dateISO2} • +${xp} XP ✅`);
  }

  clearLogDraft(dateISO2);
  await renderAll();
}

/* =========================
   CSV EXPORT
========================= */
function csvSafe(v){
  const s = String(v ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replaceAll('"','""')}"`;
  return s;
}
function toCSV(entries){
  const header = ["id","date","week","exercise","type","detail","xp"];
  const rows = [header.join(",")];
  entries.forEach(e => rows.push([e.id, e.date, e.week, csvSafe(e.exercise), e.type, csvSafe(e.detail), e.xp].join(",")));
  return rows.join("\n");
}
function downloadCSV(filename, content){
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/* =========================
   RECOMPOSITION (metrics) + chart
========================= */
function recompositionIndex(weight, kfa, sys, dia){
  if (!weight || !kfa) return 0;
  const lean = weight * (1 - kfa/100);
  const bpPenalty = (sys && dia) ? Math.max(0, (sys - 120) + (dia - 80)) * 0.05 : 0;
  return Math.round((lean - bpPenalty) * 10) / 10;
}
async function saveMetricsForSelectedDate(){
  const day = getSelectedDayISO();
  const weight = parseFloat(($("mWeight")?.value || "").replace(",", "."));
  const kfa = parseFloat(($("mKfa")?.value || "").replace(",", "."));
  const sys = parseInt(($("mSys")?.value || "").trim(), 10);
  const dia = parseInt(($("mDia")?.value || "").trim(), 10);

  const metric = {
    date: day,
    weight: Number.isFinite(weight) ? weight : null,
    kfa: Number.isFinite(kfa) ? kfa : null,
    sys: Number.isFinite(sys) ? sys : null,
    dia: Number.isFinite(dia) ? dia : null,
    index: recompositionIndex(weight, kfa, sys, dia)
  };
  await idbPut(STORE_METRICS, metric);
  await renderAll();
  alert(`Metrics gespeichert für ${day} ✅`);
}

function drawRecompChart(metrics){
  const canvas = $("recompChart");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // responsive: set canvas size to CSS size
  const w = canvas.clientWidth || 320;
  const h = canvas.clientHeight || 180;
  canvas.width = w;
  canvas.height = h;

  ctx.clearRect(0,0,w,h);
  ctx.globalAlpha = 1;

  const data = metrics
    .filter(m => typeof m.index === "number" && !Number.isNaN(m.index))
    .sort((a,b)=>a.date.localeCompare(b.date));

  ctx.font = "12px system-ui, -apple-system, Arial";
  ctx.fillText("Recomposition Index (Lean - BP Penalty)", 10, 16);

  if (data.length < 2){
    ctx.globalAlpha = 0.8;
    ctx.fillText("Noch nicht genug Daten für eine Linie.", 10, 40);
    return;
  }

  const xs = data.map((_,i)=>i);
  const ys = data.map(d=>d.index);

  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const pad = 26;

  const scaleX = (i) => pad + (i/(data.length-1))*(w - pad*2);
  const scaleY = (y) => (h - pad) - ((y - minY) / (maxY - minY || 1))*(h - pad*2);

  // axis
  ctx.globalAlpha = 0.25;
  ctx.beginPath();
  ctx.moveTo(pad, pad);
  ctx.lineTo(pad, h-pad);
  ctx.lineTo(w-pad, h-pad);
  ctx.stroke();

  // labels
  ctx.globalAlpha = 0.6;
  ctx.fillText(String(maxY.toFixed(1)), 6, pad+4);
  ctx.fillText(String(minY.toFixed(1)), 6, h-pad);

  // line
  ctx.globalAlpha = 1;
  ctx.beginPath();
  ys.forEach((y,i)=>{
    const x = scaleX(xs[i]);
    const yy = scaleY(y);
    if (i===0) ctx.moveTo(x,yy);
    else ctx.lineTo(x,yy);
  });
  ctx.stroke();

  // dots
  ys.forEach((y,i)=>{
    const x = scaleX(xs[i]);
    const yy = scaleY(y);
    ctx.beginPath();
    ctx.arc(x,yy,3,0,Math.PI*2);
    ctx.fill();
  });
}

async function renderRecomp(entries){
  // show latest metric + list
  const metrics = await idbGetAll(STORE_METRICS);
  metrics.sort((a,b)=>a.date.localeCompare(b.date));

  const latest = metrics[metrics.length-1] || null;

  if ($("recompLatest")){
    $("recompLatest").textContent = latest
      ? `${latest.date} • Index ${latest.index ?? "—"} • Gewicht ${latest.weight ?? "—"} • KFA ${latest.kfa ?? "—"} • BP ${latest.sys ?? "—"}/${latest.dia ?? "—"}`
      : "Noch keine Daten.";
  }

  const ul = $("metricsList");
  if (ul){
    ul.innerHTML = "";
    if (!metrics.length) ul.innerHTML = "<li>Noch keine Metrics-Einträge.</li>";
    metrics.slice().reverse().slice(0, 14).forEach(m=>{
      const li = document.createElement("li");
      li.innerHTML = `<div class="entryRow">
        <div style="min-width:0;">
          <div><b>${m.date}</b> • Index: <b>${m.index ?? "—"}</b></div>
          <div class="hint">Gewicht: ${m.weight ?? "—"} kg • KFA: ${m.kfa ?? "—"}% • BP: ${m.sys ?? "—"}/${m.dia ?? "—"}</div>
        </div>
      </div>`;
      ul.appendChild(li);
    });
  }

  // also show streak info in recomp tab if exists
  const s = computeStreak(entries);
  if ($("streakNow")) $("streakNow").textContent = s.current;
  if ($("streakBest")) $("streakBest").textContent = s.best;

  drawRecompChart(metrics);
}

/* =========================
   DASHBOARD STATS
========================= */
async function computeStats(entries){
  const startDate = ensureStartDate();
  const today = isoDate(new Date());
  const curWeek = clampWeek(getWeekNumber(startDate, today));

  let todayXp = 0, weekXp = 0, totalXp = 0;
  for (const e of entries){
    totalXp += e.xp || 0;
    if (e.date === today) todayXp += e.xp || 0;
    if (e.week === curWeek) weekXp += e.xp || 0;
  }
  return { todayXp, weekXp, totalXp, curWeek, startDate };
}

/* =========================
   MAIN RENDER
========================= */
async function renderAll(){
  ensureStartDate();
  buildExerciseDropdown();

  // restore draft after dropdown exists
  restoreLogDraft();

  const raw = await idbGetAll(STORE_ENTRIES);
  const entries = sortEntriesDesc(raw);

  const stats = await computeStats(entries);

  // achievements/reward (may add entries)
  const evalRes = await evaluateWeeklyAchievements(entries, stats.curWeek);
  const entries2 = evalRes.newlyEarned?.length ? sortEntriesDesc(await idbGetAll(STORE_ENTRIES)) : entries;
  const stats2 = await computeStats(entries2);

  // Dashboard fields (safe if missing)
  if ($("startDisplay")) $("startDisplay").textContent = stats2.startDate;
  if ($("weekNumber")) $("weekNumber").textContent = `W${stats2.curWeek}`;
  if ($("blockNow")) $("blockNow").textContent = blockName(weekBlock(stats2.curWeek));
  if ($("blockHint")) $("blockHint").textContent = weeklyProgressHint(stats2.curWeek);

  const thr = getStarThresholds();
  if ($("todayXp")) $("todayXp").textContent = stats2.todayXp;
  if ($("todayStars")) $("todayStars").textContent = starsForDay(stats2.todayXp, thr);
  if ($("weekXp")) $("weekXp").textContent = stats2.weekXp;
  if ($("totalXp")) $("totalXp").textContent = stats2.totalXp;

  const lv = levelFromTotalXp(stats2.totalXp);
  if ($("level")) $("level").textContent = lv.lvl;
  if ($("title")) $("title").textContent = titleForLevel(lv.lvl);

  // streak
  const streak = computeStreak(entries2);
  if ($("dashStreakNow")) $("dashStreakNow").textContent = streak.current;
  if ($("dashStreakBest")) $("dashStreakBest").textContent = streak.best;

  // Weekly summary
  if ($("wkTrainDays")) $("wkTrainDays").textContent = evalRes.trainDays ?? 0;
  if ($("wkThreeStarDays")) $("wkThreeStarDays").textContent = evalRes.threeStarDays ?? 0;
  const earnedNames = (evalRes.earned || []).map(id => ACHIEVEMENTS.find(a=>a.id===id)?.name).filter(Boolean);
  if ($("wkAchievements")) $("wkAchievements").textContent = earnedNames.length ? earnedNames.join(", ") : "—";
  const adaptive = getAdaptiveModifiers(entries2, stats2.curWeek);
  if ($("adaptiveHint")) $("adaptiveHint").textContent = adaptive.note;

  // Recent list
  const recentList = $("recentList");
  if (recentList){
    const recent = entries2.slice(0, 6);
    recentList.innerHTML = recent.length ? "" : "<li>Noch keine Einträge.</li>";
    recent.forEach(e => {
      const li2 = document.createElement("li");
      li2.textContent = `${e.date} (W${e.week}) • ${e.exercise} • ${e.xp} XP`;
      recentList.appendChild(li2);
    });
  }

  // Calendar + plan + quests + boss + skills + log
  renderCalendar(entries2);
  renderWeeklyPlan(stats2.curWeek, entries2);
  renderQuests();
  renderBoss(stats2.curWeek);

  ensureDashboardSkillPill();
  const sp = computeSkillPointsAvailable(entries2);
  if ($("skillPointsAvail")) $("skillPointsAvail").textContent = sp.available;
  renderSkillTrees(entries2, stats2.curWeek);

  await updateLogUI(entries2);
  renderAllEntriesList(entries2);

  // recomp tab
  await renderRecomp(entries2);

  // Count
  if ($("countEntries")) $("countEntries").textContent = entries2.length;

  // Status
  if ($("appStatus")) {
    const rew = rewardActiveForWeek(stats2.curWeek) ? "Reward +5% aktiv" : "Reward —";
    $("appStatus").textContent = `OK • ⭐ ${thr.one} • ⭐⭐ ${thr.two} • ⭐⭐⭐ ${thr.three} • ${rew}`;
  }
}

/* =========================
   INIT + EVENTS
========================= */
async function init(){
  try {
    initServiceWorkerUpdates();
    initTabRouter();

    if ($("date")) $("date").value = isoDate(new Date());
    ensureStartDate();
    buildExerciseDropdown();
    resetEditMode();

    // Calendar nav
    $("calPrev")?.addEventListener("click", async ()=>{
      const st = loadCalendarState();
      st.weekOffset = (st.weekOffset || 0) - 1;
      saveCalendarState(st);
      await renderAll();
    });
    $("calNext")?.addEventListener("click", async ()=>{
      const st = loadCalendarState();
      st.weekOffset = (st.weekOffset || 0) + 1;
      saveCalendarState(st);
      await renderAll();
    });

    // Save start date retroactively
    $("saveStartDash")?.addEventListener("click", async () => {
      const newStart = $("startDateDash")?.value;
      if (!newStart) return alert("Bitte ein Startdatum wählen.");

      const oldStart = ensureStartDate();
      if (newStart === oldStart) return alert("Startdatum unverändert.");

      const ok = confirm(
        "Startdatum rückwirkend ändern?\n\n" +
        "✅ Alle Trainingseinträge werden neu in Wochen einsortiert.\n" +
        "⚠️ Boss/Achievements/Mutations werden zurückgesetzt.\n"
      );
      if (!ok) { $("startDateDash").value = oldStart; return; }

      setStartDateLocal(newStart);
      resetWeekBoundSystems();
      await recalcAllEntryWeeks();
      saveCalendarState({ weekOffset: 0, selectedDate: isoDate(new Date()) });

      await renderAll();
      alert("Startdatum gespeichert & Einträge neu berechnet ✅");
    });

    // Date change updates selected day
    $("date")?.addEventListener("change", async () => {
      const st = loadCalendarState();
      st.selectedDate = $("date").value;
      saveCalendarState(st);
      await renderAll();
    });

    $("exercise")?.addEventListener("change", async () => { await renderAll(); });

    // Inputs -> autosave draft
    ["exercise","sets","reps","walkMin","date"].forEach(id => {
      const el = $(id);
      if (!el) return;
      el.addEventListener("input", autosaveLogDraft);
      el.addEventListener("change", autosaveLogDraft);
    });

    // Preview update
    ["sets","reps","walkMin"].forEach(id=>{
      const el = $(id);
      if (!el) return;
      el.addEventListener("input", async ()=>{
        const d = $("date")?.value || isoDate(new Date());
        const w = currentWeekFor(d);
        const mut = getMutationForWeek(w);
        updateCalcPreview(w, mut);
      });
    });

    // Save entry
    $("add")?.addEventListener("click", saveOrUpdateEntry);

    // Cancel edit
    $("cancelEdit")?.addEventListener("click", async ()=>{
      resetEditMode();
      await renderAll();
    });

    // Clear all entries
    $("clear")?.addEventListener("click", async () => {
      if (confirm("Wirklich ALLE Einträge löschen?")) {
        await idbClear(STORE_ENTRIES);
        await renderAll();
      }
    });

    // Reset boss state
    $("resetBoss")?.addEventListener("click", async () => {
      if (confirm("Boss-Fight Status & Checks zurücksetzen?")) {
        localStorage.removeItem(KEY_BOSS);
        localStorage.removeItem(KEY_BOSSCHK);
        await renderAll();
      }
    });

    // Export CSV
    $("exportCsv")?.addEventListener("click", async () => {
      const entries = sortEntriesDesc(await idbGetAll(STORE_ENTRIES));
      if (!entries.length) return alert("Keine Einträge zum Exportieren.");
      downloadCSV("ironquest_export.csv", toCSV(entries));
    });

    // Reset skilltree
    $("resetSkills")?.addEventListener("click", async ()=>{
      if (confirm("Skilltree zurücksetzen?")) {
        const st = loadSkillState();
        st.spent = 0;
        st.nodes = Object.fromEntries(TREES.map(t => [t.key, defaultNodesForTree(t.key)]));
        saveSkillState(st);
        await renderAll();
      }
    });

    // Save metrics (recomp)
    $("saveMetrics")?.addEventListener("click", saveMetricsForSelectedDate);

    // ensure weeks OK
    await recalcAllEntryWeeks();

    // inject Quick Log UI once
    injectQuickLogUI();

    await renderAll();
  } catch (e) {
    console.error(e);
    if ($("appStatus")) $("appStatus").textContent = "ERROR (siehe Konsole)";
    alert("Fehler in app.js. Bitte Screenshot der Konsole schicken.");
  }
}

init();
