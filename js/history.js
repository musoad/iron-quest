(() => {
  "use strict";

  function esc(s){
    return String(s ?? "").replace(/[&<>\"]/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[m]));
  }

  function byDateDesc(a,b){
    // ISO date strings
    return String(b.date||"").localeCompare(String(a.date||""));
  }

  function groupByDate(entries){
    const map = new Map();
    for(const e of entries){
      const d = String(e.date || "").slice(0,10) || "(ohne Datum)";
      if(!map.has(d)) map.set(d, []);
      map.get(d).push(e);
    }
    const days = Array.from(map.keys()).sort((a,b)=>String(b).localeCompare(String(a)));
    return days.map(d=>({ date:d, items: map.get(d).slice().sort((a,b)=>Number(b.id||0)-Number(a.id||0)) }));
  }

  async function render(root){
    const entries = await (window.IronDB?.getAllEntries?.() || Promise.resolve([]));
    entries.sort(byDateDesc);

    root.innerHTML = `
      <div class="card">
        <h2>History</h2>
        <p class="hint">Suche nach Übungen und klappe Tage ein/aus. Tippe auf 🗑️ um einzelne Einträge zu löschen.</p>
        <div class="historySearchRow">
          <input id="historyQ" type="text" placeholder="Search (e.g. Push Ups, Squats)…" autocomplete="off" />
          <button class="secondary" id="historyToday">Today</button>
        </div>
      </div>
      <div id="historyBody"></div>
    `;

    const body = root.querySelector("#historyBody");
    const qEl = root.querySelector("#historyQ");
    const btnToday = root.querySelector("#historyToday");

    const todayIso = window.Utils?.isoDate?.(new Date()) || new Date().toISOString().slice(0,10);

    function draw(filter){
      const t = String(filter||"").trim().toLowerCase();
      const filtered = !t ? entries : entries.filter(e => {
        const name = String(e.exercise || e.type || "").toLowerCase();
        const mg = String(e.muscleGroup||"").toLowerCase();
        const sg = String(e.subGroup||"").toLowerCase();
        return name.includes(t) || mg.includes(t) || sg.includes(t);
      });
      const groups = groupByDate(filtered);

      body.innerHTML = groups.length ? groups.map((g,idx)=>`
        <details class="card soft historyDay" ${idx<2 ? "open" : ""}>
          <summary class="historyDaySum">
            <div>
              <b>${esc(g.date)}</b>
              <span class="historyCount">${g.items.length} entries</span>
            </div>
            <span class="badge">W${esc(g.items[0]?.week ?? "—")}</span>
          </summary>
          <ul class="list historyList">
            ${g.items.map(e=>`
              <li class="historyItem" data-id="${esc(e.id)}">
                <div class="historyLeft">
                  <div class="historyName"><b>${esc(e.exercise || e.type || "Entry")}</b></div>
                  <div class="small">${esc(e.muscleGroup||"")}${e.subGroup?" / "+esc(e.subGroup):""}${e.dayTag?" • "+esc(e.dayTag):""}</div>
                  <div class="small">${esc(e.sets ?? "—")}×${esc(e.reps ?? "—")} • <span class="badge ok" style="margin-left:6px;">+${esc(e.xp||0)} XP</span></div>
                </div>
                <button class="iconBtn danger" title="Delete" data-del="${esc(e.id)}">🗑️</button>
              </li>
            `).join("")}
          </ul>
        </details>
      `).join("") : `
        <div class="card soft"><p class="hint">Keine Einträge gefunden.</p></div>
      `;

      body.querySelectorAll("[data-del]").forEach(btn=>{
        btn.addEventListener("click", async ()=>{
          const idRaw = btn.getAttribute("data-del");
          const id = (idRaw !== null && idRaw !== "") ? (isNaN(Number(idRaw)) ? idRaw : Number(idRaw)) : idRaw;
          if(!confirm("Eintrag wirklich löschen?")) return;
          try{
            if(typeof window.IronDB?.deleteEntry === "function"){
              await window.IronDB.deleteEntry(id);
            }else{
              throw new Error("deleteEntry not available");
            }
            (window.Toast && window.Toast.show) && window.Toast.show("Gelöscht", "Eintrag entfernt.");
          }catch(e){
            console.warn(e);
            alert("Konnte Eintrag nicht löschen.");
          }
          await render(root);
        });
      });
    }

    draw("");

    if(qEl){
      qEl.addEventListener("input", ()=>draw(qEl.value));
    }
    if(btnToday){
      btnToday.addEventListener("click", ()=>{
        if(qEl) qEl.value = "";
        // open today's group if present
        draw("");
        setTimeout(()=>{
          try{
            const day = root.querySelector(`details.historyDay summary + ul`);
            const target = root.querySelector(`details.historyDay summary`);
            const details = Array.from(root.querySelectorAll('details.historyDay'))
              .find(d=>String(d.textContent||"").includes(todayIso));
            if(details){
              details.open = true;
              details.scrollIntoView({ block:"start", behavior:"smooth" });
            }
          }catch(_){ }
        }, 30);
      });
    }
  }

  window.IronQuestHistory = { render };
})();
