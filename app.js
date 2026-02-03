/* =========================
   IRON QUEST – PWA
   - Entries: IndexedDB
   - UI: nicer checklist layout
   - Start date: applied to Log (reps/sets), Boss, Weekly Plan
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
const KEY_SKILLS   = "ironquest_skills_v6";
const KEY_BOSS     = "ironquest_boss_v6";
const KEY_BOSSCHK  = "ironquest_boss_checks_v4";
const KEY_START    = "ironquest_startdate_v6";
const KEY_QUESTS   = "ironquest_dailyquests_v4";
const KEY_ACH      = "ironquest_weeklyach_v4";

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

// ✅ ensures start date exists (used everywhere)
function ensureStartDate(){
  let start = localStorage.getItem(KEY_START);
  if (!start) {
    // Prefer the log date if present, else today
    const d = $("date")?.value;
    start = d || isoDate(new Date());
    localStorage.setItem(KEY_START, start);
  }
  // keep boss input synced
  if ($("startDate")) $("startDate").value = start;
  return start;
}

function currentWeekToday(){
  const start = ensureStartDate();
  const today = isoDate(new Date());
  return getWeekNumber(start, today);
}

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
function blockHintShort(week){
  const b = weekBlock(week);
  if (b === 1) return "Clean & kontrolliert";
  if (b === 2) return "Mehr Volumen";
  return "Dicht & intensiv";
}

// ---------- Tabs ----------
function setupTabs(){
  const tabs = document.querySelectorAll(".tab");
  const panels = document.querySelectorAll(".panel");
  tabs.forEach(btn => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const target = btn.getAttribute("data-tab");
      const panel = document.getElementById("tab-" + target);
      if (!panel) return;
      tabs.forEach(b => b.classList.remove("active"));
      panels.forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      panel.classList.add("active");
    });
  });
}

// ---------- XP + Level ----------
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
function neatXP(minutes) { return Math.max(0, Math.round(minutes * 5)); } // 60->300

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

// ---------- Recommended Sets + Reps ----------
function recommendedSetsByWeek(type, week){
  const b = weekBlock(week);
  if (type === "NEAT") return { text:"Minuten statt Sätze", value:null };
  if (type === "Conditioning") {
    if (b === 1) return { text:"4–5 Runden", value:4 };
    if (b === 2) return { text:"5–6 Runden", value:5 };
    return { text:"5–6 Runden (kürzere Pausen)", value:5 };
  }
  if (type === "Core") {
    if (b === 1) return { text:"3 Sätze", value:3 };
    if (b === 2) return { text:"4 Sätze", value:4 };
    return { text:"4 Sätze (langsamer/clean)", value:4 };
  }
  if (type === "Komplexe") {
    if (b === 1) return { text:"4–5 Runden", value:4 };
    if (b === 2) return { text:"5–6 Runden", value:5 };
    return { text:"6 Runden (gleiches Gewicht)", value:6 };
  }
  if (b === 1) return { text:"3–4 Sätze", value:4 };
  if (b === 2) return { text:"4–5 Sätze", value:5 };
  return { text:"4–5 Sätze (Tempo/Pausen härter)", value:5 };
}

function recommendedRepsByWeek(type, week){
  const b = weekBlock(week);
  if (type === "NEAT") return "Minuten (z. B. 30–60)";
  if (type === "Core") {
    if (b === 1) return "30–45s pro Satz";
    if (b === 2) return "40–60s pro Satz";
    return "45–60s (sauber, ohne Ausweichen)";
  }
  if (type === "Conditioning") {
    if (b === 1) return "30–40s Arbeit / 60s Pause";
    if (b === 2) return "35–45s Arbeit / 45–60s Pause";
    return "40–45s Arbeit / 30–45s Pause";
  }
  if (type === "Komplexe") {
    if (b === 1) return "6–8 Wdh pro Movement";
    if (b === 2) return "6 Wdh pro Movement";
    return "6 Wdh pro Movement (stabil)";
  }
  if (b === 1) return "10–12 Wdh/Satz";
  if (b === 2) return "8–10 Wdh/Satz";
  return "6–8 Wdh/Satz (Tempo kontrolliert)";
}

// ---------- Exercises ----------
const EXERCISES = [
  { name: "DB Floor Press (neutral)", type: "Mehrgelenkig", group: "Tag 1 – Push" },
  { name: "Arnold Press", type: "Mehrgelenkig", group: "Tag 1 – Push" },
  { name: "Deficit Push-Ups", type: "Mehrgelenkig", group: "Tag 1 – Push" },
  { name: "Overhead Trizeps Extension", type: "Mehrgelenkig", group: "Tag 1 – Push" },

  { name: "1-Arm DB Row (Pause oben)", type: "Unilateral", group: "Tag 2 – Pull" },
  { name: "Renegade Rows", type: "Unilateral", group: "Tag 2 – Pull" },
  { name: "Reverse Flys (langsam)", type: "Mehrgelenkig", group: "Tag 2 – Pull" },
  { name: "Cross-Body Hammer Curl", type: "Mehrgelenkig", group: "Tag 2 – Pull" },

  { name: "Bulgarian Split Squats", type: "Unilateral", group: "Tag 3 – Beine & Core" },
  { name: "DB Romanian Deadlift", type: "Mehrgelenkig", group: "Tag 3 – Beine & Core" },
  { name: "Cossack Squats", type: "Unilateral", group: "Tag 3 – Beine & Core" },
  { name: "Side Plank + Leg Raise", type: "Core", group: "Tag 3 – Beine & Core" },

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

  { name: "Walking Desk (Laufband 3 km/h)", type: "NEAT", group: "NEAT / Alltag" },
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

// ---------- Daily Quests (UI nicer) ----------
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
  const already = qState[today][questId] === true;
  if (done && already) return;

  if (done) qState[today][questId] = true;
  else delete qState[today][questId];

  saveQuestState(qState);

  if (done) {
    const q = QUESTS.find(x => x.id === questId);
    const week = currentWeekToday();
    await idbAdd({
      date: today,
      week,
      exercise: `Daily Quest: ${q?.name ?? questId}`,
      type: "Quest",
      detail: "Completed",
      xp: q?.xp ?? 0
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
        <input type="checkbox" id="q_${q.id}" ${done ? "checked":""}>
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
        await setQuestDoneToday(q.id, true);
      } else {
        alert("Quest deaktiviert – XP-Eintrag bleibt bestehen (einfaches System).");
      }
      await renderAll();
    });
  });
}

// ---------- Bossfights (UI nicer + startdate applied) ----------
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
  const start = ensureStartDate();
  const today = isoDate(new Date());
  const bossState = loadBoss();

  if ($("bossStartDisplay")) $("bossStartDisplay").textContent = start;
  if ($("bossCurrentWeek")) $("bossCurrentWeek").textContent = curWeek ? `W${curWeek}` : "—";

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

    b.workout.forEach((line, idx) => {
      const checked = !!checks[idx];
      const row = document.createElement("li");
      row.innerHTML = `
        <div class="checkItem">
          <input type="checkbox" id="bc_${b.week}_${idx}" ${checked ? "checked":""} ${locked ? "disabled":""}>
          <div class="checkMain">
            <div class="checkTitle">${line}</div>
            <div class="checkSub">${b.name}</div>
          </div>
          <div class="xpBadge">Teil XP</div>
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
      const w = getWeekNumber(start, today);

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

function renderWeeklyPlan(curWeek){
  const content = $("planContent");
  if (!content) return;

  const start = ensureStartDate();
  const w = clampWeek(curWeek || 1);
  const b = weekBlock(w);
  const dayMap = groupExercisesByDay();
  const boss = getBossForWeek(w);

  if ($("planStart")) $("planStart").textContent = start;
  if ($("planWeek")) $("planWeek").textContent = `W${w}`;
  if ($("planBlock")) $("planBlock").textContent = blockName(b);
  if ($("planHint")) $("planHint").textContent = weeklyProgressHint(w);

  const questHint = `Quests: ${QUESTS.map(q => `${q.name} (+${q.xp})`).join(" • ")}`;

  let html = "";
  html += `<div class="pill"><b>Heute/Alltag:</b> ${questHint}</div>`;
  html += `<div class="divider"></div>`;

  if (boss) {
    html += `
      <div class="pill"><b>Boss diese Woche:</b> ${boss.name} (W${boss.week}) • +${boss.xp} XP<br>
      <span class="small">Clear nur in W${boss.week} + Checkboxen im Boss-Tab.</span></div>
      <div class="divider"></div>
    `;
  } else {
    html += `<div class="pill"><b>Boss diese Woche:</b> keiner (Boss-Wochen: 2/4/6/8/10/12)</div><div class="divider"></div>`;
  }

  Object.keys(dayMap).forEach(dayName => {
    html += `<div class="planDay"><h3>${dayName}</h3><ul class="planList">`;
    dayMap[dayName].forEach(ex => {
      const setRec = recommendedSetsByWeek(ex.type, w).text;
      const repRec = recommendedRepsByWeek(ex.type, w);
      html += `<li><b>${ex.name}</b><br><span class="small">${ex.type} • ${setRec} • ${repRec}</span></li>`;
    });
    html += `</ul></div>`;
  });

  html += `
    <div class="planDay">
      <h3>Extra (optional)</h3>
      <ul class="planList">
        <li><b>NEAT Walking Desk (3 km/h)</b><br><span class="small">${recommendedRepsByWeek("NEAT", w)} • XP = Minuten × 5</span></li>
        <li><b>Ruhetag / Mobility</b><br><span class="small">10–20 Min Mobility + Spaziergang = Fortschritt</span></li>
      </ul>
    </div>
  `;

  content.innerHTML = html;
}

// ---------- Log UI ----------
async function updateLogUI(){
  const start = ensureStartDate();
  if ($("logStart")) $("logStart").textContent = start;

  const today = isoDate(new Date());
  const curWeek = getWeekNumber(start, today);

  const exName = $("exercise")?.value;
  const type = typeForExercise(exName);

  if ($("autoType")) $("autoType").textContent = type;

  const setRec = recommendedSetsByWeek(type, curWeek);
  const repRec = recommendedRepsByWeek(type, curWeek);
  if ($("recommendedSets")) $("recommendedSets").textContent = setRec.text;
  if ($("recommendedReps")) $("recommendedReps").textContent = repRec;
  if ($("blockHintShort")) $("blockHintShort").textContent = blockHintShort(curWeek);

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

  updateCalcPreview(curWeek);
}

function updateCalcPreview(curWeek){
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

  if ($("calcXp")) $("calcXp").textContent = xp;
}

// ---------- Dashboard render ----------
async function computeStats(entries){
  const startDate = ensureStartDate();
  const today = isoDate(new Date());
  const curWeek = getWeekNumber(startDate, today);

  let todayXp = 0, weekXp = 0, totalXp = 0;
  for (const e of entries){
    totalXp += e.xp;
    if (e.date === today) todayXp += e.xp;
    if (e.week === curWeek) weekXp += e.xp;
  }
  return { todayXp, weekXp, totalXp, curWeek, startDate };
}

// ---------- Achievements (unchanged, minimal) ----------
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
  for (const dayISO of Object.keys(q)){
    const w = getWeekNumber(ensureStartDate(), dayISO);
    if (w === weekNum){
      count += Object.values(q[dayISO] || {}).filter(Boolean).length;
    }
  }
  return count;
}
async function evaluateWeeklyAchievements(entries, weekNum){
  if (!weekNum) return { earned:[], newlyEarned:[], trainDays:0, threeStarDays:0 };

  const dayXP = {};
  for (const e of entries){
    if (e.week !== weekNum) continue;
    dayXP[e.date] = (dayXP[e.date] || 0) + e.xp;
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
    if (!achState[weekNum][id]){
      achState[weekNum][id] = true;
      newlyEarned.push(id);
    }
  }
  saveWeeklyAch(achState);

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

// ---------- Render All ----------
async function renderAll(){
  ensureStartDate();

  const raw = await idbGetAll();
  const entries = sortEntriesDesc(raw);
  const stats = await computeStats(entries);

  const evalRes = await evaluateWeeklyAchievements(entries, stats.curWeek);
  const finalEntries = evalRes.newlyEarned?.length ? sortEntriesDesc(await idbGetAll()) : entries;
  const stats2 = await computeStats(finalEntries);

  if ($("startDisplay")) $("startDisplay").textContent = stats2.startDate;
  if ($("weekNumber")) $("weekNumber").textContent = `W${stats2.curWeek}`;
  if ($("blockNow")) $("blockNow").textContent = blockName(weekBlock(stats2.curWeek));

  if ($("todayXp")) $("todayXp").textContent = stats2.todayXp;
  if ($("todayStars")) $("todayStars").textContent = starsForToday(stats2.todayXp);
  if ($("weekXp")) $("weekXp").textContent = stats2.weekXp;
  if ($("totalXp")) $("totalXp").textContent = stats2.totalXp;

  const lvl = xpToLevel(stats2.totalXp);
  if ($("level")) $("level").textContent = lvl;
  if ($("title")) $("title").textContent = getTitle(lvl);

  if ($("wkTrainDays")) $("wkTrainDays").textContent = evalRes.trainDays ?? 0;
  if ($("wkThreeStarDays")) $("wkThreeStarDays").textContent = evalRes.threeStarDays ?? 0;

  const earnedNames = (evalRes.earned || []).map(id => ACHIEVEMENTS.find(a=>a.id===id)?.name).filter(Boolean);
  if ($("wkAchievements")) $("wkAchievements").textContent = earnedNames.length ? earnedNames.join(", ") : "—";
  if ($("wkProgressHint")) $("wkProgressHint").textContent = weeklyProgressHint(stats2.curWeek);

  const recent = finalEntries.slice(0, 6);
  const recentList = $("recentList");
  if (recentList){
    recentList.innerHTML = recent.length ? "" : "<li>Noch keine Einträge.</li>";
    recent.forEach(e => {
      const li = document.createElement("li");
      li.textContent = `${e.date} • ${e.exercise} • ${e.type} • ${e.detail} • ${e.xp} XP`;
      recentList.appendChild(li);
    });
  }

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
  renderWeeklyPlan(stats2.curWeek);
  await updateLogUI();
}

// ---------- CSV export ----------
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

// ---------- Init ----------
async function init(){
  if ($("date")) $("date").value = isoDate(new Date());
  ensureStartDate();

  buildExerciseDropdown();
  setupTabs();

  $("exercise")?.addEventListener("change", async () => { await updateLogUI(); });
  ["sets","walkMin","rpe9","tech","pause"].forEach(id => {
    $(id)?.addEventListener("input", async () => { await updateLogUI(); });
    $(id)?.addEventListener("change", async () => { await updateLogUI(); });
  });

  $("add")?.addEventListener("click", async () => {
    const date = $("date")?.value || isoDate(new Date());
    const exercise = $("exercise")?.value || "Unbekannt";
    const type = typeForExercise(exercise);

    const start = ensureStartDate();
    const week = getWeekNumber(start, date);
    const repRec = recommendedRepsByWeek(type, week);

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

    await idbAdd({ date, week, exercise, type, detail, xp });

    if ($("rpe9")) $("rpe9").checked = false;
    if ($("tech")) $("tech").checked = false;
    if ($("pause")) $("pause").checked = false;

    await renderAll();
    alert(`Gespeichert: +${xp} XP`);
  });

  $("clear")?.addEventListener("click", async () => {
    if (confirm("Wirklich ALLE Einträge löschen?")) {
      await idbClear();
      await renderAll();
    }
  });

  $("saveStart")?.addEventListener("click", async () => {
    const d = $("startDate")?.value;
    if (!d) return alert("Bitte Startdatum wählen.");
    localStorage.setItem(KEY_START, d);
    await renderAll();
    alert("Startdatum gespeichert.");
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

  if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js");

  await renderAll();
}

init();
