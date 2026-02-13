/* =========================
   IRON QUEST v4 PRO – js/app.js (FULL)
   ✅ Tabs funktionieren stabil (iOS/Safari)
   ✅ Log: Übungen + Beschreibung + tatsächliche Sets/Reps
   ✅ Sterne pro Trainingstag (⭐/⭐⭐/⭐⭐⭐) + Anzeige
   ✅ Weekly Plan (einfach) im Dashboard
   ✅ Jogging Tab: Distanz + Zeit + XP + Pace-Chart
   ✅ Skilltree/Analytics/Health/Boss/Challenge/Backup: echte Module (kompatible Global-Namen)
========================= */

(function () {
  "use strict";

  /* -------------------------
     Helpers
  ------------------------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const isoDate = (d) => new Date(d).toISOString().slice(0, 10);

  const KEY_START = "ironquest_startdate_v4";
  const STAR_THR = { one: 1200, two: 1600, three: 2000 };

  function starsForXp(xp) {
    if (xp >= STAR_THR.three) return "⭐⭐⭐";
    if (xp >= STAR_THR.two) return "⭐⭐";
    if (xp >= STAR_THR.one) return "⭐";
    return "—";
  }

  function computeTrainingStreak(entries) {
    const totals = new Map();
    for (const e of entries || []) {
      const d = e?.date;
      if (!d) continue;
      totals.set(d, (totals.get(d) || 0) + (e.xp || 0));
    }

    let streak = 0;
    let cursor = new Date();
    while (true) {
      const d = isoDate(cursor);
      const xp = totals.get(d) || 0;
      if (xp > 0) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  }

  function ensureStartDate() {
    let start = localStorage.getItem(KEY_START);
    if (!start) {
      start = isoDate(new Date());
      localStorage.setItem(KEY_START, start);
    }
    return start;
  }

  function getWeekNumber(startISO, dateISO) {
    const a = new Date(startISO);
    const b = new Date(dateISO);
    const diff = Math.floor((b - a) / 86400000);
    if (diff < 0) return 0;
    return Math.floor(diff / 7) + 1;
  }

  function weekBlock(week) {
    if (week <= 4) return 1;
    if (week <= 8) return 2;
    return 3;
  }

  function blockLabel(block) {
    if (block === 1) return "Block 1 (Technik/ROM)";
    if (block === 2) return "Block 2 (Volumen/Progress)";
    return "Block 3 (Dichte/Intensität)";
  }

  // Compatibility: different files may expose different global names.
  function pickGlobal(...names) {
    for (const n of names) {
      if (n && typeof window[n] !== "undefined") return window[n];
    }
    return null;
  }

  /* -------------------------
     DB Adapter
  ------------------------- */
  function db() {
    const d = window.IronQuestDB || window.DB || null;
    if (!d) throw new Error("DB Modul fehlt (db.js).");
    return d;
  }

  /* -------------------------
     Tabs
  ------------------------- */
  const TAB_IDS = ["dashboard", "log", "jogging", "skills", "analytics", "health", "boss", "challenge", "backup"];

  function setActiveTab(id) {
    if (!TAB_IDS.includes(id)) id = "dashboard";
    $$("nav button").forEach((b) => b.classList.toggle("active", b.dataset.tab === id));
    TAB_IDS.forEach((tid) => {
      const sec = document.getElementById(tid);
      if (sec) sec.classList.toggle("active", tid === id);
    });
    location.hash = id;
  }

  function wireTabs() {
    const nav = $("nav");
    if (!nav) return;

    nav.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-tab]");
      if (!btn) return;
      e.preventDefault();
      setActiveTab(btn.dataset.tab);
      renderActive();
    });

    const initial = (location.hash || "#dashboard").replace("#", "");
    setActiveTab(initial);
  }

  /* -------------------------
     Dashboard (includes Weekly Plan + Stars summary)
  ------------------------- */
  async function renderDashboard() {
    const root = document.getElementById("dashboard");
    if (!root) return;

    const start = ensureStartDate();
    const today = isoDate(new Date());
    const week = getWeekNumber(start, today);
    const block = weekBlock(week);

    const entries = await db().getAll();
    const totalXp = entries.reduce((s, e) => s + (e.xp || 0), 0);

    // Today XP
    const todayXp = entries.filter((e) => e.date === today).reduce((s, e) => s + (e.xp || 0), 0);

    // Week XP (based on start date)
    const weekXp = entries
      .filter((e) => getWeekNumber(start, e.date) === week)
      .reduce((s, e) => s + (e.xp || 0), 0);

    const Prog = pickGlobal("Progression", "IronQuestProgression", "IQProgression");
    const lvl = Prog?.levelFromXp ? Prog.levelFromXp(totalXp) : { level: 1, next: 0 };

    // Weekly Plan (simple)
    const plan = [
      { day: "Mo", focus: "Push", note: "Brust/Schulter/Trizeps" },
      { day: "Di", focus: "Pull", note: "Rücken/Bizeps" },
      { day: "Mi", focus: "Recovery", note: "Mobility + Walk" },
      { day: "Do", focus: "Legs + Core", note: "Beine/Rumpf" },
      { day: "Fr", focus: "Full Body", note: "Komplexe + Core" },
      { day: "Sa", focus: "Conditioning", note: "Metcon + Core" },
      { day: "So", focus: "Recovery", note: "Mobility + Walk" },
    ];

    root.innerHTML = `
      <div class="card">
        <h2>Status</h2>
        <div class="row">
          <div class="pill"><b>Start:</b> ${start}</div>
          <div class="pill"><b>Woche:</b> ${week ? `W${week}` : "—"}</div>
          <div class="pill"><b>${blockLabel(block)}</b></div>
        </div>

        <div class="row" style="margin-top:10px;">
          <div class="pill"><b>Heute:</b> ${todayXp} XP (${starsForXp(todayXp)})</div>
          <div class="pill"><b>Woche:</b> ${weekXp} XP</div>
          <div class="pill"><b>Gesamt:</b> ${totalXp} XP</div>
          <div class="pill"><b>Level:</b> ${lvl.level}</div>
          <div class="pill"><b>Streak:</b> ${computeTrainingStreak(entries)} Tage</div>
        </div>

        <div class="hr"></div>

        <label>Startdatum Woche 1</label>
        <input id="startDateInput" type="date" value="${start}">
        <button class="secondary" id="saveStartDate">Startdatum speichern</button>
        <div class="small">Hinweis: Week-Logik basiert auf Startdatum (Sterne fix: ⭐ ab ${STAR_THR.one}, ⭐⭐ ab ${STAR_THR.two}, ⭐⭐⭐ ab ${STAR_THR.three}).</div>
      </div>

      <div class="card">
        <h2>Weekly Plan</h2>
        <div class="grid cols2">
          ${plan
            .map(
              (p) => `
            <div class="pill" style="border-radius:16px;">
              <b>${p.day}:</b> ${p.focus}<br><span class="small">${p.note}</span>
            </div>`
            )
            .join("")}
        </div>
        <div class="small" style="margin-top:10px;">Joggen: nutze den Tab <b>Joggen</b> → generiert XP + Fortschrittsgrafik.</div>
      </div>
    `;

    $("#saveStartDate", root)?.addEventListener("click", async () => {
      const v = $("#startDateInput", root)?.value;
      if (!v) return alert("Bitte Startdatum wählen.");
      localStorage.setItem(KEY_START, v);
      await renderActive();
      alert("Startdatum gespeichert ✅");
    });
  }

  /* -------------------------
     Log
  ------------------------- */
  async function renderLog() {
    const root = document.getElementById("log");
    if (!root) return;

    const start = ensureStartDate();
    const today = isoDate(new Date());
    const week = getWeekNumber(start, today);

    const exercises = (window.IQExercises && window.IQExercises.getAll) ? window.IQExercises.getAll() : [];
    const entries = await db().getAll();

    const dayTotals = {};
    for (const e of entries) dayTotals[e.date] = (dayTotals[e.date] || 0) + (e.xp || 0);

    const sortedDates = Object.keys(dayTotals).sort().reverse().slice(0, 14);

    root.innerHTML = `
      <div class="card">
        <h2>Neuer Eintrag</h2>
        <label>Datum</label>
        <input id="logDate" type="date" value="${today}">

        <label>Übung</label>
        <select id="logExercise">
          ${exercises
            .map((ex) => `<option value="${ex.id}">${ex.name} (${ex.type})</option>`)
            .join("")}
        </select>

        <div id="logMeta" class="small"></div>

        <div class="grid cols2">
          <div>
            <label>Tatsächliche Sätze</label>
            <input id="logSets" type="number" min="0" step="1" placeholder="z.B. 4">
          </div>
          <div>
            <label>Tatsächliche Reps pro Satz</label>
            <input id="logReps" type="number" min="0" step="1" placeholder="z.B. 10">
          </div>
        </div>

        <button class="primary" id="logSave">Speichern</button>
        <div class="small">Heute: ${starsForXp(dayTotals[today] || 0)} • Woche: W${week}</div>
      </div>

      <div class="card">
        <h2>Letzte Tage (XP & Sterne)</h2>
        <ul class="list">
          ${sortedDates
            .map((d) => {
              const xp = dayTotals[d] || 0;
              return `<li>
                <div class="top"><b>${d}</b><span class="badge">${xp} XP</span></div>
                <div class="small">Sterne: ${starsForXp(xp)}</div>
              </li>`;
            })
            .join("") || `<li>Keine Daten.</li>`}
        </ul>
      </div>

      <div class="card">
        <h2>Alle Einträge</h2>
        <ul class="list" id="entryList"></ul>
      </div>
    `;

    const sel = $("#logExercise", root);
    const meta = $("#logMeta", root);

    function updateMeta() {
      const id = sel?.value;
      const ex = exercises.find((x) => String(x.id) === String(id));
      if (!ex) {
        meta.textContent = "";
        return;
      }
      meta.innerHTML = `
        <b>Beschreibung:</b> ${ex.description || "—"}<br>
        <b>Empfehlung:</b> ${ex.recommendedSets || "—"} Sätze × ${ex.recommendedReps || "—"} Reps
        <span class="small"> • Typ: ${ex.type}</span>
      `;
    }

    sel?.addEventListener("change", updateMeta);
    updateMeta();

    $("#logSave", root)?.addEventListener("click", async () => {
      const date = $("#logDate", root)?.value || today;
      const exId = sel?.value;
      const ex = exercises.find((x) => String(x.id) === String(exId));
      if (!ex) return alert("Bitte Übung wählen.");

      const sets = parseInt($("#logSets", root)?.value || "0", 10);
      const reps = parseInt($("#logReps", root)?.value || "0", 10);

      const xp = window.XPSystem?.calcExerciseXP
        ? window.XPSystem.calcExerciseXP(ex, { sets, reps })
        : 100;

      await db().add({
        date,
        xp,
        type: ex.type,
        exercise: ex.name,
        detail: `Empf: ${ex.recommendedSets}×${ex.recommendedReps} | Ist: ${sets || 0}×${reps || 0}`
      });

      $("#logSets", root).value = "";
      $("#logReps", root).value = "";

      await renderActive();
      alert(`Gespeichert: +${xp} XP ✅`);
    });

    const list = $("#entryList", root);
    if (list) {
      const sorted = [...entries].sort((a, b) => (a.date < b.date ? 1 : -1));
      list.innerHTML = sorted
        .map(
          (e) => `
        <li>
          <div class="top"><b>${e.date}</b><span class="badge">${e.xp} XP</span></div>
          <div class="small">${e.exercise} • ${e.type} • ${e.detail || ""}</div>
        </li>`
        )
        .join("") || "<li>Keine Einträge.</li>";
    }
  }

  /* -------------------------
     Jogging
  ------------------------- */
  async function renderJogging() {
    const root = document.getElementById("jogging");
    if (!root) return;

    const today = isoDate(new Date());
    const entries = await db().getAll();
    const jogs = entries.filter((e) => e.type === "Jogging").sort((a, b) => (a.date < b.date ? -1 : 1));

    root.innerHTML = `
      <div class="card">
        <h2>Joggen</h2>
        <div class="muted">Trage Distanz & Zeit ein → XP wird generiert + Pace-Chart.</div>

        <label>Datum</label>
        <input id="jogDate" type="date" value="${today}">

        <div class="grid cols2">
          <div>
            <label>Distanz (km)</label>
            <input id="jogKm" type="number" min="0" step="0.1" placeholder="z.B. 5.0">
          </div>
          <div>
            <label>Zeit (Minuten)</label>
            <input id="jogMin" type="number" min="0" step="1" placeholder="z.B. 30">
          </div>
        </div>

        <button class="primary" id="saveJog">Jog speichern</button>

        <div class="hr"></div>

        <h3>Fortschritt (Pace)</h3>
        <canvas id="jogChart" height="220"></canvas>
        <div class="small">Pace = Minuten pro km. Niedriger ist besser.</div>
      </div>

      <div class="card">
        <h2>Letzte Läufe</h2>
        <ul class="list" id="jogList"></ul>
      </div>
    `;

    $("#saveJog", root)?.addEventListener("click", async () => {
      const d = $("#jogDate", root)?.value || today;
      const km = parseFloat($("#jogKm", root)?.value || "0");
      const min = parseFloat($("#jogMin", root)?.value || "0");
      if (!km || !min) return alert("Bitte Distanz und Zeit eintragen.");

      // XP: distance-heavy + time component
      const baseXP = Math.round(km * 120 + min * 2);
      const pace = min / km;
      const detail = `km=${km.toFixed(1)} • min=${Math.round(min)} • pace=${pace.toFixed(2)} min/km`;

      await db().add({
        date: d,
        xp: baseXP,
        type: "Jogging",
        exercise: "Jogging",
        detail
      });

      await renderActive();
      alert(`Jog gespeichert: +${baseXP} XP ✅`);
    });

    // list
    const list = $("#jogList", root);
    if (list) {
      list.innerHTML =
        jogs
          .slice()
          .reverse()
          .slice(0, 20)
          .map((j) => `<li><div class="top"><b>${j.date}</b><span class="badge">${j.xp} XP</span></div><div class="small">${j.detail}</div></li>`)
          .join("") || "<li>Noch keine Läufe.</li>";
    }

    // chart (pace)
    const canvas = $("#jogChart", root);
    if (canvas && jogs.length) {
      const ctx = canvas.getContext("2d");
      const W = canvas.width = canvas.clientWidth * devicePixelRatio;
      const H = canvas.height = 220 * devicePixelRatio;
      ctx.clearRect(0, 0, W, H);

      const pts = jogs.slice(-12).map((j) => {
        const mKm = /pace=([0-9.]+)/.exec(j.detail || "");
        return { date: j.date, pace: mKm ? parseFloat(mKm[1]) : 0 };
      }).filter(p => p.pace > 0);

      if (!pts.length) return;

      const minP = Math.min(...pts.map(p => p.pace));
      const maxP = Math.max(...pts.map(p => p.pace));
      const pad = 20 * devicePixelRatio;

      const xFor = (i) => pad + (i / Math.max(1, pts.length - 1)) * (W - pad * 2);
      const yFor = (v) => pad + (1 - (v - minP) / Math.max(0.0001, (maxP - minP))) * (H - pad * 2);

      ctx.globalAlpha = 0.5;
      ctx.strokeStyle = "rgba(255,255,255,0.25)";
      ctx.beginPath();
      ctx.moveTo(pad, H - pad);
      ctx.lineTo(W - pad, H - pad);
      ctx.stroke();
      ctx.globalAlpha = 1;

      ctx.strokeStyle = "rgba(255,255,255,0.9)";
      ctx.lineWidth = 3 * devicePixelRatio;
      ctx.beginPath();
      pts.forEach((p, i) => {
        const x = xFor(i);
        const y = yFor(p.pace);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      ctx.fillStyle = "rgba(255,255,255,0.95)";
      pts.forEach((p, i) => {
        const x = xFor(i);
        const y = yFor(p.pace);
        ctx.beginPath();
        ctx.arc(x, y, 4 * devicePixelRatio, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }

  /* -------------------------
     Other Tabs (real modules)
  ------------------------- */
  async function renderSkills() {
    const root = document.getElementById("skills");
    if (!root) return;

    const Skill = pickGlobal("IQSkilltree", "Skilltree", "IronQuestSkilltree");
    if (!Skill?.render) {
      root.innerHTML = `<div class="card"><h2>Skilltree</h2><div class="muted">Skilltree-Modul nicht gefunden.</div></div>`;
      return;
    }
    await Skill.render(root, db());
  }

  async function renderAnalytics() {
    const root = document.getElementById("analytics");
    if (!root) return;

    const A = pickGlobal("IronQuestAnalytics", "IQAnalytics", "Analytics");
    if (!A?.render) {
      root.innerHTML = `<div class="card"><h2>Analytics</h2><div class="muted">Analytics-Modul nicht gefunden.</div></div>`;
      return;
    }
    await A.render(root, db());
  }

  async function renderHealth() {
    const root = document.getElementById("health");
    if (!root) return;

    const H = pickGlobal("IronQuestHealth", "IQHealth", "Health");
    if (!H?.render) {
      root.innerHTML = `<div class="card"><h2>Health</h2><div class="muted">Health-Modul nicht gefunden.</div></div>`;
      return;
    }
    await H.render(root);
  }

  async function renderBoss() {
    const root = document.getElementById("boss");
    if (!root) return;

    const B = pickGlobal("IronQuestBoss", "IQBoss", "Boss");
    if (!B?.render) {
      root.innerHTML = `<div class="card"><h2>Boss</h2><div class="muted">Boss-Modul nicht gefunden.</div></div>`;
      return;
    }
    await B.render(root, db());
  }

  async function renderChallenge() {
    const root = document.getElementById("challenge");
    if (!root) return;

    const C = pickGlobal("IronQuestChallenges", "IQChallenges", "Challenges");
    if (!C?.render) {
      root.innerHTML = `<div class="card"><h2>Challenge</h2><div class="muted">Challenge-Modul nicht gefunden.</div></div>`;
      return;
    }
    await C.render(root, db());
  }

  async function renderBackup() {
    const root = document.getElementById("backup");
    if (!root) return;

    const BK = pickGlobal("IronQuestBackup", "IQBackup", "Backup");
    if (!BK?.render) {
      root.innerHTML = `<div class="card"><h2>Backup</h2><div class="muted">Backup-Modul nicht gefunden.</div></div>`;
      return;
    }
    await BK.render(root, db());
  }

  /* -------------------------
     Status line
  ------------------------- */
  async function renderStatus() {
    const info = document.getElementById("playerInfo");
    if (!info) return;

    const entries = await db().getAll();
    const today = isoDate(new Date());
    const todayXp = entries.filter((e) => e.date === today).reduce((s, e) => s + (e.xp || 0), 0);

    const status = `OK • ${starsForXp(todayXp)} • Streak ${computeTrainingStreak(entries)}`;
    info.textContent = status;
  }

  /* -------------------------
     Render router
  ------------------------- */
  async function renderActive() {
    const active = $("nav button.active")?.dataset.tab || "dashboard";

    await renderStatus();

    if (active === "dashboard") return renderDashboard();
    if (active === "log") return renderLog();
    if (active === "jogging") return renderJogging();
    if (active === "skills") return renderSkills();
    if (active === "analytics") return renderAnalytics();
    if (active === "health") return renderHealth();
    if (active === "boss") return renderBoss();
    if (active === "challenge") return renderChallenge();
    if (active === "backup") return renderBackup();
  }

  /* -------------------------
     Init
  ------------------------- */
  async function init() {
    try {
      wireTabs();

      if ("serviceWorker" in navigator) {
        navigator.serviceWorker.register("sw.js").catch(() => {});
      }

      await renderActive();
    } catch (err) {
      console.error(err);
      const dash = document.getElementById("dashboard");
      if (dash) dash.innerHTML = `<div class="card"><h2>Fehler</h2><div class="muted">JS Fehler: ${String(err?.message || err)}</div></div>`;
      alert("Anzeige Fehler in JS.");
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
