/* =========================
   IRON QUEST — Boss System (v5 stable)
   ✅ Boss nur in eigener Woche clearbar
   ✅ Clear erzeugt XP-Entry in IndexedDB (entries)
   ✅ Fortschritt bleibt localStorage
========================= */

(() => {
  "use strict";

  const KEY = "ironquest_boss_state_v5";

  const BOSSES = [
    { week: 2,  name: "Foundation Beast",      xp: 650,  rule: "Saubere Technik, 90s Pause", reward: "Titel: Foundation Slayer" },
    { week: 4,  name: "Asymmetry Lord",        xp: 800,  rule: "Unilateral Fokus",          reward: "+1 STA (Flavor)" },
    { week: 6,  name: "Core Guardian",         xp: 900,  rule: "Core-Disziplin",            reward: "+1 MOB (Flavor)" },
    { week: 8,  name: "Conditioning Reaper",   xp: 1100, rule: "Pace halten",               reward: "+1 END (Flavor)" },
    { week: 10, name: "Iron Champion",         xp: 1400, rule: "Komplex sauber",            reward: "Titel: Iron Challenger" },
    { week: 12, name: "FINAL: Iron Overlord",  xp: 2400, rule: "Finale Woche",              reward: "Titel: IRON OVERLORD" },
  ];

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
    catch { return {}; }
  }
  function save(st) {
    localStorage.setItem(KEY, JSON.stringify(st));
  }

  function bossUnlocked(curWeek, bossWeek) {
    return Number(curWeek) === Number(bossWeek);
  }

  async function awardBossXP(boss) {
    const date = (window.Utils?.isoDate ? window.Utils.isoDate(new Date()) : new Date().toISOString().slice(0, 10));
    const week = boss.week;

    await window.IronDB.addEntry({
      date,
      week,
      type: "Boss",
      exercise: `Boss: ${boss.name}`,
      detail: `${boss.rule} • Reward: ${boss.reward}`,
      xp: boss.xp
    });
  }

  async function renderBoss(el) {
    const curWeek = window.IronQuestProgression?.getWeekNumber ? window.IronQuestProgression.getWeekNumber() : 1;
    const state = load();

    el.innerHTML = `
      <div class="card">
        <h2>Boss</h2>
        <p class="hint">Boss ist nur in seiner Woche clearbar. Clear gibt XP + Reward.</p>
        <div class="pill"><b>Aktuelle Woche:</b> W${curWeek}</div>
      </div>

      <div class="card">
        <h2>Boss-Liste</h2>
        <div id="bossList"></div>
      </div>
    `;

    const list = el.querySelector("#bossList");
    list.innerHTML = "";

    BOSSES.forEach((b) => {
      const cleared = !!state[b.week]?.cleared;
      const unlocked = bossUnlocked(curWeek, b.week);

      const row = document.createElement("div");
      row.className = "bossRow";
      row.innerHTML = `
        <div style="min-width:0;">
          <div class="bossTitle">W${b.week} — ${b.name}</div>
          <div class="hint">${b.rule}</div>
          <div class="hint">Reward: ${b.reward} • <b>+${b.xp} XP</b></div>
          ${cleared ? `<div class="hint">✅ Cleared am: ${state[b.week].date}</div>` : ``}
          ${!unlocked ? `<div class="hint">🔒 Locked — nur in Woche ${b.week}</div>` : `<div class="hint">✅ Diese Woche aktiv</div>`}
        </div>
        <div class="bossActions">
          <span class="badge ${cleared ? "ok" : (unlocked ? "no" : "lock")}">
            ${cleared ? "CLEARED" : (unlocked ? "OPEN" : "LOCKED")}
          </span>
          <button class="secondary" ${(!unlocked || cleared) ? "disabled" : ""} data-clear="${b.week}">
            Clear
          </button>
        </div>
      `;
      list.appendChild(row);
    });

    list.querySelectorAll("[data-clear]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const w = Number(btn.getAttribute("data-clear"));
        const boss = BOSSES.find(x => x.week === w);
        if (!boss) return;

        const curWeek2 = window.IronQuestProgression?.getWeekNumber ? window.IronQuestProgression.getWeekNumber() : 1;
        if (curWeek2 !== w) return alert(`Locked. Aktuell W${curWeek2}. Boss nur in W${w}.`);

        const ok = confirm(`Boss clearen?\n\n${boss.name}\n+${boss.xp} XP\nReward: ${boss.reward}`);
        if (!ok) return;

        await awardBossXP(boss);

        const st = load();
        st[w] = { cleared: true, date: (window.Utils?.isoDate ? window.Utils.isoDate(new Date()) : new Date().toISOString().slice(0, 10)) };
        save(st);

        alert(`✅ Boss cleared: ${boss.name} (+${boss.xp} XP)`);
        await renderBoss(el);
      });
    });
  }

  window.IronQuestBoss = { renderBoss };
})();
