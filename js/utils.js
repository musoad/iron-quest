export const $ = (id) => document.getElementById(id);

export function isoDate(d = new Date()) {
  return new Date(d).toISOString().slice(0, 10);
}

export function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

export function loadJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}

export function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function fmt(n) {
  const x = Number(n || 0);
  return x.toLocaleString("de-DE");
}

export function safeText(s) {
  return String(s ?? "").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export function sum(arr) {
  return arr.reduce((a, b) => a + (Number(b) || 0), 0);
}
