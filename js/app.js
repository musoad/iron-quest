// js/app.js (ES Module)
import { isoDate } from "./utils.js";
import { entriesGetAll, entriesAdd } from "./db.js";
import { EXERCISES, getExercise } from "./exercises.js";
import { calcEntryXP } from "./xpSystem.js";
import { getPlayerState, computeWeekFromStart, ensureStartDate } from "./progression.js";
import { renderSkilltreePanel, skillMultiplierForType } from "./skilltree.js";
import { renderAnalyticsPanel } from "./analytics.js";
import { renderHealthPanel } from "./health.js";
import { renderBossPanel } from "./boss.js";
import { renderChallengePanel, challengeMultiplier } from "./challenges.js";
import { renderBackupPanel } from "./backup.js";

function $(id){ return document.getElementById(id); }

function setActiveTab(tabId) {
  document.querySelectorAll("nav button[data-tab]").forEach(b => {
    b.classList.toggle("active", b.getAttribute("data-tab") === tabId);
  });
  document.querySelectorAll("main section.tab").forEach(s => {
    s.classList.toggle("active", s.id === tabId);
  });
  location.hash = tabId;
}

function bindTabs() {
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("nav button[data-tab]");
    if (!btn) return;
    e.preventDefault();
    setActiveTab(btn.getAttribute("data-tab"));
  });

  const initial = (location.hash || "#dashboard").replace("#","");
  setActiveTab(initial);
}

function sortEntriesDesc(entries){
  return [...entries].sort((a,b)=>{
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return (b.id||0)-(a.id||0);
  });
}

function renderDashboard(container, entries, curWeek, player) {
  if (!container) return;

  const today = isoDate(new Date());
  const todayXp = entries.filter(e=>e.date===today).reduce((s,e)=>s+(e.xp||0),0);
  const weekXp  = entries.filter(e=>Number(e.week)===Number(curWeek)).reduce((s,e)=>s+(e.xp||0),0);

  container.innerHTML = `
    <div class="card">
      <h2>Dashboard</h2>
      <div class="row2">
        <div class="pill"><b>Woche:</b> W${curWeek}</div>
        <div class="pill"><b>Heute XP:</b> ${todayXp}</div>
      </div>
      <div class="row2">
        <div class="pill"><b>Woche XP:</b> ${weekXp}</div>
        <div class="pill"><b>Einträge:</b> ${entries.length}</div>
      </div>
      <div class="divider"></div>
      <div class="hint">Nutze Log → Eintrag speichern. Analytics zeigt Trends.</div>
    </div>
  `;
}

function renderLog(container, entries, curWeek) {
  if (!container) return;

  const exOptions = EXERCISES.map(ex => `<option value="${ex.name}">${ex.name}</option>`).join("");

  container.innerHTML = `
    <div class="card">
      <h2>Log</h2>

      <div class="row2">
        <label>Datum
          <input id="logDate" type="date" value="${isoDate(new Date())}">
        </label>

        <label>Übung
          <select id="logExercise">${exOptions}</select>
        </label>
      </div>

      <div class="row2">
        <label>Sätze
          <input id="logSets" type="number" min="0" step="1" inputmode="numeric" placeholder="z.B. 4">
        </label>
        <label>Reps pro Satz
          <input id="logReps" type="number" min="0" step="1" inputmode="numeric" placeholder="z.B. 10">
        </label>
      </div>

      <div class="row2">
        <label>Walking Minuten (NEAT)
          <input id="logMin" type="number" min="0" step="1" inputmode="numeric" placeholder="z.B. 60">
        </label>
        <div class="pill"><b>Preview XP:</b> <span id="logXP">—</span></div>
      </div>

      <div class="row2">
        <button id="logSave">Eintrag speichern</button>
        <button id="logClearPreview" class="secondary">Reset</button>
      </div>

      <div class="divider"></div>

      <h3>Letzte 15 Einträge</h3>
      <ul id="logList"></ul>
    </div>
  `;

  const exSel = container.querySelector("#logExercise");
  const dateEl = container.querySelector("#logDate");
  const setsEl = container.querySelector("#logSets");
  const repsEl = container.querySelector("#logReps");
  const minEl  = container.querySelector("#logMin");
  const xpEl   = container.querySelector("#logXP");

  function computePreview(){
    const dateISO = dateEl.value || isoDate(new Date());
    const w = computeWeekFromStart(ensureStartDate(), dateISO);
    const exName = exSel.value;

    const ex = getExercise(exName);
    const type = ex?.type || "Other";

    const mult = {
      skill: skillMultiplierForType(type),
      challenge: challengeMultiplier(dateISO),
    };

    const minutes = Number(minEl.value || 0) || 0;

    const xp = calcEntryXP({ exerciseName: exName, minutes }, mult);
    xpEl.textContent = `${xp} XP (W${w})`;
    return { xp, w, dateISO, exName, type };
  }

  ["change","input"].forEach(ev=>{
    [exSel, dateEl, setsEl, repsEl, minEl].forEach(el=> el.addEventListener(ev, computePreview));
  });

  computePreview();

  container.querySelector("#logSave").onclick = async () => {
    const { xp, w, dateISO, exName, type } = computePreview();
    const sets = Number(setsEl.value || 0) || null;
    const reps = Number(repsEl.value || 0) || null;
    const minutes = Number(minEl.value || 0) || null;

    const ex = getExercise(exName);
    const rec = ex?.recommended || null;

    const detailParts = [];
    if (rec?.sets) detailParts.push(`Empf Sets: ${rec.sets}`);
    if (rec?.reps) detailParts.push(`Empf Reps: ${rec.reps}`);
    if (sets != null) detailParts.push(`Ist Sets: ${sets}`);
    if (reps != null) detailParts.push(`Ist Reps: ${reps}`);
    if (minutes != null && minutes > 0) detailParts.push(`Min: ${minutes}`);
    if (ex?.desc) detailParts.push(ex.desc);

    await entriesAdd({
      date: dateISO,
      week: w,
      exercise: exName,
      type,
      detail: detailParts.join(" • "),
      xp
    });

    await boot(); // rerender alles
    alert(`Gespeichert: +${xp} XP ✅`);
  };

  container.querySelector("#logClearPreview").onclick = () => {
    setsEl.value = "";
    repsEl.value = "";
    minEl.value = "";
    computePreview();
  };

  const ul = container.querySelector("#logList");
  const recent = sortEntriesDesc(entries).slice(0,15);
  ul.innerHTML = recent.length ? "" : "<li>—</li>";
  recent.forEach(e=>{
    const li = document.createElement("li");
    li.innerHTML = `<div class="entryRow"><div style="min-width:0;"><b>${e.date}</b> • ${e.exercise}<div class="hint">${e.type} • ${e.detail||""}</div></div><span class="badge">${e.xp} XP</span></div>`;
    ul.appendChild(li);
  });
}

async function boot(){
  const player = getPlayerState(await entriesGetAll());
  const start = ensureStartDate();
  const today = isoDate(new Date());
  const curWeek = computeWeekFromStart(start, today);

  const entries = await entriesGetAll();

  // Header info
  $("playerInfo").textContent = `W${curWeek} • Total XP: ${player.totalXp} • Level: ${player.level}`;

  // Panels
  renderDashboard($("dashboard"), entries, curWeek, player);
  renderLog($("log"), entries, curWeek);
  renderSkilltreePanel($("skills"), entries, curWeek);
  renderAnalyticsPanel($("analytics"), entries, curWeek);
  renderHealthPanel($("health"));
  renderBossPanel($("boss"), entries, curWeek);
  renderChallengePanel($("challenge"), entries, curWeek);
  renderBackupPanel($("backup"));
}

// Service Worker update trigger (iOS Homescreen braucht oft “manual” kick)
function setupSWUpdateButton(){
  const btn = $("btnUpdate");
  if (!btn) return;

  btn.onclick = async () => {
    if (!("serviceWorker" in navigator)) return alert("Kein Service Worker verfügbar.");
    const reg = await navigator.serviceWorker.getRegistration();
    if (!reg) return alert("SW nicht registriert.");

    await reg.update();
    if (reg.waiting) {
      reg.waiting.postMessage({ type: "SKIP_WAITING" });
      alert("Update angewendet ✅ App neu öffnen (komplett schließen).");
    } else {
      alert("Kein Update gefunden. (Oder schon aktuell)");
    }
  };
}

async function init(){
  bindTabs();
  setupSWUpdateButton();

  // SW register
  if ("serviceWorker" in navigator) {
    try {
      const reg = await navigator.serviceWorker.register("./sw.js");
      reg.addEventListener("updatefound", () => {
        // optional: could show badge
      });
    } catch (e) {
      console.warn("SW register failed", e);
    }
  }

  await boot();
}

init();
