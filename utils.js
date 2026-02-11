// utils.js
export const $ = (id) => document.getElementById(id);
export const qs = (s, root = document) => root.querySelector(s);
export const qsa = (s, root = document) => Array.from(root.querySelectorAll(s));

export function isoDate(d = new Date()) {
  const dd = d instanceof Date ? d : new Date(d);
  return dd.toISOString().slice(0, 10);
}

export function clamp(n, a, b) {
  n = Number(n || 0);
  return Math.max(a, Math.min(b, n));
}

export function loadJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch { return fallback; }
}
export function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function safeText(v) {
  return String(v ?? "").replace(/[<>&]/g, (m) => ({ "<":"&lt;", ">":"&gt;", "&":"&amp;" }[m]));
}

export function todayISO() { return isoDate(new Date()); }

export function addDays(dateISO, n) {
  const d = new Date(dateISO);
  d.setDate(d.getDate() + n);
  return isoDate(d);
}

export function startOfWeekMonday(dateISO) {
  const d = new Date(dateISO);
  const day = d.getDay(); // 0 Sun
  const diffToMon = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diffToMon);
  return isoDate(d);
}

export function debounce(fn, ms = 120) {
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}
