/* =========================
   IRON QUEST – health.js (Classic)
   Blood Pressure + Pulse + optional Weight
   Exposes: window.IronQuestHealth.render(state)
========================= */

(function () {
  const KEY = "ironquest_health_v1";

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; }
    catch { return []; }
  }
  function save(rows) {
    localStorage.setItem(KEY, JSON.stringify(rows));
  }

  function todayISO() {
    return new Date().toISOString().slice(0, 10);
  }

  function render(_state) {
    const sec = document.getElementById("health");
    if (!sec) return;

    const rows = load().sort((a, b) => (a.date < b.date ? 1 : -1));

    sec.innerHTML = `
      <h2>🫀 Health</h2>
      <p class="hint">Tracke Blutdruck + Puls (und optional Gewicht). Alles lokal (Offline).</p>

      <div class="card">
        <h3>Neuer Eintrag</h3>

        <label>Datum
          <input id="hDate" type="date" value="${todayISO()}">
        </label>

        <div class="grid2">
          <label>Systolisch (mmHg)
            <input id="hSys" type="number" inputmode="numeric" placeholder="z. B. 125">
          </label>
          <label>Diastolisch (mmHg)
            <input id="hDia" type="number" inputmode="numeric" placeholder="z. B. 80">
          </label>
        </div>

        <div class="grid2">
          <label>Puls (bpm)
            <input id="hPulse" type="number" inputmode="numeric" placeholder="z. B. 62">
          </label>
          <label>Gewicht (kg, optional)
            <input id="hWeight" type="number" step="0.1" inputmode="decimal" placeholder="z. B. 84.6">
          </label>
        </div>

        <button id="hSave">Speichern</button>
      </div>

      <div class="card">
        <h3>Verlauf</h3>
        <ul id="hList" class="list"></ul>
        <button id="hClear" class="danger">Alle Health-Daten löschen</button>
      </div>
    `;

    const ul = document.getElementById("hList");
    if (ul) {
      ul.innerHTML = rows.length ? "" : "<li>Noch keine Daten.</li>";
      rows.slice(0, 60).forEach((r) => {
        const li = document.createElement("li");
        li.textContent =
          `${r.date}: ${r.sys}/${r.dia} mmHg • Puls ${r.pulse} bpm` +
          (r.weight ? ` • ${r.weight} kg` : "");
        ul.appendChild(li);
      });
    }

    document.getElementById("hSave")?.addEventListener("click", () => {
      const date = document.getElementById("hDate").value || todayISO();
      const sys = Number(document.getElementById("hSys").value || 0);
      const dia = Number(document.getElementById("hDia").value || 0);
      const pulse = Number(document.getElementById("hPulse").value || 0);
      const weightRaw = document.getElementById("hWeight").value;
      const weight = weightRaw ? Number(weightRaw) : null;

      if (!sys || !dia || !pulse) {
        alert("Bitte Systolisch, Diastolisch und Puls eintragen.");
        return;
      }

      const data = load();
      data.push({ date, sys, dia, pulse, weight });
      save(data);
      render({});
      alert("Health gespeichert ✅");
    });

    document.getElementById("hClear")?.addEventListener("click", () => {
      if (confirm("Health Verlauf wirklich löschen?")) {
        localStorage.removeItem(KEY);
        render({});
      }
    });
  }

  window.IronQuestHealth = { render };
})();
