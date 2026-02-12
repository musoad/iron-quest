/* health.js – CLASSIC SCRIPT
   Exposes: window.IronQuestHealth
*/

(function () {
  const KEY = "iq_health_v4";

  function load() {
    return (window.IQ?.loadJSON?.(KEY, [])) || [];
  }

  function save(rows) {
    window.IQ?.saveJSON?.(KEY, rows);
  }

  function renderHealthPanel(targetSelector) {
    const root = document.querySelector(targetSelector);
    if (!root) return;

    const rows = load();

    root.innerHTML = `
      <div class="card">
        <h2>Health Tracking</h2>
        <p class="hint">Blutdruck + Puls + Gewicht (optional). Alles lokal gespeichert.</p>

        <div class="row2">
          <label>Datum <input id="hDate" type="date"></label>
          <label>Puls (bpm) <input id="hHr" type="number" inputmode="numeric" placeholder="z.B. 62"></label>
        </div>

        <div class="row2">
          <label>Systole <input id="hSys" type="number" inputmode="numeric" placeholder="z.B. 120"></label>
          <label>Diastole <input id="hDia" type="number" inputmode="numeric" placeholder="z.B. 75"></label>
        </div>

        <div class="row2">
          <label>Gewicht (kg) <input id="hW" type="number" step="0.1" inputmode="decimal" placeholder="z.B. 84.5"></label>
          <button id="hSave">Speichern</button>
        </div>

        <div class="divider"></div>

        <h3>Letzte Werte</h3>
        <ul id="hList"></ul>
        <button id="hClear" class="secondary">Alles löschen</button>
      </div>
    `;

    const today = window.IQ?.isoDate?.(new Date()) || new Date().toISOString().slice(0, 10);
    root.querySelector("#hDate").value = today;

    function renderList() {
      const ul = root.querySelector("#hList");
      const data = load().slice().sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 20);
      ul.innerHTML = data.length ? "" : "<li>—</li>";
      data.forEach((r) => {
        const li = document.createElement("li");
        li.textContent = `${r.date} • Puls ${r.hr ?? "—"} bpm • BP ${r.sys ?? "—"}/${r.dia ?? "—"} • Gewicht ${r.w ?? "—"} kg`;
        ul.appendChild(li);
      });
    }

    root.querySelector("#hSave").onclick = () => {
      const date = root.querySelector("#hDate").value;
      const hr = parseInt(root.querySelector("#hHr").value || "", 10);
      const sys = parseInt(root.querySelector("#hSys").value || "", 10);
      const dia = parseInt(root.querySelector("#hDia").value || "", 10);
      const w = parseFloat(root.querySelector("#hW").value || "");

      const row = {
        date,
        hr: Number.isFinite(hr) ? hr : null,
        sys: Number.isFinite(sys) ? sys : null,
        dia: Number.isFinite(dia) ? dia : null,
        w: Number.isFinite(w) ? w : null,
      };

      const all = load();
      all.push(row);
      save(all);
      renderList();
      alert("Health gespeichert ✅");
    };

    root.querySelector("#hClear").onclick = () => {
      if (!confirm("Health Daten wirklich löschen?")) return;
      save([]);
      renderList();
    };

    renderList();
  }

  window.IronQuestHealth = { renderHealthPanel };
})();
