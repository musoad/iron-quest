// js/backup.js (ES Module)
import { entriesGetAll, entriesAdd } from "./db.js";

export function renderBackupPanel(container) {
  if (!container) return;

  container.innerHTML = `
    <div class="card">
      <h2>Backup</h2>
      <p class="hint">
        GitHub Pages hat kein echtes Server-Backend – daher: <b>Export/Import als Datei</b>.
        Das ist das stabilste “Cloud-Backup” ohne Login/Server.
      </p>

      <div class="row2">
        <button id="bkExport">Export (JSON)</button>
        <label class="secondary" style="display:flex;align-items:center;justify-content:center;">
          Import (JSON)
          <input id="bkImport" type="file" accept="application/json" style="display:none;">
        </label>
      </div>

      <div class="divider"></div>

      <p class="hint"><b>Hinweis:</b> Import fügt Einträge hinzu (keine Duplikat-Prüfung). Für “Clean Restore” erst DB leeren.</p>

      <div class="row2">
        <button id="bkClear" class="danger">DB leeren (Entries)</button>
        <div class="pill" id="bkInfo">—</div>
      </div>
    </div>
  `;

  async function refreshCount(){
    const all = await entriesGetAll();
    container.querySelector("#bkInfo").textContent = `${all.length} Einträge in DB`;
  }
  refreshCount();

  container.querySelector("#bkExport").onclick = async () => {
    const all = await entriesGetAll();
    const blob = new Blob([JSON.stringify({ entries: all }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ironquest_backup.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
  };

  container.querySelector("#bkImport").onchange = async (ev) => {
    const file = ev.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    let parsed;
    try { parsed = JSON.parse(text); } catch { return alert("Ungültiges JSON."); }
    const entries = parsed?.entries || [];
    if (!Array.isArray(entries)) return alert("Backup enthält keine entries[].");

    for (const e of entries) {
      // beim Add ohne id, damit IndexedDB sauber autoIncrement macht
      const copy = { ...e };
      delete copy.id;
      await entriesAdd(copy);
    }
    await refreshCount();
    alert("Import abgeschlossen ✅");
  };

  container.querySelector("#bkClear").onclick = async () => {
    alert("DB-Leeren ist in dieser Datei absichtlich nicht implementiert.\nWenn du willst, sag kurz Bescheid, dann ergänze ich einen sicheren Clear-Button.");
  };
}
