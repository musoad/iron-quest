(() => {
  "use strict";
  function download(filename, content){
    const blob=new Blob([content],{type:"application/json;charset=utf-8"});
    const url=URL.createObjectURL(blob);
    const a=document.createElement("a");
    a.href=url; a.download=filename;
    document.body.appendChild(a);
    a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 800);
  }

  async function render(container){
    container.innerHTML=`
      <div class="card">
        <h2>Backup</h2>
        <p class="hint">Export/Import deiner lokalen Daten (Offline).</p>
      </div>

      <div class="card">
        <h2>Export</h2>
        <button class="primary" id="ex">Backup JSON herunterladen</button>
      </div>

      <div class="card">
        <h2>Import</h2>
        <input id="file" type="file" accept="application/json">
        <button class="secondary" id="im">Importieren (Merge)</button>
      </div>

      <div class="card soft">
        <h2>System Log</h2>
        <div class="btnRow">
          <button class="secondary" id="sysExport">System Log export</button>
          <button class="danger" id="sysClear">System Log löschen</button>
        </div>
      </div>
    `;

    container.querySelector("#ex").onclick=async()=>{
      const snapshot={
        meta:{ createdAt:new Date().toISOString(), version:"v8-hunter-ascended" },
        entries: await window.IronDB.getAllEntries(),
        health: await window.IronDB.getAllHealth(),
        system: await window.IronDB.getAllSystem(),
        local:{
          start: localStorage.getItem("ironquest_startdate_v8"),
          rank: localStorage.getItem("ironquest_rank_v8"),
          cls: localStorage.getItem("ironquest_class_v8"),
          skills: localStorage.getItem("ironquest_skilltree_v8"),
          loot: localStorage.getItem("ironquest_loot_v8"),
          eq: localStorage.getItem("ironquest_equipment_v8"),
          attrs: localStorage.getItem("ironquest_attributes_v8"),
          gates: localStorage.getItem("ironquest_gates_v8"),
          boss: localStorage.getItem("ironquest_boss_v8"),
          coach: localStorage.getItem("ironquest_coach_v8"),
        }
      };
      download(`ironquest_v8_backup_${window.Utils.isoDate(new Date())}.json`, JSON.stringify(snapshot,null,2));
      (window.Toast && window.Toast.toast)("Backup exported");
    };

    container.querySelector("#im").onclick=async()=>{
      var _files = container.querySelector("#file").files; const f = _files && _files[0];
      if(!f) return (window.Toast && window.Toast.toast)("Import", "Bitte JSON wählen.");
      let snap=null;
      try{ snap=JSON.parse(await f.text()); }catch{ return (window.Toast && window.Toast.toast)("Import", "Ungültiges JSON."); }

      const merge=async(name, rows, sigFn)=>{
        const cur=await window.DB.getAll(name);
        const sig=new Set(cur.map(sigFn));
        for(const r of (rows||[])){
          const copy={...r}; delete copy.id;
          const k=sigFn(copy);
          if(sig.has(k)) continue;
          await window.DB.add(name, copy);
          sig.add(k);
        }
      };

      await merge("entries", snap.entries, (e)=>`${e.date}|${e.exercise}|${e.xp}|${e.week}`);
      await merge("health", snap.health, (h)=>`${h.date}|${h.sys}|${h.dia}|${h.pulse}|${h.weight}|${h.waist}`);
      await merge("system", snap.system, (s)=>`${s.date}|${s.msg}`);

      if(snap.local){
        for(const [k,v] of Object.entries(snap.local)){
          if(v==null) continue;
          const map={
            start:"ironquest_startdate_v8",
            rank:"ironquest_rank_v8",
            cls:"ironquest_class_v8",
            skills:"ironquest_skilltree_v8",
            loot:"ironquest_loot_v8",
            eq:"ironquest_equipment_v8",
            attrs:"ironquest_attributes_v8",
            gates:"ironquest_gates_v8",
            boss:"ironquest_boss_v8",
            coach:"ironquest_coach_v8"
          };
          if(map[k]) localStorage.setItem(map[k], String(v));
        }
      }

      (window.Toast && window.Toast.toast)("Import done", "Daten gemerged ✅");
    };

    container.querySelector("#sysExport").onclick=async()=>{
      const sys=await window.IronDB.getAllSystem();
      download(`ironquest_v8_systemlog_${window.Utils.isoDate(new Date())}.json`, JSON.stringify(sys,null,2));
      (window.Toast && window.Toast.toast)("System log exported");
    };
    container.querySelector("#sysClear").onclick=async()=>{
      await window.IronDB.clearSystem();
      (window.Toast && window.Toast.toast)("System log cleared");
    };
  }

  window.IronQuestBackup={ render };
})();
