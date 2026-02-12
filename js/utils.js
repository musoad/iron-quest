/* IRON QUEST – utils.js (classic) */
(function () {
  const $ = (id) => document.getElementById(id);

  const isoDate = (d) => {
    const x = (d instanceof Date) ? d : new Date(d);
    return new Date(Date.UTC(x.getFullYear(), x.getMonth(), x.getDate())).toISOString().slice(0, 10);
  };

  function loadJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  }
  function saveJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

  window.IQ = { $, isoDate, loadJSON, saveJSON, clamp };
})();
