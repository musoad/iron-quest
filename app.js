/***********************
 * IRON QUEST – app.js
 * iOS-safe • Offline • IndexedDB
 ***********************/

/* =====================
   HELPERS
===================== */
const $ = id => document.getElementById(id);
const todayISO = () => new Date().toISOString().slice(0,10);
const clampWeek = w => Math.max(1, Math.min(12, w));

function daysBetween(a,b){
  return Math.floor((new Date(b) - new Date(a)) / 86400000);
}
function getWeekNumber(start, date){
  return Math.floor(daysBetween(start, date) / 7) + 1;
}

/* =====================
   STORAGE (IndexedDB)
===================== */
const DB_NAME = "ironquest-db";
const DB_VER = 1;
let db;

function openDB(){
  return new Promise((res, rej)=>{
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = e=>{
      const d = e.target.result;
      d.createObjectStore("entries",{ keyPath:"id", autoIncrement:true });
      d.createObjectStore("meta",{ keyPath:"key" });
    };
    req.onsuccess = e=>{ db = e.target.result; res(); };
    req.onerror = e=>rej(e);
  });
}

function tx(store, mode="readonly"){
  return db.transaction(store, mode).objectStore(store);
}

/* =====================
   DATA
===================== */
const EXERCISES = [
  { name:"DB Floor Press", type:"Mehrgelenkig" },
  { name:"Goblet Squat", type:"Mehrgelenkig" },
  { name:"DB Row", type:"Mehrgelenkig" },
  { name:"RDL", type:"Mehrgelenkig" },
  { name:"Bulgarian Split Squat", type:"Unilateral" },
  { name:"Push Ups", type:"Mehrgelenkig" },
  { name:"Hamstring Walkouts", type:"Core" },
  { name:"Standing DB Calf Raises", type:"Core" },
  { name:"DB Lateral Raises", type:"Mehrgelenkig" },
  { name:"Farmer’s Carry (DB)", type:"Unilateral" },
  { name:"Tibialis Raises", type:"Core" },
  { name:"Walking 3 km/h", type:"NEAT", walk:true }
];

const SET_RECOMMEND = {
  Mehrgelenkig:{ sets:4, reps:"6–10" },
  Unilateral:{ sets:3, reps:"8–12 / Seite" },
  Core:{ sets:3, reps:"10–20" },
  NEAT:{ sets:null, reps:"Zeit" }
};

/* =====================
   STARTDATE
===================== */
async function ensureStartDate(){
  const r = await tx("meta").get("startDate");
  return r?.value || todayISO();
}
async function setStartDate(v){
  await tx("meta","readwrite").put({ key:"startDate", value:v });
}

/* =====================
   UI INIT
===================== */
async function init(){
  await openDB();

  // Fill exercises
  const sel = $("exercise");
  sel.innerHTML = "";
  EXERCISES.forEach(e=>{
    const o = document.createElement("option");
    o.value = e.name;
    o.textContent = e.name;
    sel.appendChild(o);
  });

  // Dates
  $("date").value = todayISO();
  $("startDateDash").value = await ensureStartDate();

  // Events
  $("saveStartDash").onclick = async ()=>{
    await setStartDate($("startDateDash").value);
    renderAll();
  };

  $("exercise").onchange = updateLogUI;
  $("date").onchange = updateLogUI;

  // ⭐ FIX: Sets darf editierbar bleiben
  ["sets","walkMin"].forEach(id=>{
    const el = $(id);
    if(!el) return;
    el.addEventListener("input", updateCalcOnly);
    el.addEventListener("change", renderAll);
  });

  ["rpe9","tech","pause"].forEach(id=>{
    $(id).onchange = updateCalcOnly;
  });

  $("add").onclick = saveEntry;
  $("clear").onclick = clearAll;

  renderAll();
}

/* =====================
   LOG UI (NO OVERWRITE)
===================== */
async function updateLogUI(){
  const ex = EXERCISES.find(e=>e.name === $("exercise").value);
  if(!ex) return;

  $("autoType").textContent = ex.type;

  const rec = SET_RECOMMEND[ex.type] || {};
  $("recommendedSets").textContent = rec.sets ?? "—";
  $("recommendedReps").textContent = rec.reps ?? "—";

  // Walking toggle
  $("walkingRow").classList.toggle("hide", !ex.walk);
  $("setsRow").classList.toggle("hide", !!ex.walk);

  // ⭐ IMPORTANT: Auto-fill sets ONLY if EMPTY and NOT editing
  if(!ex.walk && rec.sets && $("sets")){
    const el = $("sets");
    const editing = document.activeElement === el;
    if(!editing && (el.value === "" || el.value === "0")){
      el.value = rec.sets;
    }
  }

  updateCalcOnly();
}

/* =====================
   XP PREVIEW ONLY
===================== */
async function updateCalcOnly(){
  const ex = EXERCISES.find(e=>e.name === $("exercise").value);
  if(!ex) return;

  let xp = 0;

  if(ex.walk){
    const min = parseInt($("walkMin").value||"0",10);
    xp = min * 5;
  } else {
    const setsRaw = $("sets").value;
    const sets = parseInt(setsRaw||"0",10);
    xp = sets * 100;
  }

  if($("rpe9").checked) xp += 50;
  if($("tech").checked) xp += 25;
  if($("pause").checked) xp += 25;

  $("calcXp").textContent = xp;
  $("calcInfo").textContent = "Live-Vorschau";
}

/* =====================
   SAVE ENTRY
===================== */
async function saveEntry(){
  const ex = EXERCISES.find(e=>e.name === $("exercise").value);
  if(!ex) return;

  const entry = {
    date: $("date").value,
    exercise: ex.name,
    type: ex.type,
    sets: ex.walk ? null : parseInt($("sets").value||"0",10),
    minutes: ex.walk ? parseInt($("walkMin").value||"0",10) : null,
    xp: parseInt($("calcXp").textContent||"0",10)
  };

  await tx("entries","readwrite").add(entry);
  renderAll();
}

/* =====================
   RENDER ALL
===================== */
async function renderAll(){
  const start = await ensureStartDate();
  $("startDisplay").textContent = start;

  updateLogUI();

  const list = $("list");
  list.innerHTML = "";

  let total = 0;
  const cur = tx("entries").openCursor();
  cur.onsuccess = e=>{
    const c = e.target.result;
    if(!c) return;

    const it = c.value;
    total += it.xp;

    const li = document.createElement("li");
    li.textContent = `${it.date} – ${it.exercise} – ${it.xp} XP`;
    list.appendChild(li);

    c.continue();
  };

  $("totalXp").textContent = total;
}

/* =====================
   CLEAR
===================== */
async function clearAll(){
  if(!confirm("Wirklich alle Einträge löschen?")) return;
  await tx("entries","readwrite").clear();
  renderAll();
}

/* =====================
   START
===================== */
init();
