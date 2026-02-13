// js/health.js ✅

(function () {
  const KEY = "ironquest_health_v1";
  const { isoDate } = window.IronQuestProgression;

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
  }
  function save(m) { localStorage.setItem(KEY, JSON.stringify(m)); }

  function recompositionIndex(weight, waist) {
    // simpel & motivierend: niedriger = besser
    const w = Number(weight || 0);
    const wa = Number(waist || 0);
    if (w <= 0 || wa <= 0) return null;
    return (wa / w) * 100;
  }

  function render(container) {
    const today = isoDate(new Date());
    const map = load();
    const d = map[today] || { weight: "", waist: "", sys: "", dia: "", pulse: "" };

    container.innerHTML = `
      <div class="card">
        <h2>🫀 Health</h2>
        <p class="hint">Tageswerte speichern. Recomposition Index = (Waist/Weight)*100.</p>

        <div class="row2">
          <label>Datum
            <input id="hDate" type="date" value="${today}">
          </label>
          <div class="pill"><b>Recomp Index:</b> <span id="hRI">—</span></div>
        </div>

        <div class="row2">
          <label>Gewicht (kg)
            <input id="hWeight" inputmode="decimal" value="${d.weight}">
          </label>
          <label>Taille (cm)
            <input id="hWaist" inputmode="decimal" value="${d.waist}">
          </label>
        </div>

        <div class="row2">
          <label>Blutdruck SYS
            <input id="hSys" inputmode="numeric" value="${d.sys}">
          </label>
          <label>Blutdruck DIA
            <input id="hDia" inputmode="numeric" value="${d.dia}">
          </label>
        </div>

        <div class="row2">
          <label>Puls (bpm)
            <input id="hPulse" inputmode="numeric" value="${d.pulse}">
          </label>
          <button id="hSave" type="button">Speichern</button>
        </div>

        <div class="divider"></div>
        <h3>Letzte 7 Tage</h3>
        <ul class="list" id="hList"></ul>
      </div>
    `;

    const riEl = container.querySelector("#hRI");
    function updateRI() {
      const w = container.querySelector("#hWeight").value;
      const wa = container.querySelector("#hWaist").value;
      const ri = recompositionIndex(w, wa);
      riEl.textContent = ri == null ? "—" : ri.toFixed(2);
    }
    updateRI();

    ["hWeight", "hWaist"].forEach(id => container.querySelector("#" + id).addEventListener("input", updateRI));

    container.querySelector("#hSave").addEventListener("click", () => {
      const date = container.querySelector("#hDate").value || today;
      const m = load();
      m[date] = {
        weight: container.querySelector("#hWeight").value || "",
        waist: container.querySelector("#hWaist").value || "",
        sys: container.querySelector("#hSys").value || "",
        dia: container.querySelector("#hDia").value || "",
        pulse: container.querySelector("#hPulse").value || ""
      };
      save(m);
      alert("Health gespeichert ✅");
      render(container);
    });

    // list last 7 days
    const list = container.querySelector("#hList");
    list.innerHTML = "";
    for (let i = 0; i < 7; i++) {
      const dt = new Date(today);
      dt.setDate(dt.getDate() - i);
      const di = isoDate(dt);
      const x = map[di];
      const li = document.createElement("li");
      if (!x) {
        li.textContent = `${di}: —`;
      } else {
        const ri = recompositionIndex(x.weight, x.waist);
        li.innerHTML = `<div class="entryRow"><div style="min-width:0;">
          <b>${di}</b> • ${x.weight || "—"} kg • ${x.waist || "—"} cm • BP ${x.sys || "—"}/${x.dia || "—"} • Puls ${x.pulse || "—"}
          <div class="hint">RI: ${ri == null ? "—" : ri.toFixed(2)}</div>
        </div></div>`;
      }
      list.appendChild(li);
    }
  }

  window.IronQuestHealth = { render };
})();
