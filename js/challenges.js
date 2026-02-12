// js/challenges.js (ES Module)
import { isoDate } from "./utils.js";

const KEY = "iq_challenge_v1";

// simple daily challenge: enabled => +10% XP
function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || { enabled:false, since:null }; }
  catch { return { enabled:false, since:null }; }
}
function save(s) { localStorage.setItem(KEY, JSON.stringify(s)); }

export function challengeMultiplier(_dateISO) {
  const s = load();
  return s.enabled ? 1.10 : 1.00;
}

export function renderChallengePanel(container) {
  if (!container) return;
  const s = load();
  container.innerHTML = `
    <div class="card">
      <h2>Challenge Mode</h2>
      <p class="hint">Wenn aktiv: <b>+10% XP</b> auf alle Einträge.</p>

      <div class="row2">
        <div class="pill"><b>Status:</b> ${s.enabled ? "✅ Aktiv" : "— Inaktiv"}</div>
        <div class="pill"><b>Seit:</b> ${s.since || "—"}</div>
      </div>

      <div class="row2">
        <button id="chToggle">${s.enabled ? "Challenge deaktivieren" : "Challenge aktivieren"}</button>
        <button id="chReset" class="secondary">Reset</button>
      </div>

      <div class="divider"></div>
      <p class="hint">Nice: Kombiniere Challenge + Streak + PR-System für maximale Motivation.</p>
    </div>
  `;

  container.querySelector("#chToggle").onclick = () => {
    const next = load();
    next.enabled = !next.enabled;
    next.since = next.enabled ? isoDate(new Date()) : null;
    save(next);
    renderChallengePanel(container);
  };

  container.querySelector("#chReset").onclick = () => {
    if (!confirm("Challenge Reset?")) return;
    localStorage.removeItem(KEY);
    renderChallengePanel(container);
  };
}
