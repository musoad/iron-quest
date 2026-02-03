// XP Werte (wie dein System)
const XP_PER_SET = {
  "Mehrgelenkig": 100,
  "Unilateral": 120,
  "Komplexe": 150,
  "Core": 80,
  "Conditioning": 200,
  "NEAT": 300 // 1h Walking Desk als "1 Satz" (du kannst das später minutengenau machen)
};

function bonusXP({ rpe9, tech, pause }) {
  return (rpe9 ? 50 : 0) + (tech ? 25 : 0) + (pause ? 25 : 0);
}

function calcEntryXP(type, sets, flags) {
  const base = (XP_PER_SET[type] ?? 0) * sets;
  return base + bonusXP(flags);
}

function getTitle(level) {
  if (level >= 20) return "Iron Champion";
  if (level >= 15) return "Elite";
  if (level >= 10) return "Veteran";
  if (level >= 5) return "Krieger";
  return "Anfänger";
}

// XP → Level (einfaches Lookup)
const LEVELS = [
  { xp: 0, lvl: 1 },
  { xp: 2500, lvl: 5 },
  { xp: 6000, lvl: 10 },
  { xp: 12000, lvl: 15 },
  { xp: 20000, lvl: 20 },
];

function xpToLevel(totalXp) {
  let lvl = 1;
  for (const step of LEVELS) {
    if (totalXp >= step.xp) lvl = step.lvl;
  }
  return lvl;
}

const KEY = "ironquest_entries_v1";

function loadEntries() {
  try { return JSON.parse(localStorage.getItem(KEY)) ?? []; }
  catch { return []; }
}

function saveEntries(entries) {
  localStorage.setItem(KEY, JSON.stringify(entries));
}

function formatDate(d) {
  return new Date(d).toISOString().slice(0, 10);
}

function render() {
  const entries = loadEntries();
  const list = document.getElementById("list");
  list.innerHTML = "";

  const today = formatDate(new Date());
  let todayXp = 0;
  let totalXp = 0;

  for (const e of entries) {
    totalXp += e.xp;
    if (e.date === today) todayXp += e.xp;

    const li = document.createElement("li");
    li.textContent = `${e.date} • ${e.exercise} • ${e.type} • ${e.sets} • ${e.xp} XP`;
    list.appendChild(li);
  }

  const lvl = xpToLevel(totalXp);
  document.getElementById("todayXp").textContent = todayXp;
  document.getElementById("totalXp").textContent = totalXp;
  document.getElementById("level").textContent = lvl;
  document.getElementById("title").textContent = getTitle(lvl);
}

function init() {
  // Default Datum = heute
  const dateEl = document.getElementById("date");
  dateEl.value = formatDate(new Date());

  document.getElementById("add").addEventListener("click", () => {
    const date = dateEl.value;
    const exercise = document.getElementById("exercise").value.trim() || "Unbenannt";
    const type = document.getElementById("type").value;
    const sets = Math.max(1, parseInt(document.getElementById("sets").value || "1", 10));

    const flags = {
      rpe9: document.getElementById("rpe9").checked,
      tech: document.getElementById("tech").checked,
      pause: document.getElementById("pause").checked,
    };

    const xp = calcEntryXP(type, sets, flags);

    const entries = loadEntries();
    entries.unshift({ date, exercise, type, sets, xp });
    saveEntries(entries);

    // Reset minimal
    document.getElementById("exercise").value = "";
    document.getElementById("rpe9").checked = false;
    document.getElementById("tech").checked = false;
    document.getElementById("pause").checked = false;

    render();
  });

  document.getElementById("clear").addEventListener("click", () => {
    if (confirm("Wirklich alle Einträge löschen?")) {
      localStorage.removeItem(KEY);
      render();
    }
  });

  // PWA Service Worker
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js");
  }

  render();
}

init();

