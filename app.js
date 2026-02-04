console.log("IRON QUEST app.js loaded ✅");

const DB_NAME = "ironquest_db";
const DB_VERSION = 1;
const STORE = "entries";

const KEY_START  = "ironquest_startdate_v9";
const KEY_BOSS   = "ironquest_boss_v9";
const KEY_BOSSCHK= "ironquest_boss_checks_v9";
const KEY_QUESTS = "ironquest_dailyquests_v9";
const KEY_ACH    = "ironquest_weeklyach_v9";
const KEY_MUT    = "ironquest_mutations_v2";

function $(id){ return document.getElementById(id); }
function isoDate(d){ return new Date(d).toISOString().slice(0,10); }

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const s = db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
        s.createIndex("date", "date", { unique:false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGetAll(){
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function idbAdd(entry){
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).add(entry);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

async function idbPut(entry){
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(entry);
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

async function idbClear(){
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

function loadJSON(key, fallback){
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function saveJSON(key, value){ localStorage.setItem(key, JSON.stringify(value)); }

function getWeekNumber(startISO, dateISO){
  const start = new Date(startISO);
  const cur = new Date(dateISO);
  const diffDays = Math.floor((cur - start) / (1000*60*60*24));
  return diffDays < 0 ? 0 : Math.floor(diffDays / 7) + 1;
}
function clampWeek(w){ return Math.max(1, Math.min(12, w || 1)); }

function ensureStartDate(){
  let s = localStorage.getItem(KEY_START);
  if (!s) {
    s = isoDate(new Date());
    localStorage.setItem(KEY_START, s);
  }
  if ($("startDateDash")) $("startDateDash").value = s;
  return s;
}
function setStartDate(newISO){
  localStorage.setItem(KEY_START, newISO);
  if ($("startDateDash")) $("startDateDash").value = newISO;
}

function todayISO(){ return isoDate(new Date()); }

function sortEntriesDesc(entries){
  return entries.sort((a,b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return (b.id ?? 0) - (a.id ?? 0);
  });
}

// ------------------- XP / Levels -------------------
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
  { xp:0, lvl:1 },
  { xp:2500, lvl:5 },
  { xp:6000, lvl:10 },
  { xp:12000, lvl:15 },
  { xp:20000, lvl:20 },
];
function xpToLevel(total){
  let lvl = 1;
  for (const s of LEVELS) if (total >= s.xp) lvl = s.lvl;
  return lvl;
}
function getTitle(lvl){
  if (lvl >= 20) return "Iron Champion";
  if (lvl >= 15) return "Elite";
  if (lvl >= 10) return "Veteran";
  if (lvl >= 5) return "Krieger";
  return "Anfänger";
}
function starsForToday(xp){
  if (xp >= 1100) return "⭐⭐⭐";
  if (xp >= 800) return "⭐⭐";
  if (xp >= 500) return "⭐";
  return "—";
}

// ------------------- Blocks -------------------
function weekBlock(w){
  const ww = clampWeek(w);
  return ww <= 4 ? 1 : (ww <= 8 ? 2 : 3);
}
function blockName(b){
  if (b === 1) return "Block 1 (Technik/ROM)";
  if (b === 2) return "Block 2 (Volumen/Progress)";
  return "Block 3 (Dichte/Intensität)";
}
function weeklyProgressHint(week){
  const b = weekBlock(week);
  if (b === 1) return "Technik/ROM, Progress über Wiederholungen.";
  if (b === 2) return "Mehr Volumen (Sätze), Progress über Gewicht oder Reps.";
  return "Dichte/Intensität: Pausen kürzer, Tempo sauber.";
}

// ------------------- Mutations -------------------
const MUTATIONS = [
  { id:"tempo", name:"Tempo Week", desc:"Langsame Exzentrik, saubere ROM.", effect:"STR/STA XP +10%", mult:{ STR:1.10, STA:1.10 } },
  { id:"corefocus", name:"Core Focus", desc:"Core & Kontrolle.", effect:"MOB XP +25%", mult:{ MOB:1.25 } },
  { id:"engine", name:"Engine Mode", desc:"Konditionierung Boost.", effect:"END XP +15%", mult:{ END:1.15 } },
  { id:"neatboost", name:"NEAT Boost", desc:"Walking/NEAT zählt mehr.", effect:"NEAT XP +20%", mult:{ NEAT:1.20 } },
  { id:"unilateral", name:"Unilateral Blessing", desc:"Stabilität & Balance.", effect:"STA XP +15%", mult:{ STA:1.15 } },
];

function loadMutMap(){ return loadJSON(KEY_MUT, {}); }
function saveMutMap(m){ saveJSON(KEY_MUT, m); }

function getMutationForWeek(week){
  const w = clampWeek(week);
  const map = loadMutMap();
  if (!map[w]) {
    const pick = MUTATIONS[Math.floor(Math.random() * MUTATIONS.length)];
    map[w] = pick.id;
    saveMutMap(map);
  }
  return MUTATIONS.find(x => x.id === map[w]) || MUTATIONS[0];
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

// ------------------- Adaptive -------------------
function computeWeekDayXP(entries, weekNum){
  const dayXP = {};
  entries.forEach(e => {
    if (e.week !== weekNum) return;
    dayXP[e.date] = (dayXP[e.date] || 0) + (e.xp || 0);
  });
  return dayXP;
}
function getAdaptiveModifiers(entries, curWeek){
  const prev = curWeek - 1;
  if (prev < 1) return { setDelta:0, repDelta:0, note:"Startwoche: neutral." };

  const dayXP = computeWeekDayXP(entries, prev);
  const dates = Object.keys(dayXP);
  const trainDays = dates.filter(d => dayXP[d] >= 500).length;
  const twoStarDays = dates.filter(d => dayXP[d] >= 800).length;
  const threeStarDays = dates.filter(d => dayXP[d] >= 1100).length;

  if (trainDays >= 5 && threeStarDays >= 2) return { setDelta:+1, repDelta:+2, note:`Elite Woche (W${prev}) → +1 Satz & +2 Reps.` };
  if (trainDays >= 4 && (twoStarDays >= 2 || threeStarDays >= 1)) return { setDelta:+1, repDelta:+1, note:`Starke Woche (W${prev}) → +1 Satz & +1 Rep.` };
  if (trainDays <= 2) return { setDelta:-1, repDelta:-1, note:`Schwache Woche (W${prev}) → Deload -1/-1.` };
  return { setDelta:0, repDelta:0, note:`Stabil (W${prev}) → neutral.` };
}

function applySetDeltaText(text, delta){
  const nums = text.match(/\d+/g)?.map(n => parseInt(n,10));
  if (!nums || !nums.length) return text;
  const newNums = nums.map(n => Math.max(1, n + delta));
  let i = 0;
  return text.replace(/\d+/g, () => String(newNums[i++]));
}

function baseRecommendedSets(type, week){
  const b = weekBlock(week);
  if (type === "NEAT") return { text:"Minuten statt Sätze", value:null };
  if (type === "Conditioning") return b===1 ? { text:"4–5 Runden", value:4 } : { text:"5–6 Runden", value:5 };
  if (type === "Core") return b===1 ? { text:"3 Sätze", value:3 } : { text:"4 Sätze", value:4 };
  if (type === "Komplexe") return b===1 ? { text:"4–5 Runden", value:4 } : (b===2 ? { text:"5–6 Runden", value:5 } : { text:"6 Runden", value:6 });
  return b===1 ? { text:"3–4 Sätze", value:4 } : { text:"4–5 Sätze", value:5 };
}

function baseRecommendedReps(type, week){
  const b = weekBlock(week);
  if (type === "NEAT") return "Minuten (z. B. 30–60)";
  if (type === "Core") return b===1 ? "30–45s pro Satz" : "40–60s pro Satz";
  if (type === "Conditioning") return b===1 ? "30–40s Arbeit / 60s Pause" : "35–45s / 45–60s Pause";
  if (type === "Komplexe") return b===1 ? "6–8 Wdh pro Movement" : "6 Wdh pro Movement";
  return b===1 ? "10–12 Wdh/Satz" : (b===2 ? "8–10 Wdh/Satz" : "6–8 Wdh/Satz");
}

// Weak point overrides
function overridesForExercise(exName){
  if (!exName) return null;
  if (exName.includes("Farmer")) return { setsText:"2–3 Runden", setsValue:3, repsText:"30–60s pro Runde (Core fest)" };
  if (exName.includes("Lateral")) return { setsText:"3 Sätze", setsValue:3, repsText:"12–20 Wdh (2–3s runter)" };
  if (exName.includes("Hamstring Walkouts")) return { setsText:"3 Sätze", setsValue:3, repsText:"8–12 Wdh (kontrolliert)" };
  if (exName.includes("Calf")) return { setsText:"3–4 Sätze", setsValue:4, repsText:"15–25 Wdh (oben 1s halten)" };
  if (exName.includes("Tibialis")) return { setsText:"2–3 Sätze", setsValue:2, repsText:"15–30 Wdh" };
  return null;
}

function recommendedSetsForExercise(exName, type, week, adaptive){
  const ov = overridesForExercise(exName);
  const base = ov ? { text:ov.setsText, value:ov.setsValue } : baseRecommendedSets(type, week);
  if (type === "NEAT") return base;
  const d = adaptive?.setDelta ?? 0;
  if (!d) return base;
  return { text: applySetDeltaText(base.text, d) + " (adaptive)", value: base.value==null ? null : Math.max(1, base.value + d) };
}

function recommendedRepsForExercise(exName, type, week, adaptive){
  const ov = overridesForExercise(exName);
  if (ov) return ov.repsText; // keep cues stable
  const base = baseRecommendedReps(type, week);
  const d = adaptive?.repDelta ?? 0;
  if (!d || type === "NEAT") return base;

  const nums = base.match(/\d+/g)?.map(n => parseInt(n,10));
  if (!nums) return base;
  let i = 0;
  const shifted = base.replace(/\d+/g, () => String(Math.max(1, nums[i++] + d)));
  return shifted + " (adaptive)";
}

// ------------------- Exercises (FULL list incl. weak points + NEAT) -------------------
const EXERCISES = [
  { name: "DB Floor Press (neutral)", type:"Mehrgelenkig", group:"Tag 1 – Push" },
  { name: "Arnold Press", type:"Mehrgelenkig", group:"Tag 1 – Push" },
  { name: "Deficit Push-Ups", type:"Mehrgelenkig", group:"Tag 1 – Push" },
  { name: "Overhead Trizeps Extension", type:"Mehrgelenkig", group:"Tag 1 – Push" },
  { name: "DB Lateral Raises", type:"Mehrgelenkig", group:"Tag 1 – Push" },

  { name: "1-Arm DB Row (Pause oben)", type:"Unilateral", group:"Tag 2 – Pull" },
  { name: "Renegade Rows", type:"Unilateral", group:"Tag 2 – Pull" },
  { name: "Reverse Flys (langsam)", type:"Mehrgelenkig", group:"Tag 2 – Pull" },
  { name: "Cross-Body Hammer Curl", type:"Mehrgelenkig", group:"Tag 2 – Pull" },
  { name: "Farmer’s Carry (DB)", type:"Unilateral", group:"Tag 2 – Pull" },

  { name: "Bulgarian Split Squats", type:"Unilateral", group:"Tag 3 – Beine & Core" },
  { name: "DB Romanian Deadlift", type:"Mehrgelenkig", group:"Tag 3 – Beine & Core" },
  { name: "Cossack Squats", type:"Unilateral", group:"Tag 3 – Beine & Core" },
  { name: "Side Plank + Leg Raise", type:"Core", group:"Tag 3 – Beine & Core" },
  { name: "Hamstring Walkouts", type:"Core", group:"Tag 3 – Beine & Core" },
  { name: "Standing DB Calf Raises", type:"Core", group:"Tag 3 – Beine & Core" },

  { name: "Komplex: Deadlift", type:"Komplexe", group:"Tag 4 – Ganzkörper" },
  { name: "Komplex: Clean", type:"Komplexe", group:"Tag 4 – Ganzkörper" },
  { name: "Komplex: Front Squat", type:"Komplexe", group:"Tag 4 – Ganzkörper" },
  { name: "Komplex: Push Press", type:"Komplexe", group:"Tag 4 – Ganzkörper" },
  { name: "Goblet Squat Hold", type:"Core", group:"Tag 4 – Ganzkörper" },
  { name: "Plank Shoulder Taps", type:"Core", group:"Tag 4 – Ganzkörper" },

  { name: "Burpees", type:"Conditioning", group:"Tag 5 – Conditioning & Core" },
  { name: "Mountain Climbers", type:"Conditioning", group:"Tag 5 – Conditioning & Core" },
  { name: "Russian Twists (DB)", type:"Core", group:"Tag 5 – Conditioning & Core" },
  { name: "Hollow Body Hold", type:"Core", group:"Tag 5 – Conditioning & Core" },
  { name: "Tibialis Raises", type:"Core", group:"Tag 5 – Conditioning & Core" },

  { name: "Walking Desk (Laufband 3 km/h)", type:"NEAT", group:"NEAT / Alltag" },
];

function buildExerciseDropdown(){
  const sel = $("exercise");
  if (!sel) return;
  sel.innerHTML = "";

  const groups = {};
  EXERCISES.forEach(ex => {
    groups[ex.group] ??= [];
    groups[ex.group].push(ex);
  });

  Object.keys(groups).forEach(g => {
    const og = document.createElement("optgroup");
    og.label = g;
    groups[g].forEach(ex => {
      const opt = document.createElement("option");
      opt.value = ex.name;
      opt.textContent = ex.name;
      og.appendChild(opt);
    });
    sel.appendChild(og);
  });

  if (sel.options.length) sel.selectedIndex = 0;
}

function typeForExercise(name){
  return EXERCISES.find(e => e.name === name)?.type ?? "Mehrgelenkig";
}

// ------------------- Attributes -------------------
function attrReqForLevel(level){ return 800 + (level - 1) * 120; }
function attrLevelFromXp(totalXp){
  let lvl = 1;
  let xp = totalXp;
  while (true) {
    const req = attrReqForLevel(lvl);
    if (xp >= req) { xp -= req; lvl += 1; } else break;
  }
  return { lvl, into: xp, need: attrReqForLevel(lvl) };
}

function baseAttrFromEntry(e){
  const xp = e.xp || 0;
  const t = e.type || "";
  const name = e.exercise || "";

  let STR=0, STA=0, END=0, MOB=0;

  if (t === "Mehrgelenkig") STR += xp;
  else if (t === "Unilateral") STA += xp;
  else if (t === "Conditioning") END += xp;
  else if (t === "Core") MOB += xp;
  else if (t === "Komplexe") { STR += xp*0.4; STA += xp*0.2; END += xp*0.2; MOB += xp*0.2; }
  else if (t === "NEAT") { END += xp*0.7; MOB += xp*0.3; }
  else { STR += xp*0.25; STA += xp*0.25; END += xp*0.25; MOB += xp*0.25; }

  // weak point split
  if (name.includes("Lateral")) { STR = xp*0.7; MOB = xp*0.3; STA=0; END=0; }
  if (name.includes("Calf") || name.includes("Tibialis")) { MOB = xp*0.8; END = xp*0.2; STR=0; STA=0; }
  if (name.includes("Hamstring Walkouts")) { MOB = xp*0.6; STA = xp*0.4; STR=0; END=0; }
  if (name.includes("Farmer")) { STR = xp*0.5; STA = xp*0.5; END=0; MOB=0; }

  return { STR, STA, END, MOB };
}

function applyMutationToAttr(attr, mutation){
  const out = { ...attr };
  if (mutation?.mult?.STR) out.STR *= mutation.mult.STR;
  if (mutation?.mult?.STA) out.STA *= mutation.mult.STA;
  if (mutation?.mult?.END) out.END *= mutation.mult.END;
  if (mutation?.mult?.MOB) out.MOB *= mutation.mult.MOB;
  return out;
}

// ------------------- Quests -------------------
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
function isQuestDone(dateISO, questId){
  const s = loadQuestState();
  return s?.[dateISO]?.[questId] === true;
}
async function setQuestDone(dateISO, questId, done){
  const s = loadQuestState();
  s[dateISO] ??= {};
  if (done) s[dateISO][questId] = true;
  saveQuestState(s);

  if (done) {
    const q = QUESTS.find(x => x.id === questId);
    const start = ensureStartDate();
    const w = clampWeek(getWeekNumber(start, dateISO));
    await idbAdd({ date: dateISO, week: w, exercise:`Daily Quest: ${q.name}`, type:"Quest", detail:"Completed", xp:q.xp });
  }
}

function renderQuests(){
  const dateISO = todayISO();
  const ul = $("questList");
  if (!ul) return;
  ul.innerHTML = "";

  QUESTS.forEach(q => {
    const done = isQuestDone(dateISO, q.id);
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
      if (e.target.checked) await setQuestDone(dateISO, q.id, true);
      else alert("Quest deaktiviert – XP-Eintrag bleibt bestehen (einfaches System).");
      await renderAll();
    });
  });
}

// ------------------- Bossfights -------------------
const BOSSES = [
  { week:2, name:"The Foundation Beast", xp:500, reward:"1 Joker + Titel: Foundation Slayer",
    workout:["DB Goblet Squat – 5×10 (3s runter)","DB Floor Press – 5×8","DB Row – 5×10 (Pause oben)","Pause strikt 90s"]},
  { week:4, name:"The Asymmetry Lord", xp:600, reward:"+1 STA + Unilateral XP +10% (1 Woche)",
    workout:["Bulgarian Split Squat – 4×8 je Seite","1-Arm DB Row – 4×10 je Seite","Side Plank – 3×45s je Seite","Regel: schwache Seite beginnt"]},
  { week:6, name:"The Core Guardian", xp:700, reward:"Core-Sätze 1 Woche doppelt XP",
    workout:["Hollow Hold – 4×40s","Plank Shoulder Taps – 4×30","Goblet Squat Hold – 3×45s","Pausen max. 60s"]},
  { week:8, name:"The Conditioning Reaper", xp:800, reward:"+1 END + Conditioning ⭐⭐⭐",
    workout:["5 Runden: 30s Burpees","30s Mountain Climbers","30s High Knees","Pause 60s"]},
  { week:10, name:"The Iron Champion", xp:1000, reward:"+1 Attribut deiner Wahl + Titel: Iron Challenger",
    workout:["Komplex 6 Runden (je 6 Wdh)","Deadlift → Clean → Front Squat → Push Press","Hanteln nicht absetzen","Technik vor Tempo"]},
  { week:12, name:"FINAL: Iron Overlord", xp:2000, reward:"Titel: IRON OVERLORD SLAYER + New Game+",
    workout:["Goblet Squat – 4×12","DB Floor Press – 4×10","1-Arm DB Row – 4×10","Bulgarian Split Squat – 3×8","Plank – 3×60s"]},
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
  const c = getBossChecksFor(week, dateISO);
  for (let i=0;i<workoutLen;i++) if (!c[i]) return false;
  return true;
}
function splitXP(total, n){
  const base = Math.floor(total/n);
  const rem = total - base*n;
  const arr = Array(n).fill(base);
  arr[n-1] += rem;
  return arr;
}

function renderBoss(curWeek){
  const start = ensureStartDate();
  const today = todayISO();
  if ($("bossStartDisplay")) $("bossStartDisplay").textContent = start;
  if ($("bossCurrentWeek")) $("bossCurrentWeek").textContent = `W${curWeek}`;

  const ul = $("bossList");
  if (!ul) return;
  ul.innerHTML = "";

  const bossState = loadBoss();

  BOSSES.forEach(b => {
    const st = bossState[b.week] ?? { cleared:false, clearedAt:null };
    const isWeek = curWeek === b.week;
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

      const start = ensureStartDate();
      const w = clampWeek(getWeekNumber(start, todayISO()));

      if (w !== week) return alert(`LOCKED. Aktuell W${w}. Dieser Boss ist nur in W${week}.`);
      if (!allBossChecksDone(week, todayISO(), boss.workout.length)) return alert("Erst alle Checkboxen abhaken!");

      const xpParts = splitXP(boss.xp, boss.workout.length);
      for (let i=0;i<boss.workout.length;i++){
        await idbAdd({
          date: todayISO(),
          week,
          exercise: `Boss W${week}: ${boss.workout[i]}`,
          type: "Boss-Workout",
          detail: `${boss.name} • Reward: ${boss.reward}`,
          xp: xpParts[i]
        });
      }
      await idbAdd({ date: todayISO(), week, exercise:`Bossfight CLEARED: ${boss.name}`, type:"Boss", detail:`W${week} Clear`, xp:0 });

      const bs = loadBoss();
      bs[week] = { cleared:true, clearedAt: todayISO() };
      saveBoss(bs);

      await renderAll();
      alert(`Bossfight cleared! +${boss.xp} XP\nReward: ${boss.reward}`);
    });
  });
}

// ------------------- Achievements -------------------
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
  const dayXP = {};
  entries.forEach(e => {
    if (e.week !== weekNum) return;
    dayXP[e.date] = (dayXP[e.date] || 0) + (e.xp || 0);
  });

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

  const state = loadWeeklyAch();
  state[weekNum] ??= {};
  const newly = [];

  for (const id of shouldEarn){
    if (!state[weekNum][id]) {
      state[weekNum][id] = true;
      newly.push(id);
    }
  }
  saveWeeklyAch(state);

  if (newly.length){
    const today = todayISO();
    for (const id of newly){
      const a = ACHIEVEMENTS.find(x => x.id === id);
      if (!a) continue;
      await idbAdd({ date: today, week: weekNum, exercise:`Achievement: ${a.name}`, type:"Achievement", detail:a.rule, xp:a.xp });
    }
  }

  return { earned: shouldEarn, newlyEarned: newly, trainDays, threeStarDays };
}

// ------------------- Weekly Plan -------------------
function groupExercisesByDay(){
  const map = {
    "Tag 1 – Push": [],
    "Tag 2 – Pull": [],
    "Tag 3 – Beine & Core": [],
    "Tag 4 – Ganzkörper": [],
    "Tag 5 – Conditioning & Core": []
  };
  EXERCISES.forEach(ex => { if (map[ex.group]) map[ex.group].push(ex); });
  return map;
}
function getBossForWeek(w){ return BOSSES.find(b => b.week === w) || null; }

function renderWeeklyPlan(curWeek, entries){
  const content = $("planContent");
  if (!content) return;

  const start = ensureStartDate();
  const w = clampWeek(curWeek);
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
  html += `<div class="pill"><b>Quests:</b> ${QUESTS.map(q => `${q.name} (+${q.xp})`).join(" • ")}</div>`;
  html += `<div class="divider"></div>`;
  html += `<div class="pill"><b>Mutation:</b> ${mutation.name} • <span class="small">${mutation.desc}</span><br><span class="small">${mutation.effect}</span></div>`;
  html += `<div class="divider"></div>`;

  if (boss) {
    html += `<div class="pill"><b>Boss diese Woche:</b> ${boss.name} (W${boss.week}) • +${boss.xp} XP<br><span class="small">Clear nur in W${boss.week} im Boss-Tab.</span></div>`;
  } else {
    html += `<div class="pill"><b>Boss diese Woche:</b> keiner (Boss-Wochen: 2/4/6/8/10/12)</div>`;
  }
  html += `<div class="divider"></div>`;

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
      <h3>Extra</h3>
      <ul class="planList">
        <li><b>Walking Desk (3 km/h)</b><br><span class="small">30–60 min • XP = Minuten × 5</span></li>
        <li><b>Mobility</b><br><span class="small">10–20 min, Schulter/Hüfte/Wirbelsäule</span></li>
      </ul>
    </div>
  `;

  content.innerHTML = html;
}

// ------------------- Retroactive Startdate: recalc ALL weeks -------------------
async function recalcAllEntryWeeks(){
  const start = ensureStartDate();
  const all = await idbGetAll();

  for (const e of all){
    const newWeek = clampWeek(getWeekNumber(start, e.date));
    if (e.week !== newWeek) {
      e.week = newWeek;
      await idbPut(e);
    }
  }
}

// When start date changes, week logic changes -> reset week-bound systems
function resetWeekBoundSystems(){
  localStorage.removeItem(KEY_MUT);
  localStorage.removeItem(KEY_ACH);
  localStorage.removeItem(KEY_BOSS);
  localStorage.removeItem(KEY_BOSSCHK);
}

// ------------------- Log UI -------------------
async function updateLogUI(entries){
  const start = ensureStartDate();
  if ($("logStart")) $("logStart").textContent = start;

  const date = $("date")?.value || todayISO();
  const w = clampWeek(getWeekNumber(start, date));
  if ($("logWeek")) $("logWeek").textContent = `W${w}`;

  const mutation = getMutationForWeek(w);
  const adaptive = getAdaptiveModifiers(entries, w);

  const exName = $("exercise")?.value;
  const type = typeForExercise(exName);

  if ($("autoType")) $("autoType").textContent = type;

  const setRec = recommendedSetsForExercise(exName, type, w, adaptive);
  const repRec = recommendedRepsForExercise(exName, type, w, adaptive);

  if ($("recommendedSets")) $("recommendedSets").textContent = setRec.text;
  if ($("recommendedReps")) $("recommendedReps").textContent = repRec;

  const isWalk = (type === "NEAT");
  $("walkingRow")?.classList.toggle("hide", !isWalk);
  $("setsRow")?.classList.toggle("hide", isWalk);

  if (!isWalk && setRec.value && $("sets")) {
    const current = parseInt($("sets").value || "1", 10);
    if (!current || current === 1) $("sets").value = setRec.value;
  }

  ["rpe9","tech","pause"].forEach(id => {
    const el = $(id);
    if (!el) return;
    el.disabled = isWalk;
    if (isWalk) el.checked = false;
  });

  const mult = mutationXpMultiplierForType(type, mutation);
  if ($("logAdaptive")) {
    $("logAdaptive").textContent =
      `W${w} • Mutation: ${mutation.name} x${mult.toFixed(2)} • Adaptive: ${adaptive.setDelta>=0?"+":""}${adaptive.setDelta} Sets`;
  }

  updateCalcPreview(w, mutation);
}

function updateCalcPreview(weekNum, mutation){
  const exName = $("exercise")?.value;
  const type = typeForExercise(exName);

  let xp = 0;
  if (type === "NEAT") {
    const minutes = Math.max(1, parseInt($("walkMin")?.value || "0", 10));
    xp = neatXP(minutes);
  } else {
    const sets = Math.max(1, parseInt($("sets")?.value || "1", 10));
    const flags = { rpe9: $("rpe9")?.checked, tech: $("tech")?.checked, pause: $("pause")?.checked };
    xp = (XP_PER_SET[type] ?? 0) * sets + bonusXP(flags);
  }

  const mult = mutationXpMultiplierForType(type, mutation);
  const finalXP = Math.round(xp * mult);

  if ($("calcXp")) $("calcXp").textContent = finalXP;
  if ($("calcInfo")) $("calcInfo").textContent = `W${weekNum} • ${mutation.name}`;
}

// ------------------- Stats + Render -------------------
async function computeStats(entries){
  const start = ensureStartDate();
  const today = todayISO();
  const curWeek = clampWeek(getWeekNumber(start, today));

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

  return { start, today, curWeek, todayXp, weekXp, totalXp, attr };
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

async function renderAll(){
  ensureStartDate();
  buildExerciseDropdown(); // ✅ ensures exercises never “disappear”

  const entries = sortEntriesDesc(await idbGetAll());
  const stats = await computeStats(entries);

  // Achievements for current week
  const evalRes = await evaluateWeeklyAchievements(entries, stats.curWeek);

  // Re-load entries if achievements added
  const entries2 = evalRes.newlyEarned?.length ? sortEntriesDesc(await idbGetAll()) : entries;
  const stats2 = await computeStats(entries2);

  if ($("appStatus")) $("appStatus").textContent = "OK";
  if ($("startDisplay")) $("startDisplay").textContent = stats2.start;
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

  const adaptive = getAdaptiveModifiers(entries2, stats2.curWeek);
  if ($("adaptiveHint")) $("adaptiveHint").textContent = adaptive.note;

  // Recent list
  const recent = entries2.slice(0, 6);
  const recentList = $("recentList");
  if (recentList){
    recentList.innerHTML = recent.length ? "" : "<li>Noch keine Einträge.</li>";
    recent.forEach(e => {
      const li = document.createElement("li");
      li.textContent = `${e.date} (W${e.week}) • ${e.exercise} • ${e.type} • ${e.xp} XP`;
      recentList.appendChild(li);
    });
  }

  // Full list
  const list = $("list");
  if (list){
    list.innerHTML = entries2.length ? "" : "<li>Noch keine Einträge.</li>";
    entries2.forEach(e => {
      const li = document.createElement("li");
      li.textContent = `${e.date} (W${e.week}) • ${e.exercise} • ${e.type} • ${e.detail} • ${e.xp} XP`;
      list.appendChild(li);
    });
  }

  if ($("countEntries")) $("countEntries").textContent = entries2.length;

  renderQuests();
  renderBoss(stats2.curWeek);
  renderWeeklyPlan(stats2.curWeek, entries2);

  await updateLogUI(entries2);
}

// ------------------- CSV Export -------------------
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
  const blob = new Blob([content], { type:"text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ------------------- Init -------------------
async function init(){
  // default date = today (but user can change to past freely)
  if ($("date")) $("date").value = todayISO();

  ensureStartDate();
  buildExerciseDropdown();

  // Save start date retroactively from dashboard
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

    setStartDate(newStart);
    resetWeekBoundSystems();
    await recalcAllEntryWeeks();
    await renderAll();
    alert("Startdatum gespeichert & Einträge neu berechnet ✅");
  });

  $("date")?.addEventListener("change", async () => { await renderAll(); });
  $("exercise")?.addEventListener("change", async () => { await renderAll(); });

  ["sets","walkMin","rpe9","tech","pause"].forEach(id => {
    $(id)?.addEventListener("input", async () => { await renderAll(); });
    $(id)?.addEventListener("change", async () => { await renderAll(); });
  });

  $("add")?.addEventListener("click", async () => {
    const date = $("date")?.value || todayISO();
    const start = ensureStartDate();
    const week = clampWeek(getWeekNumber(start, date));

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
      const sets = Math.max(1, parseInt($("sets")?.value || "1", 10));
      const flags = { rpe9: $("rpe9")?.checked, tech: $("tech")?.checked, pause: $("pause")?.checked };
      xp = (XP_PER_SET[type] ?? 0) * sets + bonusXP(flags);
      detail = `${sets} sets • Empf.: ${repRec}`;
      if (flags.rpe9 || flags.tech || flags.pause) detail += " • +bonus";
    }

    const mult = mutationXpMultiplierForType(type, mutation);
    xp = Math.round(xp * mult);

    await idbAdd({
      date,
      week,
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
    if (confirm("Boss-Fights & Checks zurücksetzen?")) {
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

  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");

  await recalcAllEntryWeeks(); // ✅ ensures old entries match current startdate
  await renderAll();
}

init();
