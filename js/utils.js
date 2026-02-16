// js/utils.js
window.Utils = (function(){
  const $ = (id) => document.getElementById(id);
  const isoDate = (d) => new Date(d).toISOString().slice(0,10);

  function safeJsonParse(x, fallback){
    try { return JSON.parse(x) ?? fallback; } catch { return fallback; }
  }

  function loadJSON(key, fallback){
    return safeJsonParse(localStorage.getItem(key), fallback);
  }
  function saveJSON(key, value){
    localStorage.setItem(key, JSON.stringify(value));
  }

  function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }
  function sum(arr){ return arr.reduce((s,x)=>s+(Number(x)||0),0); }

  function startOfWeekMonday(dateISO){
    const d = new Date(dateISO);
    const day = d.getDay();
    const diff = (day === 0 ? -6 : 1 - day);
    d.setDate(d.getDate() + diff);
    return isoDate(d);
  }
  function addDays(dateISO, n){
    const d = new Date(dateISO);
    d.setDate(d.getDate() + n);
    return isoDate(d);
  }

  return { $, isoDate, loadJSON, saveJSON, clamp, sum, startOfWeekMonday, addDays };
})();
