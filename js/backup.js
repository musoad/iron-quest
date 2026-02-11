/* =========================
   IRON QUEST v4 PRO – backup.js
   - Lokal: Export/Import JSON
   - Optional Cloud: Push/Pull zu einem Endpoint (wenn du einen hast)
   - Optional Encryption: Passphrase (AES-GCM)
   ========================= */

(function () {
  const KEY_CLOUD_CFG = "iq_cloud_cfg_v4";

  function loadJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
  }
  function saveJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function getDB() {
    return window.IronQuestDB || window.DB || null;
  }

  function downloadFile(filename, content, mime = "application/json") {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function exportSnapshot() {
    const db = getDB();
    if (!db) throw new Error("DB fehlt (IronQuestDB).");

    const entries = (typeof db.getAllEntries === "function")
      ? await db.getAllEntries()
      : (typeof db.getAll === "function")
        ? await db.getAll()
        : [];

    // Du kannst hier weitere Keys dazupacken:
    const local = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      // skip browser noise
      if (!k) continue;
      if (k.startsWith("iq_") || k.startsWith("ironquest_")) {
        local[k] = localStorage.getItem(k);
      }
    }

    return {
      version: "IRON-QUEST-v4-SNAPSHOT",
      exportedAt: new Date().toISOString(),
      entries,
      localStorage: local
    };
  }

  async function importSnapshot(snapshot) {
    const db = getDB();
    if (!db) throw new Error("DB fehlt (IronQuestDB).");

    if (!snapshot || !Array.isArray(snapshot.entries)) {
      throw new Error("Snapshot ungültig (entries fehlen).");
    }

    // 1) Entries import (addMany wenn vorhanden)
    if (typeof db.addMany === "function") {
      await db.addMany(snapshot.entries);
    } else if (typeof db.addEntry === "function") {
      for (const e of snapshot.entries) await db.addEntry(e);
    } else {
      throw new Error("DB API unterstützt kein addMany/addEntry.");
    }

    // 2) localStorage restore
    const ls = snapshot.localStorage || {};
    Object.keys(ls).forEach(k => {
      try { localStorage.setItem(k, String(ls[k])); } catch {}
    });
  }

  // ---------- Optional Cloud (Endpoint) + Encryption ----------
  async function deriveKey(passphrase, saltBytes) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      enc.encode(passphrase),
      "PBKDF2",
      false,
      ["deriveKey"]
    );
    return crypto.subtle.deriveKey(
      { name: "PBKDF2", salt: saltBytes, iterations: 150000, hash: "SHA-256" },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  }

  function b64(buf) {
    return btoa(String.fromCharCode(...new Uint8Array(buf)));
  }
  function unb64(str) {
    return Uint8Array.from(atob(str), c => c.charCodeAt(0));
  }

  async function encryptJSON(obj, passphrase) {
    const enc = new TextEncoder();
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveKey(passphrase, salt);
    const data = enc.encode(JSON.stringify(obj));
    const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, data);
    return { v: 1, salt: b64(salt), iv: b64(iv), ct: b64(ct) };
  }

  async function decryptJSON(payload, passphrase) {
    const dec = new TextDecoder();
    const salt = unb64(payload.salt);
    const iv = unb64(payload.iv);
    const ct = unb64(payload.ct);
    const key = await deriveKey(passphrase, salt);
    const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
    return JSON.parse(dec.decode(pt));
  }

  function loadCloudCfg() {
    return loadJSON(KEY_CLOUD_CFG, { endpoint: "", passphrase: "" });
  }
  function saveCloudCfg(cfg) {
    saveJSON(KEY_CLOUD_CFG, cfg);
  }

  async function cloudPush() {
    const cfg = loadCloudCfg();
    if (!cfg.endpoint) return alert("Cloud Endpoint fehlt.");
    const snap = await exportSnapshot();

    const body = cfg.passphrase
      ? await encryptJSON(snap, cfg.passphrase)
      : snap;

    const res = await fetch(cfg.endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    if (!res.ok) throw new Error(`Cloud Push failed: ${res.status}`);
    alert("✅ Cloud Backup gespeichert");
  }

  async function cloudPull() {
    const cfg = loadCloudCfg();
    if (!cfg.endpoint) return alert("Cloud Endpoint fehlt.");

    const res = await fetch(cfg.endpoint, { method: "GET" });
    if (!res.ok) throw new Error(`Cloud Pull failed: ${res.status}`);

    const data = await res.json();
    const snap = (data && data.ct && cfg.passphrase)
      ? await decryptJSON(data, cfg.passphrase)
      : data;

    // Achtung: Import fügt Entries hinzu (kein wipe)
    await importSnapshot(snap);
    alert("✅ Cloud Backup importiert");
    if (window.IronQuestApp?.renderAll) window.IronQuestApp.renderAll();
  }

  // UI Renderer (optional)
  function render(containerEl) {
    if (!containerEl) return;
    const cfg = loadCloudCfg();

    containerEl.innerHTML = `
      <div class="card">
        <h2>Backup & Sync</h2>
        <p class="hint">Lokal Export/Import. Cloud nur wenn du einen Endpoint hast.</p>

        <div class="row">
          <button class="btn" id="iqExportBtn">Export JSON</button>
          <label class="btn secondary" style="display:inline-flex;gap:8px;align-items:center;">
            Import JSON
            <input id="iqImportFile" type="file" accept="application/json" style="display:none;">
          </label>
        </div>

        <div class="divider"></div>

        <h3>Cloud (optional)</h3>
        <label class="hint">Endpoint (GET = pull, POST = push)</label>
        <input id="iqCloudEndpoint" class="input" placeholder="https://dein-endpoint.example/ironquest" value="${cfg.endpoint || ""}">

        <label class="hint" style="margin-top:10px;">Passphrase (optional, verschlüsselt)</label>
        <input id="iqCloudPass" class="input" type="password" placeholder="(optional)" value="${cfg.passphrase || ""}">

        <div class="row" style="margin-top:10px;">
          <button class="btn secondary" id="iqCloudSave">Speichern</button>
          <button class="btn" id="iqCloudPush">Cloud Push</button>
          <button class="btn" id="iqCloudPull">Cloud Pull</button>
        </div>
      </div>
    `;

    containerEl.querySelector("#iqExportBtn")?.addEventListener("click", async () => {
      try {
        const snap = await exportSnapshot();
        downloadFile(`ironquest_backup_${new Date().toISOString().slice(0,10)}.json`, JSON.stringify(snap, null, 2));
      } catch (e) {
        console.error(e);
        alert("Export fehlgeschlagen (Konsole prüfen).");
      }
    });

    containerEl.querySelector("#iqImportFile")?.addEventListener("change", async (ev) => {
      const file = ev.target.files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const snap = JSON.parse(text);
        await importSnapshot(snap);
        alert("✅ Import fertig");
        if (window.IronQuestApp?.renderAll) window.IronQuestApp.renderAll();
      } catch (e) {
        console.error(e);
        alert("Import fehlgeschlagen (Konsole prüfen).");
      } finally {
        ev.target.value = "";
      }
    });

    containerEl.querySelector("#iqCloudSave")?.addEventListener("click", () => {
      const endpoint = containerEl.querySelector("#iqCloudEndpoint")?.value?.trim() || "";
      const passphrase = containerEl.querySelector("#iqCloudPass")?.value || "";
      saveCloudCfg({ endpoint, passphrase });
      alert("✅ Cloud Settings gespeichert");
    });

    containerEl.querySelector("#iqCloudPush")?.addEventListener("click", async () => {
      try { await cloudPush(); } catch (e) { console.error(e); alert(String(e.message || e)); }
    });
    containerEl.querySelector("#iqCloudPull")?.addEventListener("click", async () => {
      try { await cloudPull(); } catch (e) { console.error(e); alert(String(e.message || e)); }
    });
  }

  window.IronQuestBackup = {
    exportSnapshot,
    importSnapshot,
    cloudPush,
    cloudPull,
    render
  };
})();
