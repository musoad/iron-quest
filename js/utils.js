/* =========================
   IRON QUEST – utils.js (FULL)
   Fix:
   - exports: clamp, loadJSON, saveJSON (werden von progression.js etc. gebraucht)
   - plus: $, isoDate, fmt, safeText
========================= */

export const $ = (id) => document.getElementById(id);

export const isoDate = (d = new Date()) => {
  try { return new Date(d).toISOString().slice(0, 10); }
  catch { return new Date().toISOString().slice(0, 10); }
};

export const clamp = (n, min, max) => {
  const x = Number(n);
  if (Number.isNaN(x)) return min;
  return Math.max(min, Math.min(max, x));
};

export function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    const v = JSON.parse(raw);
    return v ?? fallback;
  } catch {
    return fallback;
  }
}

export function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore (private mode / quota)
  }
}

export const fmt = (n) => {
  const x = Number(n);
  if (Number.isNaN(x)) return "0";
  return Math.round(x).toLocaleString("de-DE");
};

export function safeText(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
