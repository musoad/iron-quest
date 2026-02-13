// js/boss.js ✅

(function () {
  const KEY = "ironquest_boss_state_v1";

  const BOSSES = [
    { week: 2, name: "The Foundation Beast", xp: 650, desc: "Basis stabilisieren." },
    { week: 4, name: "The Asymmetry Lord", xp: 800, desc: "Unilateral Challenge." },
    { week: 6, name: "The Core Guardian", xp: 900, desc: "Core unter Druck." },
    { week: 8, name: "The Conditioning Reaper", xp: 1100, desc: "Engine Test." },
    { week: 10, name: "The Iron Champion", xp: 1400, desc: "Komplex & Intensität." },
    { week: 12, name: "FINAL: Iron Overlord", xp: 2400, desc: "Finale Woche." }
  ];

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
  }
  function save(m) { localStorage.setItem(KEY, JSON.stringify(m)); }

  function render(container, entries, week, addEntryFn) {
    const boss = BOSSES.find(b => b.week === week) || null;
    const st = load();
    const cleared = boss ? (st[String(week)]?.cleared === true) : false;

    container.innerHTML = `
      <div class="card">
        <h2>👹 Boss</h2>
        ${boss ? `
          <div class="pill"><b>W${week} Boss:</b> ${boss.name} • +${boss.xp} XP</div>
          <p class="hint">${boss.desc}</p>
          <button id="bossClear" type="button" ${cleared ? "disabled" : ""}>
            ${cleared ? "Cleared ✅" : "Boss Clear (XP bekommen)"}
          </button>
        ` : `
          <p class="hint">Diese Woche hat keinen Boss. (Boss Wochen: 2/4/6/8/10/12)</p>
        `}
        <div class="divider"></div>
        <h3>Boss Historie</h3>
        <ul class="list" id="bossHist"></ul>
      </div>
    `;

    const hist = container.querySelector("#bossHist");
    hist.innerHTML = "";
    BOSSES.forEach(b => {
      const c = st[String(b.week)]?.cleared === true;
      const li = document.createElement("li");
      li.innerHTML = `<div class="entryRow"><div style="min-width:0;"><b>W${b.week}</b> • ${b.name}<div class="hint">${b.desc}</div></div>
        <span class="badge">${c ? "CLEARED" : "OPEN"}</span></div>`;
      hist.appendChild(li);
    });

    const btn = container.querySelector("#bossClear");
    if (btn) {
      btn.addEventListener("click", async () => {
        if (!boss) return;
        const ok = confirm(`Boss wirklich clearen? +${boss.xp} XP`);
        if (!ok) return;

        await addEntryFn({
          date: window.IronQuestProgression.isoDate(new Date()),
          week,
          exercise: `Boss CLEARED: ${boss.name}`,
          type: "Boss",
          sets: 0,
          reps: 0,
          minutes: 0,
          notes: boss.desc,
          xp: boss.xp
        });

        const s2 = load();
        s2[String(week)] = { cleared: true, at: window.IronQuestProgression.isoDate(new Date()) };
        save(s2);

        alert("Boss cleared ✅");
      });
    }
  }

  window.IronQuestBoss = { render };
})();
