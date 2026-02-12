import { loadJSON, saveJSON, fmt } from "./utils.js";

const KEY = "iq_challenges_v4";

const DEFAULT = {
  active: true,
  weeklyTargetXP: 7000,
  weeklyTrainingDays: 5,
  bonusMultiplier: 1.05, // Bonus XP Multiplier wenn Ziel erreicht (für die Woche)
};

export function loadChallenge() {
  return loadJSON(KEY, DEFAULT);
}
export function saveChallenge(st) {
  saveJSON(KEY, st);
}

export function challengeMultiplier(entries, currentWeek) {
  const st = loadChallenge();
  if (!st.active) return 1.0;

  let weekXP = 0;
  const days = new Set();

  for (const e of entries) {
    if (e.week !== currentWeek) continue;
    weekXP += (e.xp || 0);
    if ((e.type || "") !== "Rest" && (e.xp || 0) > 0) days.add(e.date);
  }

  const okXP = weekXP >= st.weeklyTargetXP;
  const okDays = days.size >= st.weeklyTrainingDays;

  return (okXP && okDays) ? st.bonusMultiplier : 1.0;
}

export function renderChallengePanel(container, entries, currentWeek) {
  const st = loadChallenge();
  let weekXP = 0;
  const days = new Set();
  for (const e of entries) {
    if (e.week !== currentWeek) continue;
    weekXP += (e.xp || 0);
    if ((e.type || "") !== "Rest" && (e.xp || 0) > 0) days.add(e.date);
  }

  const okXP = weekXP >= st.weeklyTargetXP;
  const okDays = days.size >= st.weeklyTrainingDays;

  container.innerHTML = `
    <div class="card">
      <h2>🏆 Challenge Mode</h2>
      <p class="hint">Erfüllst du beide Ziele, bekommst du diese Woche +${Math.round((st.bonusMultiplier-1)*100)}% XP Multiplier.</p>

      <div class="row2">
        <div class="pill"><b>Aktiv:</b> ${st.active ? "✅" : "—"}</div>
        <div class="pill"><b>Woche:</b> W${currentWeek}</div>
      </div>

      <div class="divider"></div>

      <div class="row2">
        <div class="pill"><b>Wochen-XP:</b> ${fmt(weekXP)} / ${fmt(st.weeklyTargetXP)} ${okXP ? "✅" : ""}</div>
        <div class="pill"><b>Trainingstage:</b> ${fmt(days.size)} / ${fmt(st.weeklyTrainingDays)} ${okDays ? "✅" : ""}</div>
      </div>

      <div class="divider"></div>

      <h3>Einstellungen</h3>
      <label>Weekly Target XP
        <input id="chXP" inputmode="numeric" value="${st.weeklyTargetXP}">
      </label>
      <label>Weekly Training Days
        <input id="chDays" inputmode="numeric" value="${st.weeklyTrainingDays}">
      </label>
      <label>Bonus Multiplier (z.B. 1.05)
        <input id="chMult" inputmode="decimal" value="${st.bonusMultiplier}">
      </label>

      <div class="row2">
        <button id="chSave">Speichern</button>
        <button id="chToggle" class="secondary">${st.active ? "Deaktivieren" : "Aktivieren"}</button>
      </div>
    </div>
  `;

  document.getElementById("chSave").onclick = () => {
    const next = loadChallenge();
    next.weeklyTargetXP = Number(document.getElementById("chXP").value || 0) || 0;
    next.weeklyTrainingDays = Number(document.getElementById("chDays").value || 0) || 0;
    next.bonusMultiplier = Number(document.getElementById("chMult").value || 1.0) || 1.0;
    saveChallenge(next);
    window.dispatchEvent(new Event("iq:refresh"));
  };

  document.getElementById("chToggle").onclick = () => {
    const next = loadChallenge();
    next.active = !next.active;
    saveChallenge(next);
    window.dispatchEvent(new Event("iq:refresh"));
  };
}
