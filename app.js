/* =========================
   IRON QUEST – PWA LOGIC
   ========================= */

// --- Storage Keys ---
const KEY_ENTRIES = "ironquest_entries_v2";
const KEY_SKILLS  = "ironquest_skills_v1";
const KEY_BOSS    = "ironquest_boss_v1";
const KEY_START   = "ironquest_startdate_v1";

// --- XP Values ---
const XP_PER_SET = {
  "Mehrgelenkig": 100,
  "Unilateral": 120,
  "Komplexe": 150,
  "Core": 80,
  "Conditioning": 200,
  "NEAT": 0 // NEAT wird minutengenau berechnet, nicht per Satz
};

function bonusXP({ rpe9, tech, pause }) {
  return (rpe9 ? 50 : 0) + (tech ? 25 : 0) + (pause ? 25 : 0);
}

// Minutenbasiertes Walking: 60 min = 300 XP => 5 XP pro Minute
function neatXP(minutes) {
  return Math.max(0, Math.round(minutes * 5));
}

// XP -> Level
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

// --- Exercises + Auto Type ---
const EXERCISES = [
  // Tag 1 – Push
  { name: "DB Floor Press (neutral)", type: "Mehrgelenkig", group: "Tag 1 – Push" },
  { name: "Arnold Press", type: "Mehrgelenkig", group: "Tag 1 – Push" },
  { name: "Deficit Push-Ups", type: "Mehrgelenkig", group: "Tag 1 – Push" },
  { name: "Overhead Trizeps Extension", type: "Mehrgelenkig", group: "Tag 1 – Push" },

  // Tag 2 – Pull
  { name: "1-Arm DB Row (Pause oben)", type: "Unilateral", group: "Tag 2 – Pull" },
  { name: "Renegade Rows", type: "Unilateral", group: "Tag 2 – Pull" },
  { name: "Reverse Flys (langsam)", type: "Mehrgelenkig", group: "Tag 2 – Pull" },
  { name: "Cross-Body Hammer Curl", type: "Mehrgelenkig", group: "Tag 2 – Pull" },

  // Tag 3 – Beine & Core
  { name: "Bulgarian Split Squats", type: "Unilateral", group: "Tag 3 – Beine & Core" },
  { name: "DB Romanian Deadlift", type: "Mehrgelenkig", group: "Tag 3 – Beine & Core" },
  { name: "Cossack Squats", type: "Unilateral", group: "Tag 3 – Beine & Core" },
  { name: "Side Plank + Leg Raise", type: "Core", group: "Tag 3 – Beine & Core" },

  // Tag 4 – Ganzkörper
  { name: "Komplex: Deadlift", type: "Komplexe", group: "Tag 4 – Ganzkörper" },
  { name: "Komplex: Clean", type: "Komplexe", group: "Tag 4 – Ganzkörper" },
  { name: "Komplex: Front Squat", type: "Komplexe", group: "Tag 4 – Ganzkörper" },
  { name: "Komplex: Push Press", type: "Komplexe", group: "Tag 4 – Ganzkörper" },
  { name: "Goblet Squat Hold", type: "Core", group: "Tag 4 – Ganzkörper" },
  { name: "Plank Shoulder Taps", type: "Core", group: "Tag 4 – Ganzkörper" },

  // Tag 5 – Conditioning & Core
  { name: "Burpees", type: "Conditioning", group: "Tag 5 – Conditioning & Core" },
  { name: "Mountain Climbers", type: "Conditioning", group: "Tag 5 – Conditioning & Core" },
  { name: "Russian Twists (DB)", type: "Core", group: "Tag 5 – Conditioning & Core" },
  { name: "Hollow Body Hold", type: "Core", group: "Tag 5 – Conditioning & Core" },

  // NEAT
  { name: "Walking Desk (Laufband 3 km/h)", type: "NEAT", group: "NEAT / Alltag" },
];

// --- Skilltrees (Nodes in order) ---
const SKILLTREES = {
  multi: [
    { id:"m1", name:"Heavy Foundation", desc:"+10% XP auf Mehrgelenkig (nur Anzeige-Bonus)" },
    { id:"m2", name:"Tempo Control", desc:"3s Exzentrik → +25 Bonus-XP (manuell markieren)" },
    { id:"m3", name:"Time Under Tension", desc:"Letzter Satz ≥40s → +50 XP (manuell)" },
    { id:"m4", name:"Load Mastery", desc:"2 Wochen Progress → +1 STR (manuell)" },
    { id:"m5", name:"Iron Strength (Ultimate)", desc:"1 Satz/Woche zählt doppelt (manuell)" },
  ],
  uni: [
    { id:"u1", name:"Base Stability", desc:"+10% XP Unilateral (Anzeige-Bonus)" },
    { id:"u2", name:"Balance Focus", desc:"Kein Absetzen → +25 XP (manuell)" },
    { id:"u3", name:"Weak-Side Bias", desc:"Schwache Seite zuerst → +25 XP (manuell)" },
    { id:"u4", name:"Asymmetry Fix", desc:"Gleich links/rechts → +50 XP (manuell)" },
    { id:"u5", name:"Single-Limb Master (Ultimate)", desc:"+1 STA/Woche (manuell)" },
  ],
  core: [
    { id:"c1", name:"Core Activation", desc:"Jeder Core-Satz ≥30s → +10 XP (manuell)" },
    { id:"c2", name:"Anti-Extension", desc:"Hollow/Plank sauber → +25 XP (manuell)" },
    { id:"c3", name:"Anti-Rotation", desc:"Side Plank sauber → +25 XP (manuell)" },
    { id:"c4", name:"Load Transfer", desc:"Core + Lift im Training → +50 XP (manuell)" },
    { id:"c5", name:"Core of Steel (Ultimate)", desc:"Core zählt als STR-Bonus (manuell)" },
  ],
  cond: [
    { id:"e1", name:"Cardio Base", desc:"+20 XP/Runde (manuell)" },
    { id:"e2", name:"Work Capacity", desc:"kürzere Pause → +50 XP (manuell)" },
    { id:"e3", name:"Mental Grit", desc:"trotz Low-Motivation → +100 XP (manuell)" },
    { id:"e4", name:"Density Control", desc:"mehr Runden gleiche Zeit → +1 END (manuell)" },
    { id:"e5", name:"Engine Mode (Ultimate)", desc:"Conditioning Tag = ⭐⭐ automatisch (Anzeige)" },
  ],
  comp: [
    { id:"x1", name:"Flow Control", desc:"Kein Absetzen → +50 XP (manuell)" },
    { id:"x2", name:"Clean Technique", desc:"Saubere Reihenfolge → +25 XP (manuell)" },
    { id:"x3", name:"Breathing Mastery", desc:"Atemkontrolle → +25 XP (manuell)" },
    { id:"x4", name:"Fatigue Control", desc:"alle Runden gleich → +100 XP (manuell)" },
    { id:"x5", name:"Iron Flow (Ultimate)", desc:"+1 auf alle Attribute (manuell)" },
  ],
};

// --- Bossfights schedule ---
const BOSSES = [
  { week: 2, name: "The Foundation Beast", xp: 500, reward: "1 Joker + Titel: Foundation Slayer" },
  { week: 4, name: "The Asymmetry Lord", xp: 600, reward: "+1 STA + Unilateral XP +10% (1 Woche)" },
  { week: 6, name: "The Core Guardian", xp: 700, reward: "Core-Sätze 1 Woche doppelt XP" },
  { week: 8, name: "The Conditioning Reaper", xp: 800, reward: "+1 END + Conditioning ⭐⭐⭐" },
  { week: 10, name: "The Iron Champion", xp: 1000, reward: "+1 Attribut deiner Wahl + Titel: Iron Challenger" },
  { week: 12, name: "FINAL: Iron Overlord", xp: 2000, reward: "Titel: IRON OVERLORD SLAYER + New Game+" },
];

// --- Helpers ---
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
  // Week 1 starts at startDate
  const start = new Date(startDateISO);
  const cur = new Date(dateISO);
  const diffDays = Math.floor((cur - start) / (1000*60*60*24));
  return diffDays < 0 ? 0 : Math.floor(diffDays / 7) + 1;
}

// --- Entries ---
function loadEntries(){ return loadJSON(KEY_ENTRIES, []); }
function saveEntries(entries){ saveJSON(KEY_ENTRIES, entries); }

// --- Skills ---
function defaultSkills(){
  return { multi: { sp:0, unlocked:[] }, uni:{ sp:0, unlocked:[] }, core:{ sp:0, unlocked:[] }, cond:{ sp:0, unlocked:[] }, comp:{ sp:0, unlocked:[] } };
}
function loadSkills(){ return loadJSON(KEY_SKILLS, defaultSkills()); }
function saveSkills(s){ saveJSON(KEY_SKILLS, s); }

// --- Boss ---
function defaultBoss(){
  const obj = {};
  for (const b of BOSSES) obj[b.week] = { cleared:false, clearedAt:null };
  return obj;
}
function loadBoss(){ return loadJSON(KEY_BOSS, defaultBoss()); }
function saveBoss(b){ saveJSON(KEY_BOSS, b); }

// --- Populate exercise dropdown with optgroups ---
function buildExerciseDropdown(){
  const sel = $("exercise");
  sel.innerHTML = "";
  const groups = {};
  for (const ex of EXERCISES){
    groups[ex.group] ??= [];
    groups[ex.group].push(ex);
  }
  for (const gName of Object.keys(groups)){
    const og = document.createElement("optgroup");
    og.label = gName;
    for (const ex of groups[gName]){
      const opt = document.createElement("option");
      opt.value = ex.name;
      opt.textContent = ex.name;
      og.appendChild(opt);
    }
    sel.appendChild(og);
  }
}

// --- Auto type based on selected exercise ---
function autoTypeForExercise(exName){
  const found = EXERCISES.find(e => e.name === exName);
  return found ? found.type : "Mehrgelenkig";
}

// --- Calc preview XP ---
function updateCalcPreview(){
  const exName = $("exercise").value;
  const type = $("type").value;
  const flags = { rpe9: $("rpe9").checked, tech: $("tech").checked, pause: $("pause").checked };
  const b = bonusXP(flags);

  let total = 0;
  if (type === "NEAT") {
    const minutes = Math.max(1, parseInt($("walkMin").value || "0", 10));
    total = neatXP(minutes) + 0; // no bonuses for NEAT (fair)
    $("calcBonus").textContent = 0;
  } else {
    const sets = Math.max(1, parseInt($("sets").value || "1", 10));
    const base = (XP_PER_SET[type] ?? 0) * sets;
    total = base + b;
    $("calcBonus").textContent = b;
  }
  $("calcXp").textContent = total;
}

// --- Toggle walking UI ---
function updateWalkingUI(){
  const type = $("type").value;
  const isWalk = (type === "NEAT");
  $("walkingRow").classList.toggle("hide", !isWalk);
  $("setsRow").classList.toggle("hide", isWalk);

  // Disable bonus checkboxes for NEAT
  for (const id of ["rpe9","tech","pause"]) {
    $(id).disabled = isWalk;
    if (isWalk) $(id).checked = false;
  }
  updateCalcPreview();
}

// --- Dashboard calculations ---
function computeStats(entries){
  const startDate = localStorage.getItem(KEY_START) || isoDate(new Date());
  const today = isoDate(new Date());
  const curWeek = getWeekNumber(startDate, today);

  let todayXp = 0;
  let weekXp = 0;
  let totalXp = 0;

  for (const e of entries){
    totalXp += e.xp;
    if (e.date === today) todayXp += e.xp;
    if (curWeek > 0 && e.week === curWeek) weekXp += e.xp;
  }
  return { todayXp, weekXp, totalXp, curWeek, startDate };
}

function renderLists(){
  const entries = loadEntries();
  const { todayXp, weekXp, totalXp } = computeStats(entries);
  const lvl = xpToLevel(totalXp);

  $("todayXp").textContent = todayXp;
  $("weekXp").textContent = weekXp;
  $("totalXp").textContent = totalXp;
  $("level").textContent = lvl;
  $("title").textContent = getTitle(lvl);
  $("countEntries").textContent = entries.length;

  // recent list (dashboard)
  const recent = entries.slice(0, 6);
  $("recentList").innerHTML = recent.length ? "" : "<li>Noch keine Einträge.</li>";
  for (const e of recent){
    const li = document.createElement("li");
    li.textContent = `${e.date} • ${e.exercise} • ${e.type} • ${e.detail} • ${e.xp} XP`;
    $("recentList").appendChild(li);
  }

  // full list (log)
  $("list").innerHTML = entries.length ? "" : "<li>Noch keine Einträge.</li>";
  for (const e of entries){
    const li = document.createElement("li");
    li.textContent = `${e.date} (W${e.week}) • ${e.exercise} • ${e.type} • ${e.detail} • ${e.xp} XP`;
    $("list").appendChild(li);
  }
}

// --- Skilltree render ---
function renderSkills(){
  const s = loadSkills();

  const map = [
    ["multi","sp-multi","tree-multi"],
    ["uni","sp-uni","tree-uni"],
    ["core","sp-core","tree-core"],
    ["cond","sp-cond","tree-cond"],
    ["comp","sp-comp","tree-comp"],
  ];

  for (const [key, spId, listId] of map){
    $(spId).textContent = s[key].sp;

    const ul = $(listId);
    ul.innerHTML = "";
    const nodes = SKILLTREES[key];
    const unlocked = new Set(s[key].unlocked);

    nodes.forEach((node, idx) => {
      con
