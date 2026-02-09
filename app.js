/* =========================
   IRON QUEST – app.js (FULL)
   Includes requested additions:
   ✅ Weekly Plan icons 🟢/⚪/🔴 next to each exercise
   ✅ PR Pop-Up on save (NEW PR + optional bonus XP)
   ✅ PR Top 10 list card on Dashboard
   ✅ Fixes: removed broken `await ;` / broken wrappers so tabs/render keep working
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
   PR + Weekly Plan Status Icons (🟢/⚪/🔴) + Top10
========================= */
const KEY_PR = "ironquest_pr_v1";
const PR_BONUS_XP = 120; // optional Bonus-XP bei NEW PR (Boss XP bleibt unberührt)

function loadPRMap(){ return loadJSON(KEY_PR, {}); }
function savePRMap(m){ saveJSON(KEY_PR, m); }

// Score-Logik: Kraftübungen = Sets*Reps, NEAT = Minuten
function prScoreForEntry(type, sets, reps, minutes){
  if (type === "NEAT") return Math.max(0, parseInt(minutes || 0, 10));
  if (type === "Rest" || type === "Quest" || type === "Boss" || type === "Boss-Workout") return 0;
  const s = Math.max(0, parseInt(sets || 0, 10));
  const r = Math.max(0, parseInt(reps || 0, 10));
  return s * r;
}

// NEW PR prüfen + optional Bonus-Log
async function handlePROnSave({ exName, type, score, dateISO, week }) {
  if (!exName || !type) return { isNew: false };
  if (type === "Rest" || type === "Quest" || type === "Boss" || type === "Boss-Workout") return { isNew:false };
  if (score <= 0) return { isNew:false };

  const pr = loadPRMap();
  const prevBest = pr?.[exName]?.bestScore ?? 0;
  const prevDate = pr?.[exName]?.bestDate ?? null;

  const isNew = score > prevBest;
  if (!isNew) return { isNew:false, prevBest };

  pr[exName] = { bestScore: score, bestDate: dateISO, type };
  savePRMap(pr);

  const wantBonus = confirm(
    `🏆 NEW PR!\n\n` +
    `${exName}\n` +
    `Score: ${score} (alt: ${prevBest}${prevDate ? " am "+prevDate : ""})\n\n` +
    `Bonus XP hinzufügen? (+${PR_BONUS_XP} XP)`
  );

  if (wantBonus) {
    await idbAdd({
      date: dateISO,
      week,
      exercise: `PR Bonus: ${exName}`,
      type: "PR",
      detail: `NEW PR • Score ${score} • Bonus`,
      xp: PR_BONUS_XP
    });
  } else {
    await idbAdd({
      date: dateISO,
      week,
      exercise: `NEW PR: ${exName}`,
      type: "PR",
      detail: `Score ${score}`,
      xp: 0
    });
  }

  return { isNew:true, prevBest };
}

function exerciseDoneOnDate(entries, dateISO, exName){
  return entries.some(e => e.date === dateISO && e.exercise === exName);
}
function statusIconForPlanExercise(entries, dateISO, exName){
  const today = isoDate(new Date());
  const done = exerciseDoneOnDate(entries, dateISO, exName);
  if (done) return "🟢";
  if (dateISO < today) return "🔴";
  return "⚪";
}
function top10PRs(){
  const pr = loadPRMap();
  const arr = Object.keys(pr).map(name => ({
    name,
    bestScore: pr[name]?.bestScore ?? 0,
    bestDate: pr[name]?.bestDate ?? "",
    type: pr[name]?.type ?? ""
  }));
  arr.sort((a,b) => (b.bestScore - a.bestScore));
  return arr.slice(0, 10);
}

/* =========================
   DB (IndexedDB)
========================= */
const DB_NAME = "ironquest_db";
const DB_VERSION = 2;
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
const KEY_START   = "ironquest_startdate_v20";
const KEY_MUT     = "ironquest_mutations_v20";
const KEY_QUESTS  = "ironquest_dailyquests_v20";
const KEY_BOSS    = "ironquest_boss_v20";
const KEY_BOSSCHK = "ironquest_boss_checks_v20";
const KEY_ACH     = "ironquest_weeklyach_v20";
const KEY_CAL     = "ironquest_calendar_v20";
const KEY_SKILL   = "ironquest_skilltree_v20";
const KEY_PLANOVR = "ironquest_plan_overrides_v20";
const KEY_WKREW   = "ironquest_week_rewards_v20";

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
   STARS
   1200–1599 ⭐ • 1600–1999 ⭐⭐ • 2000+ ⭐⭐⭐
========================= */
function getStarThresholdsForWeek(_week, _entries){
  return { one: 1200, two: 1600, three: 2000 };
}
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
  return Math.round(350 + 120 * l + 32 * (l ** 1.75));
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
  if (b === 2) return "Mehr Volumen, Progress über Reps oder schwerere Hanteln.";
  return "Dichte/Intensität (Tempo/kurzere Pausen, sauber).";
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

  const thr = getStarThresholdsForWeek(prev, entries);
  const dayXP = computeWeekDayXP(entries, prev);
  const days = Object.keys(dayXP);

  const trainDays = days.filter(d => dayXP[d] >= thr.one).length;
  const twoStarDays = days.filter(d => dayXP[d] >= thr.two).length;
  const threeStarDays = days.filter(d => dayXP[d] >= thr.three).length;

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
   EXERCISES
========================= */
const EXERCISES = [
  // PUSH
  { name:"DB Floor Press (neutral)", type:"Mehrgelenkig", group:"Tag 1 – Push", cat:"Brust/Trizeps" },
  { name:"DB Bench Press (Floor alt)", type:"Mehrgelenkig", group:"Tag 1 – Push", cat:"Brust/Trizeps" },
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
  { name:"DB Pullover (Floor)", type:"Mehrgelenkig", group:"Tag 2 – Pull", cat:"Lat/Brustkorb" },
  { name:"Cross-Body Hammer Curl", type:"Mehrgelenkig", group:"Tag 2 – Pull", cat:"Bizeps" },
  { name:"DB Supinated Curl", type:"Mehrgelenkig", group:"Tag 2 – Pull", cat:"Bizeps" },
  { name:"Farmer’s Carry (DB)", type:"Unilateral", group:"Tag 2 – Pull", cat:"Grip/Traps" },

  // LEGS + CORE
  { name:"Bulgarian Split Squats", type:"Unilateral", group:"Tag 3 – Beine & Core", cat:"Quads/Glute" },
  { name:"DB Romanian Deadlift", type:"Mehrgelenkig", group:"Tag 3 – Beine & Core", cat:"Hamstrings/Glute" },
  { name:"Goblet Squat", type:"Mehrgelenkig", group:"Tag 3 – Beine & Core", cat:"Quads" },
  { name:"Cossack Squats", type:"Unilateral", group:"Tag 3 – Beine & Core", cat:"Adduktoren/Hip" },
  { name:"Hip Thrust (Floor)", type:"Mehrgelenkig", group:"Tag 3 – Beine & Core", cat:"Glute" },
  { name:"Side Plank + Leg Raise", type:"Core", group:"Tag 3 – Beine & Core", cat:"Core" },
  { name:"Dead Bug", type:"Core", group:"Tag 3 – Beine & Core", cat:"Core" },
  { name:"Hamstring Walkouts", type:"Core", group:"Tag 3 – Beine & Core", cat:"Posterior/Knieflex" },
  { name:"Standing DB Calf Raises", type:"Core", group:"Tag 3 – Beine & Core", cat:"Calves" },

  // FULL BODY / COMPLEX
  { name:"Komplex: Deadlift", type:"Komplexe", group:"Tag 4 – Ganzkörper", cat:"Complex" },
  { name:"Komplex: Clean", type:"Komplexe", group:"Tag 4 – Ganzkörper", cat:"Complex" },
  { name:"Komplex: Front Squat", type:"Komplexe", group:"Tag 4 – Ganzkörper", cat:"Complex" },
  { name:"Komplex: Push Press", type:"Komplexe", group:"Tag 4 – Ganzkörper", cat:"Complex" },
  { name:"DB Thrusters", type:"Komplexe", group:"Tag 4 – Ganzkörper", cat:"Fullbody" },
  { name:"Goblet Squat Hold", type:"Core", group:"Tag 4 – Ganzkörper", cat:"Core/Bracing" },
  { name:"Plank Shoulder Taps", type:"Core", group:"Tag 4 – Ganzkörper", cat:"Core" },

  // CONDITIONING
  { name:"Burpees", type:"Conditioning", group:"Tag 5 – Conditioning & Core", cat:"Metcon" },
  { name:"Mountain Climbers", type:"Conditioning", group:"Tag 5 – Conditioning & Core", cat:"Metcon" },
  { name:"High Knees", type:"Conditioning", group:"Tag 5 – Conditioning & Core", cat:"Metcon" },
  { name:"Jumping Jacks", type:"Conditioning", group:"Tag 5 – Conditioning & Core", cat:"Metcon" },
  { name:"Russian Twists (DB)", type:"Core", group:"Tag 5 – Conditioning & Core", cat:"Core" },
  { name:"Hollow Body Hold", type:"Core", group:"Tag 5 – Conditioning & Core", cat:"Core" },
  { name:"Tibialis Raises", type:"Core", group:"Tag 5 – Conditioning & Core", cat:"Shins" },

  // NEAT
  { name:"Walking Desk (Laufband 3 km/h)", type:"NEAT", group:"NEAT / Alltag", cat:"NEAT" },

  // REST / RECOVERY
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
    const ogGroup = document.createElement("optgroup");
    ogGroup.label = groupName;

    Object.keys(map[groupName]).forEach(cat => {
      map[groupName][cat].forEach(ex => {
        const opt = document.createElement("option");
        opt.value = ex.name;
        opt.textContent = `${ex.name}`;
        ogGroup.appendChild(opt);
      });
    });

    sel.appendChild(ogGroup);
  });

  if (prev && [...sel.options].some(o => o.value === prev)) sel.value = prev;
  else sel.selectedIndex = 0;
}

/* =========================
   RECOMMENDATIONS (XP not based on sets)
========================= */
function overridesForExercise(exName) {
  if (!exName) return null;
  if (exName.includes("Farmer")) return { setsText:"2–3 Runden", setsValue:3, repsText:"30–60s pro Runde (aufrecht, Core fest)" };
  if (exName.includes("Lateral")) return { setsText:"3 Sätze", setsValue:3, repsText:"12–20 Wdh (2–3s runter)" };
  if (exName.includes("Hamstring Walkouts")) return { setsText:"3 Sätze", setsValue:3, repsText:"8–12 Wdh (kontrolliert)" };
  if (exName.includes("Calf")) return { setsText:"3–4 Sätze", setsValue:4, repsText:"15–25 Wdh (oben 1s halten)" };
  if (exName.includes("Tibialis")) return { setsText:"2–3 Sätze", setsValue:2, repsText:"15–30 Wdh" };
  if (exName.includes("Ruhetag")) return { setsText:"—", setsValue:null, repsText:"10–20 Min Mobility + Spaziergang" };
  return null;
}
function baseRecommendedSets(type, week) {
  const b = weekBlock(week);
  if (type === "NEAT") return { text:"Minuten statt Sätze", value:null };
  if (type === "Rest") return { text:"—", value:null };
  if (type === "Conditioning") return b === 1 ? { text:"4–5 Runden", value:4 } : (b === 2 ? { text:"5–6 Runden", value:5 } : { text:"5–6 Runden", value:5 });
  if (type === "Core") return b === 1 ? { text:"3 Sätze", value:3 } : { text:"4 Sätze", value:4 };
  if (type === "Komplexe") return b === 1 ? { text:"4–5 Runden", value:4 } : (b === 2 ? { text:"5–6 Runden", value:5 } : { text:"6 Runden", value:6 });
  return b === 1 ? { text:"3–4 Sätze", value:4 } : (b === 2 ? { text:"4–5 Sätze", value:5 } : { text:"4–5 Sätze", value:5 });
}
function baseRecommendedReps(type, week) {
  const b = weekBlock(week);
  if (type === "NEAT") return "Minuten (z. B. 30–60)";
  if (type === "Rest") return "Mobility: Schulter/T-Spine/Hüfte";
  if (type === "Core") return b === 1 ? "30–45s pro Satz" : "40–60s pro Satz";
  if (type === "Conditioning") return b === 1 ? "30–40s Arbeit / 60s Pause" : (b === 2 ? "35–45s / 45–60s" : "40–45s / 30–45s");
  if (type === "Komplexe") return b === 1 ? "6–8 Wdh pro Movement" : "6 Wdh pro Movement";
  return b === 1 ? "10–12 Wdh/Satz" : (b === 2 ? "8–10 Wdh/Satz" : "6–8 Wdh/Satz");
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
function neatXP(minutes) {
  return Math.max(0, Math.round((minutes || 0) * 2.5)); // 60min=150
}

/* =========================
   QUESTS (with supplements AM/PM) + retroactive
========================= */
const QUESTS = [
  { id:"steps10k",   name:"10.000 Schritte", xp:70, note:"NEAT-Boost", slot:"any" },
  { id:"mobility10", name:"10 Min Mobility", xp:40, note:"Hüfte/Schulter/WS", slot:"any" },
  { id:"water",      name:"2,5–3L Wasser",   xp:22, note:"Regeneration", slot:"any" },
  { id:"sleep",      name:"7h+ Schlaf",      xp:45, note:"Performance", slot:"any" },

  { id:"supp_d3",      name:"Vitamin D3", xp:10, note:"morgens", slot:"am" },
  { id:"supp_crea",    name:"Kreatin 5g", xp:10, note:"morgens", slot:"am" },
  { id:"supp_mag",     name:"Magnesium",  xp:10, note:"abends",  slot:"pm" },
  { id:"supp_omega3",  name:"Omega-3",    xp:10, note:"abends",  slot:"pm" },
];
function loadQuestState(){ return loadJSON(KEY_QUESTS, {}); }
function saveQuestState(s){ saveJSON(KEY_QUESTS, s); }
function isQuestDoneForDay(qState, questId, dayISO){ return qState?.[dayISO]?.[questId] === true; }

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
    await idbAdd({
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
  info.innerHTML = `<div class="hint"><b>Quests-Datum:</b> ${dayISO} (Kalender → Tag auswählen für rückwirkend)</div>`;
  ul.appendChild(info);

  function renderGroup(title, list){
    const head = document.createElement("li");
    head.innerHTML = `<div class="hint"><b>${title}</b></div>`;
    ul.appendChild(head);

    list.forEach(q => {
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
        alert("Quest deaktiviert – XP-Eintrag bleibt bestehen (simple).");
        return;
      }
      await setQuestDoneForDay(qid, dayISO, true);
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

  if (trainingDays >= 5) {
    if (!map[next]) {
      map[next] = true;
      saveWeekRewards(map);
      const today = isoDate(new Date());
      await idbAdd({ date: today, week: weekNum, exercise:`Weekly Reward Unlocked`, type:"Reward", detail:`W${next}: +5% XP Bonus`, xp:0 });
    }
  }
}
async function evaluateWeeklyAchievements(entries, weekNum){
  if (!weekNum) return { earned:[], newlyEarned:[], trainDays:0, threeStarDays:0 };

  const thr = getStarThresholdsForWeek(weekNum, entries);
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
      await idbAdd({ date: today, week: weekNum, exercise: `Achievement: ${a.name}`, type: "Achievement", detail: a.rule, xp: a.xp });
    }
  }

  await updateWeeklyReward(entries, weekNum);

  return { earned: shouldEarn, newlyEarned, trainDays: trainDaysByStars, threeStarDays };
}

/* =========================
   SKILLTREE (XP influence)
========================= */
const TREES = [
  { key:"multi", name:"Mehrgelenkig (STR)", gateType:"Mehrgelenkig", domList:"tree-multi" },
  { key:"uni",   name:"Unilateral (STA)",   gateType:"Unilateral",   domList:"tree-uni" },
  { key:"core",  name:"Core (MOB/STA)",     gateType:"Core",         domList:"tree-core" },
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
  const fallback = {
    spent: 0,
    nodes: Object.fromEntries(TREES.map(t => [t.key, defaultNodesForTree(t.key)]))
  };
  const st = loadJSON(KEY_SKILL, fallback);
  for (const t of TREES){
    if (!st.nodes?.[t.key]) st.nodes[t.key] = defaultNodesForTree(t.key);
  }
  if (typeof st.spent !== "number") st.spent = 0;
  return st;
}
function saveSkillState(st){ saveJSON(KEY_SKILL, st); }
function countUnlocked(nodes, tier){
  return nodes.filter(n => n.tier === tier && n.unlocked).length;
}
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
    const thr = getStarThresholdsForWeek(w, entries);
    const s = starsForDay(dayXP[dayISO] || 0, thr);
    if (s === "⭐") points += 1;
    else if (s === "⭐⭐") points += 2;
    else if (s === "⭐⭐⭐") points += 3;
  }
  const bossClears = entries.filter(e => e.type === "Boss" && String(e.exercise || "").startsWith("Bossfight CLEARED")).length;
  points += bossClears * 3;

  const ach = entries.filter(e => e.type === "Achievement").length;
  points += ach * 1;

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
  if (mapKey === "comp" && hasCap) mult += 0.03;

  return mult;
}
function ensureDashboardSkillPill(){
  const todayCard = document.querySelector("#tab-dash .card:nth-of-type(2)");
  if (!todayCard) return;
  if (document.getElementById("skillPointsAvail")) return;

  const row = todayCard.querySelector(".row2:last-of-type") || todayCard.querySelector(".row2") || null;
  const pill = document.createElement("div");
  pill.className = "pill";
  pill.innerHTML = `<b>Skillpunkte verfügbar:</b> <span id="skillPointsAvail">0</span>`;
  if (row) row.appendChild(pill);
  else todayCard.appendChild(pill);
}
function renderSkillTrees(entries, curWeek){
  const st = loadSkillState();
  const sp = computeSkillPointsAvailable(entries);
  const gates = getActiveTreeGates(entries, curWeek);

  ["multi","uni","core","cond","comp"].forEach(k=>{
    const el = $("sp-"+k);
    if (el) el.textContent = sp.available;
  });

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
   PLAN OVERRIDES
========================= */
function loadPlanOverrides(){ return loadJSON(KEY_PLANOVR, {}); }
function savePlanOverrides(s){ saveJSON(KEY_PLANOVR, s); }

const PLAN_DEFAULT = {
  "Mon": ["DB Floor Press (neutral)","Arnold Press","Deficit Push-Ups","Overhead Trizeps Extension","DB Lateral Raises"],
  "Tue": ["1-Arm DB Row (Pause oben)","Renegade Rows","Reverse Flys (langsam)","DB Supinated Curl","Farmer’s Carry (DB)"],
  "Wed": ["Ruhetag (Recovery + Mobility)"],
  "Thu": ["Bulgarian Split Squats","DB Romanian Deadlift","Goblet Squat","Side Plank + Leg Raise","Standing DB Calf Raises"],
  "Fri": ["Komplex: Deadlift","Komplex: Clean","Komplex: Front Squat","Komplex: Push Press","Plank Shoulder Taps"],
  "Sat": ["Burpees","Mountain Climbers","High Knees","Russian Twists (DB)","Hollow Body Hold"],
  "Sun": ["Ruhetag (Recovery + Mobility)"],
};

function exercisesForGroup(groupName){
  return EXERCISES.filter(e => e.group === groupName && e.type !== "Rest");
}
function groupForPlanDayKey(dayKey){
  if (dayKey === "Mon") return "Tag 1 – Push";
  if (dayKey === "Tue") return "Tag 2 – Pull";
  if (dayKey === "Thu") return "Tag 3 – Beine & Core";
  if (dayKey === "Fri") return "Tag 4 – Ganzkörper";
  if (dayKey === "Sat") return "Tag 5 – Conditioning & Core";
  return "Ruhetag";
}
function getWeekPlan(week){
  const ovr = loadPlanOverrides();
  const w = String(week);
  const base = structuredClone(PLAN_DEFAULT);
  if (!ovr[w]) return base;
  for (const k of Object.keys(ovr[w])) base[k] = ovr[w][k];
  return base;
}

/* =========================
   CALENDAR helpers
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

/* =========================
   Weekly Plan (with 🟢/⚪/🔴 icons)
========================= */
function planDateForKey(startISO, weekNum, key){
  const dayIndex =
    key === "Mon" ? 0 :
    key === "Tue" ? 1 :
    key === "Wed" ? 2 :
    key === "Thu" ? 3 :
    key === "Fri" ? 4 :
    key === "Sat" ? 5 : 6;

  const weekStartISO = addDays(startISO, (weekNum - 1) * 7);
  return addDays(weekStartISO, dayIndex);
}

function renderWeeklyPlan(curWeek, entries){
  const content = $("planContent");
  if (!content) return;

  const start = ensureStartDate();
  const w = clampWeek(curWeek || 1);
  const b = weekBlock(w);
  const plan = getWeekPlan(w);
  const mutation = getMutationForWeek(w);
  const adaptive = getAdaptiveModifiers(entries, w);
  const boss = getBossForWeek(w);

  if ($("planStart")) $("planStart").textContent = start;
  if ($("planWeek")) $("planWeek").textContent = `W${w}`;
  if ($("planBlock")) $("planBlock").textContent = blockName(b);
  if ($("planHint")) $("planHint").textContent = weeklyProgressHint(w);
  if ($("planMutation")) $("planMutation").textContent = `${mutation.name} – ${mutation.effect}`;
  if ($("planAdaptive")) $("planAdaptive").textContent = `${adaptive.setDelta>=0?"+":""}${adaptive.setDelta} Sätze, ${adaptive.repDelta>=0?"+":""}${adaptive.repDelta} Reps`;

  const reward = rewardActiveForWeek(w) ? "✅ Aktiv: +5% XP diese Woche" : "—";
  const thr = getStarThresholdsForWeek(w, entries);

  let html = "";
  html += `<div class="pill"><b>Ruhetage:</b> Mittwoch & Sonntag (Recovery/Mobility)</div>`;
  html += `<div class="row2">
    <div class="pill"><b>Sterne:</b> ⭐ ab ${thr.one} • ⭐⭐ ab ${thr.two} • ⭐⭐⭐ ab ${thr.three}</div>
    <div class="pill"><b>Weekly Reward:</b> ${reward}</div>
  </div>`;
  html += `<div class="divider"></div>`;

  if (boss) html += `<div class="pill"><b>Boss diese Woche:</b> ${boss.name} (+${boss.xp} XP)</div><div class="divider"></div>`;

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
    const dayISO = planDateForKey(start, w, key);

    exList.forEach((exName, idx)=>{
      const type = typeForExercise(exName);
      const setRec = recommendedSetsForExercise(exName, type, w, adaptive).text;
      const repRec = recommendedRepsForExercise(exName, type, w, adaptive);

      let sel = `<select class="swapSel" data-day="${key}" data-idx="${idx}">`;
      options.forEach(o=>{
        sel += `<option value="${o.name}" ${o.name===exName?"selected":""}>${o.name}</option>`;
      });
      sel += `</select>`;

      const icon = statusIconForPlanExercise(entries, dayISO, exName);

      html += `<li>
        <div style="display:grid; gap:8px;">
          <div style="display:flex; align-items:center; gap:10px;">
            <span style="font-size:18px;">${icon}</span>
            <b style="font-size:16px;">${exName}</b>
          </div>
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
   CALENDAR (weekly view)
========================= */
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
  const thr = getStarThresholdsForWeek(targetWeek, entries);

  for (let i=0;i<7;i++){
    const dateISO2 = addDays(monday, i);
    const xp = dayXP[dateISO2] || 0;
    const stars = starsForDay(xp, thr);

    const cell = document.createElement("div");
    cell.className = "calCell" + (dateISO2 === selected ? " active":"");
    cell.innerHTML = `
      <div class="calTop">
        <div class="calDow">${DOW[i]}</div>
        <div class="calDate">${dateISO2.slice(5)}</div>
      </div>
      <div class="calXP"><b>${xp}</b> XP</div>
      <div class="calStars">${stars}</div>
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

function renderDayEntries(entries, dateISO2){
  const ul = $("dayEntries");
  const title = $("dayTitle");
  const dayXpEl = $("dayXp");
  const starsEl = $("dayStars");
  if (!ul) return;

  const dayEntries = entries.filter(e => e.date === dateISO2).sort((a,b)=>(b.id??0)-(a.id??0));
  const dayXp = dayEntries.reduce((s,e)=>s+(e.xp||0),0);

  const wDay = currentWeekFor(dateISO2);
  const thr = getStarThresholdsForWeek(wDay, entries);

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

/* =========================
   EDIT/DELETE
========================= */
async function startEditEntry(id){
  const all = await idbGetAll();
  const e = all.find(x => x.id === id);
  if (!e) return alert("Eintrag nicht gefunden.");

  $("editId").value = String(e.id);
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

  location.hash = "log";
  await renderAll();
}
async function deleteEntryById(id){
  const ok = confirm("Diesen Eintrag wirklich löschen?");
  if (!ok) return;
  await idbDelete(id);
  await renderAll();
}
function resetEditMode(){
  if ($("editId")) $("editId").value = "";
  if ($("logFormTitle")) $("logFormTitle").textContent = "Neuer Eintrag (rückwirkend möglich)";
  if ($("add")) $("add").textContent = "Eintrag speichern";
  $("cancelEdit")?.classList.add("hide");
}

/* =========================
   LOG UI + PREVIEW
========================= */
function removeBonusCheckboxes(){
  ["rpe9","tech","pause"].forEach(id => {
    const el = $(id);
    if (!el) return;
    const label = el.closest("label");
    if (label) label.remove();
    else el.remove();
  });
}
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

  if (!isWalk && !isRest && $("sets") && setRec.value) {
    const el = $("sets");
    const raw = (el.value ?? "").trim();
    const isEditing = (document.activeElement === el);
    if (!isEditing && (raw === "" || parseInt(raw,10) <= 0)) el.value = String(setRec.value);
  }
  if (!isWalk && !isRest && $("reps")) {
    const el = $("reps");
    const raw = (el.value ?? "").trim();
    const isEditing = (document.activeElement === el);
    if (!isEditing && raw === "") {
      const n = (repRec.match(/\d+/) || [])[0];
      if (n) el.value = n;
    }
  }

  const mutMult = mutationXpMultiplierForType(type, mutation);
  const skillMult = skillMultiplierForType(type);
  const rewardMult = rewardActiveForWeek(week) ? 1.05 : 1.0;

  if ($("logAdaptive")) {
    $("logAdaptive").textContent =
      `W${week} • Mut x${mutMult.toFixed(2)} • Skill x${skillMult.toFixed(2)} • Reward x${rewardMult.toFixed(2)} • Adaptive nur Empfehlungen`;
  }

  updateCalcPreview(week, mutation);
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

  if (t === "Mehrgelenkig") out.STR += xp;
  else if (t === "Unilateral") out.STA += xp;
  else if (t === "Conditioning") out.END += xp;
  else if (t === "Core") out.MOB += xp;
  else if (t === "Komplexe") { out.STR += xp*0.4; out.STA += xp*0.2; out.END += xp*0.2; out.MOB += xp*0.2; }
  else if (t === "NEAT") { out.END += xp*0.7; out.MOB += xp*0.3; }
  else if (t === "Boss-Workout") { out.STR += xp*0.25; out.STA += xp*0.25; out.END += xp*0.25; out.MOB += xp*0.25; }
  else return out;

  return out;
}
function applyMutationToAttr(attr, mutation){
  const out = { ...attr };
  if (mutation?.mult?.STR) out.STR *= mutation.mult.STR;
  if (mutation?.mult?.STA) out.STA *= mutation.mult.STA;
  if (mutation?.mult?.END) out.END *= mutation.mult.END;
  if (mutation?.mult?.MOB) out.MOB *= mutation.mult.MOB;
  return out;
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
   ENTRIES LIST
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
   SAVE / UPDATE ENTRY (XP per exercise) + PR Pop-Up
========================= */
async function saveOrUpdateEntry(){
  const dateISO2 = $("date")?.value || isoDate(new Date());
  const week = currentWeekFor(dateISO2);

  const exName = $("exercise")?.value || "Unbekannt";
  const type = typeForExercise(exName);

  const entries = sortEntriesDesc(await idbGetAll());
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

  // PR Score
  const minutesForPR = type === "NEAT" ? Math.max(0, parseInt($("walkMin")?.value || "0", 10)) : 0;
  const prScore = prScoreForEntry(type, sets, reps, minutesForPR);

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
    await idbPut({ id: editId, date: dateISO2, week, exercise: exName, type, detail, xp });
    resetEditMode();
    alert(`Gespeichert (Edit): ${dateISO2} • +${xp} XP ✅`);
  } else {
    await idbAdd({ date: dateISO2, week, exercise: exName, type, detail, xp });
    alert(`Gespeichert: ${dateISO2} • +${xp} XP ✅`);
  }

  // PR Pop-Up + optional Bonus XP
  await handlePROnSave({
    exName,
    type,
    score: prScore,
    dateISO: dateISO2,
    week
  });

  // Draft für dieses Datum löschen
  clearLogDraft(dateISO2);

  await renderAll();
}

/* =========================
   MAIN RENDER
========================= */
async function renderAll(){
  ensureStartDate();
  buildExerciseDropdown();
  removeBonusCheckboxes();

  const raw = await idbGetAll();
  const entries = sortEntriesDesc(raw);

  const stats = await computeStats(entries);

  const evalRes = await evaluateWeeklyAchievements(entries, stats.curWeek);
  const finalEntries = evalRes.newlyEarned?.length ? sortEntriesDesc(await idbGetAll()) : entries;
  const stats2 = await computeStats(finalEntries);

  if ($("startDisplay")) $("startDisplay").textContent = stats2.startDate;
  if ($("weekNumber")) $("weekNumber").textContent = `W${stats2.curWeek}`;
  if ($("blockNow")) $("blockNow").textContent = blockName(weekBlock(stats2.curWeek));
  if ($("blockHint")) $("blockHint").textContent = weeklyProgressHint(stats2.curWeek);

  const thrToday = getStarThresholdsForWeek(stats2.curWeek, finalEntries);

  if ($("todayXp")) $("todayXp").textContent = stats2.todayXp;
  if ($("todayStars")) $("todayStars").textContent = starsForDay(stats2.todayXp, thrToday);
  if ($("weekXp")) $("weekXp").textContent = stats2.weekXp;
  if ($("totalXp")) $("totalXp").textContent = stats2.totalXp;

  const lv = levelFromTotalXp(stats2.totalXp);
  if ($("level")) $("level").textContent = lv.lvl;
  if ($("title")) $("title").textContent = titleForLevel(lv.lvl);

  renderMutationUI(stats2.curWeek);
  renderAttributes(stats2.attr);

  if ($("wkTrainDays")) $("wkTrainDays").textContent = evalRes.trainDays ?? 0;
  if ($("wkThreeStarDays")) $("wkThreeStarDays").textContent = evalRes.threeStarDays ?? 0;
  const earnedNames = (evalRes.earned || []).map(id => ACHIEVEMENTS.find(a=>a.id===id)?.name).filter(Boolean);
  if ($("wkAchievements")) $("wkAchievements").textContent = earnedNames.length ? earnedNames.join(", ") : "—";
  const adaptive = getAdaptiveModifiers(finalEntries, stats2.curWeek);
  if ($("adaptiveHint")) $("adaptiveHint").textContent = adaptive.note;

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

  // PR Top 10 card on Dashboard (auto-inject, no HTML changes)
  const dash = document.querySelector("#tab-dash");
  if (dash && !document.getElementById("prTop10Box")) {
    const card = document.createElement("div");
    card.className = "card";
    card.id = "prTop10Box";
    card.innerHTML = `
      <h2>🏆 Top 10 PRs</h2>
      <div class="hint">Score: Sets×Reps (NEAT=Minuten)</div>
      <ul id="prTop10List" class="list"></ul>
    `;
    dash.appendChild(card);
  }
  const prList = document.getElementById("prTop10List");
  if (prList) {
    const top = top10PRs();
    prList.innerHTML = top.length ? "" : "<li>Noch keine PRs.</li>";
    top.forEach((p, i) => {
      const li = document.createElement("li");
      li.innerHTML = `<b>#${i+1}</b> ${p.name} • <b>${p.bestScore}</b> • ${p.bestDate ? p.bestDate : ""} <span class="hint">(${p.type})</span>`;
      prList.appendChild(li);
    });
  }

  renderCalendar(finalEntries);
  renderWeeklyPlan(stats2.curWeek, finalEntries);

  renderQuests();
  renderBoss(stats2.curWeek);

  ensureDashboardSkillPill();
  const sp = computeSkillPointsAvailable(finalEntries);
  if ($("skillPointsAvail")) $("skillPointsAvail").textContent = sp.available;
  renderSkillTrees(finalEntries, stats2.curWeek);

  await updateLogUI(finalEntries);
  renderAllEntriesList(finalEntries);

  if ($("countEntries")) $("countEntries").textContent = finalEntries.length;

  const thr = getStarThresholdsForWeek(stats2.curWeek, finalEntries);
  const rew = rewardActiveForWeek(stats2.curWeek) ? "Reward +5% aktiv" : "Reward —";
  if ($("appStatus")) $("appStatus").textContent = `OK • ⭐ ${thr.one} • ⭐⭐ ${thr.two} • ⭐⭐⭐ ${thr.three} • ${rew}`;
}

/* =========================
   INIT + EVENTS
========================= */
async function init(){
  try {
    if ($("date")) $("date").value = isoDate(new Date());
    ensureStartDate();
    buildExerciseDropdown();
    resetEditMode();
    removeBonusCheckboxes();

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

    $("date")?.addEventListener("change", async () => {
      const st = loadCalendarState();
      st.selectedDate = $("date").value;
      saveCalendarState(st);
      await renderAll();
    });

    $("exercise")?.addEventListener("change", async () => { await renderAll(); });

    ["sets","reps","walkMin"].forEach(id=>{
      const el = $(id);
      if (!el) return;
      el.addEventListener("input", async ()=>{
        const d = $("date")?.value || isoDate(new Date());
        const w = currentWeekFor(d);
        const mut = getMutationForWeek(w);
        updateCalcPreview(w, mut);
      });
      el.addEventListener("change", async ()=>{ await renderAll(); });
    });

    // Auto-save bei jeder Eingabe im Log
    ["exercise","sets","reps","walkMin","date"].forEach(id => {
      const el = $(id);
      if (!el) return;
      el.addEventListener("input", autosaveLogDraft);
      el.addEventListener("change", autosaveLogDraft);
    });

    // Save / update
    $("add")?.addEventListener("click", saveOrUpdateEntry);

    $("cancelEdit")?.addEventListener("click", async ()=>{
      resetEditMode();
      await renderAll();
    });

    $("clear")?.addEventListener("click", async () => {
      if (confirm("Wirklich ALLE Einträge löschen?")) {
        await idbClear();
        await renderAll();
      }
    });

    $("resetBoss")?.addEventListener("click", async () => {
      if (confirm("Boss-Fight Status & Checks zurücksetzen?")) {
        localStorage.removeItem(KEY_BOSS);
        localStorage.removeItem(KEY_BOSSCHK);
        await renderAll();
      }
    });

    $("exportCsv")?.addEventListener("click", async () => {
      const entries = sortEntriesDesc(await idbGetAll());
      if (!entries.length) return alert("Keine Einträge zum Exportieren.");
      downloadCSV("ironquest_export.csv", toCSV(entries));
    });

    $("resetSkills")?.addEventListener("click", async ()=>{
      if (confirm("Skilltree zurücksetzen?")) {
        const st = loadSkillState();
        st.spent = 0;
        st.nodes = Object.fromEntries(TREES.map(t => [t.key, defaultNodesForTree(t.key)]));
        saveSkillState(st);
        await renderAll();
      }
    });

    if ("serviceWorker" in navigator) {
      try { await navigator.serviceWorker.register("sw.js"); } catch(e){ console.warn("SW register failed", e); }
    }

    await recalcAllEntryWeeks();
    await renderAll();
  } catch (e) {
    console.error(e);
    if ($("appStatus")) $("appStatus").textContent = "ERROR (siehe Konsole)";
    alert("Fehler in app.js. Bitte Screenshot der Konsole schicken.");
  }
}

/* =========================
   LOG DRAFT AUTOSAVE
========================= */
const LOG_DRAFT_KEY = "ironquest_log_draft_v1";

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
   ADD-ON: Auto-Balance + Plan-Day Quick Log (Batch)
========================= */
function deepClone(obj){ return JSON.parse(JSON.stringify(obj)); }

function computeXpForExerciseOnDate(exName, dateISO){
  const week = currentWeekFor(dateISO);
  const type = typeForExercise(exName);
  const mutation = getMutationForWeek(week);

  let base = 0;
  if (type === "NEAT") {
    const minutes = Math.max(1, parseInt($("walkMin")?.value || "60", 10));
    base = neatXP(minutes);
  } else if (type === "Rest") {
    base = 0;
  } else {
    base = XP_PER_EXERCISE[type] ?? 0;
  }

  const mutMult = mutationXpMultiplierForType(type, mutation);
  const skillMult = skillMultiplierForType(type);
  const rewardMult = rewardActiveForWeek(week) ? 1.05 : 1.0;

  return {
    xp: Math.round(base * mutMult * skillMult * rewardMult),
    week,
    type,
    multInfo: `Mut x${mutMult.toFixed(2)} • Skill x${skillMult.toFixed(2)} • Reward x${rewardMult.toFixed(2)}`
  };
}

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
  { id:"more_legs", label:"Mehr Beine (weniger Upper Zubehör)" },
  { id:"more_core", label:"Mehr Core/Mobility (ohne Extra-Trainingstag)" },
  { id:"more_engine", label:"Mehr Conditioning (mehr Engine)" },
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
  const newPlan = deepClone(plan);

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
    const row2 = pickByNameFallback(pullPool, ["1-arm db row (elbow", "1-arm db row", "renegade"], "1-Arm DB Row (Elbow close)");
    const rear = pickByNameFallback(pullPool, ["reverse fly"], "Reverse Flys (langsam)");
    if (Array.isArray(newPlan.Tue) && newPlan.Tue.length >= 5){
      newPlan.Tue[0] = "1-Arm DB Row (Pause oben)";
      newPlan.Tue[1] = row2;
      newPlan.Tue[2] = rear;
    }
  }

  if (presetId === "more_legs"){
    const squat = pickByNameFallback(legsPool, ["goblet squat"], "Goblet Squat");
    const hinge = pickByNameFallback(legsPool, ["romanian deadlift", "rdl"], "DB Romanian Deadlift");
    const glute = pickByNameFallback(legsPool, ["hip thrust"], "Hip Thrust (Floor)");
    const uni = pickByNameFallback(legsPool, ["bulgarian"], "Bulgarian Split Squats");
    const calf = pickByNameFallback(legsPool, ["calf"], "Standing DB Calf Raises");
    newPlan.Thu = [uni, squat, hinge, glute, calf];
    if (Array.isArray(newPlan.Fri) && newPlan.Fri.length >= 5){
      newPlan.Fri[4] = "Goblet Squat Hold";
    }
  }

  if (presetId === "more_core"){
    if (Array.isArray(newPlan.Thu) && newPlan.Thu.length >= 5){
      newPlan.Thu[3] = "Dead Bug";
    }
    if (Array.isArray(newPlan.Sat) && newPlan.Sat.length >= 5){
      newPlan.Sat[4] = "Plank Shoulder Taps";
    }
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
      <span class="hint">Passt den Wochenplan an (Overrides nur für diese Woche).</span>
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
  const parent = addBtn.closest(".card") || addBtn.parentElement;
  if (!parent) return;

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
  parent.prepend(panel);

  panel.querySelector("#planFill").addEventListener("click", async ()=>{
    const dateISO = $("date")?.value || isoDate(new Date());
    const week = currentWeekFor(dateISO);
    const plan = getWeekPlan(week);
    const key = panel.querySelector("#planDaySelect").value;
    const list = (plan[key] || []).filter(Boolean);

    if (!list.length) return alert("Keine Übungen im Plan-Day gefunden.");

    const exSel = $("exercise");
    if (exSel) exSel.value = list[0];

    $("planPreview").textContent = `W${week} ${key}: ${list.join(" • ")}`;
    await renderAll();
  });

  panel.querySelector("#planAutoLog").addEventListener("click", async ()=>{
    const dateISO = $("date")?.value || isoDate(new Date());
    const week = currentWeekFor(dateISO);
    const plan = getWeekPlan(week);
    const key = panel.querySelector("#planDaySelect").value;
    const list = (plan[key] || []).filter(Boolean);

    if (!list.length) return alert("Keine Übungen im Plan-Day gefunden.");

    const ok = confirm(
      `Auto-Log für ${dateISO} (W${week})?\n\n` +
      `${list.length} Übungen werden gespeichert:\n- ${list.join("\n- ")}\n`
    );
    if (!ok) return;

    let total = 0;
    const entriesToAdd = [];

    const allEntries = sortEntriesDesc(await idbGetAll());
    const adaptive = getAdaptiveModifiers(allEntries, week);

    for (const exName of list){
      const { xp, type, multInfo } = computeXpForExerciseOnDate(exName, dateISO);
      total += xp;

      const setRec = recommendedSetsForExercise(exName, type, week, adaptive).text;
      const repRec = recommendedRepsForExercise(exName, type, week, adaptive);

      const detail = `Auto-Log • Empf: ${setRec} / ${repRec} • ${multInfo}`;

      entriesToAdd.push({ date: dateISO, week, exercise: exName, type, detail, xp });
    }

    await idbAddMany(entriesToAdd);
    await renderAll();
    alert(`Auto-Log 완료 ✅ ${list.length} Übungen • +${total} XP`);
  });
}

// Wrap renderWeeklyPlan to inject Auto-Balance UI every time
const __origRenderWeeklyPlan = renderWeeklyPlan;
renderWeeklyPlan = function(curWeek, entries){
  __origRenderWeeklyPlan(curWeek, entries);
  try { injectAutoBalanceUI(curWeek); } catch(e){ console.warn(e); }
};

// Wrap updateLogUI to restore draft after rendering recommendations
const __origUpdateLogUI = updateLogUI;
updateLogUI = async function(entries){
  await __origUpdateLogUI(entries);
  restoreLogDraft();
};

// Wrap renderAll to ensure QuickLog UI stays injected
const __origRenderAll = renderAll;
renderAll = async function(){
  await __origRenderAll();
  try { injectQuickLogUI(); } catch(e){ console.warn(e); }
};

init();
