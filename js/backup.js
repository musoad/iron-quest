// js/backup.js
window.Backup = (function(){
  const { isoDate } = window.Utils;

  async function makeSnapshot(){
    const entries = await window.DB.getAll("entries");
    const health = await window.DB.getAll("health");
    const runs = await window.DB.getAll("runs");
    const settings = await window.DB.getAll("settings");
    const meta = { createdAt: new Date().toISOString(), version:"v4.0.0" };
    return { meta, entries, health, runs, settings };
  }

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

  async function restoreSnapshot(snapshot){
    if (!snapshot || typeof snapshot !== "object") throw new Error("Invalid snapshot");
    const { entries, health, runs, settings } = snapshot;

    // Merge (kein Clear by default)
    const curE = await window.DB.getAll("entries");
    const sigE = new Set(curE.map(e=>`${e.date}|${e.exercise}|${e.xp}|${e.week}`));
    for (const e of (entries||[])){
      const k = `${e.date}|${e.exercise}|${e.xp}|${e.week}`;
      if (sigE.has(k)) continue;
      const copy = { ...e };
      delete copy.id;
      await window.DB.add("entries", copy);
    }

    const curH = await window.DB.getAll("health");
    const sigH = new Set(curH.map(h=>`${h.date}|${h.sys}|${h.dia}|${h.pulse}|${h.weightKg}|${h.waistCm}`));
    for (const h of (health||[])){
      const k = `${h.date}|${h.sys}|${h.dia}|${h.pulse}|${h.weightKg}|${h.waistCm}`;
      if (sigH.has(k)) continue;
      const copy = { ...h };
      delete copy.id;
      await window.DB.add("health", copy);
    }

    const curR = await window.DB.getAll("runs");
    const sigR = new Set(curR.map(r=>`${r.date}|${r.distanceKm}|${r.timeMin}|${r.xp}`));
    for (const r of (runs||[])){
      const k = `${r.date}|${r.distanceKm}|${r.timeMin}|${r.xp}`;
      if (sigR.has(k)) continue;
      const copy = { ...r };
      delete copy.id;
      await window.DB.add("runs", copy);
    }

    for (const s of (settings||[])){
      if (!s || !s.key) continue;
      await window.DB.put("settings", s);
    }
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

  async function render(elId){
    const el = document.getElementById(elId);
    if (!el) return;

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

    const key = "ironquest_backup_endpoint_v4";
    const saved = localStorage.getItem(key) || window.URLS.DEFAULT_BACKUP_ENDPOINT || "";
    document.getElementById("bkUrl").value = saved;

    document.getElementById("bkSaveUrl").onclick = ()=>{
      const v = document.getElementById("bkUrl").value.trim();
      localStorage.setItem(key, v);
      document.getElementById("bkStatus").textContent = "URL gespeichert";
    };

    document.getElementById("bkExport").onclick = async ()=>{
      const snap = await makeSnapshot();
      download(`ironquest_backup_${isoDate(new Date())}.json`, JSON.stringify(snap, null, 2), "application/json");
    };

    document.getElementById("bkImport").onclick = async ()=>{
      const f = document.getElementById("bkFile").files?.[0];
      if (!f) return alert("Bitte JSON-Datei wählen.");
      const text = await f.text();
      const snap = JSON.parse(text);
      await restoreSnapshot(snap);
      alert("Import 완료 (Merge) ✅");
    };

    document.getElementById("bkSend").onclick = async ()=>{
      const endpoint = (localStorage.getItem(key) || "").trim();
      if (!endpoint) return alert("Bitte Endpoint URL eintragen und speichern.");
      try{
        const snap = await makeSnapshot();
        await postToEndpoint(endpoint, snap);
        document.getElementById("bkStatus").textContent = "Online Backup gesendet ✅";
      } catch(e){
        document.getElementById("bkStatus").textContent = "Fehler beim Senden";
        alert(String(e));
      }
    };
  }

  return { render };
})();
