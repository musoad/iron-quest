// js/backup.js ✅
// Offline Export/Import + optional Cloud (wenn IronQuestURLs.CLOUD_ENDPOINT gesetzt)

(function () {
  function download(filename, text) {
    const blob = new Blob([text], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function render(container, getAllDataFn, importDataFn) {
    const urls = window.IronQuestURLs || {};
    container.innerHTML = `
      <div class="card">
        <h2>🌎 Backup</h2>
        <p class="hint">Export/Import (JSON). Cloud optional über eigenen Endpoint.</p>

        <div class="row2">
          <button id="bExport" type="button">Export JSON</button>
          <label class="secondary" style="display:flex;align-items:center;gap:10px;justify-content:center;">
            Import JSON
            <input id="bImport" type="file" accept="application/json" style="display:none;">
          </label>
        </div>

        <div class="divider"></div>

        <h3>🔐 Cloud Sync (optional)</h3>
        <p class="hint">Endpoint: <b>${urls.CLOUD_ENDPOINT ? urls.CLOUD_ENDPOINT : "— (leer)"}</b></p>

        <div class="row2">
          <button id="cPush" type="button" class="secondary">Cloud PUSH</button>
          <button id="cPull" type="button" class="secondary">Cloud PULL</button>
        </div>

        <p class="hint">Cloud funktioniert nur, wenn du in <b>js/urls.js</b> deinen Endpoint einträgst.</p>
      </div>
    `;

    container.querySelector("#bExport").addEventListener("click", async () => {
      const data = await getAllDataFn();
      download("ironquest_backup.json", JSON.stringify(data, null, 2));
    });

    const fileInput = container.querySelector("#bImport");
    fileInput.addEventListener("change", async (e) => {
      const f = e.target.files?.[0];
      if (!f) return;
      const txt = await f.text();
      try {
        const data = JSON.parse(txt);
        await importDataFn(data);
        alert("Import 완료 ✅ (App neu laden)");
        location.reload();
      } catch {
        alert("Import fehlgeschlagen (ungültiges JSON).");
      }
    });

    async function cloudFetch(method, body) {
      const endpoint = urls.CLOUD_ENDPOINT;
      if (!endpoint) {
        alert("Cloud Endpoint ist leer. Trage ihn in js/urls.js ein.");
        return null;
      }
      const headers = { "Content-Type": "application/json" };
      if (urls.CLOUD_TOKEN) headers["Authorization"] = urls.CLOUD_TOKEN;
      const res = await fetch(endpoint, { method, headers, body: body ? JSON.stringify(body) : undefined });
      if (!res.ok) throw new Error("Cloud Error: " + res.status);
      return await res.json();
    }

    container.querySelector("#cPush").addEventListener("click", async () => {
      try {
        const data = await getAllDataFn();
        await cloudFetch("PUT", data);
        alert("Cloud PUSH ✅");
      } catch (e) {
        alert(String(e));
      }
    });

    container.querySelector("#cPull").addEventListener("click", async () => {
      try {
        const data = await cloudFetch("GET");
        if (!data) return;
        await importDataFn(data);
        alert("Cloud PULL ✅ (App neu laden)");
        location.reload();
      } catch (e) {
        alert(String(e));
      }
    });
  }

  window.IronQuestBackup = { render };
})();
