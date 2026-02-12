/* =========================
   IRON QUEST – utils.js (iOS-safe, FULL)
   - Keine Module / Exports
   - Kleine Helpers + EventBus + Storage
========================= */
(function () {
  const IQ = {};

  IQ.$ = (sel) => document.querySelector(sel);
  IQ.$$ = (sel) => Array.from(document.querySelectorAll(sel));

  IQ.iso = (d) => {
    const dt = d instanceof Date ? d : new Date(d);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, "0");
    const day = String(dt.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  IQ.nowISO = () => IQ.iso(new Date());

  IQ.safeJSONParse = (s, fallback) => {
    try { return JSON.parse(s); } catch { return fallback; }
  };

  IQ.loadJSON = (key, fallback) => {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return IQ.safeJSONParse(raw, fallback);
  };

  IQ.saveJSON = (key, value) => {
    localStorage.setItem(key, JSON.stringify(value));
  };

  IQ.toast = (msg) => {
    try {
      let el = document.getElementById("iqToast");
      if (!el) {
        el = document.createElement("div");
        el.id = "iqToast";
        el.style.position = "fixed";
        el.style.left = "50%";
        el.style.bottom = "18px";
        el.style.transform = "translateX(-50%)";
        el.style.padding = "10px 14px";
        el.style.borderRadius = "14px";
        el.style.background = "rgba(0,0,0,0.75)";
        el.style.color = "white";
        el.style.fontSize = "14px";
        el.style.zIndex = "9999";
        el.style.maxWidth = "92vw";
        el.style.textAlign = "center";
        el.style.backdropFilter = "blur(8px)";
        document.body.appendChild(el);
      }
      el.textContent = msg;
      el.style.opacity = "1";
      clearTimeout(IQ._toastT);
      IQ._toastT = setTimeout(() => { el.style.opacity = "0"; }, 1600);
    } catch {
      alert(msg);
    }
  };

  // Tiny Event Bus
  const listeners = {};
  IQ.on = (evt, fn) => {
    listeners[evt] ??= [];
    listeners[evt].push(fn);
  };
  IQ.emit = (evt, payload) => {
    (listeners[evt] || []).forEach(fn => {
      try { fn(payload); } catch (e) { console.error(e); }
    });
  };

  // Simple streak from entries (any entry per day counts)
  IQ.computeStreak = (entries) => {
    const days = new Set((entries || []).map(e => e.date).filter(Boolean));
    if (!days.size) return { streak: 0, best: 0 };

    const sorted = Array.from(days).sort(); // asc YYYY-MM-DD
    let best = 1, cur = 1;

    function dayToNum(iso) {
      const d = new Date(iso + "T00:00:00");
      return Math.floor(d.getTime() / 86400000);
    }

    for (let i = 1; i < sorted.length; i++) {
      const a = dayToNum(sorted[i - 1]);
      const b = dayToNum(sorted[i]);
      if (b === a + 1) cur++;
      else cur = 1;
      if (cur > best) best = cur;
    }

    // current streak ending today
    const today = dayToNum(IQ.nowISO());
    const last = dayToNum(sorted[sorted.length - 1]);

    let streak = 0;
    if (last === today || last === today - 1) {
      // walk backwards
      streak = 1;
      for (let i = sorted.length - 1; i > 0; i--) {
        const prev = dayToNum(sorted[i - 1]);
        const curd = dayToNum(sorted[i]);
        if (curd === prev + 1) streak++;
        else break;
      }
      // if last is yesterday, streak still valid but doesn’t include today yet
      if (last === today - 1) {
        // keep streak as-is
      }
    } else {
      streak = 0;
    }

    return { streak, best };
  };

  window.IQ = IQ;
})();
