/* boss.js – minimal boss system (ES Module) */

import { isoDate, loadJSON, saveJSON } from "./utils.js";

const KEY_BOSS = "iq_boss_v4";

const BOSSES = [
  { week: 2,  name: "The Foundation Beast", xp: 650 },
  { week: 4,  name: "The Asymmetry Lord",   xp: 800 },
  { week: 6,  name: "The Core Guardian",    xp: 900 },
  { week: 8,  name: "The Conditioning Reaper", xp: 1100 },
  { week: 10, name: "The Iron Champion",    xp: 1400 },
  { week: 12, name: "FINAL: Iron Overlord", xp: 2400 },
];

function getBossState() {
  const base = {};
  BOSSES.forEach(b => base[b.week] = { cleared: false, at: null });
  const st = loadJSON(KEY_BOSS, base);
  for (const b of BOSSES) st[b.week] ??= { cleared: false, at: null };
  return st;
}
function saveBossState(st) {
  saveJSON(KEY_BOSS, st);
}

export function renderBossPanel(container, player, entries, onClearBoss) {
  if (!container) return;
  const st = getBossState();
  const curW = player.week || 1;

  container.innerHTML = `
    <div class="card">
      <h2>Boss</h2>
      <p class="hint">Boss kann nur in der richtigen Woche gecleared werden.</p>
      <div class="pill"><b>Aktuelle Woche:</b> W${curW}</div>
    </div>

    <div class="card">
      <ul id="bossList" class="skilllist"></ul>
      <button class="danger" id="bossReset">Boss-Status reset</button>
    </div>
  `;

  const ul = container.querySelector("#bossList");
  ul.innerHTML = "";

  BOSSES.forEach(b => {
    const s = st[b.week];
    const locked = curW !== b.week;
    const li = document.createElement("li");
    li.innerHTML = `
      <div class="entryRow">
        <div style="min-width:0;">
          <div class="entryTitle"><b>W${b.week}:</b> ${b.name}</div>
          <div class="hint">Reward XP: +${b.xp} • Status: ${s.cleared ? "✅ CLEARED" : locked ? "🔒 LOCKED" : "🟢 OPEN"}</div>
          ${s.at ? `<div class="hint">Cleared am: ${s.at}</div>` : ""}
        </div>
        <div class="row" style="margin:0;">
          <button class="secondary" data-clear="${b.week}" ${locked || s.cleared ? "disabled":""}>Clear</button>
        </div>
      </div>
    `;
    ul.appendChild(li);
  });

  ul.querySelectorAll("[data-clear]").forEach(btn => {
    btn.addEventListener("click", () => {
      const w = parseInt(btn.getAttribute("data-clear"), 10);
      if (w !== curW) return alert("Locked – nicht die richtige Woche.");
      const boss = BOSSES.find(x => x.week === w);
      if (!boss) return;

      // callback: app adds entries
      onClearBoss?.(boss);

      const st2 = getBossState();
      st2[w] = { cleared: true, at: isoDate(new Date()) };
      saveBossState(st2);

      renderBossPanel(container, player, entries, onClearBoss);
      alert(`Boss cleared! +${boss.xp} XP ✅`);
    });
  });

  container.querySelector("#bossReset")?.addEventListener("click", () => {
    if (!confirm("Boss-Status resetten?")) return;
    localStorage.removeItem(KEY_BOSS);
    renderBossPanel(container, player, entries, onClearBoss);
  });
}
