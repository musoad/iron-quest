// statusIcons.js
import { loadJSON, saveJSON } from "./utils.js";

const KEY_STATUS = "iq_status_v3";

function loadStatus(){ return loadJSON(KEY_STATUS, {}); }
function saveStatus(s){ saveJSON(KEY_STATUS, s); }

function key(week, dayKey, idx){ return `${week}|${dayKey}|${idx}`; }

export function getStatus(week, dayKey, idx){
  const s = loadStatus();
  return s[key(week, dayKey, idx)] || "white"; // green/white/red
}

export function setStatus(week, dayKey, idx, value){
  const s = loadStatus();
  s[key(week, dayKey, idx)] = value;
  saveStatus(s);
}

export function statusIcon(value){
  if (value === "green") return "🟢";
  if (value === "red") return "🔴";
  return "⚪";
}

export function nextStatus(value){
  if (value === "white") return "green";
  if (value === "green") return "red";
  return "white";
}
