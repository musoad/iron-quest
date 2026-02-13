(function(){
  const BOSSES = [
    { week:2, name:"The Foundation Beast", xp:650, rule:"5 Runden sauber." },
    { week:4, name:"The Asymmetry Lord", xp:800, rule:"Unilateral Fokus." },
    { week:6, name:"The Core Guardian", xp:900, rule:"Core sauber halten." },
    { week:8, name:"The Conditioning Reaper", xp:1100, rule:"Engine push." },
    { week:10, name:"The Iron Champion", xp:1400, rule:"Komplex clean." },
    { week:12, name:"FINAL: Iron Overlord", xp:2400, rule:"Final Week." },
  ];
  const KEY = "iq_boss_v4";

  function load(){
    try{ return JSON.parse(localStorage.getItem(KEY)) || {}; }catch{ return {}; }
  }
  function save(s){ localStorage.setItem(KEY, JSON.stringify(s)); }

  async function renderBoss(container, entries, curWeek){
    const st = load();
    container.innerHTML = `
      <div class="card">
        <h2>Boss Fights</h2>
        <p class="hint">Boss kann nur in seiner Woche “cleared” werden.</p>
        <ul class="list" id="bossList"></ul>
      </div>
    `;
    const ul = document.getElementById("bossList");
    BOSSES.forEach(b=>{
      const cleared = st[String(b.week)]?.cleared === true;
      const li = document.createElement("li");
      const locked = curWeek !== b.week;

      li.innerHTML = `
        <div class="row" style="justify-content:space-between;align-items:flex-start;">
          <div>
            <b>W${b.week}:</b> ${b.name}
            <div class="small">${b.rule} • Reward: +${b.xp} XP</div>
            <div class="small">${cleared ? "✅ Cleared" : (locked ? "🔒 Locked" : "🟢 Active")}</div>
          </div>
          <div class="row" style="margin:0;">
            <span class="badge ${cleared?"ok":locked?"warn":"ok"}">${cleared?"CLEARED":locked?"LOCKED":"READY"}</span>
            <button class="btn primary" data-clear="${b.week}" ${locked||cleared?"disabled":""} type="button">Clear</button>
          </div>
        </div>
      `;
      ul.appendChild(li);
    });

    ul.querySelectorAll("[data-clear]").forEach(btn=>{
      btn.addEventListener("click", async ()=>{
        const w = Number(btn.getAttribute("data-clear"));
        if (w !== curWeek) return alert("Boss ist gerade nicht aktiv.");
        const boss = BOSSES.find(x=>x.week===w);
        if (!boss) return;

        // add an entry
        await window.IronQuestDB.add(window.IronQuestDB.STORES.entries, {
          date: window.IQ.isoDate(new Date()),
          week: curWeek,
          exercise: `Boss CLEARED: ${boss.name}`,
          type: "Boss",
          sets: null, reps: null, minutes: null,
          xp: boss.xp,
          detail: `Boss Week ${w}`
        });

        const s = load();
        s[String(w)] = { cleared:true, date: window.IQ.isoDate(new Date()) };
        save(s);

        alert(`Boss cleared! +${boss.xp} XP ✅`);
        location.reload();
      });
    });
  }

  window.IronQuestBoss = { renderBoss };
})();
