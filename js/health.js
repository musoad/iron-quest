// js/health.js (ES Module)
import { isoDate } from "./utils.js";

const KEY = "iq_health_v1";

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)) || []; }
  catch { return []; }
}
function save(rows) {
  localStorage.setItem(KEY, JSON.stringify(rows));
}

function recompositionIndex(weightKg, bodyfatPct) {
  const w = Number(weightKg || 0);
  const bf = Number(bodyfatPct || 0);
  if (w <= 0 || bf <= 0 || bf >= 80) return null;
  const lean = w * (1 - bf/100);
  return Math.round(lean * 10) / 10; // Lean Mass (kg) als einfacher Recomp-Index
}

export function renderHealthPanel(container) {
  if (!container) return;

  const rows = load().sort((a,b)=> (a.date < b.date ? 1 : -1));
  const today = isoDate(new Date());

  container.innerHTML = `
    <div class="card">
      <h2>Health</h2>
      <p class="hint">Gewicht, KFA, Blutdruck & Puls – plus Recomp Index (Lean Mass)</p>

      <div class="row2">
        <label>Datum
          <input id="hDate" type="date" value="${today}">
        </label>
        <label>Gewicht (kg)
          <input id="hW" type="number" step="0.1" inputmode="decimal" placeholder="z.B. 85.2">
        </label>
      </div>

      <div class="row2">
        <label>KFA (%)
          <input id="hBF" type="number" step="0.1" inputmode="decimal" placeholder="z.B. 18.5">
        </label>
        <label>Puls (bpm)
          <input id="hPulse" type="number" step="1" inputmode="numeric" placeholder="z.B. 58">
        </label>
      </div>

      <div class="row2">
        <label>Blutdruck SYS
          <input id="hSys" type="number" step="1" inputmode="numeric" placeholder="z.B. 125">
        </label>
        <label>Blutdruck DIA
          <input id="hDia" type="number" step="1" inputmode="numeric" placeholder="z.B. 80">
        </label>
      </div>

      <div class="row2">
        <button id="hSave">Speichern</button>
        <button id="hClear" class="secondary">Alle Health-Daten löschen</button>
      </div>

      <div class="divider"></div>

      <div class="pill"><b>Letzter Recomp Index (Lean Mass):</b> <span id="hRecomp">—</span></div>

      <div class="divider"></div>
      <h3>Historie</h3>
      <ul id="hList"></ul>
    </div>
  `;

  const list = container.querySelector("#hList");
  list.innerHTML = rows.length ? "" : "<li>—</li>";

  let lastRecomp = null;

  rows.forEach(r => {
    const rec = recompositionIndex(r.weight, r.bodyfat);
    if (lastRecomp == null && rec != null) lastRecomp = rec;

    const li = document.createElement("li");
    li.innerHTML = `
      <div class="entryRow">
        <div style="min-width:0;">
          <div><b>${r.date}</b> • ${r.weight ?? "—"} kg • ${r.bodyfat ?? "—"}% KFA</div>
          <div class="hint">Recomp(Lean): <b>${rec ?? "—"}</b> kg • BP: ${r.sys ?? "—"}/${r.dia ?? "—"} • Puls: ${r.pulse ?? "—"}</div>
        </div>
      </div>
    `;
    list.appendChild(li);
  });

  container.querySelector("#hRecomp").textContent = lastRecomp == null ? "—" : `${lastRecomp} kg`;

  container.querySelector("#hSave").onclick = () => {
    const date = container.querySelector("#hDate").value || today;
    const weight = Number(container.querySelector("#hW").value || 0) || null;
    const bodyfat = Number(container.querySelector("#hBF").value || 0) || null;
    const pulse = Number(container.querySelector("#hPulse").value || 0) || null;
    const sys = Number(container.querySelector("#hSys").value || 0) || null;
    const dia = Number(container.querySelector("#hDia").value || 0) || null;

    const all = load();
    const idx = all.findIndex(x => x.date === date);
    const row = { date, weight, bodyfat, sys, dia, pulse };

    if (idx >= 0) all[idx] = row;
    else all.push(row);

    save(all);
    renderHealthPanel(container);
  };

  container.querySelector("#hClear").onclick = () => {
    if (!confirm("Health-Daten wirklich löschen?")) return;
    localStorage.removeItem(KEY);
    renderHealthPanel(container);
  };
}
