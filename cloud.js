// cloud.js
import { loadJSON, saveJSON, $ } from "./utils.js";
import { idbGetAll, idbClear, idbAddMany } from "./db.js";

const KEY_CLOUD = "iq_cloud_v3";

function loadCfg(){ return loadJSON(KEY_CLOUD, { endpoint:"", token:"" }); }
function saveCfg(c){ saveJSON(KEY_CLOUD, c); }

export function ensureBackupPanel(){
  const nav = document.querySelector("nav.tabs");
  const main = document.querySelector("main");
  if (!nav || !main) return;

  if (!document.querySelector('.tab[data-tab="backup"]')) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tab";
    btn.setAttribute("data-tab","backup");
    btn.textContent = "Backup";
    const exportBtn = nav.querySelector('.tab[data-tab="export"]');
    if (exportBtn) nav.insertBefore(btn, exportBtn);
    else nav.appendChild(btn);
  }

  if (!document.getElementById("tab-backup")) {
    const sec = document.createElement("section");
    sec.id = "tab-backup";
    sec.className = "panel";
    sec.innerHTML = `
      <div class="card">
        <h2>Backup / Restore</h2>
        <p class="hint">Download/Upload JSON (lokal). Optional Cloud Sync via Endpoint/WebDAV (CORS nötig).</p>

        <div class="row2">
          <button id="bkDownload" type="button">Backup herunterladen (JSON)</button>
          <label class="secondary" style="display:flex; align-items:center; justify-content:center;">
            Restore JSON hochladen
            <input id="bkUpload" type="file" accept="application/json" style="display:none;">
          </label>
        </div>

        <div class="divider"></div>

        <h2>Cloud Sync (optional)</h2>
        <label>Endpoint (PUT/GET JSON, CORS erlaubt)
          <input id="cloudEndpoint" type="text" placeholder="https://dein-server.com/ironquest.json">
        </label>
        <label>Token (optional, wird als Authorization Bearer gesendet)
          <input id="cloudToken" type="password" placeholder="optional">
        </label>

        <div class="row2">
          <button id="cloudSave" type="button" class="secondary">Cloud Einstellungen speichern</button>
          <button id="cloudPush" type="button">Cloud PUSH (hochladen)</button>
        </div>
        <div class="row2">
          <button id="cloudPull" type="button" class="secondary">Cloud PULL (download)</button>
          <button id="cloudTest" type="button" class="secondary">Verbindung testen</button>
        </div>

        <div class="divider"></div>
        <button id="bkDangerClear" type="button" class="danger">⚠️ ALLE Daten löschen</button>
      </div>
    `;
    main.appendChild(sec);

    const cfg = loadCfg();
    $("#cloudEndpoint").value = cfg.endpoint || "";
    $("#cloudToken").value = cfg.token || "";

    $("#cloudSave")?.addEventListener("click", () => {
      saveCfg({ endpoint: $("#cloudEndpoint").value.trim(), token: $("#cloudToken").value.trim() });
      alert("Cloud Einstellungen gespeichert ✅");
    });

    $("#bkDownload")?.addEventListener("click", async () => {
      const data = await buildBackupJSON();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type:"application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "ironquest_backup.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(()=>URL.revokeObjectURL(url), 1000);
    });

    $("#bkUpload")?.addEventListener("change", async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const text = await file.text();
      const data = JSON.parse(text);
      await restoreBackupJSON(data);
      alert("Restore fertig ✅");
      document.dispatchEvent(new CustomEvent("iq:rerender"));
      e.target.value = "";
    });

    $("#cloudTest")?.addEventListener("click", async () => {
      const ok = await cloudTest();
      alert(ok ? "Cloud erreichbar ✅" : "Cloud Test fehlgeschlagen ❌ (CORS/URL/Token prüfen)");
    });

    $("#cloudPush")?.addEventListener("click", async () => {
      const ok = await cloudPush();
      alert(ok ? "Cloud PUSH ✅" : "Cloud PUSH fehlgeschlagen ❌");
    });

    $("#cloudPull")?.addEventListener("click", async () => {
      const ok = await cloudPull();
      if (ok) {
        alert("Cloud PULL ✅");
        document.dispatchEvent(new CustomEvent("iq:rerender"));
      } else {
        alert("Cloud PULL fehlgeschlagen ❌");
      }
    });

    $("#bkDangerClear")?.addEventListener("click", async () => {
      if (!confirm("Wirklich ALLES löschen?")) return;
      await idbClear();
      // localStorage Keys: wir löschen nur ironquest/iq keys (safe-ish)
      Object.keys(localStorage).forEach(k=>{
        if (k.startsWith("ironquest_") || k.startsWith("iq_")) localStorage.removeItem(k);
      });
      alert("Alles gelöscht.");
      document.dispatchEvent(new CustomEvent("iq:rerender"));
    });
  }
}

async function buildBackupJSON(){
  const entries = await idbGetAll();
  const storage = {};
  Object.keys(localStorage).forEach(k=>{
    if (k.startsWith("ironquest_") || k.startsWith("iq_")) storage[k] = localStorage.getItem(k);
  });
  return { version:"iq_v3", exportedAt: new Date().toISOString(), entries, storage };
}

async function restoreBackupJSON(data){
  if (!data || !Array.isArray(data.entries)) throw new Error("Invalid backup JSON");
  if (!confirm("Restore überschreibt deine aktuellen Einträge. Fortfahren?")) return;

  await idbClear();
  await idbAddMany(data.entries);

  if (data.storage && typeof data.storage === "object") {
    Object.entries(data.storage).forEach(([k,v])=>{
      try { localStorage.setItem(k, String(v)); } catch {}
    });
  }
}

async function cloudFetch(url, token, opts){
  const headers = Object.assign({ "Content-Type":"application/json" }, opts?.headers || {});
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(url, { ...opts, headers, cache:"no-store" });
  return res;
}

async function cloudTest(){
  const cfg = loadCfg();
  if (!cfg.endpoint) return false;
  try {
    const res = await cloudFetch(cfg.endpoint, cfg.token, { method:"GET" });
    // 200/404 akzeptieren als "erreichbar"
    return res.status === 200 || res.status === 404;
  } catch {
    return false;
  }
}

async function cloudPush(){
  const cfg = loadCfg();
  if (!cfg.endpoint) return false;
  try {
    const data = await buildBackupJSON();
    const res = await cloudFetch(cfg.endpoint, cfg.token, { method:"PUT", body: JSON.stringify(data) });
    return res.ok;
  } catch {
    return false;
  }
}

async function cloudPull(){
  const cfg = loadCfg();
  if (!cfg.endpoint) return false;
  try {
    const res = await cloudFetch(cfg.endpoint, cfg.token, { method:"GET" });
    if (!res.ok) return false;
    const data = await res.json();
    await restoreBackupJSON(data);
    return true;
  } catch {
    return false;
  }
}
