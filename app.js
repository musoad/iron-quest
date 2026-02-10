/* =========================
   IRON QUEST – app.js (FULL, iOS SAFE)
   ✅ Alles wie vorher + Mini-Analytics (Dashboard + eigener Tab)
   ✅ iOS Safe: kein ?. / ?? / ??= / structuredClone / replaceAll
   ✅ Auto-Update Home-Screen PWA (SW update -> SKIP_WAITING -> reload)
   ========================= */

console.log("IRON QUEST loaded ✅");

/* =========================
   BASIC DOM
========================= */
function $(id) { return document.getElementById(id); }
function isoDate(d) { return new Date(d).toISOString().slice(0, 10); }
function clampWeek(w) { return Math.max(1, Math.min(12, w || 1)); }

function loadJSON(key, fallback) {
  try {
    var raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    var v = JSON.parse(raw);
    return (v == null) ? fallback : v;
  } catch (e) {
    return fallback;
  }
}
function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

/* =========================
   DB (IndexedDB)
========================= */
var DB_NAME = "ironquest_db";
var DB_VERSION = 2;
var STORE = "entries";

function openDB() {
  return new Promise(function (resolve, reject) {
    var req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = function () {
      var db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        var store = db.createObjectStore(STORE, { keyPath: "id", autoIncrement: true });
        store.createIndex("date", "date", { unique: false });
        store.createIndex("week", "week", { unique: false });
      } else {
        var store2 = req.transaction.objectStore(STORE);
        if (!store2.indexNames.contains("date")) store2.createIndex("date", "date", { unique: false });
        if (!store2.indexNames.contains("week")) store2.createIndex("week", "week", { unique: false });
      }
    };
    req.onsuccess = function () { resolve(req.result); };
    req.onerror = function () { reject(req.error); };
  });
}

function idbGetAll() {
  return openDB().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(STORE, "readonly");
      var req = tx.objectStore(STORE).getAll();
      req.onsuccess = function () { resolve(req.result || []); };
      req.onerror = function () { reject(req.error); };
    });
  });
}
function idbAdd(entry) {
  return openDB().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).add(entry);
      tx.oncomplete = function () { resolve(true); };
      tx.onerror = function () { reject(tx.error); };
    });
  });
}
function idbPut(entry) {
  return openDB().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(entry);
      tx.oncomplete = function () { resolve(true); };
      tx.onerror = function () { reject(tx.error); };
    });
  });
}
function idbDelete(id) {
  return openDB().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = function () { resolve(true); };
      tx.onerror = function () { reject(tx.error); };
    });
  });
}
function idbClear() {
  return openDB().then(function (db) {
    return new Promise(function (resolve, reject) {
      var tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).clear();
      tx.oncomplete = function () { resolve(true); };
      tx.onerror = function () { reject(tx.error); };
    });
  });
}
function idbAddMany(entries) {
  var p = Promise.resolve();
  entries.forEach(function (e) {
    p = p.then(function () { return idbAdd(e); });
  });
  return p;
}

/* =========================
   KEYS
========================= */
var KEY_START   = "ironquest_startdate_v20";
var KEY_MUT     = "ironquest_mutations_v20";
var KEY_QUESTS  = "ironquest_dailyquests_v20";
var KEY_BOSS    = "ironquest_boss_v20";
var KEY_BOSSCHK = "ironquest_boss_checks_v20";
var KEY_ACH     = "ironquest_weeklyach_v20";
var KEY_CAL     = "ironquest_calendar_v20";
var KEY_SKILL   = "ironquest_skilltree_v20";
var KEY_PLANOVR = "ironquest_plan_overrides_v20";
var KEY_WKREW   = "ironquest_week_rewards_v20";

/* =========================
   TIME / WEEK
========================= */
function daysBetween(a, b) {
  return Math.floor((new Date(b) - new Date(a)) / 86400000);
}
function getWeekNumber(startISO, dateISO) {
  var diff = daysBetween(startISO, dateISO);
  return diff < 0 ? 0 : Math.floor(diff / 7) + 1;
}

function ensureStartDate() {
  var start = localStorage.getItem(KEY_START);
  if (!start) {
    start = isoDate(new Date());
    localStorage.setItem(KEY_START, start);
  }
  var el = $("startDateDash");
  if (el) el.value = start;
  return start;
}
function setStartDateLocal(newISO) {
  localStorage.setItem(KEY_START, newISO);
  var el = $("startDateDash");
  if (el) el.value = newISO;
}

function currentWeekFor(dateISO) {
  var start = ensureStartDate();
  return clampWeek(getWeekNumber(start, dateISO));
}

function recalcAllEntryWeeks() {
  var start = ensureStartDate();
  return idbGetAll().then(function (all) {
    var p = Promise.resolve();
    all.forEach(function (e) {
      var nw = clampWeek(getWeekNumber(start, e.date));
      if (e.week !== nw) {
        e.week = nw;
        p = p.then(function () { return idbPut(e); });
      }
    });
    return p;
  });
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
  return entries.sort(function (a, b) {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return (b.id || 0) - (a.id || 0);
  });
}

/* =========================
   STARS
========================= */
function getStarThresholdsForWeek(_week, _entries) {
  return { one: 1200, two: 1600, three: 2000 };
}
function starsForDay(xp, thr) {
  if (xp >= thr.three) return "⭐⭐⭐";
  if (xp >= thr.two) return "⭐⭐";
  if (xp >= thr.one) return "⭐";
  return "—";
}

/* =========================
   LEVEL SYSTEM
========================= */
function xpNeededForNextLevel(level) {
  var l = Math.max(1, level);
  return Math.round(350 + 120 * l + 32 * Math.pow(l, 1.75));
}
function levelFromTotalXp(totalXp) {
  var lvl = 1;
  var xp = Math.max(0, Math.round(totalXp || 0));
  while (true) {
    var need = xpNeededForNextLevel(lvl);
    if (xp >= need) { xp -= need; lvl += 1; }
    else break;
    if (lvl > 999) break;
  }
  var needNow = xpNeededForNextLevel(lvl);
  return { lvl: lvl, into: xp, need: needNow };
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
  var ww = clampWeek(w);
  return ww <= 4 ? 1 : (ww <= 8 ? 2 : 3);
}
function blockName(block) {
  if (block === 1) return "Block 1 (Technik/ROM)";
  if (block === 2) return "Block 2 (Volumen/Progress)";
  return "Block 3 (Dichte/Intensität)";
}
function weeklyProgressHint(week) {
  var b = weekBlock(week);
  if (b === 1) return "Technik/ROM, Progress über Wiederholungen.";
  if (b === 2) return "Mehr Volumen, Progress über Reps oder schwerere Hanteln.";
  return "Dichte/Intensität (Tempo/kurzere Pausen, sauber).";
}

/* =========================
   MUTATIONS
========================= */
var MUTATIONS = [
  { id:"tempo", name:"Tempo Week", desc:"Langsame Exzentrik, saubere ROM.", effect:"STR/STA XP +10%", mult:{ STR:1.10, STA:1.10 } },
  { id:"corefocus", name:"Core Focus", desc:"Core & Kontrolle im Zentrum.", effect:"MOB XP +25%", mult:{ MOB:1.25 } },
  { id:"engine", name:"Engine Mode", desc:"Konditionierung bekommt den Boost.", effect:"END XP +15%", mult:{ END:1.15 } },
  { id:"neatboost", name:"NEAT Boost", desc:"Alltag zählt mehr.", effect:"NEAT XP +20%", mult:{ NEAT:1.20 } },
  { id:"unilateral", name:"Unilateral Blessing", desc:"Stabilität und Balance.", effect:"STA XP +15%", mult:{ STA:1.15 } }
];

function loadMutMap(){ return loadJSON(KEY_MUT, {}); }
function saveMutMap(m){ saveJSON(KEY_MUT, m); }

function getMutationForWeek(week) {
  var w = clampWeek(week);
  var map = loadMutMap();
  if (!map[w]) {
    var choice = MUTATIONS[Math.floor(Math.random() * MUTATIONS.length)];
    map[w] = choice.id;
    saveMutMap(map);
  }
  for (var i=0;i<MUTATIONS.length;i++){
    if (MUTATIONS[i].id === map[w]) return MUTATIONS[i];
  }
  return MUTATIONS[0];
}

function mutationXpMultiplierForType(type, mutation) {
  if (type === "NEAT" && mutation && mutation.mult && mutation.mult.NEAT) return mutation.mult.NEAT;
  if (type === "Mehrgelenkig" && mutation && mutation.mult && mutation.mult.STR) return mutation.mult.STR;
  if (type === "Unilateral" && mutation && mutation.mult && mutation.mult.STA) return mutation.mult.STA;
  if (type === "Conditioning" && mutation && mutation.mult && mutation.mult.END) return mutation.mult.END;
  if (type === "Core" && mutation && mutation.mult && mutation.mult.MOB) return mutation.mult.MOB;

  if (type === "Komplexe") {
    var ms = [];
    if (mutation && mutation.mult) {
      if (mutation.mult.STR) ms.push(mutation.mult.STR);
      if (mutation.mult.STA) ms.push(mutation.mult.STA);
      if (mutation.mult.END) ms.push(mutation.mult.END);
      if (mutation.mult.MOB) ms.push(mutation.mult.MOB);
    }
    if (!ms.length) return 1;
    var sum = 0;
    ms.forEach(function (x){ sum += x; });
    return sum / ms.length;
  }
  return 1;
}

/* =========================
   ADAPTIVE
========================= */
function computeWeekDayXP(entries, weekNum) {
  var dayXP = {};
  entries.forEach(function (e) {
    if (e.week !== weekNum) return;
    dayXP[e.date] = (dayXP[e.date] || 0) + (e.xp || 0);
  });
  return dayXP;
}
function getAdaptiveModifiers(entries, curWeek) {
  var prev = curWeek - 1;
  if (prev < 1) return { setDelta: 0, repDelta: 0, note: "Startwoche: neutral." };

  var thr = getStarThresholdsForWeek(prev, entries);
  var dayXP = computeWeekDayXP(entries, prev);
  var days = Object.keys(dayXP);

  var trainDays = days.filter(function (d){ return dayXP[d] >= thr.one; }).length;
  var twoStarDays = days.filter(function (d){ return dayXP[d] >= thr.two; }).length;
  var threeStarDays = days.filter(function (d){ return dayXP[d] >= thr.three; }).length;

  if (trainDays >= 5 && threeStarDays >= 2) return { setDelta:+1, repDelta:+2, note:"Elite Woche (W"+prev+") → +1 Satz & +2 Reps." };
  if (trainDays >= 4 && (twoStarDays >= 2 || threeStarDays >= 1)) return { setDelta:+1, repDelta:+1, note:"Starke Woche (W"+prev+") → +1 Satz & +1 Rep." };
  if (trainDays <= 2) return { setDelta:-1, repDelta:-1, note:"Schwache Woche (W"+prev+") → Deload -1 Satz & -1 Rep." };
  return { setDelta:0, repDelta:0, note:"Stabil (W"+prev+") → neutral." };
}
function applySetDeltaText(text, delta) {
  var nums = text.match(/\d+/g);
  if (!nums || nums.length === 0) return text;
  var parsed = nums.map(function (n){ return parseInt(n,10); });
  var newNums = parsed.map(function (n){ return Math.max(1, n + delta); });
  var i = 0;
  return text.replace(/\d+/g, function () { return String(newNums[i++]); });
}

/* =========================
   EXERCISES
========================= */
var EXERCISES = [
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

  // NEAT
  { name:"Walking Desk (Laufband 3 km/h)", type:"NEAT", group:"NEAT / Alltag", cat:"NEAT" },

  // REST
  { name:"Ruhetag (Recovery + Mobility)", type:"Rest", group:"Ruhetag", cat:"Recovery" }
];

function typeForExercise(exName) {
  for (var i=0;i<EXERCISES.length;i++){
    if (EXERCISES[i].name === exName) return EXERCISES[i].type;
  }
  return "Mehrgelenkig";
}
function metaForExercise(exName){
  for (var i=0;i<EXERCISES.length;i++){
    if (EXERCISES[i].name === exName) return EXERCISES[i];
  }
  return null;
}
function isWalkType(type){ return type === "NEAT"; }
function isRestType(type){ return type === "Rest"; }

function buildExerciseDropdown() {
  var sel = $("exercise");
  if (!sel) return;
  var prev = sel.value;
  sel.innerHTML = "";

  var map = {};
  EXERCISES.forEach(function (ex) {
    if (map[ex.group] == null) map[ex.group] = {};
    if (map[ex.group][ex.cat] == null) map[ex.group][ex.cat] = [];
    map[ex.group][ex.cat].push(ex);
  });

  Object.keys(map).forEach(function (groupName) {
    var ogGroup = document.createElement("optgroup");
    ogGroup.label = groupName;

    Object.keys(map[groupName]).forEach(function (cat) {
      map[groupName][cat].forEach(function (ex) {
        var opt = document.createElement("option");
        opt.value = ex.name;
        opt.textContent = "" + ex.name;
        ogGroup.appendChild(opt);
      });
    });

    sel.appendChild(ogGroup);
  });

  var hasPrev = false;
  for (var i=0;i<sel.options.length;i++){
    if (sel.options[i].value === prev) { hasPrev = true; break; }
  }
  if (prev && hasPrev) sel.value = prev;
  else sel.selectedIndex = 0;
}

/* =========================
   RECOMMENDATIONS
========================= */
function overridesForExercise(exName) {
  if (!exName) return null;
  if (exName.indexOf("Farmer") >= 0) return { setsText:"2–3 Runden", setsValue:3, repsText:"30–60s pro Runde (aufrecht, Core fest)" };
  if (exName.indexOf("Lateral") >= 0) return { setsText:"3 Sätze", setsValue:3, repsText:"12–20 Wdh (2–3s runter)" };
  if (exName.indexOf("Hamstring Walkouts") >= 0) return { setsText:"3 Sätze", setsValue:3, repsText:"8–12 Wdh (kontrolliert)" };
  if (exName.indexOf("Calf") >= 0) return { setsText:"3–4 Sätze", setsValue:4, repsText:"15–25 Wdh (oben 1s halten)" };
  if (exName.indexOf("Ruhetag") >= 0) return { setsText:"—", setsValue:null, repsText:"10–20 Min Mobility + Spaziergang" };
  return null;
}
function baseRecommendedSets(type, week) {
  var b = weekBlock(week);
  if (type === "NEAT") return { text:"Minuten statt Sätze", value:null };
  if (type === "Rest") return { text:"—", value:null };
  if (type === "Conditioning") return b === 1 ? { text:"4–5 Runden", value:4 } : (b === 2 ? { text:"5–6 Runden", value:5 } : { text:"5–6 Runden", value:5 });
  if (type === "Core") return b === 1 ? { text:"3 Sätze", value:3 } : { text:"4 Sätze", value:4 };
  if (type === "Komplexe") return b === 1 ? { text:"4–5 Runden", value:4 } : (b === 2 ? { text:"5–6 Runden", value:5 } : { text:"6 Runden", value:6 });
  return b === 1 ? { text:"3–4 Sätze", value:4 } : (b === 2 ? { text:"4–5 Sätze", value:5 } : { text:"4–5 Sätze", value:5 });
}
function baseRecommendedReps(type, week) {
  var b = weekBlock(week);
  if (type === "NEAT") return "Minuten (z. B. 30–60)";
  if (type === "Rest") return "Mobility: Schulter/T-Spine/Hüfte";
  if (type === "Core") return b === 1 ? "30–45s pro Satz" : "40–60s pro Satz";
  if (type === "Conditioning") return b === 1 ? "30–40s Arbeit / 60s Pause" : (b === 2 ? "35–45s / 45–60s" : "40–45s / 30–45s");
  if (type === "Komplexe") return b === 1 ? "6–8 Wdh pro Movement" : "6 Wdh pro Movement";
  return b === 1 ? "10–12 Wdh/Satz" : (b === 2 ? "8–10 Wdh/Satz" : "6–8 Wdh/Satz");
}
function recommendedSetsForExercise(exName, type, week, adaptive) {
  var ov = overridesForExercise(exName);
  var base = ov ? { text: ov.setsText, value: ov.setsValue } : baseRecommendedSets(type, week);
  if (type === "NEAT" || type === "Rest") return base;
  var d = adaptive ? (adaptive.setDelta || 0) : 0;
  if (!d) return base;
  return {
    text: applySetDeltaText(base.text, d) + " (adaptive)",
    value: base.value == null ? null : Math.max(1, base.value + d)
  };
}
function recommendedRepsForExercise(exName, type, week, adaptive) {
  var ov = overridesForExercise(exName);
  if (ov) return ov.repsText;
  var base = baseRecommendedReps(type, week);
  var d = adaptive ? (adaptive.repDelta || 0) : 0;
  if (!d || type === "NEAT" || type === "Rest") return base;
  var nums = base.match(/\d+/g);
  if (!nums) return base;
  var parsed = nums.map(function (n){ return parseInt(n,10); });
  var i = 0;
  var shifted = base.replace(/\d+/g, function () { return String(Math.max(1, parsed[i++] + d)); });
  return shifted + " (adaptive)";
}

/* =========================
   XP SYSTEM
========================= */
var XP_PER_EXERCISE = {
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
   QUESTS
========================= */
var QUESTS = [
  { id:"steps10k",   name:"10.000 Schritte", xp:70, note:"NEAT-Boost", slot:"any" },
  { id:"mobility10", name:"10 Min Mobility", xp:40, note:"Hüfte/Schulter/WS", slot:"any" },
  { id:"water",      name:"2,5–3L Wasser",   xp:22, note:"Regeneration", slot:"any" },
  { id:"sleep",      name:"7h+ Schlaf",      xp:45, note:"Performance", slot:"any" },
  { id:"supp_d3",      name:"Vitamin D3", xp:10, note:"morgens", slot:"am" },
  { id:"supp_crea",    name:"Kreatin 5g", xp:10, note:"morgens", slot:"am" },
  { id:"supp_mag",     name:"Magnesium",  xp:10, note:"abends",  slot:"pm" },
  { id:"supp_omega3",  name:"Omega-3",    xp:10, note:"abends",  slot:"pm" }
];

function loadQuestState(){ return loadJSON(KEY_QUESTS, {}); }
function saveQuestState(s){ saveJSON(KEY_QUESTS, s); }
function isQuestDoneForDay(qState, questId, dayISO){
  return (qState && qState[dayISO] && qState[dayISO][questId] === true);
}

function loadCalendarState(){
  return loadJSON(KEY_CAL, { weekOffset: 0, selectedDate: isoDate(new Date()) });
}
function saveCalendarState(st){ saveJSON(KEY_CAL, st); }
function getSelectedDayISO(){
  var st = loadCalendarState();
  return st.selectedDate || isoDate(new Date());
}

function setQuestDoneForDay(questId, dayISO, done){
  var qState = loadQuestState();
  if (qState[dayISO] == null) qState[dayISO] = {};
  var already = (qState[dayISO][questId] === true);
  if (done && already) return Promise.resolve(true);

  if (done) qState[dayISO][questId] = true;
  else delete qState[dayISO][questId];
  saveQuestState(qState);

  if (done) {
    var q = null;
    for (var i=0;i<QUESTS.length;i++){ if (QUESTS[i].id === questId) { q = QUESTS[i]; break; } }
    var week = currentWeekFor(dayISO);
    return idbAdd({
      date: dayISO,
      week: week,
      exercise: "Daily Quest: " + ((q && q.name) ? q.name : questId),
      type: "Quest",
      detail: ((q && q.slot === "am") ? "AM" : ((q && q.slot === "pm") ? "PM" : "Any")),
      xp: (q && q.xp) ? q.xp : 0
    });
  }
  return Promise.resolve(true);
}

function renderQuests(){
  var dayISO = getSelectedDayISO();
  var qState = loadQuestState();
  var ul = $("questList");
  if (!ul) return;
  ul.innerHTML = "";

  var info = document.createElement("li");
  info.innerHTML = '<div class="hint"><b>Quests-Datum:</b> ' + dayISO + ' (Kalender → Tag auswählen für rückwirkend)</div>';
  ul.appendChild(info);

  function renderGroup(title, list){
    var head = document.createElement("li");
    head.innerHTML = '<div class="hint"><b>' + title + '</b></div>';
    ul.appendChild(head);

    list.forEach(function (q) {
      var done = isQuestDoneForDay(qState, q.id, dayISO);
      var li = document.createElement("li");
      li.innerHTML =
        '<div class="checkItem">' +
          '<button type="button" class="qbtn ' + (done ? "done" : "") + '" data-q="' + q.id + '">' +
            (done ? "✓" : "+") +
          '</button>' +
          '<div class="checkMain">' +
            '<div class="checkTitle">' + q.name + '</div>' +
            '<div class="checkSub">' + q.note + '</div>' +
          '</div>' +
          '<div class="xpBadge">+' + q.xp + ' XP</div>' +
        '</div>';
      ul.appendChild(li);
    });
  }

  renderGroup("Morgens (Supplements)", QUESTS.filter(function(q){ return q.slot === "am"; }));
  renderGroup("Abends (Supplements)", QUESTS.filter(function(q){ return q.slot === "pm"; }));
  renderGroup("Jederzeit", QUESTS.filter(function(q){ return q.slot === "any"; }));

  var buttons = ul.querySelectorAll("button[data-q]");
  for (var i=0;i<buttons.length;i++){
    (function (btn) {
      btn.addEventListener("click", function () {
        var qid = btn.getAttribute("data-q");
        var done = isQuestDoneForDay(loadQuestState(), qid, dayISO);
        if (done) {
          alert("Quest deaktiviert – XP-Eintrag bleibt bestehen (simple).");
          return;
        }
        setQuestDoneForDay(qid, dayISO, true).then(function () {
          return renderAll();
        });
      });
    })(buttons[i]);
  }
}

/* =========================
   BOSSES (unverändert funktional)
========================= */
var BOSSES = [
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
    workout: ["Goblet Squat – 4×12","DB Floor Press – 4×10","1-Arm DB Row – 4×10","Bulgarian Split Squat – 3×8","Plank – 3×60s"]}
];

function defaultBoss(){
  var obj = {};
  BOSSES.forEach(function (b) {
    obj[b.week] = { cleared:false, clearedAt:null };
  });
  return obj;
}
function loadBoss(){ return loadJSON(KEY_BOSS, defaultBoss()); }
function saveBoss(b){ saveJSON(KEY_BOSS, b); }

function loadBossChecks(){ return loadJSON(KEY_BOSSCHK, {}); }
function saveBossChecks(s){ saveJSON(KEY_BOSSCHK, s); }

function bossCheckKey(week, dateISO){ return week + "|" + dateISO; }
function getBossChecksFor(week, dateISO){
  var all = loadBossChecks();
  var k = bossCheckKey(week, dateISO);
  return all[k] || {};
}
function setBossCheckFor(week, dateISO, idx, value){
  var all = loadBossChecks();
  var k = bossCheckKey(week, dateISO);
  if (all[k] == null) all[k] = {};
  all[k][idx] = value;
  saveBossChecks(all);
}
function allBossChecksDone(week, dateISO, workoutLen){
  var checks = getBossChecksFor(week, dateISO);
  for (var i=0;i<workoutLen;i++){
    if (!checks[i]) return false;
  }
  return true;
}
function splitXP(total, n){
  var base = Math.floor(total / n);
  var rem = total - base * n;
  var arr = [];
  for (var i=0;i<n;i++) arr.push(base);
  arr[n-1] += rem;
  return arr;
}
function getBossForWeek(w){
  for (var i=0;i<BOSSES.length;i++){
    if (BOSSES[i].week === w) return BOSSES[i];
  }
  return null;
}

function renderBoss(curWeek){
  var today = isoDate(new Date());
  var bossState = loadBoss();

  var startEl = $("bossStartDisplay");
  if (startEl) startEl.textContent = ensureStartDate();
  var wkEl = $("bossCurrentWeek");
  if (wkEl) wkEl.textContent = "W" + curWeek;

  var ul = $("bossList");
  if (!ul) return;
  ul.innerHTML = "";

  BOSSES.forEach(function (b) {
    var st = bossState[b.week] || { cleared:false, clearedAt:null };
    var isWeek = (curWeek === b.week);
    var locked = !isWeek;
    var doneChecks = allBossChecksDone(b.week, today, b.workout.length);
    var canClear = isWeek && doneChecks;

    var li = document.createElement("li");
    li.innerHTML =
      '<div class="bossrow">' +
        '<div style="min-width:0;">' +
          '<div><b>Week ' + b.week + ':</b> ' + b.name + '</div>' +
          '<div class="hint">Reward: ' + b.reward + ' • +' + b.xp + ' XP</div>' +
          (st.clearedAt ? ('<div class="hint">Cleared am: ' + st.clearedAt + '</div>') : '') +
          (locked ? ('<div class="hint">🔒 Locked – nur in Woche ' + b.week + '</div>') : '<div class="hint">✅ Woche aktiv</div>') +
        '</div>' +
        '<div class="row" style="margin:0; align-items:flex-start;">' +
          '<span class="badge ' + (locked ? "lock" : (st.cleared ? "ok" : "no")) + '">' +
            (locked ? "LOCKED" : (st.cleared ? "CLEARED" : "OPEN")) +
          '</span>' +
          '<button type="button" class="secondary" style="width:auto; padding:10px 12px;" data-week="' + b.week + '" ' + (canClear ? "" : "disabled") + '>Clear</button>' +
        '</div>' +
      '</div>' +
      '<div class="hint" style="margin-top:10px;"><b>Boss-Workout Checkliste (heute):</b></div>' +
      '<ul class="checklist" id="bosschk_' + b.week + '"></ul>' +
      '<div class="hint">Clear wird erst aktiv, wenn alle Punkte abgehakt sind.</div>';

    ul.appendChild(li);

    var chkUl = li.querySelector("#bosschk_" + b.week);
    var checks = getBossChecksFor(b.week, today);
    var xpParts = splitXP(b.xp, b.workout.length);

    b.workout.forEach(function (line, idx) {
      var checked = !!checks[idx];
      var row = document.createElement("li");
      row.innerHTML =
        '<div class="checkItem">' +
          '<input type="checkbox" ' + (checked ? "checked" : "") + ' ' + (locked ? "disabled" : "") + '>' +
          '<div class="checkMain">' +
            '<div class="checkTitle">' + line + '</div>' +
            '<div class="checkSub">' + b.name + '</div>' +
          '</div>' +
          '<div class="xpBadge">+' + xpParts[idx] + ' XP</div>' +
        '</div>';

      chkUl.appendChild(row);

      var cb = row.querySelector("input");
      cb.addEventListener("change", function (e) {
        setBossCheckFor(b.week, today, idx, e.target.checked);
        renderAll();
      });
    });
  });

  var btns = ul.querySelectorAll("button[data-week]");
  for (var i=0;i<btns.length;i++){
    (function (btn) {
      btn.addEventListener("click", function () {
        var week = parseInt(btn.getAttribute("data-week"), 10);
        var boss = null;
        for (var j=0;j<BOSSES.length;j++){ if (BOSSES[j].week === week) { boss = BOSSES[j]; break; } }
        if (!boss) return;

        var today2 = isoDate(new Date());
        var w = currentWeekFor(today2);

        if (w !== week) return alert("LOCKED. Aktuell W"+w+". Dieser Boss ist nur in W"+week+".");
        if (!allBossChecksDone(week, today2, boss.workout.length)) return alert("Erst alle Checkboxen abhaken!");

        var xpParts = splitXP(boss.xp, boss.workout.length);
        var entriesToAdd = boss.workout.map(function (line, idx) {
          return {
            date: today2, week: w,
            exercise: "Boss W"+week+": " + line,
            type: "Boss-Workout",
            detail: boss.name + " • Reward: " + boss.reward,
            xp: xpParts[idx]
          };
        });
        entriesToAdd.push({ date: today2, week: w, exercise: "Bossfight CLEARED: " + boss.name, type: "Boss", detail: "W"+week+" Clear", xp: 0 });

        idbAddMany(entriesToAdd).then(function () {
          var bs = loadBoss();
          bs[week] = { cleared:true, clearedAt: today2 };
          saveBoss(bs);
          return renderAll();
        }).then(function () {
          alert("Bossfight cleared! +" + boss.xp + " XP ✅");
        });
      });
    })(btns[i]);
  }
}

/* =========================
   WEEKLY ACHIEVEMENTS + WEEKLY REWARD
========================= */
var ACHIEVEMENTS = [
  { id:"noskip", name:"No Skip Week", xp:650, rule:"5 Trainingstage (≥⭐)" },
  { id:"perfect", name:"Perfect Run", xp:750, rule:"5 Tage ⭐⭐ oder ⭐⭐⭐" },
  { id:"threestar", name:"3-Star Hunter", xp:550, rule:"mind. 2× ⭐⭐⭐" },
  { id:"questmaster", name:"Quest Master", xp:450, rule:"mind. 6 Quests (inkl. Supplements)" }
];

function loadWeeklyAch(){ return loadJSON(KEY_ACH, {}); }
function saveWeeklyAch(s){ saveJSON(KEY_ACH, s); }

function countDailyQuestsInWeek(weekNum){
  var q = loadQuestState();
  var count = 0;
  var start = ensureStartDate();
  Object.keys(q).forEach(function (dayISO) {
    var w = clampWeek(getWeekNumber(start, dayISO));
    if (w === weekNum) {
      var vals = Object.values(q[dayISO] || {});
      count += vals.filter(Boolean).length;
    }
  });
  return count;
}
function countTrainingDaysInWeek(entries, weekNum){
  var days = {};
  entries.forEach(function (e) {
    if (e.week !== weekNum) return;
    if (e.type === "Quest" || e.type === "Rest" || e.type === "NEAT") return;
    days[e.date] = true;
  });
  return Object.keys(days).length;
}

function loadWeekRewards(){ return loadJSON(KEY_WKREW, {}); }
function saveWeekRewards(s){ saveJSON(KEY_WKREW, s); }

function rewardActiveForWeek(week){
  var map = loadWeekRewards();
  return !!(map && map[week] === true);
}

function updateWeeklyReward(entries, weekNum){
  if (!weekNum || weekNum < 1) return Promise.resolve(true);
  var map = loadWeekRewards();
  var trainingDays = countTrainingDaysInWeek(entries, weekNum);
  var next = clampWeek(weekNum + 1);

  if (trainingDays >= 5) {
    if (!map[next]) {
      map[next] = true;
      saveWeekRewards(map);
      var today = isoDate(new Date());
      return idbAdd({ date: today, week: weekNum, exercise:"Weekly Reward Unlocked", type:"Reward", detail:"W"+next+": +5% XP Bonus", xp:0 });
    }
  }
  return Promise.resolve(true);
}

function evaluateWeeklyAchievements(entries, weekNum){
  if (!weekNum) return Promise.resolve({ earned:[], newlyEarned:[], trainDays:0, threeStarDays:0 });

  var thr = getStarThresholdsForWeek(weekNum, entries);
  var dayXP = computeWeekDayXP(entries, weekNum);
  var dates = Object.keys(dayXP);

  var trainDaysByStars = dates.filter(function (d){ return dayXP[d] >= thr.one; }).length;
  var twoPlusDays = dates.filter(function (d){ return dayXP[d] >= thr.two; }).length;
  var threeStarDays = dates.filter(function (d){ return dayXP[d] >= thr.three; }).length;
  var questCount = countDailyQuestsInWeek(weekNum);

  var shouldEarn = [];
  if (trainDaysByStars >= 5) shouldEarn.push("noskip");
  if (twoPlusDays >= 5) shouldEarn.push("perfect");
  if (threeStarDays >= 2) shouldEarn.push("threestar");
  if (questCount >= 6) shouldEarn.push("questmaster");

  var achState = loadWeeklyAch();
  if (achState[weekNum] == null) achState[weekNum] = {};
  var newlyEarned = [];

  shouldEarn.forEach(function (id) {
    if (!achState[weekNum][id]) {
      achState[weekNum][id] = true;
      newlyEarned.push(id);
    }
  });
  saveWeeklyAch(achState);

  var p = Promise.resolve();

  if (newlyEarned.length){
    var today = isoDate(new Date());
    newlyEarned.forEach(function (id) {
      var a = null;
      for (var i=0;i<ACHIEVEMENTS.length;i++){ if (ACHIEVEMENTS[i].id === id) { a = ACHIEVEMENTS[i]; break; } }
      if (!a) return;
      p = p.then(function () {
        return idbAdd({ date: today, week: weekNum, exercise: "Achievement: " + a.name, type: "Achievement", detail: a.rule, xp: a.xp });
      });
    });
  }

  return p.then(function () {
    return updateWeeklyReward(entries, weekNum);
  }).then(function () {
    return { earned: shouldEarn, newlyEarned: newlyEarned, trainDays: trainDaysByStars, threeStarDays: threeStarDays };
  });
}

/* =========================
   SKILLTREE (wie vorher)
========================= */
var TREES = [
  { key:"multi", name:"Mehrgelenkig (STR)", gateType:"Mehrgelenkig", domList:"tree-multi" },
  { key:"uni",   name:"Unilateral (STA)",   gateType:"Unilateral",   domList:"tree-uni" },
  { key:"core",  name:"Core (MOB/STA)",     gateType:"Core",         domList:"tree-core" },
  { key:"cond",  name:"Conditioning (END)", gateType:"Conditioning", domList:"tree-cond" },
  { key:"comp",  name:"Komplexe (ELITE)",   gateType:"Komplexe",     domList:"tree-comp" }
];

function defaultNodesForTree(treeKey){
  return [
    { id: treeKey+"_t1a", tier:1, cost:1, name:"Tier 1: Foundation I", unlocked:false },
    { id: treeKey+"_t1b", tier:1, cost:1, name:"Tier 1: Foundation II", unlocked:false },
    { id: treeKey+"_t1c", tier:1, cost:1, name:"Tier 1: Foundation III", unlocked:false },
    { id: treeKey+"_t2a", tier:2, cost:2, name:"Tier 2: Advanced I", unlocked:false },
    { id: treeKey+"_t2b", tier:2, cost:2, name:"Tier 2: Advanced II", unlocked:false },
    { id: treeKey+"_t3a", tier:3, cost:3, name:"Tier 3: Mastery", unlocked:false },
    { id: treeKey+"_cap", tier:4, cost:5, name:"Capstone: Ascension", unlocked:false }
  ];
}

function loadSkillState(){
  var fallback = {
    spent: 0,
    nodes: (function () {
      var o = {};
      TREES.forEach(function (t){ o[t.key] = defaultNodesForTree(t.key); });
      return o;
    })()
  };
  var st = loadJSON(KEY_SKILL, fallback);
  if (!st.nodes) st.nodes = {};
  TREES.forEach(function (t) {
    if (!st.nodes[t.key]) st.nodes[t.key] = defaultNodesForTree(t.key);
  });
  if (typeof st.spent !== "number") st.spent = 0;
  return st;
}
function saveSkillState(st){ saveJSON(KEY_SKILL, st); }

function countUnlocked(nodes, tier){
  return nodes.filter(function (n){ return n.tier === tier && n.unlocked; }).length;
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
  var start = ensureStartDate();
  var dayXP = {};
  entries.forEach(function (e) {
    dayXP[e.date] = (dayXP[e.date] || 0) + (e.xp || 0);
  });

  var points = 0;
  Object.keys(dayXP).forEach(function (dayISO) {
    var w = clampWeek(getWeekNumber(start, dayISO));
    var thr = getStarThresholdsForWeek(w, entries);
    var s = starsForDay(dayXP[dayISO] || 0, thr);
    if (s === "⭐") points += 1;
    else if (s === "⭐⭐") points += 2;
    else if (s === "⭐⭐⭐") points += 3;
  });

  var bossClears = entries.filter(function (e) {
    return e.type === "Boss" && String(e.exercise || "").indexOf("Bossfight CLEARED") === 0;
  }).length;
  points += bossClears * 3;

  var ach = entries.filter(function (e) { return e.type === "Achievement"; }).length;
  points += ach * 1;

  return points;
}
function computeSkillPointsAvailable(entries){
  var earned = computeSkillPointsEarned(entries);
  var st = loadSkillState();
  var spent = st.spent || 0;
  return { earned: earned, spent: spent, available: Math.max(0, earned - spent) };
}

function getActiveTreeGates(entries, currentWeek){
  var typesThisWeek = {};
  entries.forEach(function (e) {
    if (e.week === currentWeek) typesThisWeek[e.type] = true;
  });
  var o = {};
  TREES.forEach(function (t) { o[t.key] = !!typesThisWeek[t.gateType]; });
  return o;
}

function skillMultiplierForType(type){
  var st = loadSkillState();
  var mapKey =
    (type === "Mehrgelenkig") ? "multi" :
    (type === "Unilateral") ? "uni" :
    (type === "Core") ? "core" :
    (type === "Conditioning") ? "cond" :
    (type === "Komplexe") ? "comp" : null;

  if (!mapKey) return 1;

  var nodes = (st.nodes && st.nodes[mapKey]) ? st.nodes[mapKey] : [];
  var unlockedCount = nodes.filter(function (n){ return n.unlocked; }).length;

  var hasCap = false;
  nodes.forEach(function (n){ if (String(n.id).indexOf("_cap") >= 0 && n.unlocked) hasCap = true; });

  var mult = 1 + unlockedCount * 0.02;
  if (hasCap) mult += 0.05;
  if (mapKey === "comp" && hasCap) mult += 0.03;

  return mult;
}

function ensureDashboardSkillPill(){
  var todayCard = document.querySelector("#tab-dash .card:nth-of-type(2)");
  if (!todayCard) return;
  if (document.getElementById("skillPointsAvail")) return;

  var row = todayCard.querySelector(".row2:last-of-type") || todayCard.querySelector(".row2") || null;
  var pill = document.createElement("div");
  pill.className = "pill";
  pill.innerHTML = '<b>Skillpunkte verfügbar:</b> <span id="skillPointsAvail">0</span>';
  if (row) row.appendChild(pill);
  else todayCard.appendChild(pill);
}

function renderSkillTrees(entries, curWeek){
  var st = loadSkillState();
  var sp = computeSkillPointsAvailable(entries);
  var gates = getActiveTreeGates(entries, curWeek);

  ["multi","uni","core","cond","comp"].forEach(function (k) {
    var el = $("sp-"+k);
    if (el) el.textContent = sp.available;
  });

  TREES.forEach(function (tree) {
    var ul = $(tree.domList);
    if (!ul) return;
    ul.innerHTML = "";

    var gateOk = !!gates[tree.key];
    var head = document.createElement("li");
    head.innerHTML = '<div class="hint"><b>' + tree.name + '</b> • Gate: ' + (gateOk ? "✅ aktiv" : "🔒 gesperrt (diese Woche nicht trainiert)") + '</div>';
    ul.appendChild(head);

    var nodes = st.nodes[tree.key];
    nodes.forEach(function (node) {
      var available = isNodeAvailable(nodes, node);
      var canBuy = gateOk && available && (sp.available >= node.cost);

      var li = document.createElement("li");
      var status = node.unlocked ? "✅ unlocked" : (available ? "🔓 verfügbar" : "🔒 locked");
      li.innerHTML =
        '<div class="entryRow">' +
          '<div style="min-width:0;">' +
            '<div><b>' + node.name + '</b></div>' +
            '<div class="hint">Cost: ' + node.cost + ' SP • ' + status + ' • Effekt: +2% XP (Capstone extra)</div>' +
          '</div>' +
          '<div class="row" style="margin:0; align-items:flex-start;">' +
            '<button class="secondary" style="width:auto; padding:10px 12px;" data-node="' + node.id + '" ' + (canBuy ? "" : "disabled") + '>' +
              (node.unlocked ? "Unlocked" : "Unlock") +
            '</button>' +
          '</div>' +
        '</div>';
      ul.appendChild(li);
    });
  });

  var btns = document.querySelectorAll("[data-node]");
  for (var i=0;i<btns.length;i++){
    (function (btn) {
      btn.onclick = function () {
        var id = btn.getAttribute("data-node");
        var st2 = loadSkillState();
        var sp2 = computeSkillPointsAvailable(entries);
        var gates2 = getActiveTreeGates(entries, curWeek);

        var found = null, treeKey = null;
        TREES.forEach(function (t) {
          if (found) return;
          var nodes = st2.nodes[t.key];
          for (var j=0;j<nodes.length;j++){
            if (nodes[j].id === id) { found = nodes[j]; treeKey = t.key; break; }
          }
        });
        if (!found) return;

        if (!gates2[treeKey]) return alert("Tree gesperrt – trainiere den Typ diese Woche.");
        if (found.unlocked) return;

        var nodes2 = st2.nodes[treeKey];
        if (!isNodeAvailable(nodes2, found)) return alert("Noch locked – erfülle Tier-Voraussetzungen.");
        if (sp2.available < found.cost) return alert("Nicht genug Skillpunkte.");

        found.unlocked = true;
        st2.spent = (st2.spent || 0) + found.cost;
        saveSkillState(st2);

        renderAll();
      };
    })(btns[i]);
  }
}

/* =========================
   PLAN OVERRIDES
========================= */
function loadPlanOverrides(){ return loadJSON(KEY_PLANOVR, {}); }
function savePlanOverrides(s){ saveJSON(KEY_PLANOVR, s); }

var PLAN_DEFAULT = {
  "Mon": ["DB Floor Press (neutral)","Arnold Press","Deficit Push-Ups","Overhead Trizeps Extension","DB Lateral Raises"],
  "Tue": ["1-Arm DB Row (Pause oben)","Renegade Rows","Reverse Flys (langsam)","DB Supinated Curl","Farmer’s Carry (DB)"],
  "Wed": ["Ruhetag (Recovery + Mobility)"],
  "Thu": ["Bulgarian Split Squats","DB Romanian Deadlift","Goblet Squat","Side Plank + Leg Raise","Standing DB Calf Raises"],
  "Fri": ["Komplex: Deadlift","Komplex: Clean","Komplex: Front Squat","Komplex: Push Press","Plank Shoulder Taps"],
  "Sat": ["Burpees","Mountain Climbers","High Knees","Russian Twists (DB)","Hollow Body Hold"],
  "Sun": ["Ruhetag (Recovery + Mobility)"]
};

function exercisesForGroup(groupName){
  return EXERCISES.filter(function (e) { return e.group === groupName && e.type !== "Rest"; });
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
  var ovr = loadPlanOverrides();
  var w = String(week);
  var base = JSON.parse(JSON.stringify(PLAN_DEFAULT)); // iOS safe clone
  if (!ovr[w]) return base;
  Object.keys(ovr[w]).forEach(function (k) {
    base[k] = ovr[w][k];
  });
  return base;
}

function renderWeeklyPlan(curWeek, entries){
  var content = $("planContent");
  if (!content) return;

  var start = ensureStartDate();
  var w = clampWeek(curWeek || 1);
  var b = weekBlock(w);
  var plan = getWeekPlan(w);
  var mutation = getMutationForWeek(w);
  var adaptive = getAdaptiveModifiers(entries, w);
  var boss = getBossForWeek(w);

  if ($("planStart")) $("planStart").textContent = start;
  if ($("planWeek")) $("planWeek").textContent = "W" + w;
  if ($("planBlock")) $("planBlock").textContent = blockName(b);
  if ($("planHint")) $("planHint").textContent = weeklyProgressHint(w);
  if ($("planMutation")) $("planMutation").textContent = mutation.name + " – " + mutation.effect;
  if ($("planAdaptive")) $("planAdaptive").textContent =
    (adaptive.setDelta >= 0 ? "+" : "") + adaptive.setDelta + " Sätze, " +
    (adaptive.repDelta >= 0 ? "+" : "") + adaptive.repDelta + " Reps";

  var reward = rewardActiveForWeek(w) ? "✅ Aktiv: +5% XP diese Woche" : "—";
  var thr = getStarThresholdsForWeek(w, entries);

  var html = "";
  html += '<div class="pill"><b>Ruhetage:</b> Mittwoch & Sonntag (Recovery/Mobility)</div>';
  html += '<div class="row2">' +
    '<div class="pill"><b>Sterne:</b> ⭐ ab ' + thr.one + ' • ⭐⭐ ab ' + thr.two + ' • ⭐⭐⭐ ab ' + thr.three + '</div>' +
    '<div class="pill"><b>Weekly Reward:</b> ' + reward + '</div>' +
  '</div>';
  html += '<div class="divider"></div>';

  if (boss) html += '<div class="pill"><b>Boss diese Woche:</b> ' + boss.name + ' (+' + boss.xp + ' XP)</div><div class="divider"></div>';

  var dayNames = [
    ["Mon","Montag (Tag 1 – Push)"],
    ["Tue","Dienstag (Tag 2 – Pull)"],
    ["Wed","Mittwoch (Ruhetag)"],
    ["Thu","Donnerstag (Tag 3 – Beine & Core)"],
    ["Fri","Freitag (Tag 4 – Ganzkörper)"],
    ["Sat","Samstag (Tag 5 – Conditioning)"],
    ["Sun","Sonntag (Ruhetag)"]
  ];

  dayNames.forEach(function (pair) {
    var key = pair[0], label = pair[1];
    var exList = plan[key] || [];
    html += '<div class="planDay"><h3>' + label + '</h3><ul class="planList">';

    if (key === "Wed" || key === "Sun"){
      html += '<li><b>Ruhetag</b><br><span class="small">10–20 Min Mobility + Spaziergang. Optional: Walking Desk 30–60 Min.</span></li>';
      html += '</ul></div>';
      return;
    }

    var group = groupForPlanDayKey(key);
    var options = exercisesForGroup(group);

    exList.forEach(function (exName, idx) {
      var type = typeForExercise(exName);
      var setRec = recommendedSetsForExercise(exName, type, w, adaptive).text;
      var repRec = recommendedRepsForExercise(exName, type, w, adaptive);

      var sel = '<select class="swapSel" data-day="' + key + '" data-idx="' + idx + '">';
      options.forEach(function (o) {
        sel += '<option value="' + o.name + '" ' + (o.name === exName ? "selected" : "") + '>' + o.name + '</option>';
      });
      sel += '</select>';

      html += '<li>' +
        '<div style="display:grid; gap:8px;">' +
          '<div><b>' + exName + '</b></div>' +
          '<div class="small">' + type + ' • ' + setRec + ' • ' + repRec + '</div>' +
          '<div class="small">Swap: ' + sel + '</div>' +
        '</div>' +
      '</li>';
    });

    html += '</ul></div>';
  });

  html += '<div class="planDay"><h3>NEAT (optional)</h3>' +
    '<ul class="planList">' +
      '<li><b>Walking Desk 3 km/h</b><br><span class="small">XP = Minuten × 2.5</span></li>' +
    '</ul>' +
  '</div>';

  content.innerHTML = html;

  var sels = content.querySelectorAll("select.swapSel");
  for (var i=0;i<sels.length;i++){
    (function (sel) {
      sel.addEventListener("change", function () {
        var day = sel.getAttribute("data-day");
        var idx = parseInt(sel.getAttribute("data-idx"), 10);
        var val = sel.value;

        var ovr = loadPlanOverrides();
        var wKey = String(w);
        if (ovr[wKey] == null) ovr[wKey] = {};
        if (ovr[wKey][day] == null) ovr[wKey][day] = (PLAN_DEFAULT[day] || []).slice();
        ovr[wKey][day][idx] = val;
        savePlanOverrides(ovr);

        renderAll();
      });
    })(sels[i]);
  }
}

/* =========================
   CALENDAR
========================= */
function startOfWeekMonday(dateISO){
  var d = new Date(dateISO);
  var day = d.getDay();
  var diffToMon = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diffToMon);
  return isoDate(d);
}
function addDays(dateISO, n){
  var d = new Date(dateISO);
  d.setDate(d.getDate() + n);
  return isoDate(d);
}
function rangeLabel(mondayISO){
  var sunISO = addDays(mondayISO, 6);
  return mondayISO + " – " + sunISO;
}
var DOW = ["Mo","Di","Mi","Do","Fr","Sa","So"];

function renderCalendar(entries){
  var grid = $("calGrid");
  if (!grid) return;

  var start = ensureStartDate();
  var today = isoDate(new Date());
  var curWeek = clampWeek(getWeekNumber(start, today));

  var st = loadCalendarState();
  var targetWeek = clampWeek(curWeek + (st.weekOffset || 0));

  var weekStart = addDays(start, (targetWeek - 1) * 7);
  var monday = startOfWeekMonday(weekStart);

  if ($("calWeekTitle")) $("calWeekTitle").textContent = "Woche " + targetWeek;
  if ($("calRange")) $("calRange").textContent = rangeLabel(monday);

  var dayXP = {};
  for (var i=0;i<7;i++){
    var dayISO = addDays(monday, i);
    dayXP[dayISO] = 0;
  }
  entries.forEach(function (e) {
    if (dayXP[e.date] != null) dayXP[e.date] += (e.xp || 0);
  });

  var selected = st.selectedDate || today;
  if (dayXP[selected] == null) selected = monday;

  grid.innerHTML = "";
  var thr = getStarThresholdsForWeek(targetWeek, entries);

  for (var j=0;j<7;j++){
    (function (i2) {
      var dateISO2 = addDays(monday, i2);
      var xp = dayXP[dateISO2] || 0;
      var stars = starsForDay(xp, thr);

      var cell = document.createElement("div");
      cell.className = "calCell" + (dateISO2 === selected ? " active" : "");
      cell.innerHTML =
        '<div class="calTop">' +
          '<div class="calDow">' + DOW[i2] + '</div>' +
          '<div class="calDate">' + dateISO2.slice(5) + '</div>' +
        '</div>' +
        '<div class="calXP"><b>' + xp + '</b> XP</div>' +
        '<div class="calStars">' + stars + '</div>';

      cell.addEventListener("click", function () {
        var st2 = loadCalendarState();
        st2.selectedDate = dateISO2;
        saveCalendarState(st2);
        var dateEl = $("date");
        if (dateEl) dateEl.value = dateISO2;
        renderAll();
      });
      grid.appendChild(cell);
    })(j);
  }

  renderDayEntries(entries, selected);
}

function renderDayEntries(entries, dateISO2){
  var ul = $("dayEntries");
  var title = $("dayTitle");
  var dayXpEl = $("dayXp");
  var starsEl = $("dayStars");
  if (!ul) return;

  var dayEntries = entries.filter(function (e){ return e.date === dateISO2; })
    .sort(function (a,b){ return (b.id || 0) - (a.id || 0); });
  var dayXp = dayEntries.reduce(function (s,e){ return s + (e.xp || 0); }, 0);

  var wDay = currentWeekFor(dateISO2);
  var thr = getStarThresholdsForWeek(wDay, entries);

  if (title) title.textContent = "Tages-Einträge: " + dateISO2;
  if (dayXpEl) dayXpEl.textContent = String(dayXp);
  if (starsEl) starsEl.textContent = starsForDay(dayXp, thr);

  ul.innerHTML = "";
  if (!dayEntries.length) {
    ul.innerHTML = "<li>Noch keine Einträge an diesem Tag.</li>";
    return;
  }

  dayEntries.forEach(function (e) {
    var li = document.createElement("li");
    li.innerHTML =
      '<div class="entryRow">' +
        '<div style="min-width:0;">' +
          '<div class="entryTitle"><b>' + e.exercise + '</b></div>' +
          '<div class="hint">' + e.type + ' • ' + (e.detail || "") + '</div>' +
          '<div class="hint">ID: ' + e.id + ' • W' + e.week + '</div>' +
        '</div>' +
        '<div class="row" style="margin:0; align-items:flex-start;">' +
          '<span class="badge">' + e.xp + ' XP</span>' +
          '<button class="secondary" style="width:auto; padding:10px 12px;" data-edit="' + e.id + '">Edit</button>' +
          '<button class="danger" style="width:auto; padding:10px 12px;" data-del="' + e.id + '">Delete</button>' +
        '</div>' +
      '</div>';
    ul.appendChild(li);
  });

  var editBtns = ul.querySelectorAll("button[data-edit]");
  for (var i=0;i<editBtns.length;i++){
    (function (btn) {
      btn.addEventListener("click", function () {
        var id = parseInt(btn.getAttribute("data-edit"), 10);
        startEditEntry(id);
      });
    })(editBtns[i]);
  }

  var delBtns = ul.querySelectorAll("button[data-del]");
  for (var j=0;j<delBtns.length;j++){
    (function (btn) {
      btn.addEventListener("click", function () {
        var id = parseInt(btn.getAttribute("data-del"), 10);
        deleteEntryById(id);
      });
    })(delBtns[j]);
  }
}

/* =========================
   EDIT/DELETE
========================= */
function startEditEntry(id){
  return idbGetAll().then(function (all) {
    var e = null;
    for (var i=0;i<all.length;i++){ if (all[i].id === id) { e = all[i]; break; } }
    if (!e) { alert("Eintrag nicht gefunden."); return; }

    $("editId").value = String(e.id);
    if ($("logFormTitle")) $("logFormTitle").textContent = "Eintrag bearbeiten";
    if ($("add")) $("add").textContent = "Änderungen speichern";
    var cancel = $("cancelEdit");
    if (cancel) cancel.classList.remove("hide");

    if ($("date")) $("date").value = e.date;
    if ($("exercise")) $("exercise").value = e.exercise;

    var mSets = (e.detail || "").match(/Sets:\s*(\d+)/i);
    var mReps = (e.detail || "").match(/Reps:\s*(\d+)/i);
    var mMin  = (e.detail || "").match(/Min:\s*(\d+)/i);

    if ($("sets") && mSets) $("sets").value = mSets[1];
    if ($("reps") && mReps) $("reps").value = mReps[1];
    if ($("walkMin") && mMin) $("walkMin").value = mMin[1];

    location.hash = "log";
    return renderAll();
  });
}
function deleteEntryById(id){
  var ok = confirm("Diesen Eintrag wirklich löschen?");
  if (!ok) return Promise.resolve(true);
  return idbDelete(id).then(function () { return renderAll(); });
}
function resetEditMode(){
  if ($("editId")) $("editId").value = "";
  if ($("logFormTitle")) $("logFormTitle").textContent = "Neuer Eintrag (rückwirkend möglich)";
  if ($("add")) $("add").textContent = "Eintrag speichern";
  var cancel = $("cancelEdit");
  if (cancel) cancel.classList.add("hide");
}

/* =========================
   LOG UI + PREVIEW
========================= */
function removeBonusCheckboxes(){
  ["rpe9","tech","pause","extraXp"].forEach(function (id) {
    var el = $(id);
    if (!el) return;
    var label = el.closest ? el.closest("label") : null;
    if (label) label.remove();
    else el.remove();
  });
}

function ensureRepsInput(){
  if ($("reps")) return;
  var setsRow = $("setsRow");
  if (!setsRow) return;
  var wrap = document.createElement("div");
  wrap.innerHTML =
    '<label>Wiederholungen pro Satz' +
      '<input id="reps" type="number" min="0" step="1" inputmode="numeric" placeholder="z. B. 10">' +
    '</label>';
  setsRow.appendChild(wrap);
}

function updateLogUI(entries){
  ensureRepsInput();

  if ($("logStart")) $("logStart").textContent = ensureStartDate();

  var dateISO2 = ($("date") && $("date").value) ? $("date").value : isoDate(new Date());
  var week = currentWeekFor(dateISO2);
  if ($("logWeek")) $("logWeek").textContent = "W" + week;

  var mutation = getMutationForWeek(week);
  var adaptive = getAdaptiveModifiers(entries, week);

  var exName = ($("exercise") && $("exercise").value) ? $("exercise").value : "";
  var type = typeForExercise(exName);

  if ($("autoType")) $("autoType").textContent = type;

  var setRec = recommendedSetsForExercise(exName, type, week, adaptive);
  var repRec = recommendedRepsForExercise(exName, type, week, adaptive);

  if ($("recommendedSets")) $("recommendedSets").textContent = setRec.text;
  if ($("recommendedReps")) $("recommendedReps").textContent = repRec;

  var isWalk = isWalkType(type);
  var isRest = isRestType(type);

  var walkRow = $("walkingRow");
  if (walkRow) walkRow.classList.toggle("hide", !isWalk);

  var setsRow = $("setsRow");
  if (setsRow) setsRow.classList.toggle("hide", isWalk || isRest);

  if (!isWalk && !isRest && $("sets") && setRec.value) {
    var elS = $("sets");
    var rawS = (elS.value || "").trim();
    var isEditingS = (document.activeElement === elS);
    if (!isEditingS && (rawS === "" || parseInt(rawS,10) <= 0)) elS.value = String(setRec.value);
  }
  if (!isWalk && !isRest && $("reps")) {
    var elR = $("reps");
    var rawR = (elR.value || "").trim();
    var isEditingR = (document.activeElement === elR);
    if (!isEditingR && rawR === "") {
      var m = repRec.match(/\d+/);
      if (m && m[0]) elR.value = m[0];
    }
  }

  var mutMult = mutationXpMultiplierForType(type, mutation);
  var skillMult = skillMultiplierForType(type);
  var rewardMult = rewardActiveForWeek(week) ? 1.05 : 1.0;

  if ($("logAdaptive")) {
    $("logAdaptive").textContent =
      "W"+week+" • Mut x"+mutMult.toFixed(2)+" • Skill x"+skillMult.toFixed(2)+" • Reward x"+rewardMult.toFixed(2)+" • Adaptive nur Empfehlungen";
  }

  updateCalcPreview(week, mutation);
}

function updateCalcPreview(week, mutation){
  var exName = ($("exercise") && $("exercise").value) ? $("exercise").value : "";
  var type = typeForExercise(exName);

  var base = 0;
  if (type === "NEAT") {
    var minutes = Math.max(1, parseInt(($("walkMin") && $("walkMin").value) ? $("walkMin").value : "0", 10));
    base = neatXP(minutes);
  } else if (type === "Rest") {
    base = 0;
  } else {
    base = XP_PER_EXERCISE[type] || 0;
  }

  var mutMult = mutationXpMultiplierForType(type, mutation);
  var skillMult = skillMultiplierForType(type);
  var rewardMult = rewardActiveForWeek(week) ? 1.05 : 1.0;

  var xp = Math.round(base * mutMult * skillMult * rewardMult);

  if ($("calcXp")) $("calcXp").textContent = String(xp);
  if ($("calcInfo")) $("calcInfo").textContent =
    "Base "+base+" • Mut x"+mutMult.toFixed(2)+" • Skill x"+skillMult.toFixed(2)+" • Reward x"+rewardMult.toFixed(2);
}

/* =========================
   ATTRIBUTES
========================= */
function attrReqForLevel(level){ return 900 + (level - 1) * 150; }
function attrLevelFromXp(totalXp){
  var lvl = 1;
  var xp = Math.max(0, Math.round(totalXp || 0));
  while (true) {
    var req = attrReqForLevel(lvl);
    if (xp >= req) { xp -= req; lvl += 1; }
    else break;
    if (lvl > 999) break;
  }
  return { lvl: lvl, into: xp, need: attrReqForLevel(lvl) };
}

function baseAttrFromEntry(e) {
  var out = { STR:0, STA:0, END:0, MOB:0 };
  var xp = e.xp || 0;
  var t = e.type || "";

  if (t === "Mehrgelenkig") out.STR += xp;
  else if (t === "Unilateral") out.STA += xp;
  else if (t === "Conditioning") out.END += xp;
  else if (t === "Core") out.MOB += xp;
  else if (t === "Komplexe") { out.STR += xp*0.4; out.STA += xp*0.2; out.END += xp*0.2; out.MOB += xp*0.2; }
  else if (t === "NEAT") { out.END += xp*0.7; out.MOB += xp*0.3; }
  else if (t === "Boss-Workout") { out.STR += xp*0.25; out.STA += xp*0.25; out.END += xp*0.25; out.MOB += xp*0.25; }
  return out;
}

function applyMutationToAttr(attr, mutation){
  var out = { STR:attr.STR, STA:attr.STA, END:attr.END, MOB:attr.MOB };
  if (mutation && mutation.mult) {
    if (mutation.mult.STR) out.STR *= mutation.mult.STR;
    if (mutation.mult.STA) out.STA *= mutation.mult.STA;
    if (mutation.mult.END) out.END *= mutation.mult.END;
    if (mutation.mult.MOB) out.MOB *= mutation.mult.MOB;
  }
  return out;
}

function computeStats(entries){
  var startDate = ensureStartDate();
  var today = isoDate(new Date());
  var curWeek = clampWeek(getWeekNumber(startDate, today));

  var todayXp = 0, weekXp = 0, totalXp = 0;
  var attr = { STR:0, STA:0, END:0, MOB:0 };

  entries.forEach(function (e) {
    totalXp += (e.xp || 0);
    if (e.date === today) todayXp += (e.xp || 0);
    if (e.week === curWeek) weekXp += (e.xp || 0);

    var mut = getMutationForWeek(e.week || curWeek);
    var base = baseAttrFromEntry(e);
    var adj = applyMutationToAttr(base, mut);
    attr.STR += adj.STR; attr.STA += adj.STA; attr.END += adj.END; attr.MOB += adj.MOB;
  });

  return { todayXp: todayXp, weekXp: weekXp, totalXp: totalXp, curWeek: curWeek, startDate: startDate, attr: attr };
}

function renderAttributes(attr){
  ["STR","STA","END","MOB"].forEach(function (k) {
    var xp = Math.round(attr[k] || 0);
    var lvObj = attrLevelFromXp(xp);
    var lvl = lvObj.lvl, into = lvObj.into, need = lvObj.need;
    var pct = Math.max(0, Math.min(100, Math.round((into / need) * 100)));

    if ($("lv"+k)) $("lv"+k).textContent = String(lvl);
    if ($("xp"+k)) $("xp"+k).textContent = String(xp);
    if ($("need"+k)) $("need"+k).textContent = String(Math.max(0, need - into));
    if ($("bar"+k)) $("bar"+k).style.width = pct + "%";
  });
}

function renderMutationUI(curWeek){
  var m = getMutationForWeek(curWeek);
  if ($("mutationName")) $("mutationName").textContent = "W"+curWeek+": " + m.name;
  if ($("mutationDesc")) $("mutationDesc").textContent = m.desc;
  if ($("mutationEffect")) $("mutationEffect").textContent = m.effect;
}

/* =========================
   CSV EXPORT
========================= */
function csvSafe(v){
  var s = String(v == null ? "" : v);
  if (s.indexOf(",") >= 0 || s.indexOf('"') >= 0 || s.indexOf("\n") >= 0) {
    return '"' + s.split('"').join('""') + '"'; // iOS safe replaceAll
  }
  return s;
}
function toCSV(entries){
  var header = ["id","date","week","exercise","type","detail","xp"];
  var rows = [header.join(",")];
  entries.forEach(function (e) {
    rows.push([e.id, e.date, e.week, csvSafe(e.exercise), e.type, csvSafe(e.detail), e.xp].join(","));
  });
  return rows.join("\n");
}
function downloadCSV(filename, content){
  var blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  var url = URL.createObjectURL(blob);
  var a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
}

/* =========================
   ENTRIES LIST
========================= */
function renderAllEntriesList(entries){
  var list = $("list");
  if (!list) return;

  list.innerHTML = "";
  if (!entries.length){
    list.innerHTML = "<li>Noch keine Einträge.</li>";
    return;
  }

  entries.forEach(function (e) {
    var li = document.createElement("li");
    li.innerHTML =
      '<div class="entryRow">' +
        '<div style="min-width:0;">' +
          '<div class="entryTitle"><b>' + e.date + '</b> (W' + e.week + ') • <b>' + e.exercise + '</b></div>' +
          '<div class="hint">' + e.type + ' • ' + (e.detail || "") + '</div>' +
        '</div>' +
        '<div class="row" style="margin:0; align-items:flex-start;">' +
          '<span class="badge">' + e.xp + ' XP</span>' +
          '<button class="secondary" style="width:auto; padding:10px 12px;" data-edit="' + e.id + '">Edit</button>' +
          '<button class="danger" style="width:auto; padding:10px 12px;" data-del="' + e.id + '">Delete</button>' +
        '</div>' +
      '</div>';
    list.appendChild(li);
  });

  var editBtns = list.querySelectorAll("button[data-edit]");
  for (var i=0;i<editBtns.length;i++){
    (function (btn) {
      btn.addEventListener("click", function () {
        var id = parseInt(btn.getAttribute("data-edit"), 10);
        startEditEntry(id);
      });
    })(editBtns[i]);
  }
  var delBtns = list.querySelectorAll("button[data-del]");
  for (var j=0;j<delBtns.length;j++){
    (function (btn) {
      btn.addEventListener("click", function () {
        var id = parseInt(btn.getAttribute("data-del"), 10);
        deleteEntryById(id);
      });
    })(delBtns[j]);
  }
}

/* =========================
   SAVE / UPDATE ENTRY
========================= */
function saveOrUpdateEntry(){
  var dateISO2 = ($("date") && $("date").value) ? $("date").value : isoDate(new Date());
  var week = currentWeekFor(dateISO2);

  var exName = ($("exercise") && $("exercise").value) ? $("exercise").value : "Unbekannt";
  var type = typeForExercise(exName);

  return idbGetAll().then(function (raw) {
    var entries = sortEntriesDesc(raw);
    var adaptive = getAdaptiveModifiers(entries, week);
    var mutation = getMutationForWeek(week);

    var setRec = recommendedSetsForExercise(exName, type, week, adaptive).text;
    var repRec = recommendedRepsForExercise(exName, type, week, adaptive);

    var sets = parseInt((($("sets") && $("sets").value) ? $("sets").value : "").trim(), 10);
    var reps = parseInt((($("reps") && $("reps").value) ? $("reps").value : "").trim(), 10);

    var base = 0;
    if (type === "NEAT") {
      var minutes = Math.max(1, parseInt((($("walkMin") && $("walkMin").value) ? $("walkMin").value : "0"), 10));
      base = neatXP(minutes);
    } else if (type === "Rest") {
      base = 0;
    } else {
      base = XP_PER_EXERCISE[type] || 0;
    }

    var mutMult = mutationXpMultiplierForType(type, mutation);
    var skillMult = skillMultiplierForType(type);
    var rewardMult = rewardActiveForWeek(week) ? 1.05 : 1.0;

    var xp = Math.round(base * mutMult * skillMult * rewardMult);

    var detail = "Empf: " + setRec + " / " + repRec;
    if (type === "NEAT") {
      var minutes2 = Math.max(1, parseInt((($("walkMin") && $("walkMin").value) ? $("walkMin").value : "0"), 10));
      detail = "Min: " + minutes2 + " • " + detail;
    } else if (type !== "Rest") {
      if (!Number.isNaN(sets)) detail = "Sets: " + sets + " • " + detail;
      if (!Number.isNaN(reps)) detail = "Reps: " + reps + " • " + detail;
    } else {
      detail = "Recovery • Mobility 10–20 Min";
    }
    detail += " • Mut x"+mutMult.toFixed(2)+" • Skill x"+skillMult.toFixed(2)+" • Reward x"+rewardMult.toFixed(2);

    var editId = parseInt((($("editId") && $("editId").value) ? $("editId").value : "").trim(), 10);

    var p;
    if (editId) {
      p = idbPut({ id: editId, date: dateISO2, week: week, exercise: exName, type: type, detail: detail, xp: xp })
        .then(function () {
          resetEditMode();
          alert("Gespeichert (Edit): " + dateISO2 + " • +" + xp + " XP ✅");
        });
    } else {
      p = idbAdd({ date: dateISO2, week: week, exercise: exName, type: type, detail: detail, xp: xp })
        .then(function () {
          alert("Gespeichert: " + dateISO2 + " • +" + xp + " XP ✅");
        });
    }

    return p.then(function () {
      clearLogDraft(dateISO2);
      return renderAll();
    });
  });
}

/* =========================
   MINI-ANALYTICS
========================= */
function ensureAnalyticsTabExists(){
  var nav = document.querySelector("nav.tabs");
  var main = document.querySelector("main");
  if (!nav || !main) return;

  if (!document.querySelector('.tab[data-tab="analytics"]')) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tab";
    btn.setAttribute("data-tab", "analytics");
    btn.textContent = "Analytics";
    var exportBtn = nav.querySelector('.tab[data-tab="export"]');
    if (exportBtn) nav.insertBefore(btn, exportBtn);
    else nav.appendChild(btn);
  }

  if (!document.getElementById("tab-analytics")) {
    var sec = document.createElement("section");
    sec.id = "tab-analytics";
    sec.className = "panel";
    sec.innerHTML =
      '<div class="card">' +
        '<h2>Mini-Analytics</h2>' +
        '<p class="hint">Wochen-Trend, Top-Übungen, Typ-Verteilung & ⭐ Übersicht.</p>' +

        '<div class="row2">' +
          '<div class="pill"><b>Woche:</b> <span id="anWeek">—</span></div>' +
          '<div class="pill"><b>Trend vs. letzte Woche:</b> <span id="anTrend">—</span></div>' +
        '</div>' +

        '<div class="divider"></div>' +

        '<h2>Wochen-XP (letzte 8 Wochen)</h2>' +
        '<canvas id="anWeekChart" width="900" height="240" style="width:100%; height:auto; border-radius:12px;"></canvas>' +
        '<div class="hint" id="anWeekChartHint">—</div>' +

        '<div class="divider"></div>' +

        '<div class="grid2">' +
          '<div class="skillbox">' +
            '<h3>Top 10 Übungen (nach XP)</h3>' +
            '<ul class="skilllist" id="anTopExercises"></ul>' +
          '</div>' +
          '<div class="skillbox">' +
            '<h3>XP nach Übungstyp</h3>' +
            '<ul class="skilllist" id="anTypeDist"></ul>' +
          '</div>' +
        '</div>' +

        '<div class="divider"></div>' +

        '<h2>⭐ Übersicht (aktuelle Woche)</h2>' +
        '<div id="anStarGrid" class="calGrid"></div>' +
        '<p class="hint">Ziel: Mehr ⭐⭐⭐-Tage – und weniger „—“.</p>' +
      '</div>';

    main.appendChild(sec);
  }

  if (!document.getElementById("dashAnalyticsCard")) {
    var dash = document.getElementById("tab-dash");
    if (!dash) return;
    var cards = dash.querySelectorAll(".card");
    var insertAfter = (cards && cards[1]) ? cards[1] : null;

    var card = document.createElement("div");
    card.className = "card";
    card.id = "dashAnalyticsCard";
    card.innerHTML =
      '<h2>Mini-Analytics</h2>' +
      '<div class="row2">' +
        '<div class="pill"><b>Trend:</b> <span id="dashTrend">—</span></div>' +
        '<div class="pill"><b>Top Übung (Woche):</b> <span id="dashTopEx">—</span></div>' +
      '</div>' +
      '<div class="row2">' +
        '<div class="pill"><b>Top Typ (Woche):</b> <span id="dashTopType">—</span></div>' +
        '<div class="pill"><b>⭐⭐⭐-Tage (Woche):</b> <span id="dash3StarCount">0</span></div>' +
      '</div>' +
      '<canvas id="dashSpark" width="900" height="120" style="width:100%; height:auto; border-radius:12px;"></canvas>' +
      '<p class="hint">Sparkline = Wochen-XP der letzten 8 Wochen.</p>';

    if (insertAfter) insertAfter.insertAdjacentElement("afterend", card);
    else dash.appendChild(card);
  }
}

function weekXpMap(entries){
  var map = {};
  entries.forEach(function (e) {
    var w = clampWeek(e.week || 1);
    map[w] = (map[w] || 0) + (e.xp || 0);
  });
  return map;
}
function topExercisesForWeek(entries, week){
  var m = {};
  entries.forEach(function (e) {
    if ((e.week || 0) !== week) return;
    if (!e.exercise) return;
    var name = String(e.exercise);
    if (name.indexOf("Bossfight CLEARED") === 0) return;
    m[name] = (m[name] || 0) + (e.xp || 0);
  });
  return Object.entries(m).sort(function (a,b){ return b[1] - a[1]; });
}
function typeDistForWeek(entries, week){
  var m = {};
  entries.forEach(function (e) {
    if ((e.week || 0) !== week) return;
    var t = e.type || "Other";
    m[t] = (m[t] || 0) + (e.xp || 0);
  });
  return Object.entries(m).sort(function (a,b){ return b[1] - a[1]; });
}
function dayXpForWeek(entries, week){
  var start = ensureStartDate();
  var weekStart = addDays(start, (week - 1) * 7);
  var monday = startOfWeekMonday(weekStart);
  var days = [];
  for (var i=0;i<7;i++) days.push(addDays(monday, i));

  var m = {};
  days.forEach(function (d) { m[d] = 0; });

  entries.forEach(function (e) {
    if (e.week !== week) return;
    if (m[e.date] != null) m[e.date] += (e.xp || 0);
  });
  return { days: days, map: m };
}
function pctChange(cur, prev){
  if (prev <= 0 && cur > 0) return "↑ neu";
  if (prev <= 0 && cur <= 0) return "—";
  var p = ((cur - prev) / prev) * 100;
  var sign = p >= 0 ? "+" : "";
  return sign + Math.round(p) + "%";
}

function drawBarChart(canvas, labels, values){
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var W = canvas.width, H = canvas.height;
  ctx.clearRect(0,0,W,H);

  var pad = 24;
  var innerW = W - pad*2;
  var innerH = H - pad*2;

  var maxV = 1;
  values.forEach(function (v){ if (v > maxV) maxV = v; });

  var n = values.length;
  var gap = Math.max(6, Math.floor(innerW / (n*12)));
  var barW = Math.floor((innerW - gap*(n-1)) / n);

  ctx.globalAlpha = 0.35;
  ctx.fillRect(pad, H-pad, innerW, 2);
  ctx.globalAlpha = 1;

  for (var i=0;i<n;i++){
    var v = values[i];
    var h = Math.round((v/maxV) * (innerH-20));
    var x = pad + i*(barW+gap);
    var y = pad + (innerH - h);

    ctx.fillRect(x, y, barW, h);

    ctx.globalAlpha = 0.85;
    ctx.font = "22px system-ui, -apple-system, Segoe UI, Roboto";
    ctx.fillText(labels[i], x, H - 6);
    ctx.globalAlpha = 1;
  }
}

function drawSpark(canvas, values){
  if (!canvas) return;
  var ctx = canvas.getContext("2d");
  var W = canvas.width, H = canvas.height;
  ctx.clearRect(0,0,W,H);

  var pad = 18;
  var innerW = W - pad*2;
  var innerH = H - pad*2;

  var maxV = 1;
  values.forEach(function (v){ if (v > maxV) maxV = v; });
  var minV = 0;
  values.forEach(function (v){ if (v < minV) minV = v; });
  var range = Math.max(1, maxV - minV);

  var pts = values.map(function (v,i) {
    var x = pad + (i/(values.length-1)) * innerW;
    var y = pad + innerH - ((v-minV)/range)*innerH;
    return {x:x,y:y};
  });

  ctx.beginPath();
  pts.forEach(function (p,i) {
    if (i===0) ctx.moveTo(p.x,p.y);
    else ctx.lineTo(p.x,p.y);
  });
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.9;
  ctx.stroke();
  ctx.globalAlpha = 1;

  pts.forEach(function (p) {
    ctx.beginPath();
    ctx.arc(p.x,p.y,4,0,Math.PI*2);
    ctx.fill();
  });
}

function renderAnalytics(entries, curWeek){
  ensureAnalyticsTabExists();

  var weekMap = weekXpMap(entries);

  var weeks = [];
  for (var w = Math.max(1, curWeek-7); w <= curWeek; w++) weeks.push(w);
  var vals = weeks.map(function (w2){ return weekMap[w2] || 0; });
  var labels = weeks.map(function (w2){ return "W"+w2; });

  var cur = weekMap[curWeek] || 0;
  var prev = weekMap[curWeek-1] || 0;
  var trend = pctChange(cur, prev);

  if ($("dashTrend")) $("dashTrend").textContent = trend + " (" + cur + " XP)";
  var topEx = topExercisesForWeek(entries, curWeek);
  if ($("dashTopEx")) $("dashTopEx").textContent = topEx.length ? topEx[0][0] : "—";
  var topType = typeDistForWeek(entries, curWeek);
  if ($("dashTopType")) $("dashTopType").textContent = topType.length ? topType[0][0] : "—";

  var thr = getStarThresholdsForWeek(curWeek, entries);
  var dayObj = dayXpForWeek(entries, curWeek);
  var days = dayObj.days, dayMap = dayObj.map;
  var threeCount = days.filter(function (d){ return (dayMap[d] || 0) >= thr.three; }).length;
  if ($("dash3StarCount")) $("dash3StarCount").textContent = String(threeCount);

  drawSpark($("dashSpark"), vals);

  if ($("anWeek")) $("anWeek").textContent = "W"+curWeek;
  if ($("anTrend")) $("anTrend").textContent = trend + " (W"+curWeek+": "+cur+" XP / W"+(curWeek-1)+": "+prev+" XP)";

  drawBarChart($("anWeekChart"), labels, vals);
  if ($("anWeekChartHint")) {
    var max = Math.max.apply(null, vals);
    var min = Math.min.apply(null, vals);
    $("anWeekChartHint").textContent = "Max: " + max + " XP • Min: " + min + " XP";
  }

  var ulTop = $("anTopExercises");
  if (ulTop){
    var top10 = topExercisesForWeek(entries, curWeek).slice(0,10);
    ulTop.innerHTML = top10.length ? "" : "<li>—</li>";
    top10.forEach(function (pair, i) {
      var name = pair[0], xp = pair[1];
      var li = document.createElement("li");
      li.innerHTML = '<div class="entryRow"><div style="min-width:0;"><b>'+(i+1)+'.</b> '+name+'</div><span class="badge">'+Math.round(xp)+' XP</span></div>';
      ulTop.appendChild(li);
    });
  }

  var ulDist = $("anTypeDist");
  if (ulDist){
    var dist = typeDistForWeek(entries, curWeek);
    var totalWeek = dist.reduce(function (s,p){ return s + p[1]; }, 0) || 1;
    ulDist.innerHTML = dist.length ? "" : "<li>—</li>";
    dist.forEach(function (pair) {
      var t = pair[0], x = pair[1];
      var pct = Math.round((x/totalWeek)*100);
      var li = document.createElement("li");
      li.innerHTML = '<div class="entryRow"><div style="min-width:0;"><b>'+t+'</b> <span class="hint">('+pct+'%)</span></div><span class="badge">'+Math.round(x)+' XP</span></div>';
      ulDist.appendChild(li);
    });
  }

  var grid = $("anStarGrid");
  if (grid){
    grid.innerHTML = "";
    for (var i=0;i<7;i++){
      var d = days[i];
      var xp2 = dayMap[d] || 0;
      var stars = starsForDay(xp2, thr);

      var cell = document.createElement("div");
      cell.className = "calCell";
      cell.innerHTML =
        '<div class="calTop">' +
          '<div class="calDow">' + DOW[i] + '</div>' +
          '<div class="calDate">' + d.slice(5) + '</div>' +
        '</div>' +
        '<div class="calXP"><b>' + xp2 + '</b> XP</div>' +
        '<div class="calStars">' + stars + '</div>';
      grid.appendChild(cell);
    }
  }
}

/* =========================
   MAIN RENDER
========================= */
function renderAll(){
  ensureStartDate();
  ensureAnalyticsTabExists();
  buildExerciseDropdown();
  removeBonusCheckboxes();

  return idbGetAll().then(function (raw) {
    var entries = sortEntriesDesc(raw);
    var stats = computeStats(entries);

    return evaluateWeeklyAchievements(entries, stats.curWeek).then(function (evalRes) {
      // falls neue Achievements hinzugefügt wurden: neu laden
      var reloadNeeded = evalRes.newlyEarned && evalRes.newlyEarned.length;
      var p = reloadNeeded ? idbGetAll().then(function (r2){ return sortEntriesDesc(r2); }) : Promise.resolve(entries);

      return p.then(function (finalEntries) {
        var stats2 = computeStats(finalEntries);

        if ($("startDisplay")) $("startDisplay").textContent = stats2.startDate;
        if ($("weekNumber")) $("weekNumber").textContent = "W" + stats2.curWeek;
        if ($("blockNow")) $("blockNow").textContent = blockName(weekBlock(stats2.curWeek));
        if ($("blockHint")) $("blockHint").textContent = weeklyProgressHint(stats2.curWeek);

        var thrToday = getStarThresholdsForWeek(stats2.curWeek, finalEntries);

        if ($("todayXp")) $("todayXp").textContent = String(stats2.todayXp);
        if ($("todayStars")) $("todayStars").textContent = starsForDay(stats2.todayXp, thrToday);
        if ($("weekXp")) $("weekXp").textContent = String(stats2.weekXp);
        if ($("totalXp")) $("totalXp").textContent = String(stats2.totalXp);

        var lv = levelFromTotalXp(stats2.totalXp);
        if ($("level")) $("level").textContent = String(lv.lvl);
        if ($("title")) $("title").textContent = titleForLevel(lv.lvl);

        renderMutationUI(stats2.curWeek);
        renderAttributes(stats2.attr);

        if ($("wkTrainDays")) $("wkTrainDays").textContent = String(evalRes.trainDays || 0);
        if ($("wkThreeStarDays")) $("wkThreeStarDays").textContent = String(evalRes.threeStarDays || 0);

        var earnedNames = (evalRes.earned || []).map(function (id) {
          for (var i=0;i<ACHIEVEMENTS.length;i++){ if (ACHIEVEMENTS[i].id === id) return ACHIEVEMENTS[i].name; }
          return null;
        }).filter(Boolean);

        if ($("wkAchievements")) $("wkAchievements").textContent = earnedNames.length ? earnedNames.join(", ") : "—";

        var adaptive = getAdaptiveModifiers(finalEntries, stats2.curWeek);
        if ($("adaptiveHint")) $("adaptiveHint").textContent = adaptive.note;

        var recentList = $("recentList");
        if (recentList){
          var recent = finalEntries.slice(0, 6);
          recentList.innerHTML = recent.length ? "" : "<li>Noch keine Einträge.</li>";
          recent.forEach(function (e) {
            var li2 = document.createElement("li");
            li2.textContent = e.date + " (W"+e.week+") • " + e.exercise + " • " + e.xp + " XP";
            recentList.appendChild(li2);
          });
        }

        renderCalendar(finalEntries);
        renderWeeklyPlan(stats2.curWeek, finalEntries);

        renderQuests();
        renderBoss(stats2.curWeek);

        ensureDashboardSkillPill();
        var sp = computeSkillPointsAvailable(finalEntries);
        if ($("skillPointsAvail")) $("skillPointsAvail").textContent = String(sp.available);
        renderSkillTrees(finalEntries, stats2.curWeek);

        updateLogUI(finalEntries);
        renderAllEntriesList(finalEntries);

        if ($("countEntries")) $("countEntries").textContent = String(finalEntries.length);

        var thr = getStarThresholdsForWeek(stats2.curWeek, finalEntries);
        var rew = rewardActiveForWeek(stats2.curWeek) ? "Reward +5% aktiv" : "Reward —";
        if ($("appStatus")) $("appStatus").textContent = "OK • ⭐ "+thr.one+" • ⭐⭐ "+thr.two+" • ⭐⭐⭐ "+thr.three+" • "+rew;

        renderAnalytics(finalEntries, stats2.curWeek);
      });
    });
  });
}

/* =========================
   SW AUTO-UPDATE (Home Screen)
========================= */
function setupServiceWorkerAutoUpdate(){
  if (!("serviceWorker" in navigator)) return;

  navigator.serviceWorker.register("sw.js").then(function (reg) {
    // Suche aktiv nach Updates
    if (reg.update) reg.update();

    // Wenn ein neuer SW gefunden wurde:
    reg.addEventListener("updatefound", function () {
      var newWorker = reg.installing;
      if (!newWorker) return;

      newWorker.addEventListener("statechange", function () {
        // installed => wenn schon ein SW aktiv ist, dann update vorhanden
        if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
          // sag dem neuen SW: skip waiting
          try { newWorker.postMessage({ type: "SKIP_WAITING" }); } catch (e) {}
        }
      });
    });

    // Wenn SW Kontrolle wechselt => reload (damit Home Screen sofort neue app.js bekommt)
    navigator.serviceWorker.addEventListener("controllerchange", function () {
      window.location.reload();
    });
  }).catch(function (e) {
    console.warn("SW register failed", e);
  });
}

/* =========================
   INIT + EVENTS
========================= */
function init(){
  try {
    if ($("date")) $("date").value = isoDate(new Date());
    ensureStartDate();
    ensureAnalyticsTabExists();
    buildExerciseDropdown();
    resetEditMode();
    removeBonusCheckboxes();

    var prevBtn = $("calPrev");
    if (prevBtn) prevBtn.addEventListener("click", function () {
      var st = loadCalendarState();
      st.weekOffset = (st.weekOffset || 0) - 1;
      saveCalendarState(st);
      renderAll();
    });

    var nextBtn = $("calNext");
    if (nextBtn) nextBtn.addEventListener("click", function () {
      var st = loadCalendarState();
      st.weekOffset = (st.weekOffset || 0) + 1;
      saveCalendarState(st);
      renderAll();
    });

    var saveStart = $("saveStartDash");
    if (saveStart) saveStart.addEventListener("click", function () {
      var newStart = $("startDateDash") ? $("startDateDash").value : "";
      if (!newStart) return alert("Bitte ein Startdatum wählen.");

      var oldStart = ensureStartDate();
      if (newStart === oldStart) return alert("Startdatum unverändert.");

      var ok = confirm(
        "Startdatum rückwirkend ändern?\n\n" +
        "✅ Alle Trainingseinträge werden neu in Wochen einsortiert.\n" +
        "⚠️ Boss/Achievements/Mutations werden zurückgesetzt.\n"
      );
      if (!ok) { if ($("startDateDash")) $("startDateDash").value = oldStart; return; }

      setStartDateLocal(newStart);
      resetWeekBoundSystems();

      recalcAllEntryWeeks().then(function () {
        saveCalendarState({ weekOffset: 0, selectedDate: isoDate(new Date()) });
        return renderAll();
      }).then(function () {
        alert("Startdatum gespeichert & Einträge neu berechnet ✅");
      });
    });

    var dateEl = $("date");
    if (dateEl) dateEl.addEventListener("change", function () {
      var st = loadCalendarState();
      st.selectedDate = dateEl.value;
      saveCalendarState(st);
      renderAll();
    });

    var exEl = $("exercise");
    if (exEl) exEl.addEventListener("change", function () { renderAll(); });

    ["sets","reps","walkMin"].forEach(function (id) {
      var el = $(id);
      if (!el) return;
      el.addEventListener("input", function () {
        var d = ($("date") && $("date").value) ? $("date").value : isoDate(new Date());
        var w = currentWeekFor(d);
        var mut = getMutationForWeek(w);
        updateCalcPreview(w, mut);
        autosaveLogDraft();
      });
      el.addEventListener("change", function () {
        autosaveLogDraft();
        renderAll();
      });
    });

    ["exercise","date","walkMin"].forEach(function (id) {
      var el = $(id);
      if (!el) return;
      el.addEventListener("input", autosaveLogDraft);
      el.addEventListener("change", autosaveLogDraft);
    });

    var addBtn = $("add");
    if (addBtn) addBtn.addEventListener("click", function () { saveOrUpdateEntry(); });

    var cancelBtn = $("cancelEdit");
    if (cancelBtn) cancelBtn.addEventListener("click", function () {
      resetEditMode();
      renderAll();
    });

    var clearBtn = $("clear");
    if (clearBtn) clearBtn.addEventListener("click", function () {
      if (confirm("Wirklich ALLE Einträge löschen?")) {
        idbClear().then(function () { return renderAll(); });
      }
    });

    var resetBossBtn = $("resetBoss");
    if (resetBossBtn) resetBossBtn.addEventListener("click", function () {
      if (confirm("Boss-Fight Status & Checks zurücksetzen?")) {
        localStorage.removeItem(KEY_BOSS);
        localStorage.removeItem(KEY_BOSSCHK);
        renderAll();
      }
    });

    var exportBtn = $("exportCsv");
    if (exportBtn) exportBtn.addEventListener("click", function () {
      idbGetAll().then(function (raw) {
        var entries = sortEntriesDesc(raw);
        if (!entries.length) return alert("Keine Einträge zum Exportieren.");
        downloadCSV("ironquest_export.csv", toCSV(entries));
      });
    });

    var resetSkillsBtn = $("resetSkills");
    if (resetSkillsBtn) resetSkillsBtn.addEventListener("click", function () {
      if (confirm("Skilltree zurücksetzen?")) {
        var st = loadSkillState();
        st.spent = 0;
        var nodes = {};
        TREES.forEach(function (t){ nodes[t.key] = defaultNodesForTree(t.key); });
        st.nodes = nodes;
        saveSkillState(st);
        renderAll();
      }
    });

    // ✅ Service Worker Auto-Update
    setupServiceWorkerAutoUpdate();

    recalcAllEntryWeeks().then(function () {
      return renderAll();
    }).then(function () {
      restoreLogDraft();
    });

  } catch (e) {
    console.error(e);
    if ($("appStatus")) $("appStatus").textContent = "ERROR (siehe Konsole)";
    alert("Fehler in app.js. Bitte Screenshot der Konsole schicken.");
  }
}

/* =========================
   LOG DRAFT AUTOSAVE
========================= */
var LOG_DRAFT_KEY = "ironquest_log_draft_v1";

function loadLogDraft(){
  try {
    return JSON.parse(localStorage.getItem(LOG_DRAFT_KEY)) || {};
  } catch (e) {
    return {};
  }
}
function saveLogDraft(draft){
  localStorage.setItem(LOG_DRAFT_KEY, JSON.stringify(draft));
}
function clearLogDraft(dateISO){
  var draft = loadLogDraft();
  if (draft[dateISO]) {
    delete draft[dateISO];
    saveLogDraft(draft);
  }
}
function autosaveLogDraft(){
  var dateISO = ($("date") && $("date").value) ? $("date").value : "";
  if (!dateISO) return;

  var draft = loadLogDraft();
  draft[dateISO] = {
    date: dateISO,
    exercise: ($("exercise") && $("exercise").value) ? $("exercise").value : "",
    sets: ($("sets") && $("sets").value) ? $("sets").value : "",
    reps: ($("reps") && $("reps").value) ? $("reps").value : "",
    walkMin: ($("walkMin") && $("walkMin").value) ? $("walkMin").value : ""
  };
  saveLogDraft(draft);
}
function restoreLogDraft(){
  var dateISO = ($("date") && $("date").value) ? $("date").value : "";
  if (!dateISO) return;

  var draft = loadLogDraft();
  var d = draft[dateISO];
  if (!d) return;

  if ($("exercise") && d.exercise) $("exercise").value = d.exercise;
  if ($("sets") && d.sets) $("sets").value = d.sets;
  if ($("reps") && d.reps) $("reps").value = d.reps;
  if ($("walkMin") && d.walkMin) $("walkMin").value = d.walkMin;
}

/* =========================
   START
========================= */
init();
