/* utils.js – ES Module helpers (iOS/Safari safe) */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

export function isoDate(d = new Date()) {
  const dt = (d instanceof Date) ? d : new Date(d);
  const tzOff = dt.getTimezoneOffset() * 60000;
  return new Date(dt.getTime() - tzOff).toISOString().slice(0, 10);
}

export function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

export function loadJSON(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
}
export function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function htmlEscape(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function pickFileText(accept = ".json") {
  return new Promise((resolve, reject) => {
    const inp = document.createElement("input");
    inp.type = "file";
    inp.accept = accept;
    inp.onchange = async () => {
      try {
        const file = inp.files?.[0];
        if (!file) return reject(new Error("No file selected"));
        const text = await file.text();
        resolve(text);
      } catch (e) {
        reject(e);
      }
    };
    inp.click();
  });
}
