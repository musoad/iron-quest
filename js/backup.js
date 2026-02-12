/* backup.js – Local Backup + optional WebDAV sync (ES Module) */

import { downloadText, pickFileText, loadJSON, saveJSON } from "./utils.js";
import { entriesGetAll, entriesAdd, entriesClear } from "./db.js";

const KEY_WEBDAV = "iq_webdav_v4";

function getWebDAV() {
  return loadJSON(KEY_WEBDAV, { url: "", user: "", pass: "", filename: "ironquest-backup.json" });
}
function saveWebDAV(cfg) {
  saveJSON(KEY_WEBDAV, cfg);
}

export function renderBackupPanel(container) {
  if (!container) return;

  const cfg = getWebDAV();

  container.innerHTML = `
    <div class="card">
      <h2>Backup</h2>
      <p class="hint">Lokales Export/Import (JSON) + optional WebDAV Cloud Sync (Nextcloud/Synology).</p>

      <div class="row2">
        <button id="bkExport">Export JSON</button>
        <button class="secondary" id="bkImport">Import JSON</button>
      </div>
    </div>

    <div class="card">
      <h2>WebDAV Cloud Sync (optional)</h2>
      <p class="hint">URL Beispiel: https://dein-server/remote.php/dav/files/USER/IRONQUEST/ironquest.json</p>

      <label>WebDAV URL
        <input id="wdUrl" placeholder="https://..." value="${cfg.url || ""}">
      </label>
      <div class="row2">
        <label>User
          <input id="wdUser" value="${cfg.user || ""}">
        </label>
        <label>Password / App-Passwort
          <input id="wdPass" type="password" value="${cfg.pass || ""}">
        </label>
      </div>
      <label>Dateiname (nur Info)
        <input id="wdFile" value="${cfg.filename || "ironquest-backup.json"}">
      </label>

      <div class="row2">
        <button class="secondary" id="wdSave">Config speichern</button>
        <button id="wdUpload">⬆ Upload</button>
        <button id="wdDownload">⬇ Download & Import</button>
      </div>

      <div class="pill" id="wdStatus">—</div>
    </div>
  `;

  async function exportJson() {
    const entries = await entriesGetAll();
    const payload = { version: 1, exportedAt: new Date().toISOString(), entries };
    downloadText("ironquest-backup.json", JSON.stringify(payload, null, 2));
  }

  async function importJsonText(text) {
    const parsed = JSON.parse(text);
    const entries = parsed?.entries;
    if (!Array.isArray(entries)) throw new Error("Ungültige Datei (entries fehlt).");

    const ok = confirm(`Importiert ${entries.length} Einträge.\n\n⚠️ Aktuelle DB vorher löschen?`);
    if (ok) await entriesClear();

    for (const e of entries) {
      const copy = { ...e };
      delete copy.id; // new ids
      await entriesAdd(copy);
    }
  }

  container.querySelector("#bkExport")?.addEventListener("click", exportJson);

  container.querySelector("#bkImport")?.addEventListener("click", async () => {
    try {
      const text = await pickFileText(".json");
      await importJsonText(text);
      alert("Import fertig ✅");
      location.reload();
    } catch (e) {
      alert("Import Fehler: " + (e?.message || e));
    }
  });

  function setStatus(msg) {
    const el = container.querySelector("#wdStatus");
    if (el) el.textContent = msg;
  }

  container.querySelector("#wdSave")?.addEventListener("click", () => {
    const url = container.querySelector("#wdUrl").value.trim();
    const user = container.querySelector("#wdUser").value.trim();
    const pass = container.querySelector("#wdPass").value;
    const filename = container.querySelector("#wdFile").value.trim() || "ironquest-backup.json";
    saveWebDAV({ url, user, pass, filename });
    setStatus("Config gespeichert ✅");
  });

  container.querySelector("#wdUpload")?.addEventListener("click", async () => {
    try {
      const c = getWebDAV();
      if (!c.url || !c.user || !c.pass) return setStatus("Bitte URL/User/Pass setzen.");
      setStatus("Upload…");
      const entries = await entriesGetAll();
      const payload = { version: 1, exportedAt: new Date().toISOString(), entries };

      const res = await fetch(c.url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Basic " + btoa(`${c.user}:${c.pass}`)
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStatus("Upload OK ✅");
    } catch (e) {
      setStatus("Upload Fehler: " + (e?.message || e));
    }
  });

  container.querySelector("#wdDownload")?.addEventListener("click", async () => {
    try {
      const c = getWebDAV();
      if (!c.url || !c.user || !c.pass) return setStatus("Bitte URL/User/Pass setzen.");
      setStatus("Download…");

      const res = await fetch(c.url, {
        method: "GET",
        headers: { "Authorization": "Basic " + btoa(`${c.user}:${c.pass}`) }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const text = await res.text();

      await importJsonText(text);
      setStatus("Download + Import OK ✅");
      alert("Cloud Import fertig ✅");
      location.reload();
    } catch (e) {
      setStatus("Download Fehler: " + (e?.message || e));
    }
  });
}
