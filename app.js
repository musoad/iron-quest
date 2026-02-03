/* =========================
   IRON QUEST – PWA
   - Entries: IndexedDB
   - Skills/Boss/Quests/Achievements: localStorage
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

// ---------- localStorage keys ----------
const KEY_SKILLS   = "ironquest_skills_v3";
const KEY_BOSS     = "ironquest_boss_v3";
const KEY_BOSSCHK  = "ironquest_boss_checks_v1";
const KEY_START    = "ironquest_startdate_v3";
const KEY_QUESTS   = "ironquest_dailyquests_v1";
const KEY_ACH      = "ironquest_weeklyach_v1";

// ---------- helpers ----------
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
function neatXP(minutes) {
  return Math.max(0, Math.round(minutes * 5)); // 60 min -> 300 XP
}
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

// ---------- Wöchentliche Steigerung / empfohlene Sätze ----------
/*
  Ziel: Du musst nur Übung wählen. App zeigt und setzt Standard-Sätze.
  Schema:
  - Wochen 1–4: Basis (mehr Wiederholungen/Technik)
  - Wochen 5–8: mehr Sätze (Volumen)
  - Wochen 9–12: Dichte/Intensität (gleich viele Sätze wie 5–8, aber härter)
*/
function recommendedSetsByWeek(type, week){
  // fallback week
  const w = Math.max(1, Math.min(12, week || 1));
  const block = (w <= 4) ? 1 : (w <= 8 ? 2 : 3);

  if (type === "NEAT") return { text:"Minuten statt Sätze", value:null };
  if (type === "Conditioning") {
    // Runden: mehr im 2. Block, dann gleich aber härter
    if (block === 1) return { text:"4–5 Runden", value:4 };
    if (block === 2) return { text:"5–6 Runden", value:5 };
    return { text:"5–6 Runden (kürzere Pausen)", value:5 };
  }
  if (type === "Core") {
    if (block === 1) return { text:"3 Sätze", value:3 };
    if (block === 2) return { text:"4 Sätze", value:4 };
    return { text:"4 Sätze (langsamer/clean)", value:4 };
  }
  if (type === "Komplexe") {
    if (block === 1) return { text:"4–5 Runden", value:4 };
    if (block === 2) return { text:"5–6 Runden", value:5 };
    return { text:"6 Runden (gleiches Gewicht)", value:6 };
  }
  // Mehrgelenkig / Unilateral
  if (block === 1) return { text:"3–4 Sätze", value:4 };
  if (block === 2) return { text:"4–5 Sätze", value:5 };
  return { text:"4–5 Sätze (kürzere Pausen/Tempo)", value:5 };
}
function weeklyProgressHint(week){
  const w = Math.max(1, Math.min(12, week || 1));
  if (w <= 4) return "Block 1: Technik + ROM, saubere Reps, Progress über Wiederholungen.";
  if (w <= 8) return "Block 2: Volumen erhöhen (mehr Sätze), Progress über Gewicht oder 1–2 Reps mehr.";
  return "Block 3: Dichte/Intensität (Pausen leicht kürzen, Tempo langsamer, gleiche Gewichte stabil).";
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
      opt.textContent = ex.name;
      og.appendChild(opt);
    });
    sel.appendChild(og);
  });
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

// ---------- Daily Quests ----------
const QUESTS = [
  { id:"steps10k", name:"10.000 Schritte", xp:100, note:"NEAT-Boost" },
  { id:"mobility10", name:"10 Min Mobility", xp:50, note:"Hüfte/Schulter/Wirbelsäule" },
  { id:"water", name:"2,5–3L Wasser", xp:30, note:"Regeneration" },
  { id:"sleep", name:"7h+ Schlaf", xp:50, note:"Performance" },
];

function loadQuestState(){ return loadJSON(KEY_QUESTS, {}); }
function saveQuestState(s){ saveJSON(KEY_QUESTS, s); }

function isQuestDoneToday(qState, questId, today){
  return qState?.[today]?.[questId] === true;
}

async function setQuestDoneToday(questId, done){
  const today = isoDate(new Date());
  const qState = loadQuestState();
  qState[today] ??= {};
  if (done) qState[today][questId] = true;
  else delete qState[today][questId];
  saveQuestState(qState);

  if (done) {
    // add XP entry once
    await idbAdd({
      date: today,
      week: currentWeekFromStart(today),
      exercise: `Daily Quest: ${QUESTS.find(q=>q.id===questId)?.name ?? questId}`,
      type: "Quest",
      detail: "Completed",
      xp: QUESTS.find(q=>q.id===questId)?.xp ?? 0
    });
  } else {
    alert("Quest rückgängig: XP-Eintrag bleibt bestehen (einfaches System).");
  }
}

function renderQuests(){
  const today = isoDate(new Date());
  const qState = loadQuestState();
  const ul = $("questList");
  ul.innerHTML = "";

  QUESTS.forEach(q => {
    const done = isQuestDoneToday(qState, q.id, today);
    const li = document.createElement("li");

    li.innerHTML = `
      <input type="checkbox" id="q_${q.id}" ${done ? "checked":""}>
      <label for="q_${q.id}">
        <b>${q.name}</b> <span class="small">(+${q.xp} XP)</span><br>
        <span class="small">${q.note}</span>
      </label>
    `;

    ul.appendChild(li);

    li.querySelector(`#q_${q.id}`).addEventListener("change", async (e) => {
      if (e.target.checked && done) return;
      if (e.target.checked) {
        await setQuestDoneToday(q.id, true);
        await renderAll();
      } else {
        await setQuestDoneToday(q.id, false);
        await renderAll();
      }
    });
  });
}

// ---------- Bossfights with details + checkboxes + week gating ----------
const BOSSES = [
  {
    week: 2,
    name: "The Foundation Beast",
    xp: 500,
    reward: "1 Joker + Titel: Foundation Slayer",
    workout: [
      "DB Goblet Squat – 5×10 (3s runter)",
      "DB Floor Press – 5×8",
      "DB Row – 5×10 (Pause oben)",
      "Pause strikt 90s"
    ]
  },
  {
    week: 4,
    name: "The Asymmetry Lord",
    xp: 600,
    reward: "+1 STA + Unilateral XP +10% (1 Woche)",
    workout: [
      "Bulgarian Split Squat – 4×8 je Seite",
      "1-Arm DB Row – 4×10 je Seite",
      "Side Plank – 3×45s je Seite",
      "Regel: schwache Seite beginnt"
    ]
  },
  {
    week: 6,
    name: "The Core Guardian",
    xp: 700,
    reward: "Core-Sätze 1 Woche doppelt XP",
    workout: [
      "Hollow Hold – 4×40s",
      "Plank Shoulder Taps – 4×30",
      "Goblet Squat Hold – 3×45s",
      "Pausen max. 60s"
    ]
  },
  {
    week: 8,
    name: "The Conditioning Reaper",
    xp: 800,
    reward: "+1 END + Conditioning ⭐⭐⭐",
    workout: [
      "5 Runden: 30s Burpees",
      "30s Mountain Climbers",
      "30s High Knees",
      "Pause: 60s (jede Runde gleich stark)"
    ]
  },
  {
    week: 10,
    name: "The Iron Champion",
    xp: 1000,
    reward: "+1 Attribut deiner Wahl + Titel: Iron Challenger",
    workout: [
      "Komplex 6 Runden: (je 6 Wdh)",
      "Deadlift → Clean → Front Squat → Push Press",
      "Hanteln nicht absetzen",
      "Technik vor Tempo"
    ]
  },
  {
    week: 12,
    name: "FINAL: Iron Overlord",
    xp: 2000,
    reward: "Titel: IRON OVERLORD SLAYER + New Game+",
    workout: [
      "Goblet Squat – 4×12",
      "DB Floor Press – 4×10",
      "1-Arm DB Row – 4×10",
      "Bulgarian Split Squat – 3×8",
      "Plank – 3×60s"
    ]
  },
];

function defaultBoss(){
  const obj = {};
  for (const b of BOSSES) obj[b.week] = { cleared:false, clearedAt:null };
  return obj;
}
function loadBoss(){ return loadJSON(KEY_BOSS, defaultBoss()); }
function saveBoss(b){ saveJSON(KEY_BOSS, b); }

function loadBossChecks(){ return loadJSON(KEY_BOSSCHK, {}); }
function saveBossChecks(s){ saveJSON(KEY_BOSSCHK, s); }

function bossCheckKey(week, dateISO){
  return `${week}|${dateISO}`;
}
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

function renderBoss(currentWeek){
  const startDate = localStorage.getItem(KEY_START) || "";
  $("startDate").value = startDate;
  $("bossCurrentWeek").textContent = currentWeek ? `W${currentWeek}` : "—";

  const today = isoDate(new Date());
  const bossState = loadBoss();
  const ul = $("bossList");
  ul.innerHTML = "";

  for (const b of BOSSES){
    const st = bossState[b.week] ?? { cleared:false, clearedAt:null };
    const isCorrectWeek = (currentWeek === b.week);
    const lockedByWeek = !isCorrectWeek;

    const doneChecks = allBossChecksDone(b.week, today, b.workout.length);
    const canClear = isCorrectWeek && doneChecks;

    const li = document.createElement("li");
    li.innerHTML = `
      <div class="bossrow">
        <div style="min-width: 240px;">
          <div><b>Woche ${b.week}:</b> ${b.name}</div>
          <div class="hint">Reward: ${b.reward} • +${b.xp} XP</div>
          ${st.clearedAt ? `<div class="hint">Cleared am: ${st.clearedAt}</div>` : ""}
          ${lockedByWeek ? `<div class="hint">🔒 Locked – nur in Woche ${b.week}</div>` : `<div class="hint">✅ Woche aktiv</div>`}
        </div>

        <div class="row" style="margin:0; align-items:flex-start;">
          <span class="badge ${lockedByWeek ? "lock" : (st.cleared ? "ok":"no")}">
            ${lockedByWeek ? "LOCKED" : (st.cleared ? "CLEARED":"OPEN")}
          </span>
          <button class="secondary" style="width:auto; padding:10px 12px;"
            data-week="${b.week}" ${(!canClear ? "disabled": "")}>
            Clear
          </button>
        </div>
      </div>

      <div class="hint" style="margin-top:10px;"><b>Boss-Workout Checkliste (heute):</b></div>
      <ul class="checklist" id="bosschk_${b.week}"></ul>
      <div class="hint">Clear wird erst aktiv, wenn alle Punkte abgehakt sind.</div>
    `;
    ul.appendChild(li);

    // render checklist
    const chkUl = li.querySelector(`#bosschk_${b.week}`);
    const checks = getBossChecksFor(b.week, today);

    b.workout.forEach((line, idx) => {
      const checked = !!checks[idx];
      const row = document.createElement("li");
      row.innerHTML = `
        <input type="checkbox" id="bc_${b.week}_${idx}" ${checked ? "checked":""} ${lockedByWeek ? "disabled":""}>
        <label for="bc_${b.week}_${idx}">
          ${line}
        </label>
      `;
      chkUl.appendChild(row);

      row.querySelector("input").addEventListener("change", async (e) => {
        setBossCheckFor(b.week, today, idx, e.target.checked);
        // re-render to update Clear button state
        await renderAll();
      });
    });
  }

  ul.querySelectorAll("button[data-week]").forEach(btn => {
    btn.onclick = async () => {
      const week = parseInt(btn.getAttribute("data-week"), 10);
      const boss = BOSSES.find(x => x.week === week);
      if (!boss) return;

      const start = localStorage.getItem(KEY_START);
      if (!start) return alert("Bitte zuerst Startdatum Woche 1 setzen (Boss Tab).");
      const today = isoDate(new Date());
      const curWeek = getWeekNumber(start, today);

      if (curWeek !== week) return alert(`LOCKED. Aktuell W${curWeek}. Dieser Boss ist nur in W${week}.`);
      if (!allBossChecksDone(week, today, boss.workout.length)) return alert("Erst alle Boss-Workout-Checkboxen abhaken!");

      await idbAdd({
        date: today,
        week: curWeek,
        exercise: `Bossfight: ${boss.name}`,
        type: "Boss",
        detail: `W${week} Clear`,
        xp: boss.xp
      });

      const bs = loadBoss();
      bs[week] = { cleared:true, clearedAt: today };
      saveBoss(bs);

      await renderAll();
      alert(`Bossfight cleared! +${boss.xp} XP\nReward: ${boss.reward}`);
    };
  });
}

// ---------- Achievements (weekly auto) ----------
/*
  Wir vergeben XP als Eintrag, aber nur 1x pro Woche pro Achievement.
  Achievements:
  - No Skip Week: >=5 Trainingstage (>=500 XP) -> +500 XP
  - Perfect Run: >=5 Tage mit ⭐⭐ oder ⭐⭐⭐ -> +600 XP
  - 3-Star Hunter: >=2 ⭐⭐⭐ Tage -> +400 XP
  - Quest Master: >=3 Daily Quests completed across the week -> +300 XP
*/
const ACHIEVEMENTS = [
  { id:"noskip", name:"No Skip Week", xp:500, rule:"5 Trainingstage (≥500 XP)" },
  { id:"perfect", name:"Perfect Run", xp:600, rule:"5 Tage ⭐⭐ oder ⭐⭐⭐" },
  { id:"threestar", name:"3-Star Hunter", xp:400, rule:"mind. 2× ⭐⭐⭐" },
  { id:"questmaster", name:"Quest Master", xp:300, rule:"mind. 3 Daily Quests" },
];

function loadWeeklyAch(){ return loadJSON(KEY_ACH, {}); }
function saveWeeklyAch(s){ saveJSON(KEY_ACH, s); }

function currentWeekFromStart(dateISO){
  const start = localStorage.getItem(KEY_START);
  if (!start) return 0;
  return getWeekNumber(start, dateISO);
}

function dateInWeek(dateISO, weekNum){
  // only for entries already storing week
  return true;
}

function countDailyQuestsInWeek(weekNum){
  const q = loadQuestState();
  let count = 0;
  for (const dayISO of Object.keys(q)){
    const w = currentWeekFromStart(dayISO);
    if (w === weekNum){
      count += Object.values(q[dayISO] || {}).filter(Boolean).length;
    }
  }
  return count;
}

async function evaluateWeeklyAchievements(entries, weekNum){
  if (!weekNum) return { earned:[], trainDays:0, threeStarDays:0 };

  // group XP per day in that week
  const dayXP = {};
  for (const e of entries){
    if (e.week !== weekNum) continue;
    dayXP[e.date] = (dayXP[e.date] || 0) + e.xp;
  }

  const dates = Object.keys(dayXP);
  const trainDays = dates.filter(d => dayXP[d] >= 500).length;
  const twoPlusDays = dates.filter(d => dayXP[d] >= 800).length;      // ⭐⭐ or ⭐⭐⭐
  const threeStarDays = dates.filter(d => dayXP[d] >= 1100).length;   // ⭐⭐⭐

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
    if (!achState[weekNum][id]){
      achState[weekNum][id] = true;
      newlyEarned.push(id);
    }
  }
  saveWeeklyAch(achState);

  // add entries for newly earned
  if (newlyEarned.length){
    const today = isoDate(new Date());
    for (const id of newlyEarned){
      const a = ACHIEVEMENTS.find(x => x.id === id);
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

// ---------- UI logic (auto type, recommended sets, walking toggle, calc preview) ----------
function updateAutoTypeUI(curWeek){
  const exName = $("exercise").value;
  const type = typeForExercise(exName);
  $("autoType").textContent = type;

  const rec = recommendedSetsByWeek(type, curWeek || 1);
  $("recommendedSets").textContent = rec.text;

  const isWalk = (type === "NEAT");
  $("walkingRow").classList.toggle("hide", !isWalk);
  $("setsRow").classList.toggle("hide", isWalk);

  // Pre-fill sets only for non-walk, when value is empty or 1
  if (!isWalk && rec.value) {
    const current = parseInt($("sets").value || "1", 10);
    if (!current || current === 1) $("sets").value = rec.value;
  }

  // disable bonus for walking
  for (const id of ["rpe9","tech","pause"]) {
    $(id).disabled = isWalk;
    if (isWalk) $(id).checked = false;
  }

  updateCalcPreview(curWeek);
}

function updateCalcPreview(curWeek){
  const exName = $("exercise").value;
  const type = typeForExercise(exName);
  let xp = 0;

  if (type === "NEAT") {
    const minutes = Math.max(1, parseInt($("walkMin").value || "0", 10));
    xp = neatXP(minutes);
  } else {
    const sets = Math.max(1, parseInt($("sets").value || "1", 10));
    const flags = { rpe9: $("rpe9").checked, tech: $("tech").checked, pause: $("pause").checked };
    xp = (XP_PER_SET[type] ?? 0) * sets + bonusXP(flags);
  }
  $("calcXp").textContent = xp;
}

// ---------- Tabs ----------
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

// ---------- Rendering (Dashboard + Lists + Boss + Quests + Weekly Summary) ----------
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

async function renderAll(){
  const entriesRaw = await idbGetAll();
  const entries = sortEntriesDesc(entriesRaw);
  const { todayXp, weekXp, totalXp, curWeek } = await computeStats(entries);

  // Weekly achievements evaluation (may add entries!)
  const evalRes = await evaluateWeeklyAchievements(entries, curWeek);
  // Re-read entries if newly earned added
  const entriesFinal = evalRes.newlyEarned?.length ? sortEntriesDesc(await idbGetAll()) : entries;

  // recompute after possible additions
  const stats2 = await computeStats(entriesFinal);

  $("todayXp").textContent = stats2.todayXp;
  $("todayStars").textContent = starsForToday(stats2.todayXp);

  $("weekNumber").textContent = curWeek ? `W${curWeek}` : "— (Startdatum setzen)";
  $("weekXp").textContent = stats2.weekXp;
  $("totalXp").textContent = stats2.totalXp;

  const lvl = xpToLevel(stats2.totalXp);
  $("level").textContent = lvl;
  $("title").textContent = getTitle(lvl);

  $("countEntries").textContent = entriesFinal.length;

  // Weekly report
  $("wkTrainDays").textContent = evalRes.trainDays ?? 0;
  $("wkThreeStarDays").textContent = evalRes.threeStarDays ?? 0;

  const earnedNames = (evalRes.earned || []).map(id => ACHIEVEMENTS.find(a=>a.id===id)?.name).filter(Boolean);
  $("wkAchievements").textContent = earnedNames.length ? earnedNames.join(", ") : "—";
  $("wkProgressHint").textContent = weeklyProgressHint(curWeek);

  // recent list
  const recent = entriesFinal.slice(0, 6);
  $("recentList").innerHTML = recent.length ? "" : "<li>Noch keine Einträge.</li>";
  for (const e of recent){
    const li = document.createElement("li");
    li.textContent = `${e.date} • ${e.exercise} • ${e.type} • ${e.detail} • ${e.xp} XP`;
    $("recentList").appendChild(li);
  }

  // full list
  $("list").innerHTML = entriesFinal.length ? "" : "<li>Noch keine Einträge.</li>";
  for (const e of entriesFinal){
    const li = document.createElement("li");
    li.textContent = `${e.date} (W${e.week}) • ${e.exercise} • ${e.type} • ${e.detail} • ${e.xp} XP`;
    $("list").appendChild(li);
  }

  // update UI components
  renderSkills();
  renderQuests();
  renderBoss(curWeek);

  // log UI
  updateAutoTypeUI(curWeek);
}

async function init(){
  $("date").value = isoDate(new Date());

  buildExerciseDropdown();

  setupTabs();

  // exercise change -> auto type + sets suggestion
  $("exercise").addEventListener("change", async () => {
    const entries = await idbGetAll();
    const { curWeek } = await computeStats(entries);
    updateAutoTypeUI(curWeek || 1);
  });

  // calc preview inputs
  ["sets","walkMin","rpe9","tech","pause"].forEach(id => {
    $(id).addEventListener("input", async () => {
      const entries = await idbGetAll();
      const { curWeek } = await computeStats(entries);
      updateCalcPreview(curWeek || 1);
    });
    $(id).addEventListener("change", async () => {
      const entries = await idbGetAll();
      const { curWeek } = await computeStats(entries);
      updateCalcPreview(curWeek || 1);
    });
  });

  // add entry
  $("add").addEventListener("click", async () => {
    const date = $("date").value || isoDate(new Date());
    const exercise = $("exercise").value;
    const type = typeForExercise(exercise);

    // start date auto set if missing
    let start = localStorage.getItem(KEY_START);
    if (!start) {
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

  // skills add SP
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
    if (confirm("Boss-Fight Status & Checks zurücksetzen?")) {
      localStorage.removeItem(KEY_BOSS);
      localStorage.removeItem(KEY_BOSSCHK);
      await renderAll();
    }
  });

  // export
  $("exportCsv").addEventListener("click", async () => {
    const entries = sortEntriesDesc(await idbGetAll());
    if (!entries.length) return alert("Keine Einträge zum Exportieren.");
    const csv = toCSV(entries);
    downloadCSV("ironquest_export.csv", csv);
  });

  // SW
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");

  await renderAll();
}

init();
