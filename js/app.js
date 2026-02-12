/* app.js – Main ES Module boot (iOS/Safari stable) */

import { $, $$, isoDate, htmlEscape } from "./utils.js";
import { entriesGetAll, entriesAdd, entriesDelete } from "./db.js";

import { EXERCISES, getExercise } from "./exercises.js";
import { calcEntryXP } from "./xpSystem.js";

import { ensureStartDate, setStartDate, computeWeekFromStart, clampWeek, getPlayerState } from "./progression.js";
import { renderSkilltreePanel, skillMultiplierForType } from "./skilltree.js";
import { renderAnalyticsPanel } from "./analytics.js";
import { renderHealthPanel } from "./health.js";
import { renderBossPanel } from "./boss.js";
import { renderChallengePanel, challengeMultiplier } from "./challenges.js";
import { renderBackupPanel } from "./backup.js";

function sortEntriesDesc(arr) {
  return (arr || []).slice().sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? 1 : -1;
    return (b.id || 0) - (a.id || 0);
  });
}

function setActiveTab(tabId) {
  $$("nav button").forEach(b => b.classList.toggle("active", b.dataset.tab === tabId));
  $$(".tab").forEach(s => s.classList.toggle("active", s.id === tabId));
}

function wireTabs() {
  $$("nav button").forEach(btn => {
    btn.addEventListener("click", () => {
      setActiveTab(btn.dataset.tab);
    });
  });
}

function renderPlayerInfo(player) {
  const el = $("#playerInfo");
  if (!el) return;
  el.innerHTML = `
    <div class="pill"><b>Level:</b> ${player.level} (${player.title})</div>
    <div class="pill"><b>Streak:</b> ${player.streak} 🔥</div>
    <div class="pill"><b>Woche:</b> W${player.week}</div>
    <div class="pill"><b>Heute:</b> ${player.todayXp} XP</div>
    <div class="pill"><b>Woche:</b> ${player.weekXp} XP</div>
    <div class="pill"><b>Gesamt:</b> ${player.totalXp} XP</div>
  `;
}

function renderDashboard(container, player) {
  const start = ensureStartDate();
  container.innerHTML = `
    <div class="card">
      <h2>Dashboard</h2>
      <p class="hint">Startdatum steuert die Wochenlogik.</p>

      <label>Startdatum
        <input id="startDate" type="date" value="${start}">
      </label>
      <button id="saveStart" class="secondary">Startdatum speichern</button>

      <div class="row2" style="margin-top:10px;">
        <div class="pill"><b>Heute XP:</b> ${player.todayXp}</div>
        <div class="pill"><b>Streak:</b> ${player.streak} 🔥</div>
      </div>
    </div>
  `;

  container.querySelector("#saveStart")?.addEventListener("click", async () => {
    const v = container.querySelector("#startDate").value;
    if (!v) return alert("Bitte Datum wählen.");
    setStartDate(v);
    await boot(); // re-render
  });
}

function renderLog(container, player, entries) {
  const today = isoDate(new Date());
  const start = ensureStartDate();

  const exOptions = EXERCISES.map(e => `<option value="${htmlEscape(e.name)}">${htmlEscape(e.name)}</option>`).join("");

  container.innerHTML = `
    <div class="card">
      <h2>Log</h2>

      <label>Datum
        <input id="logDate" type="date" value="${today}">
      </label>

      <label>Übung
        <select id="logExercise">${exOptions}</select>
      </label>

      <div class="row2">
        <label>Gewicht (kg) – optional
          <input id="logWeight" type="number" step="0.5" inputmode="decimal" placeholder="z.B. 24">
        </label>
        <label>Reps pro Satz
          <input id="logReps" type="number" step="1" inputmode="numeric" placeholder="z.B. 10">
        </label>
      </div>

      <label>Sätze
        <input id="logSets" type="number" step="1" inputmode="numeric" placeholder="z.B. 4">
      </label>

      <div class="row2">
        <div class="pill"><b>Week:</b> <span id="logWeek">—</span></div>
        <div class="pill"><b>XP Preview:</b> <span id="logXp">—</span></div>
      </div>

      <button id="logSave">Speichern</button>
    </div>

    <div class="card">
      <h2>Einträge</h2>
      <ul id="logList"></ul>
    </div>
  `;

  const dateEl = container.querySelector("#logDate");
  const exEl = container.querySelector("#logExercise");
  const setsEl = container.querySelector("#logSets");
  const repsEl = container.querySelector("#logReps");
  const wEl = container.querySelector("#logWeek");
  const xpEl = container.querySelector("#logXp");

  function updatePreview() {
    const date = dateEl.value || today;
    const week = clampWeek(computeWeekFromStart(start, date));
    wEl.textContent = `W${week}`;

    const ex = getExercise(exEl.value);
    const sets = parseInt(setsEl.value || "0", 10) || 0;
    const reps = parseInt(repsEl.value || "0", 10) || 0;

    const baseXP = calcEntryXP({ exercise: ex, sets, reps });
    const skillMult = skillMultiplierForType(ex.type);
    const challMult = challengeMultiplier();

    const xp = Math.round(baseXP * skillMult * challMult);
    xpEl.textContent = `${xp} XP (base ${baseXP} • skill x${skillMult.toFixed(2)} • ch x${challMult.toFixed(2)})`;
  }

  [dateEl, exEl, setsEl, repsEl].forEach(el => {
    el?.addEventListener("input", updatePreview);
    el?.addEventListener("change", updatePreview);
  });
  updatePreview();

  container.querySelector("#logSave")?.addEventListener("click", async () => {
    const date = dateEl.value || today;
    const week = clampWeek(computeWeekFromStart(ensureStartDate(), date));
    const ex = getExercise(exEl.value);

    const sets = parseInt(setsEl.value || "0", 10) || 0;
    const reps = parseInt(repsEl.value || "0", 10) || 0;
    const weight = parseFloat(container.querySelector("#logWeight").value);

    const baseXP = calcEntryXP({ exercise: ex, sets, reps });
    const skillMult = skillMultiplierForType(ex.type);
    const challMult = challengeMultiplier();

    const xp = Math.round(baseXP * skillMult * challMult);

    const detail = [
      `Type: ${ex.type}`,
      `Empf: ${ex.recommended?.sets ?? "—"} Sätze • ${ex.recommended?.reps ?? "—"} Reps`,
      `Ist: ${sets}×${reps}${Number.isFinite(weight) ? ` @ ${weight}kg` : ""}`,
      `Skill x${skillMult.toFixed(2)}`,
      `Challenge x${challMult.toFixed(2)}`
    ].join(" • ");

    await entriesAdd({
      date,
      week,
      exercise: ex.name,
      type: ex.type,
      sets,
      reps,
      weight: Number.isFinite(weight) ? weight : null,
      xp,
      detail
    });

    await boot();
    alert(`Gespeichert: +${xp} XP ✅`);
  });

  // render list
  const ul = container.querySelector("#logList");
  const sorted = sortEntriesDesc(entries);
  ul.innerHTML = sorted.length ? "" : "<li>—</li>";

  sorted.slice(0, 60).forEach(e => {
    const li = document.createElement("li");
    li.innerHTML = `
      <div class="entryRow">
        <div style="min-width:0;">
          <div class="entryTitle"><b>${e.date}</b> • W${e.week} • ${htmlEscape(e.exercise)}</div>
          <div class="hint">${htmlEscape(e.detail || "")}</div>
        </div>
        <div class="row" style="margin:0;">
          <span class="badge">${e.xp} XP</span>
          <button class="danger" data-del="${e.id}">Del</button>
        </div>
      </div>
    `;
    ul.appendChild(li);
  });

  ul.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = parseInt(btn.getAttribute("data-del"), 10);
      if (!confirm("Eintrag löschen?")) return;
      await entriesDelete(id);
      await boot();
    });
  });
}

async function boot() {
  const entries = await entriesGetAll();
  const player = getPlayerState(entries);

  renderPlayerInfo(player);

  // Panels
  renderDashboard($("#dashboard"), player);
  renderLog($("#log"), player, entries);

  renderSkilltreePanel($("#skills"), player, entries);
  renderAnalyticsPanel($("#analytics"), player, entries);
  renderHealthPanel($("#health"));

  // Boss clears add XP entry
  renderBossPanel($("#boss"), player, entries, async (boss) => {
    await entriesAdd({
      date: isoDate(new Date()),
      week: player.week,
      exercise: `Boss Cleared: ${boss.name}`,
      type: "Boss",
      xp: boss.xp,
      detail: `Boss Week ${boss.week}`
    });
  });

  renderChallengePanel($("#challenge"), player);
  renderBackupPanel($("#backup"));

  // Ensure first tab is active
  setActiveTab("dashboard");
}

function init() {
  wireTabs();
  boot().catch((e) => {
    console.error(e);
    const el = $("#playerInfo");
    if (el) el.textContent = "JS Fehler (Details in Konsole).";
  });

  // SW (optional)
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch(console.warn);
  }
}

init();
