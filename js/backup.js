/* IRON QUEST – backup.js (classic)
   ✅ Offline-safe Export/Import JSON
   ✅ Optional: Cloud Push/Pull (simple endpoint, wenn vorhanden)
*/
(function () {
  const KEY_CLOUD = "ironquest_cloud_v4";

  function loadCfg(){ return window.IQ.loadJSON(KEY_CLOUD, { url:"", token:"" }); }
  function saveCfg(v){ window.IQ.saveJSON(KEY_CLOUD, v); }

  async function exportAll(){
    const entries = await window.IronQuestDB.getAll();
    const payload = {
      version: "v4",
      exportedAt: new Date().toISOString(),
      localStorage: { ...localStorage },
      entries
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type:"application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ironquest_backup_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 1500);
  }

  async function importAll(file){
    const text = await file.text();
    const data = JSON.parse(text);

    if (!data || !Array.isArray(data.entries)) throw new Error("Ungültiges Backup.");

    // restore localStorage (safe-ish)
    if (data.localStorage && typeof data.localStorage === "object") {
      for (const [k,v] of Object.entries(data.localStorage)) {
        try { localStorage.setItem(k, String(v)); } catch {}
      }
    }

    // restore entries (overwrite)
    await window.IronQuestDB.clear();
    await window.IronQuestDB.addMany(data.entries);

    alert("Backup importiert ✅");
    document.dispatchEvent(new CustomEvent("iq:refresh"));
  }

  async function cloudPush(){
    const cfg = loadCfg();
    if (!cfg.url) return alert("Cloud URL fehlt.");
    const payload = {
      version: "v4",
      exportedAt: new Date().toISOString(),
      localStorage: { ...localStorage },
      entries: await window.IronQuestDB.getAll(),
    };

    const res = await fetch(cfg.url, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        ...(cfg.token ? { "Authorization": `Bearer ${cfg.token}` } : {})
      },
      body: JSON.stringify(payload)
    });

    if (!res.ok) throw new Error("Cloud Push fehlgeschlagen.");
    alert("Cloud Push ✅");
  }

  async function cloudPull(){
    const cfg = loadCfg();
    if (!cfg.url) return alert("Cloud URL fehlt.");

    const res = await fetch(cfg.url, {
      method: "GET",
      headers: { ...(cfg.token ? { "Authorization": `Bearer ${cfg.token}` } : {}) }
    });

    if (!res.ok) throw new Error("Cloud Pull fehlgeschlagen.");
    const data = await res.json();
    if (!data || !Array.isArray(data.entries)) throw new Error("Ungültige Cloud Daten.");

    await window.IronQuestDB.clear();
    await window.IronQuestDB.addMany(data.entries);

    // optional localStorage restore (nur wenn du willst)
    if (data.localStorage && typeof data.localStorage === "object") {
      for (const [k,v] of Object.entries(data.localStorage)) {
        try { localStorage.setItem(k, String(v)); } catch {}
      }
    }

    alert("Cloud Pull ✅");
    document.dispatchEvent(new CustomEvent("iq:refresh"));
  }

  async function render(state){
    const host = document.getElementById("backup");
    if (!host) return;

    const cfg = loadCfg();

    host.innerHTML = `
      <div class="card">
        <h2>Backup</h2>
        <p class="hint">Export/Import läuft offline. Cloud optional (PUT/GET JSON Endpoint).</p>

        <div class="row2">
          <button id="bkExport" type="button">Export JSON</button>
          <label class="secondary" style="display:flex; align-items:center; justify-content:center; gap:10px;">
            Import JSON
            <input id="bkImport" type="file" accept="application/json" style="display:none;">
          </label>
        </div>

        <div class="divider"></div>

        <h3>Cloud Sync (optional)</h3>
        <label>Cloud URL (PUT/GET)
          <input id="cloudUrl" type="url" placeholder="https://example.com/ironquest.json" value="${cfg.url || ""}">
        </label>
        <label>Token (optional)
          <input id="cloudToken" type="password" placeholder="Bearer Token (optional)" value="${cfg.token || ""}">
        </label>

        <div class="row2">
          <button id="cloudSave" class="secondary" type="button">Speichern</button>
          <button id="cloudPush" type="button">Cloud Push</button>
        </div>
        <div class="row2">
          <button id="cloudPull" class="secondary" type="button">Cloud Pull</button>
          <button id="bkDangerClear" class="danger" type="button">Alle Daten löschen</button>
        </div>

        <p class="hint">Einträge: <b>${state.entries.length}</b></p>
      </div>
    `;

    host.querySelector("#bkExport")?.addEventListener("click", exportAll);
    host.querySelector("#bkImport")?.addEventListener("change", async (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      try { await importAll(f); }
      catch (err) { alert(String(err?.message || err)); }
      e.target.value = "";
    });

    host.querySelector("#cloudSave")?.addEventListener("click", () => {
      const url = host.querySelector("#cloudUrl")?.value || "";
      const token = host.querySelector("#cloudToken")?.value || "";
      saveCfg({ url:url.trim(), token:token.trim() });
      alert("Cloud Settings gespeichert ✅");
    });

    host.querySelector("#cloudPush")?.addEventListener("click", async () => {
      try { await cloudPush(); } catch (e) { alert(String(e?.message || e)); }
    });
    host.querySelector("#cloudPull")?.addEventListener("click", async () => {
      try { await cloudPull(); } catch (e) { alert(String(e?.message || e)); }
    });

    host.querySelector("#bkDangerClear")?.addEventListener("click", async () => {
      if (!confirm("Wirklich alles löschen?")) return;
      await window.IronQuestDB.clear();
      alert("Gelöscht.");
      document.dispatchEvent(new CustomEvent("iq:refresh"));
    });
  }

  window.IronQuestBackup = { render };
})();
