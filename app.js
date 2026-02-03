/* =========================
   IRON QUEST – PWA LOGIC
   - Entries: IndexedDB (unbegrenzt)
   - Skills/Boss: localStorage (klein & simpel)
   ========================= */

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

// ---------- Small Storage (skills/boss/start) ----------
const KEY_SKILLS  = "ironquest_skills_v2";
const KEY_BOSS    = "ironquest_boss_v2";
const KEY_START   = "ironquest_startdate_v2";

function loadJSON(key, fallback){
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function saveJSON(key, value){
  localStorage.setItem(key, JSON.stringify(value));
}

// ---------- Helpers ----------
function $(id){ return document.getElementById(id); }
function isoDate(d){ return new Date(d).toISOString().slice(0,10); }

function getWeekNumber(startDateISO, dateISO){
  const start = new Date(startDateISO);
  const cur = new Date(dateISO);
  const diffDays = Math.floor((cur - start) / (1000*60*60*24));
  return diffDays < 0 ? 0 : Math.floor(diffDays / 7) + 1;
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

// Tagessterne
function starsForToday(xp){
  if (xp >= 1100) return "⭐⭐⭐";
  if (xp >= 800) return "⭐⭐";
  if (xp >= 500) return "⭐";
  return "—";
}

// ---------- Exercises (Auto-Type) ----------
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

function buildExerciseDropdown(){
  const sel = $("exercise");
  sel.innerHTML = "";

  // group -> exercises
  const groups = {};
  for (const ex of EXERCISES){
    groups[ex.group] ??= [];
    groups[ex.group].push(ex);
  }

  Object.keys(groups).forEach(groupName => {
    const og = document.createElement("optgroup");
    og.label = groupName;

    groups[groupName].forEach(ex => {
      const opt = document.createElement("option");
      opt.value = ex.name;
      opt.textContent = ex.name; // <- wichtig für sichtbare Namen
      og.appendChild(opt);
    });

    sel.appendChild(og);
  });

  // select first exercise to avoid empty UI
  sel.selectedIndex = 0;
}

function typeForExercise(exName){
  return EXERCISES.find(e => e.name === exName)?.type ?? "Mehrgelenkig";
}

// ---------- Skilltrees ----------
function defaultSkills(){
  return { multi:{sp:0,unlocked:[]}, uni:{sp:0,unlocked:[]}, core:{sp:0,unlocked:[]}, cond:{sp:0,unlocked:[]}, comp:{sp:0,unlocked:[]} };
}
const SKILLTREES = {
  multi: [
    { id:"m1", name:"Heavy Foundation", desc:"+10% XP Mehrgelenkig (Regelwerk)" },
    { id:"m2", name:"Tempo Control", desc:"3s Exzentrik → +25 XP (manuell)" },
    { id:"m3", name:"Time Under Tension", desc:"Letzter Satz ≥40s → +50 XP (manuell)" },
    { id:"m4", name:"Load Mastery", desc:"2 Wochen Progress → +1 STR (manuell)" },
    { id:"m5", name:"Iron Strength (Ultimate)", desc:"1 Satz/Woche doppelte XP (manuell)" },
  ],
  uni: [
    { id:"u1", name:"Base Stability", desc:"+10% XP Unilateral (Regelwerk)" },
    { id:"u2", name:"Balance Focus", desc:"Kein Absetzen → +25 XP (manuell)" },
    { id:"u3", name:"Weak-Side Bias", desc:"Schwache Seite zuerst → +25 XP (manuell)" },
    { id:"u4", name:"Asymmetry Fix", desc:"Gleich links/rechts → +50 XP (manuell)" },
    { id:"u5", name:"Single-Limb Master (Ultimate)", desc:"+1 STA/Woche (manuell)" },
  ],
  core: [
    { id:"c1", name:"Core Activation", desc:"Core ≥30s → +10 XP (manuell)" },
    { id:"c2", name:"Anti-Extension", desc:"Hollow/Plank sauber → +25 XP (manuell)" },
    { id:"c3", name:"Anti-Rotation", desc:"Side Plank sauber → +25 XP (manuell)" },
    { id:"c4", name:"Load Transfer", desc:"Core + Lift → +50 XP (manuell)" },
    { id:"c5", name:"Core of Steel (Ultimate)", desc:"Core zählt als STR Bonus (manuell)" },
  ],
  cond: [
    { id:"e1", name:"Cardio Base", desc:"+20 XP/Runde (manuell)" },
    { id:"e2", name:"Work Capacity", desc:"kürzere Pause → +50 XP (manuell)" },
    { id:"e3", name:"Mental Grit", desc:"trotz Low Motivation → +100 XP (manuell)" },
    { id:"e4", name:"Density Control", desc:"mehr Runden → +1 END (manuell)" },
    { id:"e5", name:"Engine Mode (Ultimate)", desc:"Conditioning Tag = ⭐⭐ (Regelwerk)" },
  ],
  comp: [
    { id:"x1", name:"Flow Control", desc:"Kein Absetzen → +50 XP (manuell)" },
    { id:"x2", name:"Clean Technique", desc:"Saubere Reihenfolge → +25 XP (manuell)" },
    { id:"x3", name:"Breathing Mastery", desc:"Atemkontrolle → +25 XP (manuell)" },
    { id:"x4", name:"Fatigue Control", desc:"alle Runden gleich → +100 XP (manuell)" },
    { id:"x5", name:"Iron Flow (Ultimate)", desc:"+1 auf alle Attribute (manuell)" },
  ],
};

function loadSkills(){ return loadJSON(KEY_SKILLS, defaultSkills()); }
function saveSkills(s){ saveJSON(KEY_SKILLS, s); }

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

    const unlocked = new Set(s[key].unlocked);
    SKILLTREES[key].forEach((node, idx) => {
      const li = document.createElement("li");
      const isUnlocked = unlocked.has(node.id);
      li.className = isUnlocked ? "" : "locked";
      li.innerHTML = `<b>${idx+1}. ${node.name}</b><br><span class="hint">${node.desc}</span>`;

      const canUnlock = (idx < s[key].sp) && !isUnlocked;
      if (canUnlock) {
        const btn = document.createElement("button");
        btn.className = "secondary";
        btn.style.marginTop = "8px";
        btn.textContent = "Freischalten";
        btn.onclick = () => {
          const s2 = loadSkills();
          if (!s2[key].unlocked.includes(node.id)) s2[key].unlocked.push(node.id);
          saveSkills(s2);
          renderSkills();
        };
        li.appendChild(btn);
      }

      ul.appendChild(li);
    });
  }
}

// ---------- Bossfights (gated by week) ----------
const BOSSES = [
  { week: 2, name: "The Foundation Beast", xp: 500, reward: "1 Joker + Titel: Foundation Slayer" },
  { week: 4, name: "The Asymmetry Lord", xp: 600, reward: "+1 STA + Unilateral XP +10% (1 Woche)" },
  { week: 6, name: "The Core Guardian", xp: 700, reward: "Core-Sätze 1 Woche doppelt XP" },
  { week: 8, name: "The Conditioning Reaper", xp: 800, reward: "+1 END + Conditioning ⭐⭐⭐" },
  { week: 10, name: "The Iron Champion", xp: 1000, reward: "+1 Attribut deiner Wahl + Titel: Iron Challenger" },
  { week: 12, name: "FINAL: Iron Overlord", xp: 2000, reward: "Titel: IRON OVERLORD SLAYER + New Game+" },
];

function defaultBoss(){
  const obj = {};
  for (const b of BOSSES) obj[b.week] = { cleared:false, clearedAt:null };
  return obj;
}
function loadBoss(){ return loadJSON(KEY_BOSS, defaultBoss()); }
function saveBoss(b){ saveJSON(KEY_BOSS, b); }

function renderBoss(currentWeek){
  $("bossCurrentWeek").textContent = currentWeek ? `W${currentWeek}` : "—";
  const startDate = localStorage.getItem(KEY_START) || "";
  $("startDate").value = startDate;

  const bossState = loadBoss();
  const ul = $("bossList");
  ul.innerHTML = "";

  for (const b of BOSSES){
    const st = bossState[b.week] ?? { cleared:false, clearedAt:null };
    const isCorrectWeek = (currentWeek === b.week);
    const locked = !isCorrectWeek;

    const li = document.createElement("li");
    li.innerHTML = `
      <div class="bossrow">
        <div>
          <div><b>Woche ${b.week}:</b> ${b.name}</div>
          <div class="hint">Reward: ${b.reward} • +${b.xp} XP</div>
          ${st.clearedAt ? `<div class="hint">Cleared am: ${st.clearedAt}</div>` : ""}
          ${locked ? `<div class="hint">🔒 Locked – verfügbar nur in Woche ${b.week}</div>` : `<div class="hint">✅ Jetzt verfügbar</div>`}
        </div>
        <div class="row" style="margin:0;">
          <span class="badge ${locked ? "lock" : (st.cleared ? "ok":"no")}">
            ${locked ? "LOCKED" : (st.cleared ? "CLEARED":"OPEN")}
          </span>
          <button class="secondary" style="width:auto; padding:10px 12px;"
            data-week="${b.week}" ${locked ? "disabled":""}>
            Clear
          </button>
        </div>
      </div>
    `;
    ul.appendChild(li);
  }

  ul.querySelectorAll("button[data-week]").forEach(btn => {
    btn.onclick = async () => {
      const week = parseInt(btn.getAttribute("data-week"), 10);
      const boss = BOSSES.find(x => x.week === week);
      if (!boss) return;

      // extra safety: week gate
      const start = localStorage.getItem(KEY_START);
      if (!start) return alert("Bitte zuerst Startdatum Woche 1 setzen (Boss Tab).");
      const today = isoDate(new Date());
      const curWeek = getWeekNumber(start, today);
      if (curWeek !== week) return alert(`LOCKED. Aktuell W${curWeek}. Dieser Boss ist nur in W${week}.`);

      // add boss entry to IndexedDB
      await idbAdd({
        date: today,
        week: curWeek,
        exercise: `Bossfight: ${boss.name}`,
        type: "Boss",
        detail: `W${week} Clear`,
        xp: boss.xp
      });

      // update boss state
      const bs = loadBoss();
      bs[week] = { cleared:true, clearedAt: today };
      saveBoss(bs);

      await renderAll();
      alert(`Bossfight cleared! +${boss.xp} XP\nReward: ${boss.reward}`);
    };
  });
}

// ---------- UI: Tabs ----------
function setupTabs(){
  document.querySelectorAll(".tab").forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      $("tab-" + btn.getAttribute("data-tab")).classList.add("active");
    };
  });
}

// ---------- UI: Walking toggle + auto type ----------
function updateAutoTypeUI(){
  const exName = $("exercise").value;
  const type = typeForExercise(exName);
  $("autoType").textContent = type;

  const isWalk = (type === "NEAT");
  $("walkingRow").classList.toggle("hide", !isWalk);
  $("setsRow").classList.toggle("hide", isWalk);

  // Disable bonus for NEAT
  const disableBonus = isWalk;
  for (const id of ["rpe9","tech","pause"]) {
    $(id).disabled = disableBonus;
    if (disableBonus) $(id).checked = false;
  }

  updateCalcPreview();
}

function updateCalcPreview(){
  const exName = $("exercise").value;
  const type = typeForExercise(exName);

  let xp = 0;
  if (type === "NEAT") {
    const minutes = Math.max(1, parseInt($("walkMin").value || "0", 10));
    xp = neatXP(minutes); // no bonus
  } else {
    const sets = Math.max(1, parseInt($("sets").value || "1", 10));
    const flags = { rpe9: $("rpe9").checked, tech: $("tech").checked, pause: $("pause").checked };
    xp = (XP_PER_SET[type] ?? 0) * sets + bonusXP(flags);
  }
  $("calcXp").textContent = xp;
}

// ---------- Dashboard calculations ----------
async function computeStats(entries){
  const startDate = localStorage.getItem(KEY_START);
  const today = isoDate(new Date());
  const curWeek = startDate ? getWeekNumber(startDate, today) : 0;

  let todayXp = 0;
  let weekXp = 0;
  let totalXp = 0;

  for (const e of entries){
    totalXp += e.xp;
    if (e.date === today) todayXp += e.xp;
    if (curWeek && e.week === curWeek) weekXp += e.xp;
  }

  return { todayXp, weekXp, totalXp, curWeek };
}

function sortEntriesDesc(entries){
  // newest first: by date then id
  return entries.sort((a,b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return (b.id ?? 0) - (a.id ?? 0);
  });
}

async function renderAll(){
  const entriesRaw = await idbGetAll();
  const entries = sortEntriesDesc(entriesRaw);
  const { todayXp, weekXp, totalXp, curWeek } = await computeStats(entries);

  $("todayXp").textContent = todayXp;
  $("todayStars").textContent = starsForToday(todayXp);

  $("weekNumber").textContent = curWeek ? `W${curWeek}` : "— (Startdatum setzen)";
  $("bossCurrentWeek").textContent = curWeek ? `W${curWeek}` : "—";
  $("weekXp").textContent = weekXp;
  $("totalXp").textContent = totalXp;

  const lvl = xpToLevel(totalXp);
  $("level").textContent = lvl;
  $("title").textContent = getTitle(lvl);

  $("countEntries").textContent = entries.length;

  // recent list
  const recent = entries.slice(0, 6);
  $("recentList").innerHTML = recent.length ? "" : "<li>Noch keine Einträge.</li>";
  for (const e of recent){
    const li = document.createElement("li");
    li.textContent = `${e.date} • ${e.exercise} • ${e.type} • ${e.detail} • ${e.xp} XP`;
    $("recentList").appendChild(li);
  }

  // full list
  $("list").innerHTML = entries.length ? "" : "<li>Noch keine Einträge.</li>";
  for (const e of entries){
    const li = document.createElement("li");
    li.textContent = `${e.date} (W${e.week}) • ${e.exercise} • ${e.type} • ${e.detail} • ${e.xp} XP`;
    $("list").appendChild(li);
  }

  renderSkills();
  renderBoss(curWeek);
  updateAutoTypeUI();
}

// ---------- CSV Export ----------
function csvSafe(v){
  const s = String(v ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replaceAll('"','""')}"`;
  return s;
}
function toCSV(entries){
  const header = ["date","week","exercise","type","detail","xp"];
  const rows = [header.join(",")];
  for (const e of entries){
    rows.push([
      e.date,
      e.week,
      csvSafe(e.exercise),
      e.type,
      csvSafe(e.detail),
      e.xp
    ].join(","));
  }
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

// ---------- Init ----------
async function init(){
  // default date
  $("date").value = isoDate(new Date());

  // build dropdown
  buildExerciseDropdown();

  // bind exercise change
  $("exercise").addEventListener("change", updateAutoTypeUI);

  // bind calc preview inputs
  ["sets","walkMin","rpe9","tech","pause"].forEach(id => {
    $(id).addEventListener("input", updateCalcPreview);
    $(id).addEventListener("change", updateCalcPreview);
  });

  // add entry (auto type)
  $("add").addEventListener("click", async () => {
    const date = $("date").value || isoDate(new Date());
    const exercise = $("exercise").value;
    const type = typeForExercise(exercise);

    // start date handling
    let start = localStorage.getItem(KEY_START);
    if (!start) {
      // first entry sets start date automatically (kannst du später im Boss-Tab überschreiben)
      start = date;
      localStorage.setItem(KEY_START, start);
    }
    const week = getWeekNumber(start, date);

    let xp = 0;
    let detail = "";

    if (type === "NEAT") {
      const minutes = Math.max(1, parseInt($("walkMin").value || "0", 10));
      xp = neatXP(minutes);
      detail = `${minutes} min`;
    } else {
      const sets = Math.max(1, parseInt($("sets").value || "1", 10));
      const flags = { rpe9: $("rpe9").checked, tech: $("tech").checked, pause: $("pause").checked };
      xp = (XP_PER_SET[type] ?? 0) * sets + bonusXP(flags);
      detail = `${sets} sets`;
      if (flags.rpe9 || flags.tech || flags.pause) detail += " +bonus";
    }

    await idbAdd({ date, week, exercise, type, detail, xp });

    // reset bonuses
    $("rpe9").checked = false; $("tech").checked = false; $("pause").checked = false;

    await renderAll();
    alert(`Gespeichert: +${xp} XP`);
  });

  // clear entries
  $("clear").addEventListener("click", async () => {
    if (confirm("Wirklich ALLE Einträge löschen?")) {
      await idbClear();
      await renderAll();
    }
  });

  // skills: add SP
  document.querySelectorAll("button[data-sp]").forEach(btn => {
    btn.addEventListener("click", () => {
      const key = btn.getAttribute("data-sp");
      const s = loadSkills();
      s[key].sp += 1;
      saveSkills(s);
      renderSkills();
    });
  });

  // reset skills
  $("resetSkills").addEventListener("click", () => {
    if (confirm("Skilltrees wirklich zurücksetzen?")) {
      localStorage.removeItem(KEY_SKILLS);
      renderSkills();
    }
  });

  // save start date
  $("saveStart").addEventListener("click", async () => {
    const d = $("startDate").value;
    if (!d) return alert("Bitte Startdatum wählen.");
    localStorage.setItem(KEY_START, d);
    await renderAll();
    alert("Startdatum gespeichert.");
  });

  // reset boss
  $("resetBoss").addEventListener("click", async () => {
    if (confirm("Boss-Fight Status zurücksetzen?")) {
      localStorage.removeItem(KEY_BOSS);
      await renderAll();
    }
  });

  // export csv
  $("exportCsv").addEventListener("click", async () => {
    const entries = sortEntriesDesc(await idbGetAll());
    if (!entries.length) return alert("Keine Einträge zum Exportieren.");
    const csv = toCSV(entries);
    downloadCSV("ironquest_export.csv", csv);
  });

  // tabs
  setupTabs();

  // SW
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");

  // initial render
  await renderAll();
}

init();
