/* =========================
   IRON QUEST – app.js (FULL)
   Changes requested:
   ✅ Exercise XP halved (incl. NEAT), Daily Quests halved, Boss unchanged
   ✅ Remove quests: calves, laterals, hamstrings, tibialis
   ✅ Stars: 3⭐ = EXACT XP of "all exercises in a day + daily quests" at MAX recommended sets (for that week's rules)
      1⭐/2⭐ adjusted proportionally
   ✅ Retroactive quests: quests apply to calendar-selected date (not only today)
   ✅ Remove RPE9/Technique/Pauses bonuses (hidden + no effect)
   ✅ Skilltree automation:
      - Skillpoints auto-earned (stars/day + boss clear + achievements)
      - Node tiers + unlock rules + costs
      - Dashboard shows available skillpoints
      - Tree gating: can only invest in tree if you trained that type in current week
   ✅ Keep everything else working: IndexedDB, Startdate retro, Calendar, Edit/Delete, Boss week lock, Weekly Plan, Mutations, Attributes, CSV
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
const KEY_START   = "ironquest_startdate_v12";
const KEY_MUT     = "ironquest_mutations_v5";
const KEY_QUESTS  = "ironquest_dailyquests_v12";
const KEY_BOSS    = "ironquest_boss_v12";
const KEY_BOSSCHK = "ironquest_boss_checks_v12";
const KEY_ACH     = "ironquest_weeklyach_v12";
const KEY_CAL     = "ironquest_calendar_v2"; // { weekOffset:number, selectedDate:"YYYY-MM-DD" }
const KEY_SKILL   = "ironquest_skilltree_v1"; // skill tree state

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
  // skill points are derived from entries -> no reset needed
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
   LEVEL SYSTEM (unchanged curve)
========================= */
function xpNeededForNextLevel(level) {
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
   ADAPTIVE
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

  // thresholds depend on prev week
  const thrPrev = getStarThresholdsForWeek(prev, entries);

  const trainDays = days.filter(d => dayXP[d] >= thrPrev.one).length;
  const twoStarDays = days.filter(d => dayXP[d] >= thrPrev.two).length;
  const threeStarDays = days.filter(d => dayXP[d] >= thrPrev.three).length;

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
function isWalkType(type){ return type === "NEAT"; }

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
   XP (HALVED exercises; Boss unchanged)
   - removed RPE/tech/pause bonuses entirely
========================= */
const XP_PER_SET = {
  "Mehrgelenkig": 55,   // halved
  "Unilateral": 65,     // halved
  "Komplexe": 80,       // halved
  "Core": 45,           // halved
  "Conditioning": 110   // halved
};

// NEAT: was 5/min, now half => 2.5/min (rounded)
function neatXP(minutes) {
  return Math.max(0, Math.round((minutes || 0) * 2.5));
}

/* =========================
   QUESTS (HALVED + removed 4)
   Retroactive: applies to calendar-selected date
========================= */
const QUESTS = [
  { id:"steps10k",   name:"10.000 Schritte",   xp:70, note:"NEAT-Boost" },          // halved
  { id:"mobility10", name:"10 Min Mobility",   xp:40, note:"Hüfte/Schulter/WS" },   // halved
  { id:"water",      name:"2,5–3L Wasser",     xp:22, note:"Regeneration" },        // halved
  { id:"sleep",      name:"7h+ Schlaf",        xp:45, note:"Performance" },         // halved
];

function loadQuestState(){ return loadJSON(KEY_QUESTS, {}); }
function saveQuestState(s){ saveJSON(KEY_QUESTS, s); }
function isQuestDoneForDay(qState, questId, dayISO){ return qState?.[dayISO]?.[questId] === true; }

// ✅ retro day quests: dayISO passed in
async function setQuestDoneForDay(questId, dayISO, done){
  const qState = loadQuestState();
  qState[dayISO] ??= {};
  const already = qState[dayISO][questId] === true;
  if (done && already) return;

  if (done) qState[dayISO][questId] = true;
  else delete qState[dayISO][questId];

  saveQuestState(qState);

  // write entry only on "done"
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

// Quests render for selected date (calendar), fallback today
function getSelectedDayISO(){
  const st = loadCalendarState();
  return st.selectedDate || isoDate(new Date());
}

function renderQuests(){
  const dayISO = getSelectedDayISO();
  const qState = loadQuestState();
  const ul = $("questList");
  if (!ul) return;
  ul.innerHTML = "";

  // info header row
  const info = document.createElement("li");
  info.innerHTML = `<div class="hint"><b>Quests-Datum:</b> ${dayISO} (im Kalender auswählen für rückwirkend)</div>`;
  ul.appendChild(info);

  QUESTS.forEach(q => {
    const done = isQuestDoneForDay(qState, q.id, dayISO);
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
      if (e.target.checked) {
        await setQuestDoneForDay(q.id, dayISO, true);
      } else {
        alert("Quest deaktiviert – der XP-Eintrag bleibt bestehen (simple).");
      }
      await renderAll();
    });
  });
}

/* =========================
   BOSSES (UNCHANGED XP)
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
        xp: xpParts[idx] // unchanged
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
   ACHIEVEMENTS (unchanged logic)
========================= */
const ACHIEVEMENTS = [
  { id:"noskip", name:"No Skip Week", xp:650, rule:"5 Trainingstage (≥1⭐)" },
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

  const thr = getStarThresholdsForWeek(weekNum, entries);
  const dayXP = computeWeekDayXP(entries, weekNum);
  const dates = Object.keys(dayXP);

  const trainDays = dates.filter(d => dayXP[d] >= thr.one).length;
  const twoPlusDays = dates.filter(d => dayXP[d] >= thr.two).length;
  const threeStarDays = dates.filter(d => dayXP[d] >= thr.three).length;
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
   STAR THRESHOLDS (dynamic, exact 3⭐)
   3⭐ = (ALL exercises in one day at MAX recommended sets for that week) + (ALL Daily Quests that day)
   - excludes mutations (base goal)
========================= */

// parse "3–4 Sätze" / "4–5 Runden" etc => take upper bound
function maxFromText(text){
  if (!text) return 0;
  const nums = (text.match(/\d+/g) || []).map(n => parseInt(n,10)).filter(n => !Number.isNaN(n));
  if (!nums.length) return 0;
  return Math.max(...nums);
}

function getMaxRecommendedSetsForExercise(exName, type, week, entries){
  const adaptive = getAdaptiveModifiers(entries, week);
  const rec = recommendedSetsForExercise(exName, type, week, adaptive);
  if (type === "NEAT") return 0;
  if (rec.value != null) return rec.value;
  return maxFromText(rec.text);
}

function baseDailyQuestTotalXP(){
  return QUESTS.reduce((s,q)=>s+(q.xp||0),0);
}

// choose NEAT minutes target used for 3⭐ goal
function neatTargetMinutesForThreeStar(){
  // "max recommended" in plan is 30–60, we use 60 as max
  return 60;
}

function computeThreeStarXPForWeek(week, entries){
  // Sum XP for ALL exercises (excluding NEAT from sets; add NEAT separately)
  let total = 0;

  for (const ex of EXERCISES){
    const type = ex.type;
    if (type === "NEAT") continue;

    const setsMax = getMaxRecommendedSetsForExercise(ex.name, type, week, entries);
    total += (XP_PER_SET[type] ?? 0) * setsMax;
  }

  // Add NEAT max
  total += neatXP(neatTargetMinutesForThreeStar());

  // Add ALL daily quests
  total += baseDailyQuestTotalXP();

  return Math.round(total);
}

function getStarThresholdsForWeek(_week, _entries){
  return { one: 1200, two: 1600, three: 2000 };
}

function starsForDay(xp, thresholds){
  if (xp >= thresholds.three) return "⭐⭐⭐";
  if (xp >= thresholds.two) return "⭐⭐";
  if (xp >= thresholds.one) return "⭐";
  return "—";
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
  return out;
}

/* =========================
   SKILLTREE (automated points + node logic)
========================= */
const TREES = [
  { key:"multi", name:"Mehrgelenkig (STR)", gateType:"Mehrgelenkig", domList:"tree-multi" },
  { key:"uni",   name:"Unilateral (STA)",   gateType:"Unilateral",   domList:"tree-uni" },
  { key:"core",  name:"Core (MOB/STA)",     gateType:"Core",         domList:"tree-core" },
  { key:"cond",  name:"Conditioning (END)", gateType:"Conditioning", domList:"tree-cond" },
  { key:"comp",  name:"Komplexe (ELITE)",   gateType:"Komplexe",     domList:"tree-comp" },
];

// Node set: same structure for each tree
// Costs: T1=1, T2=2, T3=3, Cap=5
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

  // Ensure all trees exist (forward compatibility)
  for (const t of TREES){
    if (!st.nodes?.[t.key]) st.nodes[t.key] = defaultNodesForTree(t.key);
  }
  if (typeof st.spent !== "number") st.spent = 0;

  return st;
}
function saveSkillState(st){
  saveJSON(KEY_SKILL, st);
}

function countUnlocked(nodes, tier){
  return nodes.filter(n => n.tier === tier && n.unlocked).length;
}
function isNodeAvailable(nodes, node){
  if (node.unlocked) return false;

  if (node.tier === 1) return true;

  if (node.tier === 2) return countUnlocked(nodes, 1) >= 2;
  if (node.tier === 3) return countUnlocked(nodes, 2) >= 2;
  if (node.tier === 4) return countUnlocked(nodes, 3) >= 1; // capstone requires Tier3
  return false;
}

function computeSkillPointsEarned(entries){
  // Earned points:
  // - per day stars: ⭐=1, ⭐⭐=2, ⭐⭐⭐=3 (using dynamic thresholds per that day week)
  // - boss clear entries: +3
  // - achievement entries: +1
  // Avoid double counting: stars are per day
  const start = ensureStartDate();

  // day->xp
  const dayXP = {};
  for (const e of entries){
    dayXP[e.date] = (dayXP[e.date] || 0) + (e.xp || 0);
  }

  // day stars -> points
  let points = 0;
  for (const dayISO of Object.keys(dayXP)){
    const w = clampWeek(getWeekNumber(start, dayISO));
    const thr = getStarThresholdsForWeek(w, entries);
    const s = starsForDay(dayXP[dayISO] || 0, thr);
    if (s === "⭐") points += 1;
    else if (s === "⭐⭐") points += 2;
    else if (s === "⭐⭐⭐") points += 3;
  }

  // boss clear -> +3
  const bossClears = entries.filter(e => e.type === "Boss" && String(e.exercise || "").startsWith("Bossfight CLEARED")).length;
  points += bossClears * 3;

  // achievements -> +1
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

// Gate: only allow investing in a tree if user has trained that type in CURRENT week
function getActiveTreeGates(entries, currentWeek){
  const typesThisWeek = new Set(entries.filter(e => e.week === currentWeek).map(e => e.type));
  return Object.fromEntries(TREES.map(t => [t.key, typesThisWeek.has(t.gateType)]));
}

function ensureDashboardSkillPill(){
  // Insert pill into "Heute" card if not present
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

  // Optional counters if present
  const spMulti = $("sp-multi"); if (spMulti) spMulti.textContent = sp.available;
  const spUni   = $("sp-uni");   if (spUni) spUni.textContent = sp.available;
  const spCore  = $("sp-core");  if (spCore) spCore.textContent = sp.available;
  const spCond  = $("sp-cond");  if (spCond) spCond.textContent = sp.available;
  const spComp  = $("sp-comp");  if (spComp) spComp.textContent = sp.available;

  // Render each tree list as nodes with Unlock button
  for (const tree of TREES){
    const ul = $(tree.domList);
    if (!ul) continue;
    ul.innerHTML = "";

    const gateOk = !!gates[tree.key];

    // Header
    const h = document.createElement("li");
    h.innerHTML = `<div class="hint"><b>${tree.name}</b> • Gate: ${gateOk ? "✅ aktiv (diese Woche trainiert)" : "🔒 gesperrt (diese Woche nicht trainiert)"}</div>`;
    ul.appendChild(h);

    const nodes = st.nodes[tree.key];

    nodes.forEach(node => {
      const available = isNodeAvailable(nodes, node);
      const canBuy = gateOk && available && (sp.available >= node.cost);

      const li = document.createElement("li");
      const status = node.unlocked ? "✅ unlocked" : (available ? "🔓 verfügbar" : "🔒 locked");

      li.innerHTML = `
        <div class="entryRow">
          <div style="min-width:240px;">
            <div><b>${node.name}</b></div>
            <div class="hint">Tier ${node.tier === 4 ? "Capstone" : node.tier} • Cost: ${node.cost} SP • ${status}</div>
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

  // Bind unlock buttons (event delegation)
  document.querySelectorAll("[data-node]").forEach(btn => {
    btn.onclick = async () => {
      const id = btn.getAttribute("data-node");
      const st2 = loadSkillState();
      const sp2 = computeSkillPointsAvailable(entries);
      const gates2 = getActiveTreeGates(entries, curWeek);

      // find node
      let found = null, treeKey = null;
      for (const t of TREES){
        const nodes = st2.nodes[t.key];
        const n = nodes.find(x => x.id === id);
        if (n) { found = n; treeKey = t.key; break; }
      }
      if (!found) return;

      if (!gates2[treeKey]) return alert("Tree ist gesperrt – trainiere diesen Übungstyp in der aktuellen Woche, dann kannst du investieren.");
      if (found.unlocked) return;
      const nodes = st2.nodes[treeKey];
      if (!isNodeAvailable(nodes, found)) return alert("Node ist noch locked – erfülle die Tier-Voraussetzungen.");
      if (sp2.available < found.cost) return alert("Nicht genug Skillpunkte.");

      // unlock
      found.unlocked = true;
      st2.spent = (st2.spent || 0) + found.cost;
      saveSkillState(st2);
      await renderAll();
    };
  });
}

/* =========================
   WEEKLY PLAN (unchanged)
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

  let html = "";
  html += `<div class="pill"><b>Daily Quests (rückwirkend möglich über Kalender):</b> ${QUESTS.map(q => `${q.name} (+${q.xp})`).join(" • ")}</div>`;
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
        <li><b>NEAT Walking Desk (3 km/h)</b><br><span class="small">Max-Ziel (für ⭐⭐⭐): ${neatTargetMinutesForThreeStar()} Min • XP = Minuten × 2.5</span></li>
      </ul>
    </div>
  `;
  content.innerHTML = html;
}

/* =========================
   CALENDAR (Weekly view) + Retro selection
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
  for (let i=0;i<7;i++){
    const dateISO = addDays(monday, i);
    const xp = dayXP[dateISO] || 0;

    const wDay = currentWeekFor(dateISO);
    const thr = getStarThresholdsForWeek(wDay, entries);
    const stars = starsForDay(xp, thr);

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
      if ($("date")) $("date").value = dateISO;
      await renderAll();
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

  const wDay = currentWeekFor(dateISO);
  const thr = getStarThresholdsForWeek(wDay, entries);

  if (title) title.textContent = `Tages-Einträge: ${dateISO}`;
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
  if ($("extraXp")) $("extraXp").value = "0"; // optional, kept but not needed

  const type = typeForExercise(e.exercise);

  if (type === "NEAT") {
    $("walkingRow")?.classList.remove("hide");
    $("setsRow")?.classList.add("hide");
    const m = (e.detail || "").match(/(\d+)\s*min/i);
    if (m && $("walkMin")) $("walkMin").value = m[1];
  } else {
    $("walkingRow")?.classList.add("hide");
    $("setsRow")?.classList.remove("hide");
    const s = (e.detail || "").match(/(\d+)\s*sets/i);
    if (s && $("sets")) $("sets").value = s[1];
  }

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
   - RPE/Tech/Pause ignored and hidden
========================= */
function hideBonusCheckboxes(){
  // If your HTML still contains these checkboxes, hide them safely:
  ["rpe9","tech","pause"].forEach(id => {
    const el = $(id);
    if (!el) return;
    el.checked = false;
    el.disabled = true;
    // hide its label wrapper
    const label = el.closest("label");
    if (label) label.style.display = "none";
  });
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

  // ✅ only autofill if empty and NOT focused
  if (!isWalk && setRec.value && $("sets")) {
    const setsEl = $("sets");
    const isEditing = (document.activeElement === setsEl);
    const raw = (setsEl.value ?? "").trim();
    const current = raw === "" ? null : parseInt(raw, 10);
    if (!isEditing && (current === null || Number.isNaN(current) || current <= 0)) {
      setsEl.value = String(setRec.value);
    }
  }

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
    xp = (XP_PER_SET[type] ?? 0) * sets;
  }

  const mult = mutationXpMultiplierForType(type, mutation);
  xp = Math.round(xp * mult) + extra;

  if ($("calcXp")) $("calcXp").textContent = xp;
  if ($("calcInfo")) $("calcInfo").textContent = `${mutation.name} • W${week}`;
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
   ENTRIES LIST + actions
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
    const sets = Math.max(1, parseInt(setsRaw || "1", 10) || 1);
    xp = (XP_PER_SET[type] ?? 0) * sets;
    detail = `${sets} sets • Empf.: ${repRec}`;
  }

  const mult = mutationXpMultiplierForType(type, mutation);
  xp = Math.round(xp * mult) + extra;

  const editId = parseInt(($("editId")?.value ?? "").trim(), 10);

  if (editId) {
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
    await idbAdd({
      date, week,
      exercise: exName,
      type,
      detail: `${detail} • Mut: ${mutation.name} x${mult.toFixed(2)} • +Extra ${extra}`,
      xp
    });
    alert(`Gespeichert: ${date} • +${xp} XP ✅`);
  }

  if ($("extraXp")) $("extraXp").value = "0";
  await renderAll();
}

/* =========================
   MAIN RENDER
========================= */
async function renderAll(){
  ensureStartDate();
  buildExerciseDropdown();
  hideBonusCheckboxes();

  const raw = await idbGetAll();
  const entries = sortEntriesDesc(raw);

  const stats = await computeStats(entries);

  // Achievements current week (may add entries)
  const evalRes = await evaluateWeeklyAchievements(entries, stats.curWeek);
  const finalEntries = evalRes.newlyEarned?.length ? sortEntriesDesc(await idbGetAll()) : entries;
  const stats2 = await computeStats(finalEntries);

  // dynamic thresholds for current week (for dashboard today stars)
  const thrCur = getStarThresholdsForWeek(stats2.curWeek, finalEntries);

  // Dashboard setup
  if ($("startDisplay")) $("startDisplay").textContent = stats2.startDate;
  if ($("weekNumber")) $("weekNumber").textContent = `W${stats2.curWeek}`;
  if ($("blockNow")) $("blockNow").textContent = blockName(weekBlock(stats2.curWeek));
  if ($("blockHint")) $("blockHint").textContent = weeklyProgressHint(stats2.curWeek);

  // Today XP & stars (today uses its own week)
  const todayISO = isoDate(new Date());
  const wToday = currentWeekFor(todayISO);
  const thrToday = getStarThresholdsForWeek(wToday, finalEntries);

  if ($("todayXp")) $("todayXp").textContent = stats2.todayXp;
  if ($("todayStars")) $("todayStars").textContent = starsForDay(stats2.todayXp, thrToday);
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

  // Quests (for selected date) + Boss
  renderQuests();
  renderBoss(stats2.curWeek);

  // Skill points pill + trees
  ensureDashboardSkillPill();
  const sp = computeSkillPointsAvailable(finalEntries);
  if ($("skillPointsAvail")) $("skillPointsAvail").textContent = sp.available;

  renderSkillTrees(finalEntries, stats2.curWeek);

  // Log UI + entries list
  await updateLogUI(finalEntries);
  renderAllEntriesList(finalEntries);

  if ($("countEntries")) $("countEntries").textContent = finalEntries.length;
  if ($("appStatus")) $("appStatus").textContent = `OK • ⭐: ${thrCur.one} • ⭐⭐: ${thrCur.two} • ⭐⭐⭐: ${thrCur.three}`;
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
    hideBonusCheckboxes();

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
      saveCalendarState({ weekOffset: 0, selectedDate: isoDate(new Date()) });

      await renderAll();
      alert("Startdatum gespeichert & Einträge neu berechnet ✅");
    });

    // Change date updates selected date + render
    $("date")?.addEventListener("change", async () => {
      const st = loadCalendarState();
      st.selectedDate = $("date").value;
      saveCalendarState(st);
      await renderAll();
    });
    $("exercise")?.addEventListener("change", async () => { await renderAll(); });

    // Typing => preview only (no render spam)
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

    // Optional: reset skilltree button if exists
    $("resetSkills")?.addEventListener("click", async ()=>{
      if (confirm("Skilltree zurücksetzen? (Nodes werden gelockt, Skillpunkte bleiben earned)")) {
        const st = loadSkillState();
        st.spent = 0;
        st.nodes = Object.fromEntries(TREES.map(t => [t.key, defaultNodesForTree(t.key)]));
        saveSkillState(st);
        await renderAll();
      }
    });

    // SW
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");

    // Align entries to startdate
    await recalcAllEntryWeeks();
    await renderAll();
  } catch (e) {
    console.error(e);
    if ($("appStatus")) $("appStatus").textContent = "ERROR (siehe Konsole)";
    alert("Fehler in app.js. Bitte Screenshot der Konsole schicken.");
  }
}

init();
