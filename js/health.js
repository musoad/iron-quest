(function(){
  const DB = () => window.IronQuestDB;
  const iso = window.IQ.isoDate;

  function recompIndex(weightKg, bodyFatPct){
    const w = Number(weightKg||0);
    const bf = Number(bodyFatPct||0);
    if (w <= 0 || bf <= 0) return null;
    const lean = w * (1 - (bf/100));
    // index = lean mass proxy
    return Math.round(lean*10)/10;
  }

  async function addHealth(payload){
    await DB().add(DB().STORES.health, payload);
  }

  async function getAllHealth(){
    const rows = await DB().getAll(DB().STORES.health);
    rows.sort((a,b)=> (a.date<b.date?-1:1));
    return rows;
  }

  function renderHealth(container, entries){
    container.innerHTML = `
      <div class="card">
        <h2>Health Tracking</h2>
        <p class="hint">Gewicht/KFA/Umfang + Blutdruck + Puls. Recomp Index = Lean-Mass Proxy.</p>

        <div class="row2">
          <div>
            <label>Datum</label>
            <input id="hDate" type="date" value="${iso(new Date())}">
          </div>
          <div>
            <label>Gewicht (kg)</label>
            <input id="hWeight" inputmode="decimal" placeholder="z.B. 84.2">
          </div>
        </div>

        <div class="row2">
          <div>
            <label>KFA (%)</label>
            <input id="hBF" inputmode="decimal" placeholder="z.B. 17.5">
          </div>
          <div>
            <label>Umfang Taille (cm)</label>
            <input id="hWaist" inputmode="decimal" placeholder="z.B. 88">
          </div>
        </div>

        <div class="row2">
          <div>
            <label>Blutdruck SYS</label>
            <input id="hSYS" inputmode="numeric" placeholder="z.B. 125">
          </div>
          <div>
            <label>Blutdruck DIA</label>
            <input id="hDIA" inputmode="numeric" placeholder="z.B. 78">
          </div>
        </div>

        <div class="row2">
          <div>
            <label>Puls (bpm)</label>
            <input id="hHR" inputmode="numeric" placeholder="z.B. 62">
          </div>
          <div class="pill">
            <b>Recomp Index:</b> <span id="hRecomp">—</span>
            <div class="small">Berechnet nach Save.</div>
          </div>
        </div>

        <div class="row">
          <button class="btn primary" id="hSave" type="button">Speichern</button>
          <button class="btn danger" id="hClear" type="button">Alle Health-Daten löschen</button>
        </div>
      </div>

      <div class="card">
        <h2>History</h2>
        <ul class="list" id="hList"></ul>
      </div>
    `;

    const hList = document.getElementById("hList");
    const fillList = async ()=>{
      const rows = await getAllHealth();
      hList.innerHTML = rows.length ? "" : "<li>Keine Health-Daten.</li>";
      rows.slice().reverse().forEach(r=>{
        const ri = recompIndex(r.weightKg, r.bodyFatPct);
        const li = document.createElement("li");
        li.innerHTML = `
          <div class="row" style="justify-content:space-between;align-items:center;">
            <div>
              <b>${r.date}</b>
              <div class="small">
                ${r.weightKg?`Gewicht: ${r.weightKg}kg • `:""}
                ${r.bodyFatPct?`KFA: ${r.bodyFatPct}% • `:""}
                ${r.waistCm?`Taille: ${r.waistCm}cm • `:""}
                ${r.sys&&r.dia?`BP: ${r.sys}/${r.dia} • `:""}
                ${r.hr?`Puls: ${r.hr}bpm`:""}
              </div>
              <div class="small">Recomp: ${ri ?? "—"}</div>
            </div>
          </div>
        `;
        hList.appendChild(li);
      });
    };

    const calcPreview = ()=>{
      const w = Number(document.getElementById("hWeight").value || 0);
      const bf = Number(document.getElementById("hBF").value || 0);
      document.getElementById("hRecomp").textContent = recompIndex(w,bf) ?? "—";
    };

    ["hWeight","hBF"].forEach(id=>{
      document.getElementById(id).addEventListener("input", calcPreview);
    });

    document.getElementById("hSave").addEventListener("click", async ()=>{
      const date = document.getElementById("hDate").value || iso(new Date());
      const weightKg = Number(document.getElementById("hWeight").value || 0) || null;
      const bodyFatPct = Number(document.getElementById("hBF").value || 0) || null;
      const waistCm = Number(document.getElementById("hWaist").value || 0) || null;
      const sys = Number(document.getElementById("hSYS").value || 0) || null;
      const dia = Number(document.getElementById("hDIA").value || 0) || null;
      const hr = Number(document.getElementById("hHR").value || 0) || null;

      await addHealth({
        date, weightKg, bodyFatPct, waistCm, sys, dia, hr,
        recomp: recompIndex(weightKg, bodyFatPct)
      });

      await fillList();
      alert("Health gespeichert ✅");
    });

    document.getElementById("hClear").addEventListener("click", async ()=>{
      if (!confirm("Alle Health-Daten wirklich löschen?")) return;
      await DB().clear(DB().STORES.health);
      await fillList();
    });

    fillList();
  }

  window.IronQuestHealth = { renderHealth };
})();
