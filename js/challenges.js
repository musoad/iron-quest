/* =========================
   IRON QUEST — Challenges (FULL)
   ✅ Challenges mit Progress
   ✅ Completion gibt XP Entry
   ✅ Speicherung localStorage
========================= */

(() => {
  const KEY = "ironquest_challenges_v1";

  const CHALLENGES = [
    { id:"c1", title:"5 Tage Training",     desc:"In einer Woche an 5 Tagen XP sammeln.", xp: 500 },
    { id:"c2", title:"2x ⭐⭐⭐",            desc:"In einer Woche 2 Tage mit ⭐⭐⭐ erreichen.", xp: 600 },
    { id:"c3", title:"7 Tage Streak",      desc:"7 Tage in Folge XP sammeln (auch Joggen zählt).", xp: 700 },
    { id:"c4", title:"10000 XP Total",     desc:"Insgesamt 10.000 XP erreichen.", xp: 800 },
  ];

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
    catch { return {}; }
  }
  function save(st) {
    localStorage.setItem(KEY, JSON.stringify(st));
  }

  async function awardChallengeXP(ch) {
    const date = (window.Utils?.isoDate ? window.Utils.isoDate(new Date()) : new Date().toISOString().slice(0,10));
    const week = window.IronQuestProgression?.getWeekNumber ? window.IronQuestProgression.getWeekNumber() : 1;

    await window.IronDB.addEntry({
      date,
      week,
      type: "Challenge",
      exercise: `Challenge: ${ch.title}`,
      detail: ch.desc,
      xp: ch.xp
    });
  }

  async function computeChallengeProgress(entries) {
    const totalXp = entries.reduce((s,e)=>s+(e.xp||0),0);

    const curWeek = window.IronQuestProgression?.getWeekNumber ? window.IronQuestProgression.getWeekNumber() : 1;
    const weekEntries = entries.filter(e => (e.week||1) === curWeek);

    // 5 training days (any day with XP > 0)
    const days = new Set(weekEntries.filter(e => (e.xp||0) > 0).map(e => e.date));
    const trainingDays = days.size;

    // ⭐⭐⭐ days (use your existing stars helper if present)
    let threeStarDays = 0;
    if (window.IronQuestProgression?.starsForDay) {
      const dayXp = {};
      for (const e of weekEntries) dayXp[e.date] = (dayXp[e.date]||0) + (e.xp||0);
      Object.values(dayXp).forEach(xp => {
        const s = window.IronQuestProgression.starsForDay(xp);
        if (s === "⭐⭐⭐") threeStarDays++;
      });
    }

    // streak
    const streak = window.IronQuestStreak?.getStreakState ? window.IronQuestStreak.getStreakState(entries).streak : 0;

    return { totalXp, trainingDays, threeStarDays, streak };
  }

  async function renderChallenges(el) {
    const entries = await window.IronDB.getAllEntries();
    const st = load();
    const prog = await computeChallengeProgress(entries);

    el.innerHTML = `
      <div class="card">
        <h2>Challenge Mode</h2>
        <p class="hint">Challenges geben Bonus-XP. Joggen zählt auch.</p>
        <div class="row2">
          <div class="pill"><b>Trainingstage (Woche):</b> ${prog.trainingDays}/5</div>
          <div class="pill"><b>⭐⭐⭐ Tage (Woche):</b> ${prog.threeStarDays}/2</div>
        </div>
        <div class="row2">
          <div class="pill"><b>Streak:</b> ${prog.streak}/7</div>
          <div class="pill"><b>Total XP:</b> ${Math.round(prog.totalXp)}/10000</div>
        </div>
      </div>

      <div class="card">
        <h2>Challenges</h2>
        <div id="chList"></div>
      </div>
    `;

    const list = el.querySelector("#chList");
    list.innerHTML = "";

    CHALLENGES.forEach((c) => {
      const done = !!st[c.id]?.done;

      let okNow = false;
      if (c.id === "c1") okNow = prog.trainingDays >= 5;
      if (c.id === "c2") okNow = prog.threeStarDays >= 2;
      if (c.id === "c3") okNow = prog.streak >= 7;
      if (c.id === "c4") okNow = prog.totalXp >= 10000;

      const row = document.createElement("div");
      row.className = "bossRow";
      row.innerHTML = `
        <div style="min-width:0;">
          <div class="bossTitle">${c.title}</div>
          <div class="hint">${c.desc}</div>
          <div class="hint"><b>+${c.xp} XP</b></div>
          ${done ? `<div class="hint">✅ Completed</div>` : (okNow ? `<div class="hint">✅ Ready to claim</div>` : `<div class="hint">⏳ In progress</div>`)}
        </div>
        <div class="bossActions">
          <span class="badge ${done ? "ok" : (okNow ? "no" : "lock")}">${done ? "DONE" : (okNow ? "CLAIM" : "LOCKED")}</span>
          <button class="secondary" ${(!okNow || done) ? "disabled" : ""} data-claim="${c.id}">Claim</button>
        </div>
      `;
      list.appendChild(row);
    });

    list.querySelectorAll("[data-claim]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = btn.getAttribute("data-claim");
        const ch = CHALLENGES.find(x => x.id === id);
        if (!ch) return;

        const ok = confirm(`Challenge claimen?\n\n${ch.title}\n+${ch.xp} XP`);
        if (!ok) return;

        await awardChallengeXP(ch);

        const st2 = load();
        st2[id] = { done: true, date: (window.Utils?.isoDate ? window.Utils.isoDate(new Date()) : new Date().toISOString().slice(0,10)) };
        save(st2);

        alert(`✅ Challenge abgeschlossen: ${ch.title} (+${ch.xp} XP)`);
        await renderChallenges(el);
      });
    });
  }

  window.IronQuestChallenges = { renderChallenges };
})();
