/* health.js – Health tracking (Weight, BP, Pulse) ES Module */

import { isoDate, loadJSON, saveJSON } from "./utils.js";

const KEY_HEALTH = "iq_health_v4";

function getHealth() {
  return loadJSON(KEY_HEALTH, { logs: [] });
}
function saveHealth(h) {
  saveJSON(KEY_HEALTH, h);
}

export function renderHealthPanel(container) {
  if (!container) return;

  const h = getHealth();
  const logs = (h.logs || []).slice().sort((a, b) => (a.date < b.date ? 1 : -1));

  container.innerHTML = `
    <div class="card">
      <h2>Health</h2>
      <p class="hint">Gewicht, Blutdruck & Puls. (Alles lokal gespeichert)</p>

      <label>Datum
        <input id="hDate" type="date" value="${isoDate(new Date())}">
      </label>

      <div class="row2">
        <label>Gewicht (kg)
          <input id="hWeight" type="number" step="0.1" inputmode="decimal" placeholder="z.B. 82.4">
        </label>
        <label>Puls (bpm)
          <input id="hPulse" type="number" step="1" inputmode="numeric" placeholder="z.B. 62">
        </label>
      </div>

      <div class="row2">
        <label>Blutdruck SYS
          <input id="hSys" type="number" step="1" inputmode="numeric" placeholder="z.B. 120">
        </label>
        <label>Blutdruck DIA
          <input id="hDia" type="number" step="1" inputmode="numeric" placeholder="z.B. 80">
        </label>
      </div>

      <button id="hSave">Speichern</button>
    </div>

    <div class="card">
      <h2>Verlauf</h2>
      <ul id="hList"></ul>
      <button class="danger" id="hClear">Alle Health-Einträge löschen</button>
    </div>
  `;

  const ul = container.querySelector("#hList");
  ul.innerHTML = logs.length ? "" : "<li>—</li>";

  logs.forEach((x) => {
    const li = document.createElement("li");
    li.innerHTML = `
      <div class="entryRow">
        <div style="min-width:0;">
          <div class="entryTitle"><b>${x.date}</b></div>
          <div class="hint">Gewicht: ${x.weight ?? "—"} kg • Puls: ${x.pulse ?? "—"} bpm • BP: ${x.sys ?? "—"}/${x.dia ?? "—"}</div>
        </div>
      </div>
    `;
    ul.appendChild(li);
  });

  container.querySelector("#hSave")?.addEventListener("click", () => {
    const date = container.querySelector("#hDate").value || isoDate(new Date());
    const weight = parseFloat(container.querySelector("#hWeight").value);
    const pulse = parseInt(container.querySelector("#hPulse").value, 10);
    const sys = parseInt(container.querySelector("#hSys").value, 10);
    const dia = parseInt(container.querySelector("#hDia").value, 10);

    const entry = {
      date,
      weight: Number.isFinite(weight) ? weight : null,
      pulse: Number.isFinite(pulse) ? pulse : null,
      sys: Number.isFinite(sys) ? sys : null,
      dia: Number.isFinite(dia) ? dia : null
    };

    const h2 = getHealth();
    h2.logs ??= [];
    h2.logs.push(entry);
    saveHealth(h2);
    renderHealthPanel(container);
  });

  container.querySelector("#hClear")?.addEventListener("click", () => {
    if (!confirm("Wirklich alle Health-Einträge löschen?")) return;
    saveHealth({ logs: [] });
    renderHealthPanel(container);
  });
}
