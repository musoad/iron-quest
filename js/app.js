/* =========================
   IRON QUEST – app.js (FULL)
   ✅ Tabs (stabil, iOS): Event Delegation
   ✅ Dashboard + Log + Jogging + Skills + Analytics + Health + Boss + Challenge + Backup
   ✅ Jogging generiert XP + speichert Run-Objekt in runs-store
   ========================= */

const $ = (sel) => document.querySelector(sel);

function showTab(id) {
  const tabs = document.querySelectorAll("main .tab");
  const buttons = document.querySelectorAll("nav button[data-tab]");

  tabs.forEach((t) => t.classList.remove("active"));
  buttons.forEach((b) => b.classList.remove("active"));

  const el = document.getElementById(id);
  const btn = document.querySelector(`nav button[data-tab="${id}"]`);

  if (el) el.classList.add("active");
  if (btn) btn.classList.add("active");

  // optional hash
  try { location.hash = id; } catch {}
}

/** ✅ FIX: Delegation statt einzelne Listener (damit Tabs immer klickbar bleiben) */
function setupNav() {
  const nav = document.querySelector("nav");
  if (!nav) return;

  // Joggen direkt nach Log positionieren
  const logBtn = nav.querySelector('button[data-tab="log"]');
  const jogBtn = nav.querySelector('button[data-tab="jogging"]');
  if (logBtn && jogBtn && logBtn.nextElementSibling !== jogBtn) {
    logBtn.insertAdjacentElement("afterend", jogBtn);
  }

  nav.addEventListener("click", (e) => {
    const btn = e.target.closest("button");
    if (!btn) return;

    // Update Button
    if (btn.id === "btnUpdate") {
      e.preventDefault();
      tryUpdate();
      return;
    }

    // Tabs
    const tab = btn.getAttribute("data-tab");
    if (!tab) return;
    e.preventDefault();
    showTab(tab);
  });

  const initial = (location.hash || "#dashboard").replace("#", "") || "dashboard";
  showTab(initial);
}

/* =========================
   Helpers
========================= */
function isoDate(d = new Date()) {
  return new Date(d).toISOString().slice(0, 10);
}

function groupBy(arr, keyFn) {
  const m = new Map();
  for (const x of arr) {
    const k = keyFn(x);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(x);
  }
  return m;
}

/* =========================
   Stars (Tagesbewertung)
   1200–1599 ⭐ • 1600–1999 ⭐⭐ • 2000+ ⭐⭐⭐
========================= */
const STAR_THR = { one: 1200, two: 1600, three: 2000 };
function starsForXp(xp) {
  if (xp >= STAR_THR.three) return "⭐⭐⭐";
  if (xp >= STAR_THR.two) return "⭐⭐";
  if (xp >= STAR_THR.one) return "⭐";
  return "—";
}

/* =========================
   Update (SW)
========================= */
async function tryUpdate() {
  if (!("serviceWorker" in navigator)) return alert("Service Worker nicht verfügbar.");
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    if (reg?.waiting) {
      reg.waiting.postMessage({ type: "SKIP_WAITING" });
      alert("Update wird angewendet… App neu öffnen.");
      return;
    }
    await reg?.update();
    alert("Update geprüft. Falls verfügbar: App neu öffnen.");
  } catch (e) {
    alert("Update fehlgeschlagen.");
    console.warn(e);
  }
}

/* =========================
   Data loading
========================= */
async function getEntries() {
  const all = await window.IronQuestDB.getAll(window.IronQuestDB.STORES.entries);
  return (all || []).sort((a, b) => (b.id || 0) - (a.id || 0));
}

function computeDayXp(entries) {
  const map = {};
  for (const e of entries) {
    const d = e.date || "";
    map[d] = (map[d] || 0) + (e.xp || 0);
  }
  return map;
}

/* =========================
   Dashboard
========================= */
async function renderDashboard() {
  const root = document.getElementById("dashboard");
  if (!root) return;

  const entries = await getEntries();
  const today = isoDate();
  const dayXp = computeDayXp(entries);
  const todayXp = dayXp[today] || 0;

  const totalXp = entries.reduce((s, e) => s + (e.xp || 0), 0);
  const lvl = window.Progression?.levelFromXp ? window.Progression.levelFromXp(totalXp) : { level: 1, next: 0 };

  // Weekly plan (simple, based on exercises tags)
  const planHTML = buildWeeklyPlanHTML(entries);

  root.innerHTML = `
    <div class="card">
      <h2>Dashboard</h2>
      <div class="row2">
        <div class="pill"><b>Heute:</b> ${today}</div>
        <div class="pill"><b>Heute XP:</b> ${todayXp} (${starsForXp(todayXp)})</div>
      </div>
      <div class="row2">
        <div class="pill"><b>Gesamt XP:</b> ${totalXp}</div>
        <div class="pill"><b>Level:</b> ${lvl.level || 1}</div>
      </div>
      <p class="hint">Sterne: ⭐ ab ${STAR_THR.one} • ⭐⭐ ab ${STAR_THR.two} • ⭐⭐⭐ ab ${STAR_THR.three}</p>
    </div>

    <div class="card">
      <h2>Wochenplan</h2>
      <p class="hint">Einfacher Plan + Status anhand deiner geloggten Einträge dieser Woche.</p>
      ${planHTML}
    </div>

    <div class="card">
      <h2>Letzte Einträge</h2>
      ${renderRecentEntriesHTML(entries)}
    </div>
  `;
}

function renderRecentEntriesHTML(entries) {
  const last = entries.slice(0, 8);
  if (!last.length) return `<div class="hint">Noch keine Einträge.</div>`;
  return `
    <ul class="list">
      ${last.map(e => `
        <li class="listRow">
          <div>
            <div><b>${e.exercise || e.type || "Eintrag"}</b></div>
            <div class="hint">${e.date || ""} • ${e.type || ""} • ${e.detail || ""}</div>
          </div>
          <div class="badge">${e.xp || 0} XP</div>
        </li>
      `).join("")}
    </ul>
  `;
}

/* =========================
   Weekly Plan (minimal / robust)
   - verwendet EXERCISES aus exercises.js
   - enthält Joggen optional
========================= */
function buildWeeklyPlanHTML(entries) {
  const today = new Date();
  const monday = new Date(today);
  const day = monday.getDay(); // 0 So, 1 Mo
  const diff = (day === 0 ? -6 : 1 - day);
  monday.setDate(monday.getDate() + diff);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return isoDate(d);
  });

  const byDate = groupBy(entries, e => e.date || "");
  const statusIcon = (dateISO) => {
    const list = byDate.get(dateISO) || [];
    const xp = list.reduce((s, e) => s + (e.xp || 0), 0);
    if (xp >= STAR_THR.one) return "🟢";
    if (xp > 0) return "⚪";
    return "🔴";
  };

  const labels = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];

  const planned = {
    0: ["Push (Oberkörper)", "DB Floor Press / DB Press", "Arnold Press", "Push-Ups", "Trizeps"],
    1: ["Pull (Rücken)", "1-Arm DB Row", "Reverse Flys", "Curls", "Farmer Carry"],
    2: ["Joggen (optional)", "20–40 Min easy", "oder Intervalle 8×1min", "XP über Joggen-Tab"],
    3: ["Beine & Core", "Bulgarian Split Squats", "RDL", "Core Hold", "Calves"],
    4: ["Ganzkörper", "Komplex / Thrusters", "Core", "Finisher"],
    5: ["Conditioning", "Burpees / Climbers", "Core"],
    6: ["Recovery", "Mobility + Spaziergang"],
  };

  return `
    <div class="planGrid">
      ${days.map((d, i) => `
        <div class="planDay">
          <div class="planHead">${labels[i]} • ${d.slice(5)} <span class="planStatus">${statusIcon(d)}</span></div>
          <ul class="planList">
            ${(planned[i] || []).map(x => `<li>${x}</li>`).join("")}
          </ul>
          <div class="hint">Tag: ${starsForXp((byDate.get(d) || []).reduce((s,e)=>s+(e.xp||0),0))}</div>
        </div>
      `).join("")}
    </div>
  `;
}

/* =========================
   Log (Training Entry)
========================= */
async function renderLog() {
  const root = document.getElementById("log");
  if (!root) return;

  const ex = window.EXERCISES || [];
  const entries = await getEntries();
  const today = isoDate();

  root.innerHTML = `
    <div class="card">
      <h2>Log</h2>

      <label>Datum</label>
      <input id="logDate" type="date" value="${today}" />

      <label>Übung</label>
      <select id="logExercise">
        ${ex.map(e => `<option value="${e.name}">${e.name} (${e.type})</option>`).join("")}
      </select>

      <div id="logMeta" class="hint"></div>

      <label>Tatsächliche Sets</label>
      <input id="logSets" inputmode="numeric" placeholder="z.B. 4" />

      <label>Tatsächliche Reps</label>
      <input id="logReps" inputmode="numeric" placeholder="z.B. 10 (oder 8-10)" />

      <label>Walking Minuten (nur NEAT)</label>
      <input id="logWalk" inputmode="numeric" placeholder="z.B. 60" />

      <div class="card soft" style="margin-top:12px;">
        <div><b>Preview XP:</b> <span id="logXpPrev">0</span></div>
        <div class="hint" id="logXpInfo">—</div>
      </div>

      <div class="row2" style="margin-top:12px;">
        <button id="btnSave" type="button">Speichern</button>
        <button id="btnClearAll" type="button" class="danger">Alle Einträge löschen</button>
      </div>
    </div>

    <div class="card">
      <h2>Einträge</h2>
      ${renderEntriesList(entries)}
    </div>
  `;

  const dateEl = $("#logDate");
  const exEl = $("#logExercise");
  const setsEl = $("#logSets");
  const repsEl = $("#logReps");
  const walkEl = $("#logWalk");
  const metaEl = $("#logMeta");

  function refreshPreview() {
    const exName = exEl.value;
    const m = ex.find(x => x.name === exName);
    const type = m?.type || "Mehrgelenkig";

    const sets = parseInt(setsEl.value || "0", 10) || 0;
    const reps = parseInt(repsEl.value || "0", 10) || 0;
    const walkMin = parseInt(walkEl.value || "0", 10) || 0;

    if (metaEl) {
      metaEl.textContent = `${m?.desc || ""} • Empfohlen: Sets ${m?.recSets || "-"}, Reps ${m?.recReps || "-"}`;
    }

    const xpRes = window.XPSystem?.calcXP
      ? window.XPSystem.calcXP({ type, sets, reps, walkMin })
      : { xp: 0, info: "XPSystem fehlt" };

    $("#logXpPrev").textContent = xpRes.xp || 0;
    $("#logXpInfo").textContent = xpRes.info || "—";
  }

  refreshPreview();
  [dateEl, exEl, setsEl, repsEl, walkEl].forEach(el => el?.addEventListener("input", refreshPreview));

  $("#btnSave")?.addEventListener("click", async () => {
    const date = dateEl.value || today;
    const exName = exEl.value;
    const m = ex.find(x => x.name === exName);
    const type = m?.type || "Mehrgelenkig";

    const sets = parseInt(setsEl.value || "0", 10) || 0;
    const reps = parseInt(repsEl.value || "0", 10) || 0;
    const walkMin = parseInt(walkEl.value || "0", 10) || 0;

    const xpRes = window.XPSystem?.calcXP
      ? window.XPSystem.calcXP({ type, sets, reps, walkMin })
      : { xp: 0, info: "XPSystem fehlt" };

    const detailParts = [];
    if (m?.how) detailParts.push(m.how);
    if (sets) detailParts.push(`Sets: ${sets}`);
    if (reps) detailParts.push(`Reps: ${reps}`);
    if (walkMin) detailParts.push(`Min: ${walkMin}`);
    detailParts.push(xpRes.info || "");

    await window.IronQuestDB.add({
      date,
      exercise: exName,
      type,
      xp: xpRes.xp || 0,
      detail: detailParts.filter(Boolean).join(" • "),
    });

    await renderAll();
    showTab("log");
  });

  $("#btnClearAll")?.addEventListener("click", async () => {
    if (!confirm("Wirklich ALLE Einträge löschen?")) return;
    await window.IronQuestDB.clearEntries();
    await renderAll();
    showTab("log");
  });
}

function renderEntriesList(entries) {
  if (!entries.length) return `<div class="hint">Noch keine Einträge.</div>`;

  // Star badge per day (simple)
  const dayXp = computeDayXp(entries);

  return `
    <ul class="list">
      ${entries.slice(0, 40).map(e => {
        const dxp = dayXp[e.date] || 0;
        return `
          <li class="listRow">
            <div>
              <div><b>${e.exercise || e.type || "Eintrag"}</b></div>
              <div class="hint">${e.date || ""} • ${e.type || ""} • ${e.detail || ""}</div>
              <div class="hint">Tageswertung: ${starsForXp(dxp)} (${dxp} XP)</div>
            </div>
            <div class="badge">${e.xp || 0} XP</div>
          </li>
        `;
      }).join("")}
    </ul>
  `;
}

/* =========================
   Jogging (XP + Chart)
========================= */
async function renderJogging() {
  const root = document.getElementById("jogging");
  if (!root) return;

  const entries = await getEntries();
  const runs = entries.filter(e => e.type === "Jogging").slice(0, 60);

  root.innerHTML = `
    <div class="card">
      <h2>Joggen</h2>
      <p class="hint">Distance + Zeit → XP wird automatisch erzeugt und als Eintrag gespeichert.</p>

      <label>Datum</label>
      <input id="runDate" type="date" value="${isoDate()}" />

      <label>Distanz (km)</label>
      <input id="runDist" inputmode="decimal" placeholder="z.B. 5.0" />

      <label>Zeit (Minuten)</label>
      <input id="runTime" inputmode="numeric" placeholder="z.B. 30" />

      <div class="card soft" style="margin-top:12px;">
        <div><b>Preview XP:</b> <span id="runXpPrev">0</span></div>
        <div class="hint" id="runXpInfo">—</div>
      </div>

      <div class="row2" style="margin-top:12px;">
        <button id="btnRunSave" type="button">Speichern</button>
        <button id="btnRunClear" type="button" class="danger">Runs löschen</button>
      </div>
    </div>

    <div class="card">
      <h2>Entwicklung</h2>
      <canvas id="runChart" width="900" height="260" style="width:100%; height:auto; border-radius:14px;"></canvas>
      <p class="hint">Chart = Pace (min/km). Weniger ist besser.</p>
    </div>

    <div class="card">
      <h2>Letzte Runs</h2>
      ${runs.length ? `
        <ul class="list">
          ${runs.map(r => `<li class="listRow"><div>
            <div><b>${r.date}</b> • ${r.exercise}</div>
            <div class="hint">${r.detail || ""}</div>
          </div><div class="badge">${r.xp || 0} XP</div></li>`).join("")}
        </ul>
      ` : `<div class="hint">Noch keine Jogging-Einträge.</div>`}
    </div>
  `;

  const dEl = $("#runDate");
  const distEl = $("#runDist");
  const timeEl = $("#runTime");

  function preview() {
    const distKm = parseFloat((distEl.value || "").replace(",", ".")) || 0;
    const timeMin = parseFloat((timeEl.value || "").replace(",", ".")) || 0;

    const xpRes = window.XPSystem?.calcJogXP
      ? window.XPSystem.calcJogXP({ distKm, timeMin })
      : { xp: 0, info: "XPSystem.calcJogXP fehlt" };

    $("#runXpPrev").textContent = xpRes.xp || 0;
    $("#runXpInfo").textContent = xpRes.info || "—";
  }

  [distEl, timeEl].forEach(el => el?.addEventListener("input", preview));
  preview();

  $("#btnRunSave")?.addEventListener("click", async () => {
    const date = dEl.value || isoDate();
    const distKm = parseFloat((distEl.value || "").replace(",", ".")) || 0;
    const timeMin = parseFloat((timeEl.value || "").replace(",", ".")) || 0;
    if (distKm <= 0 || timeMin <= 0) return alert("Bitte Distanz und Zeit eingeben.");

    const xpRes = window.XPSystem?.calcJogXP
      ? window.XPSystem.calcJogXP({ distKm, timeMin })
      : { xp: 0, info: "XPSystem.calcJogXP fehlt" };

    const pace = distKm > 0 ? (timeMin / distKm) : 0;
    const entry = {
      date,
      exercise: `Joggen ${distKm.toFixed(2)} km`,
      type: "Jogging",
      xp: xpRes.xp || 0,
      detail: `Zeit: ${timeMin.toFixed(0)} min • Pace: ${pace.toFixed(2)} min/km • ${xpRes.info || ""}`
    };

    await window.IronQuestDB.add(entry);

    // zusätzlich runs-store (für spätere Charts/Export)
    try { await window.IronQuestDB.addRun({ date, distKm, timeMin, pace, xp: entry.xp }); } catch(e) {}

    await renderAll();
    showTab("jogging");
  });

  $("#btnRunClear")?.addEventListener("click", async () => {
    if (!confirm("Alle Run-Daten löschen? (Entries bleiben, wenn du sie im Log nicht löscht)")) return;
    try { await window.IronQuestDB.clearRuns(); } catch(e) {}
    alert("Runs gelöscht.");
  });

  drawRunChart(runs);
}

function drawRunChart(runs) {
  const c = document.getElementById("runChart");
  if (!c) return;
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, c.width, c.height);

  // parse pace from detail "Pace: X min/km"
  const pts = runs
    .slice()
    .reverse()
    .map((r) => {
      const m = String(r.detail || "").match(/Pace:\s*([\d.]+)\s*min\/km/i);
      return { date: r.date, pace: m ? parseFloat(m[1]) : null };
    })
    .filter(x => x.pace != null);

  if (pts.length < 2) {
    ctx.font = "22px system-ui";
    ctx.fillText("Noch nicht genug Daten für Chart.", 24, 60);
    return;
  }

  const pad = 30;
  const W = c.width - pad * 2;
  const H = c.height - pad * 2;

  const minP = Math.min(...pts.map(p => p.pace));
  const maxP = Math.max(...pts.map(p => p.pace));
  const range = Math.max(0.01, maxP - minP);

  ctx.globalAlpha = 0.25;
  ctx.fillRect(pad, pad + H, W, 2);
  ctx.globalAlpha = 1;

  ctx.beginPath();
  pts.forEach((p, i) => {
    const x = pad + (i / (pts.length - 1)) * W;
    const y = pad + H - ((p.pace - minP) / range) * H;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  });
  ctx.lineWidth = 3;
  ctx.stroke();

  pts.forEach((p, i) => {
    const x = pad + (i / (pts.length - 1)) * W;
    const y = pad + H - ((p.pace - minP) / range) * H;
    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.font = "18px system-ui";
  ctx.fillText(`Pace min/km: min ${minP.toFixed(2)} • max ${maxP.toFixed(2)}`, pad, 22);
}

/* =========================
   Other Tabs (minimal hook)
========================= */
async function renderSkills() {
  const root = document.getElementById("skills");
  if (!root) return;
  root.innerHTML = `<div class="card"><h2>Skilltree</h2><p class="hint">Wird über skilltree.js gerendert (falls aktiv).</p></div>`;
  try { window.Skilltree?.render?.(root); } catch {}
}

async function renderAnalytics() {
  const root = document.getElementById("analytics");
  if (!root) return;
  root.innerHTML = `<div class="card"><h2>Analytics</h2><p class="hint">Wird über analytics.js gerendert (falls aktiv).</p></div>`;
  try { window.Analytics?.render?.(root); } catch {}
}

async function renderHealth() {
  const root = document.getElementById("health");
  if (!root) return;
  root.innerHTML = `<div class="card"><h2>Health</h2><p class="hint">Wird über health.js gerendert (falls aktiv).</p></div>`;
  try { window.Health?.render?.(root); } catch {}
}

async function renderBoss() {
  const root = document.getElementById("boss");
  if (!root) return;
  root.innerHTML = `<div class="card"><h2>Boss</h2><p class="hint">Wird über boss.js gerendert (falls aktiv).</p></div>`;
  try { window.Boss?.render?.(root); } catch {}
}

async function renderChallenge() {
  const root = document.getElementById("challenge");
  if (!root) return;
  root.innerHTML = `<div class="card"><h2>Challenge</h2><p class="hint">Wird über challenges.js gerendert (falls aktiv).</p></div>`;
  try { window.Challenges?.render?.(root); } catch {}
}

async function renderBackup() {
  const root = document.getElementById("backup");
  if (!root) return;
  root.innerHTML = `<div class="card"><h2>Backup</h2><p class="hint">Wird über backup.js gerendert (falls aktiv).</p></div>`;
  try { window.Backup?.render?.(root); } catch {}
}

/* =========================
   Render All
========================= */
async function renderAll() {
  try {
    await renderDashboard();
    await renderLog();
    await renderJogging();
    await renderSkills();
    await renderAnalytics();
    await renderHealth();
    await renderBoss();
    await renderChallenge();
    await renderBackup();

    const entries = await getEntries();
    const totalXp = entries.reduce((s, e) => s + (e.xp || 0), 0);
    const today = isoDate();
    const todayXp = computeDayXp(entries)[today] || 0;

    const status = `OK • ${starsForXp(todayXp)} • Streak ${window.Streak?.get?.() ?? 0}`;
    const info = document.getElementById("playerInfo");
    if (info) info.textContent = status;
  } catch (e) {
    console.warn(e);
    const info = document.getElementById("playerInfo");
    if (info) info.textContent = "Anzeige Fehler in JS.";
  }
}

/* =========================
   Init
========================= */
function init() {
  setupNav();

  // Service Worker
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      // optional: reload on update
      // location.reload();
    });
  }

  renderAll();
}

init();
