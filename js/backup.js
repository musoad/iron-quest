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

  async function renderBackup(el){
    el.innerHTML=`
      <div class="card">
        <h2>Backup</h2>
        <p class="hint">Export/Import deiner lokalen Daten.</p>

        <div class="card">
          <h2>Export</h2>
          <button class="primary" id="ex">Backup JSON herunterladen</button>
        </div>

        <div class="card">
          <h2>Import</h2>
          <input id="file" type="file" accept="application/json">
          <button class="secondary" id="im">Importieren (Merge)</button>
        </div>
      </div>
    `;

    el.querySelector("#ex").onclick = async ()=>{
      const snapshot = {
        meta:{createdAt:new Date().toISOString(), version:"v6-solo"},
        entries: await window.DB.getAll("entries"),
        health: await window.DB.getAll("health"),
        runs: await window.DB.getAll("runs"),
        local:{
          start: localStorage.getItem("ironquest_startdate_v6"),
          skilltree: localStorage.getItem("ironquest_skilltree_v6"),
          attributes: localStorage.getItem("ironquest_attributes_v6"),
          rpg: localStorage.getItem("ironquest_rpg_v6"),
          boss: localStorage.getItem("ironquest_boss_state_v6"),
          classes: localStorage.getItem("ironquest_class_v6"),
          equipment: localStorage.getItem("ironquest_equipment_v6"),
          loot: localStorage.getItem("ironquest_loot_v6"),
          lastLevel: localStorage.getItem("ironquest_lastlevel_v6"),
          gates: localStorage.getItem("ironquest_gates_v6"),
        }
      };
      download(`ironquest_v6_backup_${window.Utils.isoDate(new Date())}.json`, JSON.stringify(snapshot,null,2));
      window.Toast?.toast("Backup exported");
    };

    el.querySelector("#im").onclick = async ()=>{
      const f = el.querySelector("#file").files?.[0];
      if(!f) return window.Toast?.toast("Import", "Bitte JSON wählen.");
      const text = await f.text();
      let snap=null;
      try{ snap=JSON.parse(text); }catch{ return window.Toast?.toast("Import", "Ungültiges JSON."); }

      const mergeStore = async (storeName, rows, sigFn)=>{
        const cur = await window.DB.getAll(storeName);
        const sig = new Set(cur.map(sigFn));
        for(const r of (rows||[])){
          const copy={...r}; delete copy.id;
          const k=sigFn(copy);
          if(sig.has(k)) continue;
          await window.DB.add(storeName, copy);
          sig.add(k);
        }
      };

      await mergeStore("entries", snap.entries, (e)=>`${e.date}|${e.exercise}|${e.xp}|${e.week}|${e.type}`);
      await mergeStore("health", snap.health, (h)=>`${h.date}|${h.sys}|${h.dia}|${h.pulse}|${h.weight}|${h.waist}`);
      await mergeStore("runs", snap.runs, (r)=>`${r.date}|${r.km}|${r.minutes}|${r.xp}`);

      if(snap.local){
        for(const [k,v] of Object.entries(snap.local)){
          if(v==null) continue;
          const map = {
            start:"ironquest_startdate_v6",
            skilltree:"ironquest_skilltree_v6",
            attributes:"ironquest_attributes_v6",
            rpg:"ironquest_rpg_v6",
            boss:"ironquest_boss_state_v6",
            classes:"ironquest_class_v6",
            equipment:"ironquest_equipment_v6",
            loot:"ironquest_loot_v6",
            lastLevel:"ironquest_lastlevel_v6",
            gates:"ironquest_gates_v6",
          };
          if (map[k]) localStorage.setItem(map[k], String(v));
        }
      }

      window.Toast?.toast("Import done", "Daten gemerged ✅");
    };
  }

  window.IronQuestBackup = { renderBackup };
})();
