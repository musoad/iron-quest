/* utils.js – Global Helpers + Mobile Error Overlay */

(function () {
  const IQ = (window.IQ = window.IQ || {});

  IQ.$ = (id) => document.getElementById(id);
  IQ.isoDate = (d) => new Date(d).toISOString().slice(0, 10);

  IQ.loadJSON = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  };

  IQ.saveJSON = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  };

  // ✅ Mobile debug overlay (damit du ohne Mac Fehler siehst)
  function ensureOverlay() {
    let box = document.getElementById("iqErrorBox");
    if (box) return box;

    box = document.createElement("div");
    box.id = "iqErrorBox";
    box.style.cssText = `
      position:fixed; left:12px; right:12px; bottom:12px; z-index:999999;
      background:rgba(0,0,0,.92); color:#fff; padding:12px 12px; border-radius:12px;
      font:12px/1.35 system-ui,-apple-system,Segoe UI,Roboto; display:none;
      max-height:42vh; overflow:auto; box-shadow:0 12px 30px rgba(0,0,0,.35);
      border:1px solid rgba(255,255,255,.12);
    `;
    box.innerHTML = `
      <div style="display:flex; gap:10px; align-items:center; margin-bottom:8px;">
        <b style="font-size:13px;">IRON QUEST – Fehlerlog</b>
        <button id="iqErrClose" style="margin-left:auto; padding:6px 10px; border-radius:10px; border:0; background:#222; color:#fff;">Schließen</button>
        <button id="iqErrCopy" style="padding:6px 10px; border-radius:10px; border:0; background:#222; color:#fff;">Kopieren</button>
      </div>
      <pre id="iqErrText" style="white-space:pre-wrap; margin:0;"></pre>
    `;
    document.body.appendChild(box);

    box.querySelector("#iqErrClose").onclick = () => (box.style.display = "none");
    box.querySelector("#iqErrCopy").onclick = async () => {
      const t = box.querySelector("#iqErrText").textContent || "";
      try {
        await navigator.clipboard.writeText(t);
        alert("Fehlertext kopiert ✅");
      } catch {
        alert("Kopieren nicht möglich (iOS). Bitte Screenshot machen.");
      }
    };
    return box;
  }

  function pushError(text) {
    const box = ensureOverlay();
    const pre = box.querySelector("#iqErrText");
    const now = new Date().toISOString();
    pre.textContent = `${now}\n${text}\n\n` + (pre.textContent || "");
    box.style.display = "block";
  }

  window.addEventListener("error", (e) => {
    pushError(`JS ERROR: ${e.message}\n@ ${e.filename}:${e.lineno}:${e.colno}`);
  });

  window.addEventListener("unhandledrejection", (e) => {
    const r = e.reason;
    const msg = (r && (r.stack || r.message)) ? (r.stack || r.message) : String(r);
    pushError(`PROMISE REJECTION: ${msg}`);
  });

  // optional: log helper
  IQ.log = (...args) => console.log("[IQ]", ...args);
})();
