(() => {
  "use strict";

  const { isoDate } = window.Utils;

  function recompositionIndex(weightKg, waistCm, hipCm){
    const w = Math.max(1, Number(weightKg||0));
    const waist = Math.max(1, Number(waistCm||0));
    const hip = Math.max(0, Number(hipCm||0));
    const whr = hip > 0 ? (waist/hip) : null;
    const wi = w / waist;
    return { wi: Number(wi.toFixed(3)), whr: whr ? Number(whr.toFixed(3)) : null };
  }

  async function renderHealth(el){
    const rows = await window.DB.getAll("health");
    rows.sort((a,b)=> (a.date<b.date ? 1 : -1));

    el.innerHTML = `
      <div class="card">
        <h2>Health</h2>
        <p class="hint">Blutdruck + Puls + Körperdaten. (Alles bleibt lokal in IndexedDB.)</p>

        <div class="card">
          <h2>Neuer Eintrag</h2>
          <label>Datum</label>
          <input id="hDate" type="date" value="${isoDate(new Date())}">

          <div class="row2">
            <div>
              <label>Blutdruck SYS</label>
              <input id="hSys" type="number" inputmode="numeric" placeholder="z. B. 120">
            </div>
            <div>
              <label>Blutdruck DIA</label>
              <input id="hDia" type="number" inputmode="numeric" placeholder="z. B. 80">
            </div>
          </div>

          <label>Puls (bpm)</label>
          <input id="hPulse" type="number" inputmode="numeric" placeholder="z. B. 60">

          <div class="row2">
            <div>
              <label>Gewicht (kg)</label>
              <input id="hWeight" type="number" step="0.1" placeholder="z. B. 83.5">
            </div>
            <div>
              <label>Taille (cm)</label>
              <input id="hWaist" type="number" step="0.1" placeholder="z. B. 88">
            </div>
          </div>

          <label>Hüfte (cm) optional</label>
          <input id="hHip" type="number" step="0.1" placeholder="z. B. 100">

          <button class="primary" id="hSave">Speichern</button>
        </div>

        <div class="card">
          <h2>Historie</h2>
          <ul class="list" id="hList"></ul>
        </div>
      </div>
    `;

    el.querySelector("#hSave").addEventListener("click", async ()=>{
      const date = el.querySelector("#hDate").value || isoDate(new Date());
      const sys = Number(el.querySelector("#hSys").value || 0);
      const dia = Number(el.querySelector("#hDia").value || 0);
      const pulse = Number(el.querySelector("#hPulse").value || 0);
      const weight = Number(el.querySelector("#hWeight").value || 0);
      const waist = Number(el.querySelector("#hWaist").value || 0);
      const hip = Number(el.querySelector("#hHip").value || 0);

      const idx = recompositionIndex(weight, waist, hip);

      await window.DB.add("health", {
        date, sys, dia, pulse, weight, waist, hip,
        wi: idx.wi, whr: idx.whr
      });

      await renderHealth(el);
    });

    const ul = el.querySelector("#hList");
    if (!rows.length) ul.innerHTML = `<li>—</li>`;
    else {
      ul.innerHTML = "";
      rows.slice(0, 60).forEach(r=>{
        const li = document.createElement("li");
        li.innerHTML = `
          <div class="itemTop">
            <div>
              <b>${r.date}</b>
              <div class="hint">
                BP ${r.sys||"—"}/${r.dia||"—"} • Puls ${r.pulse||"—"} • Gewicht ${r.weight||"—"}kg • Taille ${r.waist||"—"}cm
                ${r.whr ? `• WHR ${r.whr}` : ""} • WI ${r.wi||"—"}
              </div>
            </div>
          </div>
        `;
        ul.appendChild(li);
      });
    }
  }

  window.IronQuestHealth = { renderHealth };
})();
