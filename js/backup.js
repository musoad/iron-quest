(function(){
  function download(filename, text){
    const blob = new Blob([text], { type:"application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
  }

  async function renderBackup(container){
    container.innerHTML = `
      <div class="card">
        <h2>Backup</h2>
        <p class="hint">Offline Export/Import. Cloud Sync braucht einen Server/Token – hier nur Placeholder.</p>

        <div class="row">
          <button class="btn primary" id="bkExport" type="button">Export (JSON)</button>
          <label class="btn" style="display:inline-flex;align-items:center;gap:10px;cursor:pointer;">
            Import (JSON)
            <input id="bkImport" type="file" accept="application/json" style="display:none">
          </label>
        </div>

        <div class="divider"></div>

        <h2>Cloud (Optional)</h2>
        <p class="hint">Wenn du willst, kann ich dir Cloud Sync bauen (z.B. GitHub Gist / WebDAV). Dafür brauchst du einen Token – aktuell nicht aktiv.</p>
      </div>
    `;

    document.getElementById("bkExport").addEventListener("click", async ()=>{
      const payload = await window.IronQuestDB.exportAll();
      download(`ironquest_backup_${new Date().toISOString().slice(0,10)}.json`, JSON.stringify(payload, null, 2));
    });

    document.getElementById("bkImport").addEventListener("change", async (e)=>{
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      const text = await file.text();
      const payload = JSON.parse(text);
      await window.IronQuestDB.importAll(payload);
      alert("Import abgeschlossen ✅ (Reload)");
      location.reload();
    });
  }

  window.IronQuestBackup = { renderBackup };
})();
