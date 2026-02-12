// js/utils.js
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function isoDate(d = new Date()) {
  const x = (d instanceof Date) ? d : new Date(d);
  return x.toISOString().slice(0, 10);
}

export function addDays(dateISO, n) {
  const d = new Date(dateISO);
  d.setDate(d.getDate() + n);
  return isoDate(d);
}

// Monday-based week start
export function startOfWeekMonday(dateISO) {
  const d = new Date(dateISO);
  const day = d.getDay(); // 0=Sun..6=Sat
  const diffToMon = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diffToMon);
  return isoDate(d);
}

export function safeNum(v, fallback = 0) {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

export function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}
