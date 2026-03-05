(() => {
  "use strict";

  function line(s){ return String(s||""); }
  function ok(b){ return b ? "✅" : "❌"; }

  async function smoke(){
    const results = [];
    // storage
    let lsOk = true;
    try{ localStorage.setItem("_t","1"); localStorage.removeItem("_t"); }catch(e){ lsOk=false; }
    results.push({ name:"LocalStorage writable", pass: lsOk });

    const idbOk = !!window.indexedDB;
    results.push({ name:"IndexedDB available", pass: idbOk });

    // db
    const dbOk = !!(window.IronDB && window.IronDB.getAllEntries);
    results.push({ name:"IronDB present", pass: dbOk });

    let entries=[], runs=[];
    try{ entries = await (window.IronDB?.getAllEntries?.() || []); results.push({ name:"Read entries", pass:true, meta:`${entries.length}`}); }
    catch(e){ results.push({ name:"Read entries", pass:false, meta:String(e)}); }

    try{ runs = await (window.IronDB?.getAllRuns?.() || []); results.push({ name:"Read runs", pass:true, meta:`${runs.length}`}); }
    catch(e){ results.push({ name:"Read runs", pass:false, meta:String(e)}); }

    // xp validity
    const xpBad = entries.filter(e => !Number.isFinite(Number(e.xp||0)) || Number(e.xp||0) < 0).length;
    results.push({ name:"Entry XP valid", pass: xpBad === 0, meta: xpBad ? `${xpBad} invalid` : "ok" });

    // run linkage (entries with runId should have matching run)
    const runIds = new Set(runs.map(r=>String(r.id)));
    const missingLinks = entries.filter(e => e.runId && !runIds.has(String(e.runId))).length;
    results.push({ name:"Run links consistent", pass: missingLinks === 0, meta: missingLinks ? `${missingLinks} missing` : "ok" });

    // state snapshot
    try{
      const s = await window.IronQuestState?.get?.();
      results.push({ name:"State snapshot builds", pass: !!s, meta: s ? `L${s.progression?.level||"?"}` : "" });
    }catch(e){
      results.push({ name:"State snapshot builds", pass:false, meta:String(e) });
    }

    // plans
    let plansOk = true;
    try{
      const st = window.Plans?.getState?.() || window.Plans?.state?.();
      plansOk = !!st;
    }catch(e){ plansOk=false; }
    results.push({ name:"Plans state readable", pass: plansOk });

    return { results, entriesCount: entries.length, runsCount: runs.length };
  }

  async function render(){
    const host = document.getElementById("diagnostics");
    if(!host) return;

    const snap = await window.IronQuestState?.get?.().catch(()=>null);
    const rep = await smoke();

    const ua = navigator.userAgent;
    const sw = ("serviceWorker" in navigator);
    const controller = (navigator.serviceWorker && navigator.serviceWorker.controller) ? "active" : "none";

    host.innerHTML = "";
    host.appendChild(UI.card("Diagnostics", `
      <div class="kv">
        <div><span class="k">Build</span><span class="v">v10.2</span></div>
        <div><span class="k">URL</span><span class="v">${location.href}</span></div>
        <div><span class="k">UserAgent</span><span class="v">${ua}</span></div>
        <div><span class="k">Service Worker</span><span class="v">${sw ? "supported" : "no"} / ${controller}</span></div>
      </div>
    `));

    const list = rep.results.map(r=>`
      <div class="check ${r.pass?"pass":"fail"}">
        <span class="mark">${ok(r.pass)}</span>
        <span class="name">${line(r.name)}</span>
        <span class="meta">${r.meta?line(r.meta):""}</span>
      </div>
    `).join("");

    host.appendChild(UI.card("Smoke Tests", `
      <div class="checks">${list}</div>
      <div class="row" style="margin-top:10px">
        <button id="diag_run_integrity" class="btn primary">Run integrity repair</button>
        <button id="diag_refresh" class="btn">Refresh</button>
      </div>
      <div class="muted" style="margin-top:10px">
        Wenn etwas rot ist: Integrity Repair ausführen und danach neu laden.
      </div>
    `));

    if(snap){
      host.appendChild(UI.card("State", `
        <div class="kv">
          <div><span class="k">Level</span><span class="v">${snap.progression.level}</span></div>
          <div><span class="k">XP</span><span class="v">${snap.progression.xp} / ${snap.progression.nextNeed}</span></div>
          <div><span class="k">Today XP</span><span class="v">${snap.totals.todayXp}</span></div>
          <div><span class="k">Week XP</span><span class="v">${snap.totals.weekXp}</span></div>
          <div><span class="k">Streak</span><span class="v">${snap.streak}</span></div>
        </div>
      `));
    }

    const btnIntegrity = document.getElementById("diag_run_integrity");
    if(btnIntegrity){
      btnIntegrity.addEventListener("click", async ()=>{
        try{
          await window.IronQuestIntegrity?.run?.({ force:true });
          window.IronQuestState?.invalidate?.();
          window.Toast?.show?.("Integrity repair complete");
          render();
        }catch(e){
          window.Toast?.show?.("Integrity failed: " + e);
        }
      });
    }
    const btnRefresh = document.getElementById("diag_refresh");
    if(btnRefresh) btnRefresh.addEventListener("click", render);
  }

  // Legacy: open a quick text dialog
  function open(){
    const msg = [];
    msg.push("IRON QUEST Diagnostics");
    msg.push("URL: " + location.href);
    msg.push("UserAgent: " + navigator.userAgent);
    alert(msg.join("\n"));
  }

  window.IronQuestDiagnostics = { open, render, smoke };
})();
