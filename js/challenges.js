/* challenges.js – Challenge Mode (ES Module) */

import { loadJSON, saveJSON } from "./utils.js";

const KEY_CH = "iq_challenge_v4";

function getCh() {
  return loadJSON(KEY_CH, { enabled: false, mult: 1.15 });
}
function saveCh(ch) {
  saveJSON(KEY_CH, ch);
}

export function challengeMultiplier() {
  const ch = getCh();
  return ch.enabled ? (ch.mult || 1.15) : 1.0;
}

export function renderChallengePanel(container, player) {
  if (!container) return;

  const ch = getCh();
  container.innerHTML = `
    <div class="card">
      <h2>Challenge Mode</h2>
      <p class="hint">Wenn aktiv: XP-Multiplier auf alle Einträge.</p>

      <div class="row2">
        <div class="pill"><b>Status:</b> ${ch.enabled ? "✅ ON" : "OFF"}</div>
        <div class="pill"><b>Multiplier:</b> x${(ch.mult || 1.15).toFixed(2)}</div>
      </div>

      <label class="check" style="margin-top:12px;">
        <input id="chEnabled" type="checkbox" ${ch.enabled ? "checked":""}>
        Challenge aktivieren
      </label>

      <label>Multiplier (z.B. 1.10 – 1.30)
        <input id="chMult" type="number" step="0.01" value="${ch.mult || 1.15}">
      </label>

      <button id="chSave">Speichern</button>
    </div>
  `;

  container.querySelector("#chSave")?.addEventListener("click", () => {
    const enabled = !!container.querySelector("#chEnabled")?.checked;
    const mult = parseFloat(container.querySelector("#chMult")?.value || "1.15");
    saveCh({ enabled, mult: Number.isFinite(mult) ? mult : 1.15 });
    renderChallengePanel(container, player);
  });
}
