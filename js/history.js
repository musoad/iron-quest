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
          <select id="historyPlan" class="select">
            <option value="">All Plans</option>
          </select>
          <button class="secondary" id="historyToday">Today</button>
        </div>
      </div>
      <div id="historyBody"></div>
    `;

    const body = root.querySelector("#historyBody");
    const qEl = root.querySelector("#historyQ");
    const planEl = root.querySelector("#historyPlan");
    const btnToday = root.querySelector("#historyToday");

    const todayIso = window.Utils?.isoDate?.(new Date()) || new Date().toISOString().slice(0,10);

    // Plan filter
    function getPlans(){
      try{
        const P = window.IronQuestPlans;
        const st = (P && (typeof P.getState==="function" ? P.getState() : (typeof P.state==="function" ? P.state() : null))) || null;
        return (st && Array.isArray(st.plans)) ? st.plans : [];
      }catch(_){ return []; }
    }
    function populatePlanOptions(){
      if(!planEl) return;
      const plans = getPlans();
      // keep first option
      planEl.querySelectorAll("option[data-dyn=\"1\"]").forEach(o=>o.remove());
      plans.forEach(p=>{
        const opt=document.createElement("option");
        opt.value = String(p.id||"");
        opt.textContent = p.name || "Plan";
        opt.dataset.dyn="1";
        planEl.appendChild(opt);
      });
    }

    function draw(query, planId){
      const t = String(query||"").trim().toLowerCase();
      const pid = String(planId||"");
      let planSet = null;
      if(pid){
        const p = getPlans().find(x=>String(x.id)===pid);
        if(p && Array.isArray(p.items)) planSet = new Set(p.items.map(x=>String((x && (x.name||x.exercise)) || x).toLowerCase()));
      }
      const base = entries.filter(e => {
        if(planSet){
          const exn = String(e.exercise||"").toLowerCase();
          if(!planSet.has(exn)) return false;
        }
        return true;
      });
      const filtered = !t ? base : base.filter(e => {
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
                  ${String(e.exercise||"").toLowerCase()==="jogging" && e.detail
                    ? `<div class="small">${esc(e.detail)} • <span class="badge ok" style="margin-left:6px;">+${esc(e.xp||0)} XP</span></div>`
                    : `<div class="small">${esc(e.sets ?? "—")}×${esc(e.reps ?? "—")} • <span class="badge ok" style="margin-left:6px;">+${esc(e.xp||0)} XP</span></div>`
                  }
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

    populatePlanOptions();
    draw("", planEl ? planEl.value : "");

    if(qEl){
      qEl.addEventListener("input", ()=>draw(qEl.value, planEl ? planEl.value : ""));
    if(planEl){
      planEl.addEventListener("change", ()=>draw(qEl.value, planEl.value));
    }
    }
    if(btnToday){
      btnToday.addEventListener("click", ()=>{
        if(qEl) qEl.value = "";
        // open today's group if present
        draw("", planEl ? planEl.value : "");
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
