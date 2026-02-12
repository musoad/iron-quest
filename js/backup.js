/* =========================
   IRON QUEST – backup.js (FULL)
   - Export/Import lokal (JSON Datei)
   - Optional: Remote Backup wenn URL gesetzt
========================= */
(function () {
  const KEY = "ironquest_backup_meta_v1";

  async function exportAll() {
    const db = window.IronQuestDB;
    if (!db) throw new Error("DB Modul fehlt (IronQuestDB).");

    const entries = await db.getAllEntries();
    const health = (window.IronQuestHealth?.getAll?.() || []);
    const skill = (window.IronQuestSkilltree?.getState?.() || null);

    const payload = {
      meta: { app: "IRON QUEST", version: "v4", exportedAt: new Date().toISOString() },
      entries,
      health,
      skill
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ironquest-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    IQ.saveJSON(KEY, { lastExportAt: new Date().toISOString() });
    IQ.toast("Backup exportiert ✅");
  }

  async function importAllFromFile(file) {
    const text = await file.text();
    const data = IQ.safeJSONParse(text, null);
    if (!data || typeof data !== "object") throw new Error("Ungültige Backup-Datei.");

    const db = window.IronQuestDB;
    if (!db) throw new Error("DB Modul fehlt (IronQuestDB).");

    // Sicherheit: nur arrays akzeptieren
    const entries = Array.isArray(data.entries) ? data.entries : [];
    const health = Array.isArray(data.health) ? data.health : [];

    const ok = confirm(
      "Import startet.\n\n" +
      "✅ Einträge werden hinzugefügt (du bekommst nichts automatisch gelöscht).\n" +
      "⚠️ Wenn du doppelte Imports machst, entstehen Duplikate.\n\n" +
      "Fortfahren?"
    );
    if (!ok) return;

    // add entries
    for (const e of entries) {
      // minimal sanitize
      if (!e || !e.date) continue;
      await db.addEntry({
        date: e.date,
        exercise: e.exercise || "Unbekannt",
        type: e.type || "Other",
        week: e.week || 1,
        xp: Number(e.xp || 0),
        details: e.details || e.detail || ""
      });
    }

    // health
    if (window.IronQuestHealth?.importAll) {
      window.IronQuestHealth.importAll(health);
    }

    IQ.toast("Import abgeschlossen ✅");
    IQ.emit("iq:dataChanged");
  }

  async function remoteBackupPush() {
    const endpoint = (window.IronQuestURLS?.BACKUP_ENDPOINT || "").trim();
    if (!endpoint) return alert("BACKUP_ENDPOINT ist leer. (js/urls.js)");

    const db = window.IronQuestDB;
    const entries = await db.getAllEntries();
    const health = (window.IronQuestHealth?.getAll?.() || []);
    const skill = (window.IronQuestSkilltree?.getState?.() || null);

    const payload = {
      meta: { app: "IRON QUEST", version: "v4", pushedAt: new Date().toISOString() },
      entries,
      health,
      skill
    };

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error("Remote Backup fehlgeschlagen: " + res.status);
    IQ.toast("Online Backup gesendet ✅");
  }

  function renderBackupPanel(el) {
    el.innerHTML = `
      <h2>Backup</h2>
      <p class="hint">Lokaler Export/Import (JSON). Optional: Online Backup, wenn du einen Endpoint setzt.</p>

      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        <button id="bkExport">Backup exportieren</button>
        <button id="bkImport">Backup importieren</button>
        <button id="bkRemote" class="secondary">Online Backup senden</button>
      </div>

      <input id="bkFile" type="file" accept="application/json" style="display:none;" />

      <div class="hint" style="margin-top:12px;">
        <b>Hinweis:</b> Online Backup benötigt <code>BACKUP_ENDPOINT</code> in <code>js/urls.js</code>.
      </div>
    `;

    el.querySelector("#bkExport").onclick = () => exportAll().catch(e => {
      console.error(e);
      alert("Export Fehler: " + e.message);
    });

    el.querySelector("#bkImport").onclick = () => el.querySelector("#bkFile").click();

    el.querySelector("#bkFile").onchange = async (ev) => {
      const f = ev.target.files?.[0];
      if (!f) return;
      try {
        await importAllFromFile(f);
      } catch (e) {
        console.error(e);
        alert("Import Fehler: " + e.message);
      } finally {
        ev.target.value = "";
      }
    };

    el.querySelector("#bkRemote").onclick = () => remoteBackupPush().catch(e => {
      console.error(e);
      alert("Online Backup Fehler: " + e.message);
    });
  }

  window.IronQuestBackup = { renderBackupPanel };
})();
