/* =========================
   IRON QUEST – app.js (FULL)
   - IndexedDB entries
   - Startdate retroactive (re-week all entries)
   - Retroactive logging
   - Exercises + Types + grouped dropdown
   - Weekly Plan screen (Tag 1–5)
   - Daily Quests (+XP, 1x/day)
   - Bossfights (weeks 2/4/6/8/10/12), locked outside correct week
   - Boss checklist + clear only if checked (per day)
   - Weekly RNG Mutations (fixed per week)
   - Adaptive progression hint (+/- sets/reps suggestions)
   - Attributes STR/STA/END/MOB leveling
   - CSV export
   - NEW: Weekly calendar view (tap day => entries)
   - NEW: Edit/Delete per entry (not just wipe all)
   - FIX: Sets field editable (no overwrite while typing), no renderAll spam
   - NEW: Star thresholds higher
   - NEW: Leveling curve: fast early, harder later
   ========================= */

console.log("IRON QUEST loaded ✅");

/* =========================
   BASIC DOM
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
   DB (IndexedDB)
========================= */
const DB_NAME = "ironquest_db";
const DB_VERSION = 2; // bump for indices if needed
const STORE = "entries";

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
        store.createIndex("date", "date", { unique: false });
        store.createIndex("week", "week", { unique: false });
      } else {
        // ensure indices exist
        const store = req.transaction.objectStore(STORE);
        if (!store.indexNames.contains("date")) store.createIndex("date", "date", { unique: false });
        if (!store.indexNames.contains("week")) store.createIndex("week", "week", { unique: false });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGetAll() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}
async function idbAdd(entry) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).add(entry);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}
async function idbPut(entry) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(entry);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}
async function idbDelete(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}
async function idbClear() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}
async function idbAddMany(entries) {
  for (const e of entries) await idbAdd(e);
}

/* =========================
   KEYS
========================= */
const KEY_START   = "ironquest_startdate_v11";
const KEY_MUT     = "ironquest_mutations_v4";
const KEY_QUESTS  = "ironquest_dailyquests_v11";
const KEY_BOSS    = "ironquest_boss_v11";
const KEY_BOSSCHK = "ironquest_boss_checks_v11";
const KEY_ACH     = "ironquest_weeklyach_v11";
const KEY_CAL     = "ironquest_calendar_v1"; // { weekOffset:number, selectedDate:"YYYY-MM-DD" }

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
function currentWeekToday() {
  return currentWeekFor(isoDate(new Date()));
}

async function recalcAllEntryWeeks() {
  const start = ensureStartDate();
  const all = await idbGetAll();
  for (const e of all) {
    const nw = clampWeek(getWeekNumber(start, e.date));
    if (e.week !== nw) {
      e.week = nw;
      await idbPut(e);
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
   DIFFICULTY / STARS
   (Raised thresholds so ⭐⭐⭐ requires "full day")
========================= */
const STAR_THRESHOLDS = {
  one: 900,    // ⭐
  two: 1400,   // ⭐⭐
  three: 1900  // ⭐⭐⭐ (hard)
};
function starsForDay(xp) {
  if (xp >= STAR_THRESHOLDS.three) return "⭐⭐⭐";
  if (xp >= STAR_THRESHOLDS.two) return "⭐⭐";
  if (xp >= STAR_THRESHOLDS.one) return "⭐";
  return "—";
}

/* =========================
   LEVEL SYSTEM (fast early, harder later)
   - Each level costs more
   - Cumulative XP needed grows superlinearly
========================= */
function xpNeededForNextLevel(level) {
  // smooth curve: early levels quick, later heavy
  // lvl 1->2 ~ 250, 2->3 ~ 320, 5->6 ~ 520, 10->11 ~ 980, 20->21 ~ 2150
  const l = Math.max(1, level);
  return Math.round(180 + 70 * l + 18 * (l ** 1.6));
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
  const needNow = xpNeededForNextLevel(lvl);
  return { lvl, into: xp, need: needNow };
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
   BLOCKS
========================= */
function weekBlock(w) {
  const ww = clampWeek(w);
  return ww <= 4 ? 1 : (ww <= 8 ? 2 : 3);
}
function blockName(block) {
  if (block === 1) return "Block 1 (Technik/ROM)";
  if (block === 2) return "Block 2 (Volumen/Progress)";
  return "Block 3 (Dichte/Intensität)";
}
function weeklyProgressHint(week) {
  const b = weekBlock(week);
  if (b === 1) return "Technik/ROM, Progress über Wiederholungen.";
  if (b === 2) return "Mehr Volumen (Sätze), Progress über Gewicht oder Reps.";
  return "Dichte/Intensität (Pausen etwas kürzer, Tempo kontrolliert).";
}

/* =========================
   MUTATIONS
========================= */
const MUTATIONS = [
  { id:"tempo", name:"Tempo Week", desc:"Langsame Exzentrik, saubere ROM.", effect:"STR/STA XP +10%", mult:{ STR:1.10, STA:1.10 } },
  { id:"corefocus", name:"Core Focus", desc:"Core & Kontrolle im Zentrum.", effect:"MOB XP +25%", mult:{ MOB:1.25 } },
  { id:"engine", name:"Engine Mode", desc:"Konditionierung bekommt den Boost.", effect:"END XP +15%", mult:{ END:1.15 } },
  { id:"neatboost", name:"NEAT Boost", desc:"Alltag zählt mehr.", effect:"NEAT XP +20%", mult:{ NEAT:1.20 } },
  { id:"unilateral", name:"Unilateral Blessing", desc:"Stabilität und Balance.", effect:"STA XP +15%", mult:{ STA:1.15 } },
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
    if (!ms.length) return 1;
    return ms.reduce((a,b)=>a+b,0)/ms.length;
  }
  return 1;
}

/* =========================
   ADAPTIVE PROGRESSION
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

  const dayXP = computeWeekDayXP(entries, prev);
  const days = Object.keys(dayXP);
  const trainDays = days.filter(d => dayXP[d] >= STAR_THRESHOLDS.one).length;     // uses raised ⭐ threshold
  const twoStarDays = days.filter(d => dayXP[d] >= STAR_THRESHOLDS.two).length;
  const threeStarDays = days.filter(d => dayXP[d] >= STAR_THRESHOLDS.three).length;

  if (trainDays >= 5 && threeStarDays >= 2) return { setDelta:+1, repDelta:+2, note:`Elite Woche (W${prev}) → +1 Satz & +2 Reps.` };
  if (trainDays >= 4 && (twoStarDays >= 2 || threeStarDays >= 1)) return { setDelta:+1, repDelta:+1, note:`Starke Woche (W${prev}) → +1 Satz & +1 Rep.` };
  if (trainDays <= 2) return { setDelta:-1, repDelta:-1, note:`Schwache Woche (W${prev}) → Deload -1 Satz & -1 Rep.` };
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
   EXERCISES + TYPES
========================= */
const EXERCISES = [
  { name: "DB Floor Press (neutral)", type: "Mehrgelenkig", group: "Tag 1 – Push" },
  { name: "Arnold Press", type: "Mehrgelenkig", group: "Tag 1 – Push" },
  { name: "Deficit Push-Ups", type: "Mehrgelenkig", group: "Tag 1 – Push" },
  { name: "Overhead Trizeps Extension", type: "Mehrgelenkig", group: "Tag 1 – Push" },
  { name: "DB Lateral Raises", type: "Mehrgelenkig", group: "Tag 1 – Push" },

  { name: "1-Arm DB Row (Pause oben)", type: "Unilateral", group: "Tag 2 – Pull" },
  { name: "Renegade Rows", type: "Unilateral", group: "Tag 2 – Pull" },
  { name: "Reverse Flys (langsam)", type: "Mehrgelenkig", group: "Tag 2 – Pull" },
  { name: "Cross-Body Hammer Curl", type: "Mehrgelenkig", group: "Tag 2 – Pull" },
  { name: "Farmer’s Carry (DB)", type: "Unilateral", group: "Tag 2 – Pull" },

  { name: "Bulgarian Split Squats", type: "Unilateral", group: "Tag 3 – Beine & Core" },
  { name: "DB Romanian Deadlift", type: "Mehrgelenkig", group: "Tag 3 – Beine & Core" },
  { name: "Cossack Squats", type: "Unilateral", group: "Tag 3 – Beine & Core" },
  { name: "Side Plank + Leg Raise", type: "Core", group: "Tag 3 – Beine & Core" },
  { name: "Hamstring Walkouts", type: "Core", group: "Tag 3 – Beine & Core" },
  { name: "Standing DB Calf Raises", type: "Core", group: "Tag 3 – Beine & Core" },

  { name: "Komplex: Deadlift", type: "Komplexe", group: "Tag 4 – Ganzkörper" },
  { name: "Komplex: Clean", type: "Komplexe", group: "Tag 4 – Ganzkörper" },
  { name: "Komplex: Front Squat", type: "Komplexe", group: "Tag 4 – Ganzkörper" },
  { name: "Komplex: Push Press", type: "Komplexe", group: "Tag 4 – Ganzkörper" },
  { name: "Goblet Squat Hold", type: "Core", group: "Tag 4 – Ganzkörper" },
  { name: "Plank Shoulder Taps", type: "Core", group: "Tag 4 – Ganzkörper" },

  { name: "Burpees", type: "Conditioning", group: "Tag 5 – Conditioning & Core" },
  { name: "Mountain Climbers", type: "Conditioning", group: "Tag 5 – Conditioning & Core" },
  { name: "Russian Twists (DB)", type: "Core", group: "Tag 5 – Conditioning & Core" },
  { name: "Hollow Body Hold", type: "Core", group: "Tag 5 – Conditioning & Core" },
  { name: "Tibialis Raises", type: "Core", group: "Tag 5 – Conditioning & Core" },

  { name: "Walking Desk (Laufband 3 km/h)", type: "NEAT", group: "NEAT / Alltag" },
];

function typeForExercise(exName) {
  return EXERCISES.find(e => e.name === exName)?.type ?? "Mehrgelenkig";
}

function buildExerciseDropdown() {
  const sel = $("exercise");
  if (!sel) return;
  const prev = sel.value;
  sel.innerHTML = "";

  const groups = {};
  EXERCISES.forEach(ex => {
    groups[ex.group] ??= [];
    groups[ex.group].push(ex);
  });

  Object.keys(groups).forEach(groupName => {
    const og = document.createElement("optgroup");
    og.label = groupName;
    groups[groupName].forEach(ex => {
      const opt = document.createElement("option");
      opt.value = ex.name;
      opt.textContent = ex.name;
      og.appendChild(opt);
    });
    sel.appendChild(og);
  });

  if (prev && [...sel.options].some(o => o.value === prev)) sel.value = prev;
  else sel.selectedIndex = 0;
}

/* =========================
   RECOMMENDATIONS
========================= */
function overridesForExercise(exName) {
  if (!exName) return null;
  if (exName.includes("Farmer")) return { setsText:"2–3 Runden", setsValue:3, repsText:"30–60s pro Runde (aufrecht, Core fest)" };
  if (exName.includes("Lateral")) return { setsText:"3 Sätze", setsValue:3, repsText:"12–20 Wdh (2–3s runter, kein Schwung)" };
  if (exName.includes("Hamstring Walkouts")) return { setsText:"3 Sätze", setsValue:3, repsText:"8–12 Wdh (kontrolliert, lange Schritte)" };
  if (exName.includes("Calf")) return { setsText:"3–4 Sätze", setsValue:4, repsText:"15–25 Wdh (oben 1s halten, volle ROM)" };
  if (exName.includes("Tibialis")) return { setsText:"2–3 Sätze", setsValue:2, repsText:"15–30 Wdh (kurze Pausen ok)" };
  return null;
}

function baseRecommendedSets(type, week) {
  const b = weekBlock(week);
  if (type === "NEAT") return { text:"Minuten statt Sätze", value:null };
  if (type === "Conditioning") return b === 1 ? { text:"4–5 Runden", value:4 } : (b === 2 ? { text:"5–6 Runden", value:5 } : { text:"5–6 Runden (kürzere Pausen)", value:5 });
  if (type === "Core") return b === 1 ? { text:"3 Sätze", value:3 } : { text:"4 Sätze", value:4 };
  if (type === "Komplexe") return b === 1 ? { text:"4–5 Runden", value:4 } : (b === 2 ? { text:"5–6 Runden", value:5 } : { text:"6 Runden", value:6 });
  return b === 1 ? { text:"3–4 Sätze", value:4 } : (b === 2 ? { text:"4–5 Sätze", value:5 } : { text:"4–5 Sätze (Tempo/Pausen härter)", value:5 });
}

function baseRecommendedReps(type, week) {
  const b = weekBlock(week);
  if (type === "NEAT") return "Minuten (z. B. 30–60)";
  if (type === "Core") return b === 1 ? "30–45s pro Satz" : "40–60s pro Satz";
  if (type === "Conditioning") return b === 1 ? "30–40s Arbeit / 60s Pause" : (b === 2 ? "35–45s / 45–60s Pause" : "40–45s / 30–45s Pause");
  if (type === "Komplexe") return b === 1 ? "6–8 Wdh pro Movement" : "6 Wdh pro Movement";
  return b === 1 ? "10–12 Wdh/Satz" : (b === 2 ? "8–10 Wdh/Satz" : "6–8 Wdh/Satz");
}

function recommendedSetsForExercise(exName, type, week, adaptive) {
  const ov = overridesForExercise(exName);
  const base = ov ? { text: ov.setsText, value: ov.setsValue } : baseRecommendedSets(type, week);
  if (type === "NEAT") return base;

  const d = adaptive?.setDelta ?? 0;
  if (!d) return base;
  return {
    text: applySetDeltaText(base.text, d) + " (adaptive)",
    value: base.value == null ? null : Math.max(1, base.value + d)
  };
}
function recommendedRepsForExercise(exName, type, week, adaptive) {
  const ov = overridesForExercise(exName);
  if (ov) return ov.repsText;
  const base = baseRecommendedReps(type, week);
  const d = adaptive?.repDelta ?? 0;
  if (!d || type === "NEAT") return base;
  const nums = base.match(/\d+/g)?.map(n => parseInt(n,10));
  if (!nums) return base;
  let i = 0;
  const shifted = base.replace(/\d+/g, () => String(Math.max(1, nums[i++] + d)));
  return shifted + " (adaptive)";
}

/* =========================
   XP
========================= */
const XP_PER_SET = {
  "Mehrgelenkig": 110,
  "Unilateral": 130,
  "Komplexe": 160,
  "Core": 90,
  "Conditioning": 220
};
function bonusXP({ rpe9, tech, pause }) {
  return (rpe9 ? 60 : 0) + (tech ? 35 : 0) + (pause ? 35 : 0);
}
function neatXP(minutes) {
  return Math.max(0, Math.round((minutes || 0) * 5)); // 60min => 300 XP
}

/* =========================
   ATTRIBUTES
========================= */
function attrReqForLevel(level){ return 900 + (level - 1) * 150; }
function attrLevelFromXp(totalXp){
  let lvl = 1;
  let xp = Math.max(0, Math.round(totalXp || 0));
  while (true) {
    const req = attrReqForLevel(lvl);
    if (xp >= req) { xp -= req; lvl += 1; }
    else break;
    if (lvl > 999) break;
  }
  return { lvl, into: xp, need: attrReqForLevel(lvl) };
}

function baseAttrFromEntry(e) {
  const out = { STR:0, STA:0, END:0, MOB:0 };
  const xp = e.xp || 0;
  const t = e.type || "";
  const name = e.exercise || "";

  if (t === "Mehrgelenkig") out.STR += xp;
  else if (t === "Unilateral") out.STA += xp;
  else if (t === "Conditioning") out.END += xp;
  else if (t === "Core") out.MOB += xp;
  else if (t === "Komplexe") { out.STR += xp*0.4; out.STA += xp*0.2; out.END += xp*0.2; out.MOB += xp*0.2; }
  else if (t === "NEAT") { out.END += xp*0.7; out.MOB += xp*0.3; }
  else if (t === "Boss-Workout") { out.STR += xp*0.25; out.STA += xp*0.25; out.END += xp*0.25; out.MOB += xp*0.25; }
  else { out.STR += xp*0.25; out.STA += xp*0.25; out.END += xp*0.25; out.MOB += xp*0.25; }

  // weak point overrides
  if (name.includes("Lateral")) { out.STR = xp*0.7; out.MOB = xp*0.3; out.STA=0; out.END=0; }
  if (name.includes("Calf") || name.includes("Tibialis")) { out.MOB=xp*0.8; out.END=xp*0.2; out.STR=0; out.STA=0; }
  if (name.includes("Hamstring Walkouts")) { out.MOB=xp*0.6; out.STA=xp*0.4; out.STR=0; out.END=0; }
  if (name.includes("Farmer")) { out.STR=xp*0.5; out.STA=xp*0.5; out.END=0; out.MOB=0; }

  return out;
}

function applyMutationToAttr(attr, mutation){
  const out = { ...attr };
  if (mutation?.mult?.STR) out.STR *= mutation.mult.STR;
  if (mutation?.mult?.STA) out.STA *= mutation.mult.STA;
  if (mutation?.mult?.END) out.END *= mutation.mult.END;
  if (mutation?.mult?.MOB) out.MOB *= mutation.mult.MOB;
  if (mutation?.mult?.NEAT) { /* NEAT already routed into END/MOB base */ }
  return out;
}

/* =========================
   QUESTS
========================= */
const QUESTS = [
  { id:"steps10k", name:"10.000 Schritte", xp:140, note:"NEAT-Boost" },
  { id:"mobility10", name:"10 Min Mobility", xp:80, note:"Hüfte/Schulter/Wirbelsäule" },
  { id:"water", name:"2,5–3L Wasser", xp:45, note:"Regeneration" },
  { id:"sleep", name:"7h+ Schlaf", xp:90, note:"Performance" },
  { id:"calves", name:"Waden erledigt (Calf Raises)", xp:45, note:"Achilles/Knie & Optik" },
  { id:"laterals", name:"Seitliche Schulter (Lateral Raises)", xp:45, note:"Schulterbreite & Stabilität" },
  { id:"hamknee", name:"Hamstrings (Walkouts)", xp:55, note:"Knee-Flexion Ersatz, Balance" },
  { id:"tibialis", name:"Tibialis (Shin Raises)", xp:35, note:"Schienbein/Knöchel, Prävention" },
];

function loadQuestState(){ return loadJSON(KEY_QUESTS, {}); }
function saveQuestState(s){ saveJSON(KEY_QUESTS, s); }
function isQuestDoneToday(qState, questId, dayISO){ return qState?.[dayISO]?.[questId] === true; }

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
    await idbAdd({
      date: dayISO,
      week,
      exercise:`Daily Quest: ${q?.name ?? questId}`,
      type:"Quest",
      detail:"Completed",
      xp:q?.xp ?? 0
    });
  }
}

function renderQuests(){
  const today = isoDate(new Date());
  const qState = loadQuestState();
  const ul = $("questList");
  if (!ul) return;
  ul.innerHTML = "";

  QUESTS.forEach(q => {
    const done = isQuestDoneToday(qState, q.id, today);
    const li = document.createElement("li");
    li.innerHTML = `
      <div class="checkItem">
        <input type="checkbox" ${done ? "checked":""}>
        <div class="checkMain">
          <div class="checkTitle">${q.name}</div>
          <div class="checkSub">${q.note}</div>
        </div>
        <div class="xpBadge">+${q.xp} XP</div>
      </div>
    `;
    ul.appendChild(li);
    li.querySelector("input").addEventListener("change", async (e) => {
      if (e.target.checked) await setQuestDoneForDay(q.id, today, true);
      else alert("Quest deaktiviert – XP-Eintrag bleibt bestehen (simple).");
      await renderAll();
    });
  });
}

/* =========================
   BOSSES
========================= */
const BOSSES = [
  { week: 2, name: "The Foundation Beast", xp: 650, reward: "1 Joker + Titel: Foundation Slayer",
    workout: ["DB Goblet Squat – 5×10 (3s runter)","DB Floor Press – 5×8","DB Row – 5×10 (Pause oben)","Pause strikt 90s"]},
  { week: 4, name: "The Asymmetry Lord", xp: 800, reward: "+1 STA + Unilateral XP +10% (1 Woche)",
    workout: ["Bulgarian Split Squat – 4×8 je Seite","1-Arm DB Row – 4×10 je Seite","Side Plank – 3×45s je Seite","Regel: schwache Seite beginnt"]},
  { week: 6, name: "The Core Guardian", xp: 900, reward: "Core-Sätze 1 Woche doppelt XP",
    workout: ["Hollow Hold – 4×40s","Plank Shoulder Taps – 4×30","Goblet Squat Hold – 3×45s","Pausen max. 60s"]},
  { week: 8, name: "The Conditioning Reaper", xp: 1100, reward: "+1 END + Conditioning ⭐⭐⭐",
    workout: ["5 Runden: 30s Burpees","30s Mountain Climbers","30s High Knees","Pause 60s (jede Runde gleich stark)"]},
  { week: 10, name: "The Iron Champion", xp: 1400, reward: "+1 Attribut deiner Wahl + Titel: Iron Challenger",
    workout: ["Komplex 6 Runden (je 6 Wdh)","Deadlift → Clean → Front Squat → Push Press","Hanteln nicht absetzen","Technik vor Tempo"]},
  { week: 12, name: "FINAL: Iron Overlord", xp: 2400, reward: "Titel: IRON OVERLORD SLAYER + New Game+",
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
  if ($("bossStartDisplay")) $("bossStartDisplay").textContent = ensureStartDate();
  if ($("bossCurrentWeek")) $("bossCurrentWeek").textContent = `W${curWeek}`;

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
        <div style="min-width:240px;">
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
        date: today,
        week: w,
        exercise: `Boss W${week}: ${line}`,
        type: "Boss-Workout",
        detail: `${boss.name} • Reward: ${boss.reward}`,
        xp: xpParts[idx]
      }));
      entriesToAdd.push({ date: today, week: w, exercise: `Bossfight CLEARED: ${boss.name}`, type: "Boss", detail: `W${week} Clear`, xp: 0 });

      await idbAddMany(entriesToAdd);

      const bs = loadBoss();
      bs[week] = { cleared:true, clearedAt: today };
      saveBoss(bs);

      await renderAll();
      alert(`Bossfight cleared! +${boss.xp} XP ✅`);
    });
  });
}

/* =========================
   ACHIEVEMENTS (weekly)
========================= */
const ACHIEVEMENTS = [
  { id:"noskip", name:"No Skip Week", xp:650, rule:`5 Trainingstage (≥${STAR_THRESHOLDS.one} XP)` },
  { id:"perfect", name:"Perfect Run", xp:750, rule:"5 Tage ⭐⭐ oder ⭐⭐⭐" },
  { id:"threestar", name:"3-Star Hunter", xp:550, rule:"mind. 2× ⭐⭐⭐" },
  { id:"questmaster", name:"Quest Master", xp:450, rule:"mind. 3 Daily Quests" },
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

async function evaluateWeeklyAchievements(entries, weekNum){
  if (!weekNum) return { earned:[], newlyEarned:[], trainDays:0, threeStarDays:0 };

  const dayXP = computeWeekDayXP(entries, weekNum);
  const dates = Object.keys(dayXP);
  const trainDays = dates.filter(d => dayXP[d] >= STAR_THRESHOLDS.one).length;
  const twoPlusDays = dates.filter(d => dayXP[d] >= STAR_THRESHOLDS.two).length;
  const threeStarDays = dates.filter(d => dayXP[d] >= STAR_THRESHOLDS.three).length;
  const questCount = countDailyQuestsInWeek(weekNum);

  const shouldEarn = [];
  if (trainDays >= 5) shouldEarn.push("noskip");
  if (twoPlusDays >= 5) shouldEarn.push("perfect");
  if (threeStarDays >= 2) shouldEarn.push("threestar");
  if (questCount >= 3) shouldEarn.push("questmaster");

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
      await idbAdd({ date: today, week: weekNum, exercise: `Achievement: ${a.name}`, type: "Achievement", detail: a.rule, xp: a.xp });
    }
  }

  return { earned: shouldEarn, newlyEarned, trainDays, threeStarDays };
}

/* =========================
   WEEKLY PLAN
========================= */
function groupExercisesByDay(){
  const dayMap = {
    "Tag 1 – Push": [],
    "Tag 2 – Pull": [],
    "Tag 3 – Beine & Core": [],
    "Tag 4 – Ganzkörper": [],
    "Tag 5 – Conditioning & Core": []
  };
  EXERCISES.forEach(ex => { if (dayMap[ex.group]) dayMap[ex.group].push(ex); });
  return dayMap;
}

function renderWeeklyPlan(curWeek, entries){
  const content = $("planContent");
  if (!content) return;

  const start = ensureStartDate();
  const w = clampWeek(curWeek || 1);
  const b = weekBlock(w);
  const dayMap = groupExercisesByDay();
  const boss = getBossForWeek(w);
  const mutation = getMutationForWeek(w);
  const adaptive = getAdaptiveModifiers(entries, w);

  if ($("planStart")) $("planStart").textContent = start;
  if ($("planWeek")) $("planWeek").textContent = `W${w}`;
  if ($("planBlock")) $("planBlock").textContent = blockName(b);
  if ($("planHint")) $("planHint").textContent = weeklyProgressHint(w);
  if ($("planMutation")) $("planMutation").textContent = `${mutation.name} – ${mutation.effect}`;
  if ($("planAdaptive")) $("planAdaptive").textContent = `${adaptive.setDelta>=0?"+":""}${adaptive.setDelta} Sätze, ${adaptive.repDelta>=0?"+":""}${adaptive.repDelta} Reps`;

  const questHint = `Quests: ${QUESTS.map(q => `${q.name} (+${q.xp})`).join(" • ")}`;

  let html = "";
  html += `<div class="pill"><b>Heute/Alltag:</b> ${questHint}</div>`;
  html += `<div class="divider"></div>`;
  html += `<div class="pill"><b>Mutation:</b> ${mutation.name} • <span class="small">${mutation.desc}</span><br><span class="small">${mutation.effect}</span></div>`;
  html += `<div class="divider"></div>`;

  if (boss) {
    html += `<div class="pill"><b>Boss diese Woche:</b> ${boss.name} (W${boss.week}) • +${boss.xp} XP<br><span class="small">Clear nur in W${boss.week} + Checkboxen im Boss-Tab.</span></div><div class="divider"></div>`;
  } else {
    html += `<div class="pill"><b>Boss diese Woche:</b> keiner (Boss-Wochen: 2/4/6/8/10/12)</div><div class="divider"></div>`;
  }

  Object.keys(dayMap).forEach(dayName => {
    html += `<div class="planDay"><h3>${dayName}</h3><ul class="planList">`;
    dayMap[dayName].forEach(ex => {
      const setRec = recommendedSetsForExercise(ex.name, ex.type, w, adaptive).text;
      const repRec = recommendedRepsForExercise(ex.name, ex.type, w, adaptive);
      html += `<li><b>${ex.name}</b><br><span class="small">${ex.type} • ${setRec} • ${repRec}</span></li>`;
    });
    html += `</ul></div>`;
  });

  html += `
    <div class="planDay">
      <h3>Extra (optional)</h3>
      <ul class="planList">
        <li><b>NEAT Walking Desk (3 km/h)</b><br><span class="small">30–60 Min • XP = Minuten × 5</span></li>
        <li><b>Ruhetag / Mobility</b><br><span class="small">10–20 Min Mobility + Spaziergang = Fortschritt</span></li>
      </ul>
    </div>
  `;
  content.innerHTML = html;
}

/* =========================
   CALENDAR (Weekly view)
========================= */
function loadCalendarState(){
  return loadJSON(KEY_CAL, { weekOffset: 0, selectedDate: isoDate(new Date()) });
}
function saveCalendarState(st){
  saveJSON(KEY_CAL, st);
}
function startOfWeekMonday(dateISO){
  const d = new Date(dateISO);
  const day = d.getDay(); // 0 Sun ... 6 Sat
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

function renderCalendar(entries){
  const grid = $("calGrid");
  if (!grid) return;

  const start = ensureStartDate();
  const today = isoDate(new Date());
  const curWeek = clampWeek(getWeekNumber(start, today));

  const st = loadCalendarState();
  const targetWeek = clampWeek(curWeek + (st.weekOffset || 0));

  // Calculate monday of that "challenge week" based on startdate:
  // week 1 starts at startdate; we align display to Monday-week containing that range,
  // but we keep day selection inside the 7-day window of the challenge week.
  const weekStart = addDays(start, (targetWeek - 1) * 7);
  const monday = startOfWeekMonday(weekStart);

  if ($("calWeekTitle")) $("calWeekTitle").textContent = `Woche ${targetWeek}`;
  if ($("calRange")) $("calRange").textContent = rangeLabel(monday);

  // build dayXP map for the visible week window (Mon..Sun)
  const dayXP = {};
  for (let i=0;i<7;i++){
    const day = addDays(monday, i);
    dayXP[day] = 0;
  }
  for (const e of entries){
    if (dayXP[e.date] != null) dayXP[e.date] += (e.xp || 0);
  }

  // choose selected date: if out of range, snap to monday
  let selected = st.selectedDate || today;
  if (dayXP[selected] == null) selected = monday;

  grid.innerHTML = "";
  for (let i=0;i<7;i++){
    const dateISO = addDays(monday, i);
    const xp = dayXP[dateISO] || 0;
    const stars = starsForDay(xp);

    const cell = document.createElement("div");
    cell.className = "calCell" + (dateISO === selected ? " active":"");
    cell.innerHTML = `
      <div class="calTop">
        <div class="calDow">${DOW[i]}</div>
        <div class="calDate">${dateISO.slice(5)}</div>
      </div>
      <div class="calXP"><b>${xp}</b> XP</div>
      <div class="calStars">${stars}</div>
    `;
    cell.addEventListener("click", async ()=>{
      const st2 = loadCalendarState();
      st2.selectedDate = dateISO;
      saveCalendarState(st2);
      // also set log date
      if ($("date")) $("date").value = dateISO;
      await renderAll(); // update day list + recs based on that day
    });
    grid.appendChild(cell);
  }

  renderDayEntries(entries, selected);
}

function renderDayEntries(entries, dateISO){
  const ul = $("dayEntries");
  const title = $("dayTitle");
  const dayXpEl = $("dayXp");
  const starsEl = $("dayStars");
  if (!ul) return;

  const dayEntries = entries.filter(e => e.date === dateISO).sort((a,b)=>(b.id??0)-(a.id??0));
  const dayXp = dayEntries.reduce((s,e)=>s+(e.xp||0),0);

  if (title) title.textContent = `Tages-Einträge: ${dateISO}`;
  if (dayXpEl) dayXpEl.textContent = dayXp;
  if (starsEl) starsEl.textContent = starsForDay(dayXp);

  ul.innerHTML = "";
  if (!dayEntries.length) {
    ul.innerHTML = `<li>Noch keine Einträge an diesem Tag.</li>`;
    return;
  }

  dayEntries.forEach(e=>{
    const li = document.createElement("li");
    li.innerHTML = `
      <div class="entryRow">
        <div style="min-width:220px;">
          <div><b>${e.exercise}</b></div>
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

  // bind edit/delete
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

/* =========================
   LOG UI + EDIT/DELETE
========================= */
function isWalkType(type){ return type === "NEAT"; }

async function startEditEntry(id){
  const all = await idbGetAll();
  const e = all.find(x => x.id === id);
  if (!e) return alert("Eintrag nicht gefunden.");

  $("editId").value = String(e.id);
  $("logFormTitle").textContent = "Eintrag bearbeiten";
  $("add").textContent = "Änderungen speichern";
  $("cancelEdit").classList.remove("hide");

  if ($("date")) $("date").value = e.date;
  if ($("exercise")) $("exercise").value = e.exercise;
  if ($("extraXp")) $("extraXp").value = "0"; // extra is not persisted separately (kept simple)

  // best-effort: infer sets/min from detail if present, otherwise default
  const type = typeForExercise(e.exercise);
  if (type === "NEAT") {
    $("walkingRow")?.classList.remove("hide");
    $("setsRow")?.classList.add("hide");
    // try parse minutes from detail like "60 min"
    const m = (e.detail || "").match(/(\d+)\s*min/i);
    if (m && $("walkMin")) $("walkMin").value = m[1];
  } else {
    $("walkingRow")?.classList.add("hide");
    $("setsRow")?.classList.remove("hide");
    // try parse sets from detail like "4 sets"
    const s = (e.detail || "").match(/(\d+)\s*sets/i);
    if (s && $("sets")) $("sets").value = s[1];
  }

  // jump to Log tab (optional)
  location.hash = "log";
  // also update recs/preview
  await renderAll();
}

async function deleteEntryById(id){
  const ok = confirm("Diesen Eintrag wirklich löschen?");
  if (!ok) return;
  await idbDelete(id);
  await renderAll();
}

function resetEditMode(){
  $("editId").value = "";
  $("logFormTitle").textContent = "Neuer Eintrag (rückwirkend möglich)";
  $("add").textContent = "Eintrag speichern";
  $("cancelEdit").classList.add("hide");
}

async function updateLogUI(entries){
  if ($("logStart")) $("logStart").textContent = ensureStartDate();

  const dateISO = $("date")?.value || isoDate(new Date());
  const week = currentWeekFor(dateISO);
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
  $("walkingRow")?.classList.toggle("hide", !isWalk);
  $("setsRow")?.classList.toggle("hide", isWalk);

  // ✅ critical FIX: only autofill sets if empty AND not focused
  if (!isWalk && setRec.value && $("sets")) {
    const setsEl = $("sets");
    const isEditing = (document.activeElement === setsEl);
    const raw = (setsEl.value ?? "").trim();
    const current = raw === "" ? null : parseInt(raw, 10);
    if (!isEditing && (current === null || Number.isNaN(current) || current <= 0)) {
      setsEl.value = String(setRec.value);
    }
  }

  // disable bonus checkboxes for walking
  ["rpe9","tech","pause"].forEach(id => {
    const el = $(id);
    if (!el) return;
    el.disabled = isWalk;
    if (isWalk) el.checked = false;
  });

  const mult = mutationXpMultiplierForType(type, mutation);
  if ($("logAdaptive")) {
    $("logAdaptive").textContent =
      `W${week} • Mutation: x${mult.toFixed(2)} • Adaptive: ${adaptive.setDelta>=0?"+":""}${adaptive.setDelta} Sets / ${adaptive.repDelta>=0?"+":""}${adaptive.repDelta} Reps`;
  }

  updateCalcPreview(week, mutation);
}

function updateCalcPreview(week, mutation){
  const exName = $("exercise")?.value;
  const type = typeForExercise(exName);

  const extra = parseInt(($("extraXp")?.value ?? "0").trim() || "0", 10) || 0;

  let xp = 0;
  if (type === "NEAT") {
    const minutes = Math.max(1, parseInt($("walkMin")?.value || "0", 10));
    xp = neatXP(minutes);
  } else {
    const setsRaw = ($("sets")?.value ?? "").trim();
    const sets = Math.max(0, parseInt(setsRaw || "0", 10) || 0);
    const flags = { rpe9: $("rpe9")?.checked, tech: $("tech")?.checked, pause: $("pause")?.checked };
    xp = (XP_PER_SET[type] ?? 0) * sets + bonusXP(flags);
  }

  const mult = mutationXpMultiplierForType(type, mutation);
  xp = Math.round(xp * mult) + extra;

  if ($("calcXp")) $("calcXp").textContent = xp;
  if ($("calcInfo")) $("calcInfo").textContent = `${mutation.name} • W${week} • +Extra ${extra}`;
}

/* =========================
   STATS + UI
========================= */
async function computeStats(entries){
  const startDate = ensureStartDate();
  const today = isoDate(new Date());
  const curWeek = clampWeek(getWeekNumber(startDate, today));

  let todayXp = 0, weekXp = 0, totalXp = 0;
  const attr = { STR:0, STA:0, END:0, MOB:0 };

  for (const e of entries){
    totalXp += e.xp || 0;
    if (e.date === today) todayXp += e.xp || 0;
    if (e.week === curWeek) weekXp += e.xp || 0;

    const mut = getMutationForWeek(e.week || curWeek);
    const base = baseAttrFromEntry(e);
    const adj = applyMutationToAttr(base, mut);
    attr.STR += adj.STR; attr.STA += adj.STA; attr.END += adj.END; attr.MOB += adj.MOB;
  }

  return { todayXp, weekXp, totalXp, curWeek, startDate, attr };
}

function renderAttributes(attr){
  const keys = ["STR","STA","END","MOB"];
  keys.forEach(k => {
    const xp = Math.round(attr[k] || 0);
    const { lvl, into, need } = attrLevelFromXp(xp);
    const pct = Math.max(0, Math.min(100, Math.round((into / need) * 100)));

    if ($("lv"+k)) $("lv"+k).textContent = lvl;
    if ($("xp"+k)) $("xp"+k).textContent = xp;
    if ($("need"+k)) $("need"+k).textContent = Math.max(0, need - into);
    if ($("bar"+k)) $("bar"+k).style.width = pct + "%";
  });
}

function renderMutationUI(curWeek){
  const m = getMutationForWeek(curWeek);
  if ($("mutationName")) $("mutationName").textContent = `W${curWeek}: ${m.name}`;
  if ($("mutationDesc")) $("mutationDesc").textContent = m.desc;
  if ($("mutationEffect")) $("mutationEffect").textContent = m.effect;
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
   RENDER LIST (All entries) + actions
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
        <div style="min-width:220px;">
          <div><b>${e.date}</b> (W${e.week}) • <b>${e.exercise}</b></div>
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
   MAIN RENDER
========================= */
async function renderAll(){
  ensureStartDate();
  buildExerciseDropdown();

  const raw = await idbGetAll();
  const entries = sortEntriesDesc(raw);

  const stats = await computeStats(entries);

  // Achievements current week (may add entries)
  const evalRes = await evaluateWeeklyAchievements(entries, stats.curWeek);
  const finalEntries = evalRes.newlyEarned?.length ? sortEntriesDesc(await idbGetAll()) : entries;
  const stats2 = await computeStats(finalEntries);

  // Dashboard
  if ($("startDisplay")) $("startDisplay").textContent = stats2.startDate;
  if ($("weekNumber")) $("weekNumber").textContent = `W${stats2.curWeek}`;
  if ($("blockNow")) $("blockNow").textContent = blockName(weekBlock(stats2.curWeek));
  if ($("blockHint")) $("blockHint").textContent = weeklyProgressHint(stats2.curWeek);

  if ($("todayXp")) $("todayXp").textContent = stats2.todayXp;
  if ($("todayStars")) $("todayStars").textContent = starsForDay(stats2.todayXp);
  if ($("weekXp")) $("weekXp").textContent = stats2.weekXp;
  if ($("totalXp")) $("totalXp").textContent = stats2.totalXp;

  // Level
  const lv = levelFromTotalXp(stats2.totalXp);
  if ($("level")) $("level").textContent = lv.lvl;
  if ($("title")) $("title").textContent = titleForLevel(lv.lvl);

  // Mutations + Attr
  renderMutationUI(stats2.curWeek);
  renderAttributes(stats2.attr);

  // Weekly summary
  if ($("wkTrainDays")) $("wkTrainDays").textContent = evalRes.trainDays ?? 0;
  if ($("wkThreeStarDays")) $("wkThreeStarDays").textContent = evalRes.threeStarDays ?? 0;
  const earnedNames = (evalRes.earned || []).map(id => ACHIEVEMENTS.find(a=>a.id===id)?.name).filter(Boolean);
  if ($("wkAchievements")) $("wkAchievements").textContent = earnedNames.length ? earnedNames.join(", ") : "—";
  const adaptive = getAdaptiveModifiers(finalEntries, stats2.curWeek);
  if ($("adaptiveHint")) $("adaptiveHint").textContent = adaptive.note;

  // Recent list
  const recentList = $("recentList");
  if (recentList){
    const recent = finalEntries.slice(0, 6);
    recentList.innerHTML = recent.length ? "" : "<li>Noch keine Einträge.</li>";
    recent.forEach(e => {
      const li2 = document.createElement("li");
      li2.textContent = `${e.date} (W${e.week}) • ${e.exercise} • ${e.xp} XP`;
      recentList.appendChild(li2);
    });
  }

  // Calendar + day entries
  renderCalendar(finalEntries);

  // Weekly plan
  renderWeeklyPlan(stats2.curWeek, finalEntries);

  // Quests + Boss
  renderQuests();
  renderBoss(stats2.curWeek);

  // Log UI context + all entries list
  await updateLogUI(finalEntries);
  renderAllEntriesList(finalEntries);

  if ($("countEntries")) $("countEntries").textContent = finalEntries.length;
  if ($("appStatus")) $("appStatus").textContent = "OK";
}

/* =========================
   SAVE / UPDATE ENTRY
========================= */
async function saveOrUpdateEntry(){
  const date = $("date")?.value || isoDate(new Date());
  const week = currentWeekFor(date);

  const exName = $("exercise")?.value || "Unbekannt";
  const type = typeForExercise(exName);

  const entries = sortEntriesDesc(await idbGetAll());
  const adaptive = getAdaptiveModifiers(entries, week);
  const mutation = getMutationForWeek(week);
  const repRec = recommendedRepsForExercise(exName, type, week, adaptive);

  const extra = parseInt(($("extraXp")?.value ?? "0").trim() || "0", 10) || 0;

  let xp = 0, detail = "";

  if (type === "NEAT") {
    const minutes = Math.max(1, parseInt($("walkMin")?.value || "0", 10));
    xp = neatXP(minutes);
    detail = `${minutes} min • Empf.: ${repRec}`;
  } else {
    const setsRaw = ($("sets")?.value ?? "").trim();
    // allow 0 in UI preview, but on save enforce at least 1
    const sets = Math.max(1, parseInt(setsRaw || "1", 10) || 1);

    const flags = { rpe9: $("rpe9")?.checked, tech: $("tech")?.checked, pause: $("pause")?.checked };
    xp = (XP_PER_SET[type] ?? 0) * sets + bonusXP(flags);
    detail = `${sets} sets • Empf.: ${repRec}`;
    if (flags.rpe9 || flags.tech || flags.pause) detail += " • +bonus";
  }

  const mult = mutationXpMultiplierForType(type, mutation);
  xp = Math.round(xp * mult) + extra;

  const editId = parseInt(($("editId")?.value ?? "").trim(), 10);

  if (editId) {
    // update
    await idbPut({
      id: editId,
      date, week,
      exercise: exName,
      type,
      detail: `${detail} • Mut: ${mutation.name} x${mult.toFixed(2)} • +Extra ${extra}`,
      xp
    });
    resetEditMode();
    alert(`Gespeichert (Edit): ${date} • +${xp} XP ✅`);
  } else {
    // add new
    await idbAdd({
      date, week,
      exercise: exName,
      type,
      detail: `${detail} • Mut: ${mutation.name} x${mult.toFixed(2)} • +Extra ${extra}`,
      xp
    });
    alert(`Gespeichert: ${date} • +${xp} XP ✅`);
  }

  // reset small inputs
  if ($("extraXp")) $("extraXp").value = "0";
  if ($("rpe9")) $("rpe9").checked = false;
  if ($("tech")) $("tech").checked = false;
  if ($("pause")) $("pause").checked = false;

  await renderAll();
}

/* =========================
   INIT + EVENTS
========================= */
async function init(){
  try {
    // Defaults
    if ($("date")) $("date").value = isoDate(new Date());
    if ($("walkMin")) $("walkMin").value = $("walkMin").value || "60";
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
        "⚠️ Boss/Achievements/Mutations werden zurückgesetzt (Wochen verschieben sich).\n"
      );
      if (!ok) { $("startDateDash").value = oldStart; return; }

      setStartDateLocal(newStart);
      resetWeekBoundSystems();
      await recalcAllEntryWeeks();

      // snap calendar to week 0 and selected date to today
      saveCalendarState({ weekOffset: 0, selectedDate: isoDate(new Date()) });

      await renderAll();
      alert("Startdatum gespeichert & Einträge neu berechnet ✅");
    });

    // Change date/exercise: full update (recs/preview/calendar selection)
    $("date")?.addEventListener("change", async () => {
      // also update calendar selected date
      const st = loadCalendarState();
      st.selectedDate = $("date").value;
      saveCalendarState(st);
      await renderAll();
    });
    $("exercise")?.addEventListener("change", async () => { await renderAll(); });

    // ✅ IMPORTANT: Sets/walkMin typing => preview only, no renderAll spam
    ["sets","walkMin","extraXp"].forEach(id=>{
      const el = $(id);
      if (!el) return;
      el.addEventListener("input", async ()=>{
        const dateISO = $("date")?.value || isoDate(new Date());
        const week = currentWeekFor(dateISO);
        const mutation = getMutationForWeek(week);
        updateCalcPreview(week, mutation);
      });
      el.addEventListener("change", async ()=>{ await renderAll(); });
    });

    ["rpe9","tech","pause"].forEach(id=>{
      const el = $(id);
      if (!el) return;
      el.addEventListener("change", async ()=>{
        const dateISO = $("date")?.value || isoDate(new Date());
        const week = currentWeekFor(dateISO);
        const mutation = getMutationForWeek(week);
        updateCalcPreview(week, mutation);
      });
    });

    // Save / update
    $("add")?.addEventListener("click", saveOrUpdateEntry);

    // Cancel edit
    $("cancelEdit")?.addEventListener("click", async ()=>{
      resetEditMode();
      await renderAll();
    });

    // Clear all
    $("clear")?.addEventListener("click", async () => {
      if (confirm("Wirklich ALLE Einträge löschen?")) {
        await idbClear();
        await renderAll();
      }
    });

    // Reset boss
    $("resetBoss")?.addEventListener("click", async () => {
      if (confirm("Boss-Fight Status & Checks zurücksetzen?")) {
        localStorage.removeItem(KEY_BOSS);
        localStorage.removeItem(KEY_BOSSCHK);
        await renderAll();
      }
    });

    // Export
    $("exportCsv")?.addEventListener("click", async () => {
      const entries = sortEntriesDesc(await idbGetAll());
      if (!entries.length) return alert("Keine Einträge zum Exportieren.");
      downloadCSV("ironquest_export.csv", toCSV(entries));
    });

    // SW
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");

    // Ensure entries match current startdate
    await recalcAllEntryWeeks();

    // first render
    await renderAll();
  } catch (e) {
    console.error(e);
    if ($("appStatus")) $("appStatus").textContent = "ERROR (siehe Konsole)";
    alert("Fehler in app.js. Bitte Screenshot der Konsole schicken.");
  }
}

init();
