/* =========================
   IRON QUEST – PWA
   - IndexedDB entries
   - Startdate used everywhere (retroactively changeable)
   - Retroactive logging
   - Exercises + Types + grouped dropdown
   - Weekly Plan screen (Tag 1–5)
   - Daily Quests (auto entry, 1x/day)
   - Bossfights (weeks 2/4/6/8/10/12), locked outside correct week
   - Boss checklist + clear only if checked
   - Achievements weekly (auto)
   - Weekly RNG Mutations (fixed per week)
   - Attributes STR/STA/END/MOB + leveling
   - CSV export
   - FIX: Sets input editable (no overwrite while typing)
   - FIX: No renderAll spam on sets input (iOS safe)
   ========================= */

console.log("IRON QUEST loaded ✅");

// ---------- IndexedDB ----------
const DB_NAME = "ironquest_db";
const DB_VERSION = 1;
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
      }
    };

    req.onsuccess = () => resolve(req.result);
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

async function idbAddMany(entries) {
  for (const e of entries) await idbAdd(e);
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

async function idbClear() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

// ---------- localStorage keys ----------
const KEY_BOSS     = "ironquest_boss_v10";
const KEY_BOSSCHK  = "ironquest_boss_checks_v10";
const KEY_START    = "ironquest_startdate_v10";
const KEY_QUESTS   = "ironquest_dailyquests_v10";
const KEY_ACH      = "ironquest_weeklyach_v10";
const KEY_MUT      = "ironquest_mutations_v3";

// ---------- Helpers ----------
function $(id){ return document.getElementById(id); }
function isoDate(d){ return new Date(d).toISOString().slice(0,10); }
function loadJSON(key, fallback){
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function saveJSON(key, value){
  localStorage.setItem(key, JSON.stringify(value));
}
function getWeekNumber(startDateISO, dateISO){
  const start = new Date(startDateISO);
  const cur = new Date(dateISO);
  const diffDays = Math.floor((cur - start) / (1000*60*60*24));
  return diffDays < 0 ? 0 : Math.floor(diffDays / 7) + 1;
}
function sortEntriesDesc(entries){
  return entries.sort((a,b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return (b.id ?? 0) - (a.id ?? 0);
  });
}
function clampWeek(w){ return Math.max(1, Math.min(12, w || 1)); }

// ✅ Startdate is the anchor
function ensureStartDate(){
  let start = localStorage.getItem(KEY_START);
  if (!start) {
    const d = $("date")?.value;
    start = d || isoDate(new Date());
    localStorage.setItem(KEY_START, start);
  }
  if ($("startDateDash")) $("startDateDash").value = start;
  return start;
}
function setStartDateLocal(newISO){
  localStorage.setItem(KEY_START, newISO);
  if ($("startDateDash")) $("startDateDash").value = newISO;
}
function currentWeekFor(dateISO){
  const start = ensureStartDate();
  return clampWeek(getWeekNumber(start, dateISO));
}
function currentWeekToday(){
  return currentWeekFor(isoDate(new Date()));
}

// ✅ When Startdate changes: recalc weeks for ALL entries
async function recalcAllEntryWeeks(){
  const start = ensureStartDate();
  const all = await idbGetAll();
  for (const e of all){
    const nw = clampWeek(getWeekNumber(start, e.date));
    if (e.week !== nw){
      e.week = nw;
      await idbPut(e);
    }
  }
}

// If startdate changes, week-bound systems become inconsistent -> reset those maps
function resetWeekBoundSystems(){
  localStorage.removeItem(KEY_MUT);
  localStorage.removeItem(KEY_ACH);
  localStorage.removeItem(KEY_BOSS);
  localStorage.removeItem(KEY_BOSSCHK);
  // quests can remain (they are date-based), but entries created by quests
  // will already be re-weeked by recalcAllEntryWeeks().
}

// ---------- XP ----------
const XP_PER_SET = {
  "Mehrgelenkig": 100,
  "Unilateral": 120,
  "Komplexe": 150,
  "Core": 80,
  "Conditioning": 200
};
function bonusXP({ rpe9, tech, pause }) {
  return (rpe9 ? 50 : 0) + (tech ? 25 : 0) + (pause ? 25 : 0);
}
function neatXP(minutes) { return Math.max(0, Math.round(minutes * 5)); }

const LEVELS = [
  { xp: 0, lvl: 1 },
  { xp: 2500, lvl: 5 },
  { xp: 6000, lvl: 10 },
  { xp: 12000, lvl: 15 },
  { xp: 20000, lvl: 20 },
];
function xpToLevel(totalXp) {
  let lvl = 1;
  for (const step of LEVELS) if (totalXp >= step.xp) lvl = step.lvl;
  return lvl;
}
function getTitle(level) {
  if (level >= 20) return "Iron Champion";
  if (level >= 15) return "Elite";
  if (level >= 10) return "Veteran";
  if (level >= 5) return "Krieger";
  return "Anfänger";
}
function starsForToday(xp){
  if (xp >= 1100) return "⭐⭐⭐";
  if (xp >= 800) return "⭐⭐";
  if (xp >= 500) return "⭐";
  return "—";
}

// ---------- Blocks ----------
function weekBlock(w){
  const ww = clampWeek(w);
  return ww <= 4 ? 1 : (ww <= 8 ? 2 : 3);
}
function blockName(block){
  if (block === 1) return "Block 1 (Technik/ROM)";
  if (block === 2) return "Block 2 (Volumen/Progress)";
  return "Block 3 (Dichte/Intensität)";
}
function weeklyProgressHint(week){
  const b = weekBlock(week);
  if (b === 1) return "Technik/ROM, Progress über Wiederholungen.";
  if (b === 2) return "Mehr Volumen (Sätze), Progress über Gewicht oder Reps.";
  return "Dichte/Intensität (Pausen etwas kürzer, Tempo kontrolliert).";
}

// ---------- Weekly Mutations ----------
const MUTATIONS = [
  { id:"tempo", name:"Tempo Week", desc:"Langsame Exzentrik, saubere ROM. STR/STA XP Bonus.", effect:"STR/STA XP +10%", mult:{ STR:1.10, STA:1.10 } },
  { id:"corefocus", name:"Core Focus", desc:"Core & Kontrolle im Zentrum. MOB XP Bonus.", effect:"MOB XP +25%", mult:{ MOB:1.25 } },
  { id:"engine", name:"Engine Mode", desc:"Konditionierung bekommt den Boost. END XP Bonus.", effect:"END XP +15%", mult:{ END:1.15 } },
  { id:"neatboost", name:"NEAT Boost", desc:"Alltag zählt mehr. Walking/NEAT XP Bonus.", effect:"NEAT XP +20%", mult:{ NEAT:1.20 } },
  { id:"unilateral", name:"Unilateral Blessing", desc:"Stabilität und Balance. STA XP Bonus.", effect:"STA XP +15%", mult:{ STA:1.15 } },
];

function loadMutMap(){ return loadJSON(KEY_MUT, {}); }
function saveMutMap(m){ saveJSON(KEY_MUT, m); }
function getMutationForWeek(week){
  const w = clampWeek(week);
  const map = loadMutMap();
  if (!map[w]) {
    const choice = MUTATIONS[Math.floor(Math.random() * MUTATIONS.length)];
    map[w] = choice.id;
    saveMutMap(map);
  }
  return MUTATIONS.find(m => m.id === map[w]) || MUTATIONS[0];
}

function mutationXpMultiplierForType(type, mutation){
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

// ---------- Adaptive ----------
function computeWeekDayXP(entries, weekNum){
  const dayXP = {};
  for (const e of entries){
    if (e.week !== weekNum) continue;
    dayXP[e.date] = (dayXP[e.date] || 0) + (e.xp || 0);
  }
  return dayXP;
}
function getAdaptiveModifiers(entries, curWeek){
  const prev = curWeek - 1;
  if (prev < 1) return { setDelta: 0, repDelta: 0, note: "Startwoche: neutral." };

  const dayXP = computeWeekDayXP(entries, prev);
  const days = Object.keys(dayXP);
  const trainDays = days.filter(d => dayXP[d] >= 500).length;
  const twoStarDays = days.filter(d => dayXP[d] >= 800).length;
  const threeStarDays = days.filter(d => dayXP[d] >= 1100).length;

  if (trainDays >= 5 && threeStarDays >= 2) return { setDelta:+1, repDelta:+2, note:`Elite Woche (W${prev}) → +1 Satz & +2 Reps.` };
  if (trainDays >= 4 && (twoStarDays >= 2 || threeStarDays >= 1)) return { setDelta:+1, repDelta:+1, note:`Starke Woche (W${prev}) → +1 Satz & +1 Rep.` };
  if (trainDays <= 2) return { setDelta:-1, repDelta:-1, note:`Schwache Woche (W${prev}) → Deload -1 Satz & -1 Rep.` };
  return { setDelta:0, repDelta:0, note:`Stabil (W${prev}) → neutral.` };
}

function applySetDeltaText(text, delta){
  const nums = text.match(/\d+/g)?.map(n => parseInt(n,10));
  if (!nums || nums.length === 0) return text;
  const newNums = nums.map(n => Math.max(1, n + delta));
  let i = 0;
  return text.replace(/\d+/g, () => String(newNums[i++]));
}

// Base recommendations
function baseRecommendedSets(type, week){
  const b = weekBlock(week);
  if (type === "NEAT") return { text:"Minuten statt Sätze", value:null };
  if (type === "Conditioning") return b === 1 ? { text:"4–5 Runden", value:4 } : (b === 2 ? { text:"5–6 Runden", value:5 } : { text:"5–6 Runden (kürzere Pausen)", value:5 });
  if (type === "Core") return b === 1 ? { text:"3 Sätze", value:3 } : { text:"4 Sätze", value:4 };
  if (type === "Komplexe") return b === 1 ? { text:"4–5 Runden", value:4 } : (b === 2 ? { text:"5–6 Runden", value:5 } : { text:"6 Runden", value:6 });
  return b === 1 ? { text:"3–4 Sätze", value:4 } : (b === 2 ? { text:"4–5 Sätze", value:5 } : { text:"4–5 Sätze (Tempo/Pausen härter)", value:5 });
}
function baseRecommendedReps(type, week){
  const b = weekBlock(week);
  if (type === "NEAT") return "Minuten (z. B. 30–60)";
  if (type === "Core") return b === 1 ? "30–45s pro Satz" : "40–60s pro Satz";
  if (type === "Conditioning") return b === 1 ? "30–40s Arbeit / 60s Pause" : (b === 2 ? "35–45s / 45–60s Pause" : "40–45s / 30–45s Pause");
  if (type === "Komplexe") return b === 1 ? "6–8 Wdh pro Movement" : "6 Wdh pro Movement";
  return b === 1 ? "10–12 Wdh/Satz" : (b === 2 ? "8–10 Wdh/Satz" : "6–8 Wdh/Satz");
}

// Weak point overrides
function overridesForExercise(exName){
  if (!exName) return null;
  if (exName.includes("Farmer")) return { setsText:"2–3 Runden", setsValue:3, repsText:"30–60s pro Runde (aufrecht, Core fest)" };
  if (exName.includes("Lateral")) return { setsText:"3 Sätze", setsValue:3, repsText:"12–20 Wdh (2–3s runter, kein Schwung)" };
  if (exName.includes("Hamstring Walkouts")) return { setsText:"3 Sätze", setsValue:3, repsText:"8–12 Wdh (kontrolliert, lange Schritte)" };
  if (exName.includes("Calf")) return { setsText:"3–4 Sätze", setsValue:4, repsText:"15–25 Wdh (oben 1s halten, volle ROM)" };
  if (exName.includes("Tibialis")) return { setsText:"2–3 Sätze", setsValue:2, repsText:"15–30 Wdh (kurze Pausen ok)" };
  return null;
}

function recommendedSetsForExercise(exName, type, week, adaptive){
  const ov = overridesForExercise(exName);
  const base = ov ? { text: ov.setsText, value: ov.setsValue } : baseRecommendedSets(type, week);
  if (type === "NEAT") return base;

  const d = adaptive?.setDelta ?? 0;
  if (!d) return base;
  return { text: applySetDeltaText(base.text, d) + " (adaptive)", value: base.value == null ? null : Math.max(1, base.value + d) };
}
function recommendedRepsForExercise(exName, type, week, adaptive){
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

// ---------- Exercises (grouped dropdown) ----------
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

function buildExerciseDropdown(){
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

  // keep selection if possible
  if (prev && [...sel.options].some(o => o.value === prev)) sel.value = prev;
  else sel.selectedIndex = 0;
}

function typeForExercise(exName){
  return EXERCISES.find(e => e.name === exName)?.type ?? "Mehrgelenkig";
}

// ---------- Attribute system ----------
function attrReqForLevel(level){ return 800 + (level - 1) * 120; }
function attrLevelFromXp(totalXp){
  let lvl = 1;
  let xp = totalXp;
  while (true) {
    const req = attrReqForLevel(lvl);
    if (xp >= req) { xp -= req; lvl += 1; }
    else break;
  }
  return { lvl, into: xp, need: attrReqForLevel(lvl) };
}

function baseAttrFromEntry(e){
  const out = { STR:0, STA:0, END:0, MOB:0 };
  const xp = e.xp || 0;
  const t = e.type || "";
  const name = e.exercise || "";

  if (t === "Mehrgelenkig") out.STR += xp;
  else if (t === "Unilateral") out.STA += xp;
  else if (t === "Conditioning") out.END += xp;
  else if (t === "Core") out.MOB += xp;
  else if (t === "Komplexe") {
    out.STR += xp * 0.4; out.STA += xp * 0.2; out.END += xp * 0.2; out.MOB += xp * 0.2;
  } else if (t === "NEAT") {
    out.END += xp * 0.7; out.MOB += xp * 0.3;
  } else if (t === "Boss-Workout") {
    out.STR += xp * 0.25; out.STA += xp * 0.25; out.END += xp * 0.25; out.MOB += xp * 0.25;
  } else {
    out.STR += xp * 0.25; out.STA += xp * 0.25; out.END += xp * 0.25; out.MOB += xp * 0.25;
  }

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
  return out;
}

// ---------- Quests ----------
const QUESTS = [
  { id:"steps10k", name:"10.000 Schritte", xp:100, note:"NEAT-Boost" },
  { id:"mobility10", name:"10 Min Mobility", xp:50, note:"Hüfte/Schulter/Wirbelsäule" },
  { id:"water", name:"2,5–3L Wasser", xp:30, note:"Regeneration" },
  { id:"sleep", name:"7h+ Schlaf", xp:50, note:"Performance" },
  { id:"calves", name:"Waden erledigt (Calf Raises)", xp:30, note:"Achilles/Knie & Optik" },
  { id:"laterals", name:"Seitliche Schulter (Lateral Raises)", xp:30, note:"Schulterbreite & Stabilität" },
  { id:"hamknee", name:"Hamstrings (Walkouts)", xp:40, note:"Knee-Flexion Ersatz, Balance" },
  { id:"tibialis", name:"Tibialis (Shin Raises)", xp:25, note:"Schienbein/Knöchel, Prävention" },
];

function loadQuestState(){ return loadJSON(KEY_QUESTS, {}); }
function saveQuestState(s){ saveJSON(KEY_QUESTS, s); }

function isQuestDoneToday(qState, questId, today){ return qState?.[today]?.[questId] === true; }

async function setQuestDoneToday(questId, done){
  const today = isoDate(new Date());
  const qState = loadQuestState();
  qState[today] ??= {};
  const already = qState[today][questId] === true;
  if (done && already) return;
  if (done) qState[today][questId] = true;
  else delete qState[today][questId];
  saveQuestState(qState);

  if (done) {
    const q = QUESTS.find(x => x.id === questId);
    const week = currentWeekFor(today);
    await idbAdd({ date: today, week, exercise:`Daily Quest: ${q?.name ?? questId}`, type:"Quest", detail:"Completed", xp:q?.xp ?? 0 });
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
      if (e.target.checked) await setQuestDoneToday(q.id, true);
      else alert("Quest deaktiviert – XP-Eintrag bleibt bestehen (einfaches System).");
      await renderAll();
    });
  });
}

// ---------- Boss ----------
const BOSSES = [
  { week: 2, name: "The Foundation Beast", xp: 500, reward: "1 Joker + Titel: Foundation Slayer",
    workout: ["DB Goblet Squat – 5×10 (3s runter)","DB Floor Press – 5×8","DB Row – 5×10 (Pause oben)","Pause strikt 90s"]},
  { week: 4, name: "The Asymmetry Lord", xp: 600, reward: "+1 STA + Unilateral XP +10% (1 Woche)",
    workout: ["Bulgarian Split Squat – 4×8 je Seite","1-Arm DB Row – 4×10 je Seite","Side Plank – 3×45s je Seite","Regel: schwache Seite beginnt"]},
  { week: 6, name: "The Core Guardian", xp: 700, reward: "Core-Sätze 1 Woche doppelt XP",
    workout: ["Hollow Hold – 4×40s","Plank Shoulder Taps – 4×30","Goblet Squat Hold – 3×45s","Pausen max. 60s"]},
  { week: 8, name: "The Conditioning Reaper", xp: 800, reward: "+1 END + Conditioning ⭐⭐⭐",
    workout: ["5 Runden: 30s Burpees","30s Mountain Climbers","30s High Knees","Pause 60s (jede Runde gleich stark)"]},
  { week: 10, name: "The Iron Champion", xp: 1000, reward: "+1 Attribut deiner Wahl + Titel: Iron Challenger",
    workout: ["Komplex 6 Runden (je 6 Wdh)","Deadlift → Clean → Front Squat → Push Press","Hanteln nicht absetzen","Technik vor Tempo"]},
  { week: 12, name: "FINAL: Iron Overlord", xp: 2000, reward: "Titel: IRON OVERLORD SLAYER + New Game+",
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
      const start = ensureStartDate();
      const w = clampWeek(getWeekNumber(start, today));

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

      entriesToAdd.push({
        date: today,
        week: w,
        exercise: `Bossfight CLEARED: ${boss.name}`,
        type: "Boss",
        detail: `W${week} Clear`,
        xp: 0
      });

      await idbAddMany(entriesToAdd);

      const bs = loadBoss();
      bs[week] = { cleared:true, clearedAt: today };
      saveBoss(bs);

      await renderAll();
      alert(`Bossfight cleared! +${boss.xp} XP (auf Workout-Einträge verteilt)\nReward: ${boss.reward}`);
    });
  });
}

// ---------- Achievements ----------
const ACHIEVEMENTS = [
  { id:"noskip", name:"No Skip Week", xp:500, rule:"5 Trainingstage (≥500 XP)" },
  { id:"perfect", name:"Perfect Run", xp:600, rule:"5 Tage ⭐⭐ oder ⭐⭐⭐" },
  { id:"threestar", name:"3-Star Hunter", xp:400, rule:"mind. 2× ⭐⭐⭐" },
  { id:"questmaster", name:"Quest Master", xp:300, rule:"mind. 3 Daily Quests" },
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

  const dayXP = {};
  for (const e of entries){
    if (e.week !== weekNum) continue;
    dayXP[e.date] = (dayXP[e.date] || 0) + (e.xp || 0);
  }
  const dates = Object.keys(dayXP);
  const trainDays = dates.filter(d => dayXP[d] >= 500).length;
  const twoPlusDays = dates.filter(d => dayXP[d] >= 800).length;
  const threeStarDays = dates.filter(d => dayXP[d] >= 1100).length;
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
      await idbAdd({
        date: today,
        week: weekNum,
        exercise: `Achievement: ${a.name}`,
        type: "Achievement",
        detail: a.rule,
        xp: a.xp
      });
    }
  }

  return { earned: shouldEarn, newlyEarned, trainDays, threeStarDays };
}

// ---------- Weekly Plan ----------
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
function getBossForWeek(w){ return BOSSES.find(b => b.week === w) || null; }

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
        <li><b>NEAT Walking Desk (3 km/h)</b><br><span class="small">${baseRecommendedReps("NEAT", w)} • XP = Minuten × 5</span></li>
        <li><b>Ruhetag / Mobility</b><br><span class="small">10–20 Min Mobility + Spaziergang = Fortschritt</span></li>
      </ul>
    </div>
  `;

  content.innerHTML = html;
}

// ---------- Log UI (FIXED sets editing) ----------
async function updateLogUI(entries){
  if ($("logStart")) $("logStart").textContent = ensureStartDate();

  // date can be retroactive
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

  const isWalk = (type === "NEAT");
  $("walkingRow")?.classList.toggle("hide", !isWalk);
  $("setsRow")?.classList.toggle("hide", isWalk);

  // ✅ FIX: Auto-fill sets ONLY if empty/0 and NOT while user edits (focus)
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

  // calculate preview (no full render needed)
  updateCalcPreview(week, mutation);
}

// ✅ preview calc (no renderAll needed)
function updateCalcPreview(week, mutation){
  const exName = $("exercise")?.value;
  const type = typeForExercise(exName);

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
  xp = Math.round(xp * mult);

  if ($("calcXp")) $("calcXp").textContent = xp;
  if ($("calcInfo")) $("calcInfo").textContent = `${mutation.name} • W${week}`;
}

// ---------- Stats + Attributes ----------
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

// ---------- CSV ----------
function csvSafe(v){
  const s = String(v ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replaceAll('"','""')}"`;
  return s;
}
function toCSV(entries){
  const header = ["date","week","exercise","type","detail","xp"];
  const rows = [header.join(",")];
  entries.forEach(e => rows.push([e.date, e.week, csvSafe(e.exercise), e.type, csvSafe(e.detail), e.xp].join(",")));
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

// ---------- Render All ----------
async function renderAll(){
  ensureStartDate();
  buildExerciseDropdown(); // keeps dropdown stable

  const raw = await idbGetAll();
  const entries = sortEntriesDesc(raw);

  const stats = await computeStats(entries);

  // achievements for current week
  const evalRes = await evaluateWeeklyAchievements(entries, stats.curWeek);
  const finalEntries = evalRes.newlyEarned?.length ? sortEntriesDesc(await idbGetAll()) : entries;
  const stats2 = await computeStats(finalEntries);

  if ($("startDisplay")) $("startDisplay").textContent = stats2.startDate;
  if ($("weekNumber")) $("weekNumber").textContent = `W${stats2.curWeek}`;
  if ($("blockNow")) $("blockNow").textContent = blockName(weekBlock(stats2.curWeek));
  if ($("blockHint")) $("blockHint").textContent = weeklyProgressHint(stats2.curWeek);

  if ($("todayXp")) $("todayXp").textContent = stats2.todayXp;
  if ($("todayStars")) $("todayStars").textContent = starsForToday(stats2.todayXp);
  if ($("weekXp")) $("weekXp").textContent = stats2.weekXp;
  if ($("totalXp")) $("totalXp").textContent = stats2.totalXp;

  const lvl = xpToLevel(stats2.totalXp);
  if ($("level")) $("level").textContent = lvl;
  if ($("title")) $("title").textContent = getTitle(lvl);

  renderMutationUI(stats2.curWeek);
  renderAttributes(stats2.attr);

  if ($("wkTrainDays")) $("wkTrainDays").textContent = evalRes.trainDays ?? 0;
  if ($("wkThreeStarDays")) $("wkThreeStarDays").textContent = evalRes.threeStarDays ?? 0;

  const earnedNames = (evalRes.earned || []).map(id => ACHIEVEMENTS.find(a=>a.id===id)?.name).filter(Boolean);
  if ($("wkAchievements")) $("wkAchievements").textContent = earnedNames.length ? earnedNames.join(", ") : "—";

  const adaptive = getAdaptiveModifiers(finalEntries, stats2.curWeek);
  if ($("adaptiveHint")) $("adaptiveHint").textContent = adaptive.note;

  // Recent list
  const recent = finalEntries.slice(0, 6);
  const recentList = $("recentList");
  if (recentList){
    recentList.innerHTML = recent.length ? "" : "<li>Noch keine Einträge.</li>";
    recent.forEach(e => {
      const li = document.createElement("li");
      li.textContent = `${e.date} (W${e.week}) • ${e.exercise} • ${e.type} • ${e.xp} XP`;
      recentList.appendChild(li);
    });
  }

  // All entries list
  const list = $("list");
  if (list){
    list.innerHTML = finalEntries.length ? "" : "<li>Noch keine Einträge.</li>";
    finalEntries.forEach(e => {
      const li = document.createElement("li");
      li.textContent = `${e.date} (W${e.week}) • ${e.exercise} • ${e.type} • ${e.detail} • ${e.xp} XP`;
      list.appendChild(li);
    });
  }

  if ($("countEntries")) $("countEntries").textContent = finalEntries.length;

  renderQuests();
  renderBoss(stats2.curWeek);
  renderWeeklyPlan(stats2.curWeek, finalEntries);

  // update log UI with current entries context
  await updateLogUI(finalEntries);
}

// ---------- Init ----------
async function init(){
  try {
    if ($("date")) $("date").value = isoDate(new Date());
    ensureStartDate();
    buildExerciseDropdown();

    // Save start date retroactively (dashboard)
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
      await renderAll();
      alert("Startdatum gespeichert & Einträge neu berechnet ✅");
    });

    // Changing date/exercise should re-render recommendations/plan/etc.
    $("date")?.addEventListener("change", async () => { await renderAll(); });
    $("exercise")?.addEventListener("change", async () => { await renderAll(); });

    // ✅ FIX: Do NOT renderAll on each keystroke for sets/walkMin
    // Only update XP preview while typing; full render on change (done)
    ["sets","walkMin"].forEach(id => {
      const el = $(id);
      if (!el) return;

      el.addEventListener("input", async () => {
        const dateISO = $("date")?.value || isoDate(new Date());
        const week = currentWeekFor(dateISO);
        const mutation = getMutationForWeek(week);
        updateCalcPreview(week, mutation);
      });

      el.addEventListener("change", async () => {
        await renderAll();
      });
    });

    // Bonus checkboxes: update preview only
    ["rpe9","tech","pause"].forEach(id => {
      const el = $(id);
      if (!el) return;
      el.addEventListener("change", async () => {
        const dateISO = $("date")?.value || isoDate(new Date());
        const week = currentWeekFor(dateISO);
        const mutation = getMutationForWeek(week);
        updateCalcPreview(week, mutation);
      });
    });

    // Add entry (retroactive date supported)
    $("add")?.addEventListener("click", async () => {
      const date = $("date")?.value || isoDate(new Date());
      const week = currentWeekFor(date);

      const exName = $("exercise")?.value || "Unbekannt";
      const type = typeForExercise(exName);

      const entries = sortEntriesDesc(await idbGetAll());
      const adaptive = getAdaptiveModifiers(entries, week);
      const mutation = getMutationForWeek(week);
      const repRec = recommendedRepsForExercise(exName, type, week, adaptive);

      let xp = 0, detail = "";

      if (type === "NEAT") {
        const minutes = Math.max(1, parseInt($("walkMin")?.value || "0", 10));
        xp = neatXP(minutes);
        detail = `${minutes} min • Empf.: ${repRec}`;
      } else {
        const setsRaw = ($("sets")?.value ?? "").trim();
        const sets = Math.max(1, parseInt(setsRaw || "1", 10) || 1);

        const flags = { rpe9: $("rpe9")?.checked, tech: $("tech")?.checked, pause: $("pause")?.checked };
        xp = (XP_PER_SET[type] ?? 0) * sets + bonusXP(flags);
        detail = `${sets} sets • Empf.: ${repRec}`;
        if (flags.rpe9 || flags.tech || flags.pause) detail += " • +bonus";
      }

      const mult = mutationXpMultiplierForType(type, mutation);
      xp = Math.round(xp * mult);

      await idbAdd({
        date, week,
        exercise: exName,
        type,
        detail: `${detail} • Mut: ${mutation.name} x${mult.toFixed(2)}`,
        xp
      });

      if ($("rpe9")) $("rpe9").checked = false;
      if ($("tech")) $("tech").checked = false;
      if ($("pause")) $("pause").checked = false;

      await renderAll();
      alert(`Gespeichert: ${date} (W${week}) • +${xp} XP ✅`);
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

    // Register SW (if exists)
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");

    // Ensure any old entries reflect current startdate
    await recalcAllEntryWeeks();
    await renderAll();
  } catch (e) {
    console.error(e);
    if ($("appStatus")) $("appStatus").textContent = "ERROR (siehe Konsole)";
    alert("Fehler in app.js. Bitte Screenshot der Konsole schicken.");
  }
}

init();
