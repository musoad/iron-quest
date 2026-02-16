/* =========================
   IRON QUEST — Backup (v5 stable)
   ✅ Export/Import JSON (Merge)
   ✅ Optional: Online Backup via eigener Endpoint-URL (POST)
   ✅ Sichert DB-Stores: entries, health, runs
   ✅ Sichert localStorage: startdate, skilltree, boss/challenges state, endpoint
========================= */

(() => {
  "use strict";

  const LS_KEYS = {
    startDate: "ironquest_startdate_v5",
    skilltree: "ironquest_skilltree_v5",
    boss: "ironquest_boss_state_v5",
    challenges: "ironquest_challenges_v5",
    backupEndpoint: "ironquest_backup_endpoint_v5"
  };

  function download(filename, content, mime){
    const blob = new Blob([content], { type: mime || "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
  }

  function safeJsonParse(str, fallback){
    try { return JSON.parse(str); } catch { return fallback; }
  }

  function readLocalSettings(){
    const out = {};
    for (const k of Object.values(LS_KEYS)) out[k] = localStorage.getItem(k);
    return out;
  }

  function writeLocalSettings(lsObj){
    if (!lsObj || typeof lsObj !== "object") return;
    for (const [k,v] of Object.entries(lsObj)) {
      if (v === null || v === undefined) continue;
      localStorage.setItem(k, String(v));
    }
  }

  async function makeSnapshot(){
    const entries = await window.DB.getAll("entries");
    const health  = await window.DB.getAll("health");
    const runs    = await window.DB.getAll("runs");

    const meta = { createdAt: new Date().toISOString(), version:"v5.0.0" };
    const local = readLocalSettings();

    return { meta, entries, health, runs, local };
  }

  // Merge restore: Duplikate werden über Signaturen erkannt
  async function restoreSnapshot(snapshot){
    if (!snapshot || typeof snapshot !== "object") throw new Error("Invalid snapshot");

    const entries = snapshot.entries || [];
    const health  = snapshot.health  || [];
    const runs    = snapshot.runs    || [];
    const local   = snapshot.local   || null;

    // entries signature (date|exercise|xp|week)
    {
      const cur = await window.DB.getAll("entries");
      const sig = new Set(cur.map(e=>`${e.date}|${e.exercise}|${e.xp}|${e.week}`));

      for (const e of entries){
        if (!e) continue;
        const k = `${e.date}|${e.exercise}|${e.xp}|${e.week}`;
        if (sig.has(k)) continue;
        const copy = { ...e };
        delete copy.id;
        await window.DB.add("entries", copy);
        sig.add(k);
      }
    }

    // health signature (date|sys|dia|pulse|weight|waist)
    {
      const cur = await window.DB.getAll("health");
      const sig = new Set(cur.map(h=>`${h.date}|${h.sys}|${h.dia}|${h.pulse}|${h.weight}|${h.waist}`));

      for (const h of health){
        if (!h) continue;
        const k = `${h.date}|${h.sys}|${h.dia}|${h.pulse}|${h.weight}|${h.waist}`;
        if (sig.has(k)) continue;
        const copy = { ...h };
        delete copy.id;
        await window.DB.add("health", copy);
        sig.add(k);
      }
    }

    // runs signature (date|km|minutes|xp)
    {
      const cur = await window.DB.getAll("runs");
      const sig = new Set(cur.map(r=>`${r.date}|${r.km}|${r.minutes}|${r.xp}`));

      for (const r of runs){
        if (!r) continue;
        const k = `${r.date}|${r.km}|${r.minutes}|${r.xp}`;
        if (sig.has(k)) continue;
        const copy = { ...r };
        delete copy.id;
        await window.DB.add("runs", copy);
        sig.add(k);
      }
    }

    // localStorage Settings (optional)
    if (local) writeLocalSettings(local);
  }

  async function postToEndpoint(endpoint, snapshot){
    const res = await fetch(endpoint, {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify(snapshot)
    });
    if (!res.ok) throw new Error(`POST failed: ${res.status}`);
    return true;
  }

  async function renderBackup(el){
    const isoDate = window.Utils?.isoDate ? window.Utils.isoDate : (d)=>new Date(d).toISOString().slice(0,10);

    el.innerHTML = `
      <div class="card">
        <h2>Backup</h2>
        <p class="hint">Lokales Export/Import Backup. Optional: Online Backup via eigener Endpoint-URL.</p>

        <div class="card">
          <h2>Export</h2>
          <div class="btnRow">
            <button class="primary" id="bkExport">Backup JSON herunterladen</button>
          </div>
        </div>

        <div class="card">
          <h2>Import</h2>
          <input id="bkFile" type="file" accept="application/json">
          <div class="btnRow">
            <button class="secondary" id="bkImport">Importieren (Merge)</button>
          </div>
        </div>

        <div class="card">
          <h2>Optional: Online Backup</h2>
          <p class="hint">Trage eine URL zu deinem eigenen Webhook/Server ein. Die App sendet dein Backup als JSON per POST.</p>
          <label>Backup Endpoint URL</label>
          <input id="bkUrl" type="text" placeholder="https://dein-server.de/backup">
          <div class="btnRow">
            <button class="secondary" id="bkSaveUrl">URL speichern</button>
            <button class="primary" id="bkSend">Jetzt Online Backup senden</button>
          </div>
          <div class="pill"><b>Status:</b> <span id="bkStatus">—</span></div>
        </div>
      </div>
    `;

    const key = LS_KEYS.backupEndpoint;
    const saved = localStorage.getItem(key) || window.URLS?.DEFAULT_BACKUP_ENDPOINT || "";
    el.querySelector("#bkUrl").value = saved;

    el.querySelector("#bkSaveUrl").onclick = () => {
      const v = el.querySelector("#bkUrl").value.trim();
      localStorage.setItem(key, v);
      el.querySelector("#bkStatus").textContent = "URL gespeichert";
    };

    el.querySelector("#bkExport").onclick = async () => {
      const snap = await makeSnapshot();
      download(`ironquest_backup_${isoDate(new Date())}.json`, JSON.stringify(snap, null, 2), "application/json");
    };

    el.querySelector("#bkImport").onclick = async () => {
      const f = el.querySelector("#bkFile").files?.[0];
      if (!f) return alert("Bitte JSON-Datei wählen.");
      const text = await f.text();
      const snap = safeJsonParse(text, null);
      if (!snap) return alert("Ungültiges JSON.");
      await restoreSnapshot(snap);
      alert("Import (Merge) ✅");
    };

    el.querySelector("#bkSend").onclick = async () => {
      const endpoint = (localStorage.getItem(key) || "").trim();
      if (!endpoint) return alert("Bitte Endpoint URL eintragen und speichern.");
      try{
        const snap = await makeSnapshot();
        await postToEndpoint(endpoint, snap);
        el.querySelector("#bkStatus").textContent = "Online Backup gesendet ✅";
      } catch(e){
        el.querySelector("#bkStatus").textContent = "Fehler beim Senden";
        alert(String(e));
      }
    };
  }

  window.IronQuestBackup = { renderBackup };
})();
