// js/health.js
window.Health = (function(){
  const { isoDate } = window.Utils;

  function recompositionIndex(weightKg, waistCm, hipCm){
    // simple index: lower waist with stable weight improves
    const w = Math.max(1, Number(weightKg||0));
    const waist = Math.max(1, Number(waistCm||0));
    const hip = Math.max(0, Number(hipCm||0));
    const whr = hip > 0 ? (waist/hip) : null;
    const wi = w / waist; // weight-to-waist
    return { wi: Number(wi.toFixed(3)), whr: whr ? Number(whr.toFixed(3)) : null };
  }

  async function render(elId){
    const el = document.getElementById(elId);
    if (!el) return;

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

          <div class="row2">
            <div>
              <label>Puls (bpm)</label>
              <input id="hPulse" type="number" inputmode="numeric" placeholder="z. B. 60">
            </div>
            <div>
              <label>Gewicht (kg)</label>
              <input id="hW" type="number" step="0.1" inputmode="decimal" placeholder="z. B. 83.5">
            </div>
          </div>

          <div class="row2">
            <div>
              <label>Taille (cm)</label>
              <input id="hWaist" type="number" step="0.1" inputmode="decimal" placeholder="z. B. 85">
            </div>
            <div>
              <label>Hüfte (cm) optional</label>
              <input id="hHip" type="number" step="0.1" inputmode="decimal" placeholder="z. B. 98">
            </div>
          </div>

          <div class="btnRow">
            <button class="primary" id="hSave">Speichern</button>
            <button class="secondary" id="hClear">Felder leeren</button>
          </div>
        </div>

        <div class="card">
          <h2>Historie</h2>
          <ul class="list" id="hList"></ul>
        </div>
      </div>
    `;

    const ul = document.getElementById("hList");
    if (!rows.length) ul.innerHTML = `<li>—</li>`;
    else {
      ul.innerHTML = "";
      rows.slice(0,40).forEach(r=>{
        const ri = recompositionIndex(r.weightKg, r.waistCm, r.hipCm);
        const li = document.createElement("li");
        li.innerHTML = `
          <div class="itemTop">
            <div>
              <b>${r.date}</b>
              <div class="small">
                BP: ${r.sys||"—"}/${r.dia||"—"} • Puls: ${r.pulse||"—"} bpm
                • Gewicht: ${r.weightKg||"—"} kg • Taille: ${r.waistCm||"—"} cm
                ${ri.whr ? `• WHR: ${ri.whr}` : ""} • W/T: ${ri.wi}
              </div>
            </div>
            <button class="danger" data-del="${r.id}">Delete</button>
          </div>
        `;
        ul.appendChild(li);
      });
    }

    ul.querySelectorAll("[data-del]").forEach(btn=>{
      btn.onclick = async ()=>{
        const id = Number(btn.getAttribute("data-del"));
        if (!confirm("Eintrag löschen?")) return;
        await window.DB.del("health", id);
        await render(elId);
      };
    });

    document.getElementById("hClear").onclick = ()=>{
      ["hSys","hDia","hPulse","hW","hWaist","hHip"].forEach(id=>{
        const x = document.getElementById(id);
        if (x) x.value = "";
      });
    };

    document.getElementById("hSave").onclick = async ()=>{
      const date = document.getElementById("hDate").value || isoDate(new Date());
      const sys = Number(document.getElementById("hSys").value||0) || null;
      const dia = Number(document.getElementById("hDia").value||0) || null;
      const pulse = Number(document.getElementById("hPulse").value||0) || null;
      const weightKg = Number(document.getElementById("hW").value||0) || null;
      const waistCm = Number(document.getElementById("hWaist").value||0) || null;
      const hipCm = Number(document.getElementById("hHip").value||0) || null;

      await window.DB.add("health", { date, sys, dia, pulse, weightKg, waistCm, hipCm });
      await render(elId);
    };
  }

  return { render };
})();
