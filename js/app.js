/* =========================
   IRON QUEST v4 PRO – js/app.js (FULL)
   ✅ Stabile App-Wiring Version (iOS/PWA-freundlich)
   ✅ Tabs, Render Pipeline, DB Loading, Save Entry
   ✅ Log: Übung + empfohlene Sets/Reps + tatsächliche Sets/Reps
   ✅ Health: Blutdruck + Puls (im Log speicherbar)
   ✅ Boss/Attributes/Analytics/Skilltree/Challenge/Backup Hooks
   ✅ Defensive: crasht nicht wenn Module fehlen
   ========================= */

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

const isoDate = (d) => new Date(d).toISOString().slice(0, 10);

const KEY_START = "iq_startdate_v4";
const KEY_TAB = "iq_active_tab_v4";

function loadJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getStartDate() {
  let s = localStorage.getItem(KEY_START);
  if (!s) {
    s = isoDate(new Date());
    localStorage.setItem(KEY_START, s);
  }
  return s;
}

function setStartDate(v) {
  if (!v) return;
  localStorage.setItem(KEY_START, v);
}

function daysBetween(aISO, bISO) {
  return Math.floor((new Date(bISO) - new Date(aISO)) / 86400000);
}

function clampWeek(w) {
  return Math.max(1, Math.min(52, w || 1));
}

function getWeekNumber(startISO, dateISO) {
  const diff = daysBetween(startISO, dateISO);
  if (diff < 0) return 1;
  return clampWeek(Math.floor(diff / 7) + 1);
}

function safeText(s) {
  return String(s ?? "").replace(/[<>&]/g, (c) => ({
    "<":"&lt;", ">":"&gt;", "&":"&amp;"
  }[c]));
}

/* =========================
   Module getters (defensive)
========================= */
function DB() {
  return window.IronQuestDB || window.DB || null;
}
function Exercises() {
  // expect: window.IronQuestExercises or similar
  return window.IronQuestExercises || window.EXERCISES || null;
}
function XpSystem() {
  return window.IronQuestXP || window.XpSystem || window.XPSystem || null;
}
function Progression() {
  return window.IronQuestProgression || window.Progression || null;
}

/* =========================
   App State
========================= */
const state = {
  entries: [],
  startDate: getStartDate(),
  todayISO: isoDate(new Date()),
  currentWeek: 1,
  activeTab: localStorage.getItem(KEY_TAB) || "dashboard",
};

function computeDerived() {
  state.todayISO = isoDate(new Date());
  state.startDate = getStartDate();
  state.currentWeek = getWeekNumber(state.startDate, state.todayISO);
}

async function loadEntries() {
  const db = DB();
  if (!db) throw new Error("DB fehlt: window.IronQuestDB");

  // Standard-Funktionen (passt zu vielen db.js Implementierungen):
  if (typeof db.getAllEntries === "function") return await db.getAllEntries();
  if (typeof db.getAll === "function") return await db.getAll();
  throw new Error("DB API fehlt: getAllEntries() oder getAll()");
}

async function addEntry(entry) {
  const db = DB();
  if (!db) throw new Error("DB fehlt: window.IronQuestDB");

  if (typeof db.addEntry === "function") return await db.addEntry(entry);
  if (typeof db.add === "function") return await db.add(entry);
  throw new Error("DB API fehlt: addEntry() / add()");
}

async function addMany(entries) {
  const db = DB();
  if (!db) throw new Error("DB fehlt: window.IronQuestDB");

  if (typeof db.addMany === "function") return await db.addMany(entries);
  // fallback
  for (const e of entries) await addEntry(e);
}

/* =========================
   Tabs
========================= */
function activateTab(tabId) {
  state.activeTab = tabId;
  localStorage.setItem(KEY_TAB, tabId);

  $$("nav button[data-tab]").forEach(b => b.classList.toggle("active", b.dataset.tab === tabId));
  $$(".tab").forEach(sec => sec.classList.toggle("active", sec.id === tabId));
}

function bindTabs() {
  $$("nav button[data-tab]").forEach(btn => {
    btn.addEventListener("click", () => activateTab(btn.dataset.tab));
  });

  // Restore last tab
  activateTab(state.activeTab);
}

/* =========================
   UI Blocks
========================= */
function renderPlayerInfo() {
  const el = $("#playerInfo");
  if (!el) return;

  const totalXp = state.entries.reduce((s, e) => s + (Number(e.xp) || 0), 0);
  const level = Progression()?.levelFromTotalXp ? Progression().levelFromTotalXp(totalXp) : null;

  const lvlText = level?.lvl ? `Lv ${level.lvl}` : "Lv —";
  el.innerHTML = `
    <div class="pill"><b>Start:</b> ${safeText(state.startDate)}</div>
    <div class="pill"><b>Woche:</b> W${state.currentWeek}</div>
    <div class="pill"><b>Total XP:</b> ${Math.round(totalXp)}</div>
    <div class="pill"><b>${safeText(lvlText)}</b></div>
  `;
}

function renderDashboard() {
  const el = $("#dashboard");
  if (!el) return;

  const todayXp = state.entries
    .filter(e => e.date === state.todayISO)
    .reduce((s, e) => s + (Number(e.xp) || 0), 0);

  const weekXp = state.entries
    .filter(e => Number(e.week) === state.currentWeek)
    .reduce((s, e) => s + (Number(e.xp) || 0), 0);

  el.innerHTML = `
    <div class="card">
      <h2>Dashboard</h2>
      <p class="hint">Heute: <b>${safeText(state.todayISO)}</b> • Woche <b>W${state.currentWeek}</b></p>

      <div class="row2">
        <div class="pill"><b>Heute XP:</b> ${Math.round(todayXp)}</div>
        <div class="pill"><b>Woche XP:</b> ${Math.round(weekXp)}</div>
      </div>

      <div class="divider"></div>

      <h3>Startdatum</h3>
      <div class="row2">
        <input id="startDateInput" class="input" type="date" value="${safeText(state.startDate)}">
        <button id="saveStartBtn" class="btn secondary">Startdatum speichern</button>
      </div>
      <p class="hint">Ändert die Wochen-Nummer (W1 ab Startdatum). Wenn du eine Recalc-Funktion in db.js hast, kann man später Weeks neu berechnen.</p>
    </div>

    <div class="card" id="dashAttrCard">
      <h2>Attribute</h2>
      <div class="hint">Wird aus Entries berechnet (STR/STA/END/MOB).</div>
      <div id="dashAttrMount"></div>
    </div>

    <div class="card" id="dashAnalyticsCard">
      <h2>Analytics</h2>
      <div class="hint">Mini-Analytics (wenn analytics.js vorhanden ist).</div>
      <div id="dashAnalyticsMount"></div>
    </div>
  `;

  $("#saveStartBtn")?.addEventListener("click", async () => {
    const v = $("#startDateInput")?.value;
    if (!v) return alert("Bitte Datum wählen.");
    setStartDate(v);
    computeDerived();
    await renderAll();
    alert("Startdatum gespeichert ✅");
  });

  // Attributes
  if (window.IronQuestAttributes?.render) {
    window.IronQuestAttributes.render($("#dashAttrMount"), state.entries);
  } else {
    $("#dashAttrMount").innerHTML = `<div class="hint">attributes.js fehlt oder exportiert kein IronQuestAttributes.render()</div>`;
  }

  // Analytics mini
  if (window.IronQuestAnalytics?.renderMini) {
    window.IronQuestAnalytics.renderMini($("#dashAnalyticsMount"), state);
  } else {
    $("#dashAnalyticsMount").innerHTML = `<div class="hint">analytics.js optional (renderMini nicht gefunden)</div>`;
  }
}

function buildExerciseOptions() {
  const ex = Exercises();

  // Minimal fallback falls exercises.js nicht geladen:
  const fallback = [
    { name: "DB Floor Press", type: "Mehrgelenkig", desc: "Brust/Trizeps", recSets: "3–4", recReps: "8–12" },
    { name: "1-Arm DB Row", type: "Unilateral", desc: "Rücken", recSets: "3–4", recReps: "8–12" },
    { name: "Goblet Squat", type: "Mehrgelenkig", desc: "Beine", recSets: "3–4", recReps: "8–12" },
    { name: "Walking (NEAT)", type: "NEAT", desc: "LISS/Alltag", recSets: "—", recReps: "30–60 min" },
  ];

  const list = Array.isArray(ex?.list) ? ex.list : (Array.isArray(ex) ? ex : fallback);
  return list;
}

function renderLog() {
  const el = $("#log");
  if (!el) return;

  const exList = buildExerciseOptions();

  el.innerHTML = `
    <div class="card">
      <h2>Log</h2>
      <p class="hint">Training + Health Tracking (Blutdruck + Puls). Empfohlene Werte kommen aus exercises.js (wenn vorhanden).</p>

      <div class="row2">
        <label class="stack">
          <span class="hint">Datum</span>
          <input id="logDate" class="input" type="date" value="${safeText(state.todayISO)}">
        </label>
        <div class="pill"><b>Woche:</b> <span id="logWeek">W${state.currentWeek}</span></div>
      </div>

      <label class="stack">
        <span class="hint">Übung</span>
        <select id="logExercise" class="input">
          ${exList.map(x => `<option value="${safeText(x.name)}">${safeText(x.name)} (${safeText(x.type || "—")})</option>`).join("")}
        </select>
      </label>

      <div class="row2">
        <div class="pill"><b>Typ:</b> <span id="logType">—</span></div>
        <div class="pill"><b>Empfehlung:</b> <span id="logRec">—</span></div>
      </div>

      <div class="divider"></div>

      <h3>Tatsächliche Leistung</h3>
      <div class="row2">
        <label class="stack">
          <span class="hint">Sätze</span>
          <input id="logSets" class="input" type="number" min="0" step="1" inputmode="numeric" placeholder="z.B. 4">
        </label>
        <label class="stack">
          <span class="hint">Reps / Satz</span>
          <input id="logReps" class="input" type="number" min="0" step="1" inputmode="numeric" placeholder="z.B. 10">
        </label>
      </div>

      <div class="row2">
        <label class="stack">
          <span class="hint">Gewicht (optional)</span>
          <input id="logWeight" class="input" type="number" min="0" step="0.5" inputmode="decimal" placeholder="z.B. 20">
        </label>
        <label class="stack">
          <span class="hint">Minuten (NEAT/Conditioning optional)</span>
          <input id="logMinutes" class="input" type="number" min="0" step="1" inputmode="numeric" placeholder="z.B. 30">
        </label>
      </div>

      <div class="divider"></div>

      <h3>Health</h3>
      <div class="row2">
        <label class="stack">
          <span class="hint">Blutdruck SYS</span>
          <input id="bpSys" class="input" type="number" min="0" step="1" inputmode="numeric" placeholder="z.B. 125">
        </label>
        <label class="stack">
          <span class="hint">Blutdruck DIA</span>
          <input id="bpDia" class="input" type="number" min="0" step="1" inputmode="numeric" placeholder="z.B. 80">
        </label>
      </div>
      <div class="row2">
        <label class="stack">
          <span class="hint">Puls (bpm)</span>
          <input id="pulse" class="input" type="number" min="0" step="1" inputmode="numeric" placeholder="z.B. 65">
        </label>
        <label class="stack">
          <span class="hint">Notiz (optional)</span>
          <input id="logNote" class="input" placeholder="z.B. RPE9, Stress, Schlaf schlecht...">
        </label>
      </div>

      <div class="row2">
        <div class="pill"><b>XP Vorschau:</b> <span id="logXpPreview">—</span></div>
        <button id="saveEntryBtn" class="btn">Speichern</button>
      </div>
    </div>

    <div class="card">
      <h2>Letzte Einträge</h2>
      <div id="logEntriesList"></div>
    </div>
  `;

  const updateWeek = () => {
    const d = $("#logDate")?.value || state.todayISO;
    const w = getWeekNumber(getStartDate(), d);
    $("#logWeek").textContent = `W${w}`;
  };

  const findExercise = (name) => buildExerciseOptions().find(x => x.name === name) || null;

  const updateRecommendation = () => {
    const name = $("#logExercise")?.value;
    const ex = findExercise(name);
    $("#logType").textContent = ex?.type || "—";
    const rec = (ex?.recSets || ex?.sets || "—") + " Sets • " + (ex?.recReps || ex?.reps || "—");
    $("#logRec").textContent = rec;
  };

  const calcXpPreview = () => {
    const d = $("#logDate")?.value || state.todayISO;
    const w = getWeekNumber(getStartDate(), d);

    const name = $("#logExercise")?.value;
    const ex = findExercise(name);

    const sets = Number($("#logSets")?.value || 0);
    const reps = Number($("#logReps")?.value || 0);
    const minutes = Number($("#logMinutes")?.value || 0);
    const weight = Number($("#logWeight")?.value || 0);

    let xp = 0;

    // Preferred: xpSystem.js
    if (window.IronQuestXP?.calcXP) {
      xp = window.IronQuestXP.calcXP({
        week: w,
        exercise: ex,
        actual: { sets, reps, minutes, weight }
      });
    } else if (XpSystem()?.calcXP) {
      xp = XpSystem().calcXP({ week: w, exercise: ex, actual: { sets, reps, minutes, weight } });
    } else {
      // Fallback simple rule
      const baseByType = {
        "Mehrgelenkig": 180,
        "Unilateral": 200,
        "Core": 140,
        "Conditioning": 240,
        "Komplexe": 260,
        "NEAT": 3,
        "Rest": 0,
      };
      if ((ex?.type || "") === "NEAT") xp = Math.round(minutes * 3);
      else xp = baseByType[ex?.type] ?? 150;
    }

    $("#logXpPreview").textContent = String(Math.round(xp));
    return Math.round(xp);
  };

  $("#logDate")?.addEventListener("change", () => { updateWeek(); calcXpPreview(); });
  $("#logExercise")?.addEventListener("change", () => { updateRecommendation(); calcXpPreview(); });

  ["logSets","logReps","logMinutes","logWeight"].forEach(id => {
    $("#"+id)?.addEventListener("input", calcXpPreview);
  });

  updateWeek();
  updateRecommendation();
  calcXpPreview();

  $("#saveEntryBtn")?.addEventListener("click", async () => {
    const dateISO = $("#logDate")?.value || state.todayISO;
    const week = getWeekNumber(getStartDate(), dateISO);

    const name = $("#logExercise")?.value;
    const ex = findExercise(name);

    const sets = Number($("#logSets")?.value || 0);
    const reps = Number($("#logReps")?.value || 0);
    const minutes = Number($("#logMinutes")?.value || 0);
    const weight = Number($("#logWeight")?.value || 0);

    const bpSys = Number($("#bpSys")?.value || 0);
    const bpDia = Number($("#bpDia")?.value || 0);
    const pulse = Number($("#pulse")?.value || 0);

    const note = $("#logNote")?.value?.trim() || "";

    const xp = calcXpPreview();

    const recSets = ex?.recSets || ex?.sets || "—";
    const recReps = ex?.recReps || ex?.reps || "—";

    // detail string: recommended + actual + health
    const detailParts = [
      `Empf: ${recSets} / ${recReps}`,
      `Ist: Sets ${sets || 0}, Reps ${reps || 0}`,
    ];

    if (weight) detailParts.push(`Gewicht: ${weight}`);
    if (minutes) detailParts.push(`Min: ${minutes}`);

    if (bpSys && bpDia) detailParts.push(`BP: ${bpSys}/${bpDia}`);
    if (pulse) detailParts.push(`Puls: ${pulse} bpm`);
    if (note) detailParts.push(`Note: ${note}`);

    // Optional: exercise description
    if (ex?.desc) detailParts.push(`Desc: ${ex.desc}`);

    const entry = {
      date: dateISO,
      week,
      exercise: ex?.name || name || "Unbekannt",
      type: ex?.type || "Other",
      detail: detailParts.join(" • "),
      xp
    };

    try {
      await addEntry(entry);

      // Optional: PR System hook (wenn prSystem.js vorhanden)
      if (window.IronQuestPR?.checkPR) {
        window.IronQuestPR.checkPR(entry);
      }

      // Optional: streak hook (wenn streak.js vorhanden)
      if (window.IronQuestStreak?.update) {
        window.IronQuestStreak.update(state.entries.concat([entry]));
      }

      alert(`Gespeichert ✅ +${xp} XP`);
      await renderAll();
    } catch (e) {
      console.error(e);
      alert("Speichern fehlgeschlagen (Konsole prüfen).");
    }
  });

  renderLogEntriesList();
}

function renderLogEntriesList() {
  const mount = $("#logEntriesList");
  if (!mount) return;

  const recent = [...state.entries]
    .sort((a, b) => (b.id ?? 0) - (a.id ?? 0))
    .slice(0, 20);

  if (!recent.length) {
    mount.innerHTML = `<div class="hint">Noch keine Einträge.</div>`;
    return;
  }

  mount.innerHTML = recent.map(e => `
    <div class="entryRow">
      <div style="min-width:0;">
        <div><b>${safeText(e.date)}</b> (W${safeText(e.week)}) • <b>${safeText(e.exercise)}</b></div>
        <div class="hint">${safeText(e.type)} • ${safeText(e.detail || "")}</div>
      </div>
      <div class="badge">${Math.round(Number(e.xp) || 0)} XP</div>
    </div>
  `).join("");
}

function renderSkills() {
  const el = $("#skills");
  if (!el) return;

  el.innerHTML = `
    <div class="card">
      <h2>Skilltree</h2>
      <div id="skillsMount"></div>
    </div>
  `;

  if (window.IronQuestSkilltree?.render) {
    window.IronQuestSkilltree.render($("#skillsMount"), state);
  } else {
    $("#skillsMount").innerHTML = `<div class="hint">skilltree.js fehlt oder exportiert kein IronQuestSkilltree.render()</div>`;
  }
}

function renderAnalytics() {
  const el = $("#analytics");
  if (!el) return;

  el.innerHTML = `
    <div class="card">
      <h2>Analytics</h2>
      <div id="analyticsMount"></div>
    </div>
  `;

  if (window.IronQuestAnalytics?.render) {
    window.IronQuestAnalytics.render($("#analyticsMount"), state);
  } else {
    $("#analyticsMount").innerHTML = `<div class="hint">analytics.js fehlt oder exportiert kein IronQuestAnalytics.render()</div>`;
  }
}

function renderHealth() {
  const el = $("#health");
  if (!el) return;

  el.innerHTML = `
    <div class="card">
      <h2>Health</h2>
      <div id="healthMount"></div>
      <p class="hint">Health wird aktuell beim Log-Eintrag mit gespeichert (BP + Puls). Optional kann health.js daraus Trends bauen.</p>
    </div>
  `;

  if (window.IronQuestHealth?.render) {
    window.IronQuestHealth.render($("#healthMount"), state);
  } else {
    $("#healthMount").innerHTML = `<div class="hint">health.js optional (render nicht gefunden). Aktuell werden BP/Puls im Log gespeichert.</div>`;
  }
}

function renderBoss() {
  const el = $("#boss");
  if (!el) return;

  el.innerHTML = `
    <div class="card">
      <h2>Boss</h2>
      <div id="bossMount"></div>
    </div>
  `;

  if (window.IronQuestBoss?.render) {
    window.IronQuestBoss.render($("#bossMount"), {
      currentWeek: state.currentWeek,
      todayISO: state.todayISO
    });
  } else {
    $("#bossMount").innerHTML = `<div class="hint">boss.js fehlt oder exportiert kein IronQuestBoss.render()</div>`;
  }
}

function renderChallenge() {
  const el = $("#challenge");
  if (!el) return;

  el.innerHTML = `
    <div class="card">
      <h2>Challenge Mode</h2>
      <div id="challengeMount"></div>
    </div>

    <div class="card">
      <h2>Backup & Sync</h2>
      <div id="backupMount"></div>
    </div>
  `;

  if (window.IronQuestChallenges?.render) {
    window.IronQuestChallenges.render($("#challengeMount"), state);
  } else {
    $("#challengeMount").innerHTML = `<div class="hint">challenges.js fehlt oder exportiert kein IronQuestChallenges.render()</div>`;
  }

  if (window.IronQuestBackup?.render) {
    window.IronQuestBackup.render($("#backupMount"));
  } else {
    $("#backupMount").innerHTML = `<div class="hint">backup.js fehlt oder exportiert kein IronQuestBackup.render()</div>`;
  }
}

/* =========================
   Render Pipeline
========================= */
async function renderAll() {
  computeDerived();

  try {
    state.entries = await loadEntries();
  } catch (e) {
    console.error(e);
    // Show minimal UI but do not crash
    state.entries = [];
  }

  renderPlayerInfo();

  // Render tabs
  renderDashboard();
  renderLog();
  renderSkills();
  renderAnalytics();
  renderHealth();
  renderBoss();
  renderChallenge();
}

/* =========================
   Service Worker (iOS stable pattern)
========================= */
function registerSW() {
  if (!("serviceWorker" in navigator)) return;

  navigator.serviceWorker.register("./sw.js").then((reg) => {
    // Listen for updates
    reg.addEventListener("updatefound", () => {
      const sw = reg.installing;
      if (!sw) return;
      sw.addEventListener("statechange", () => {
        if (sw.state === "installed" && navigator.serviceWorker.controller) {
          // New version available
          console.log("SW update available ✅");
          // Optional: auto-reload after update
          // location.reload();
        }
      });
    });
  }).catch((err) => {
    console.warn("SW register failed", err);
  });
}

/* =========================
   Public API (optional)
========================= */
window.IronQuestApp = {
  renderAll
};

/* =========================
   Init
========================= */
async function init() {
  try {
    bindTabs();
    registerSW();
    await renderAll();
  } catch (e) {
    console.error(e);
    alert("Fehler in js/app.js – bitte Konsole prüfen.");
  }
}

init();
