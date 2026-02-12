import { entriesGetAll, entriesAdd, entriesClear, healthGetAll } from "./db.js";
import { loadJSON, saveJSON, isoDate } from "./utils.js";

const KEY = "iq_backup_v4";

function state() {
  return loadJSON(KEY, {
    endpoint: "",
    token: "",
    lastSync: null,
  });
}
function setState(s) { saveJSON(KEY, s); }

async function makeExportBlob() {
  const entries = await entriesGetAll();
  const health = await healthGetAll();

  const payload = {
    version: "v4",
    exportedAt: new Date().toISOString(),
    entries,
    health,
  };
  return new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
}

async function downloadJSON() {
  const blob = await makeExportBlob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ironquest_backup_${isoDate()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(()=>URL.revokeObjectURL(url), 1200);
}

async function importJSON(file) {
  const text = await file.text();
  const data = JSON.parse(text);

  if (!data || !Array.isArray(data.entries)) {
    alert("Ungültiges Backup.");
    return;
  }

  const ok = confirm(`Importieren?\n\nEntries: ${data.entries.length}\nHealth: ${(data.health||[]).length}\n\n⚠️ Optional: vorher Entries löschen?`);
  if (!ok) return;

  const wipe = confirm("Vor Import: ALLE bestehenden Trainingseinträge löschen?\n\nOK = löschen, Abbrechen = behalten + hinzufügen.");
  if (wipe) await entriesClear();

  // nur entries import (health bleibt separat – kann später ergänzt werden)
  for (const e of data.entries) {
    const copy = { ...e };
    delete copy.id; // neue IDs vergeben
    await entriesAdd(copy);
  }

  alert("Import fertig ✅");
  window.dispatchEvent(new Event("iq:refresh"));
}

// Optional: Online-Sync zu einem eigenen Endpoint (Webhook / Server)
// Erwartet: POST JSON, Response 200.
async function syncOnline() {
  const st = state();
  if (!st.endpoint) return alert("Kein Endpoint gesetzt.");

  const blob = await makeExportBlob();
  const body = await blob.text();

  const res = await fetch(st.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": st.token ? `Bearer ${st.token}` : ""
    },
    body
  });

  if (!res.ok) {
    alert(`Sync fehlgeschlagen: ${res.status}`);
    return;
  }

  st.lastSync = new Date().toISOString();
  setState(st);
  alert("Online Sync OK ✅");
  window.dispatchEvent(new Event("iq:refresh"));
}

export async function renderBackupPanel(container) {
  const st = state();

  container.innerHTML = `
    <div class="card">
      <h2>🌎 Backup & Sync</h2>
      <p class="hint">
        Offline: Export/Import als JSON.<br>
        Optional: Online-Sync zu deinem eigenen Endpoint (Cloud Sync), falls du einen Server/Webhook hast.
      </p>

      <div class="row2">
        <button id="bkExport">Backup Export (JSON)</button>
        <label class="pill" style="display:flex;align-items:center;gap:10px;">
          <b>Import</b>
          <input id="bkImport" type="file" accept="application/json" style="border:none;background:transparent;padding:0;">
        </label>
      </div>

      <div class="divider"></div>

      <h3>Cloud Sync (optional)</h3>
      <label>Endpoint URL
        <input id="bkEndpoint" placeholder="https://dein-endpoint.tld/sync" value="${st.endpoint || ""}">
      </label>
      <label>Token (optional)
        <input id="bkToken" placeholder="Bearer Token" value="${st.token || ""}">
      </label>

      <div class="row2">
        <button id="bkSave" class="secondary">Sync-Settings speichern</button>
        <button id="bkSync">Jetzt syncen</button>
      </div>

      <div class="divider"></div>
      <div class="pill"><b>Letzter Sync:</b> <span id="bkLast">${st.lastSync || "—"}</span></div>
    </div>
  `;

  document.getElementById("bkExport").onclick = downloadJSON;

  document.getElementById("bkImport").addEventListener("change", async (e)=>{
    const file = e.target.files?.[0];
    if (!file) return;
    await importJSON(file);
    e.target.value = "";
  });

  document.getElementById("bkSave").onclick = ()=>{
    const next = state();
    next.endpoint = String(document.getElementById("bkEndpoint").value || "").trim();
    next.token = String(document.getElementById("bkToken").value || "").trim();
    setState(next);
    alert("Gespeichert ✅");
    window.dispatchEvent(new Event("iq:refresh"));
  };

  document.getElementById("bkSync").onclick = syncOnline;
}
