(function(){
  const KEY = "iq_challenges_v4";

  const DEFAULT = [
    { id:"c1", name:"7-Day Streak", desc:"7 Tage in Folge trainieren.", goal:7, type:"streak" },
    { id:"c2", name:"10k XP Week", desc:"In einer Woche 10.000 XP erreichen.", goal:10000, type:"weekxp" },
    { id:"c3", name:"NEAT King", desc:"300 Minuten Walking Desk sammeln.", goal:300, type:"neatmin" }
  ];

  function load(){
    try{ return JSON.parse(localStorage.getItem(KEY)) || DEFAULT; }catch{ return DEFAULT; }
  }
  function save(v){ localStorage.setItem(KEY, JSON.stringify(v)); }

  function renderChallenge(container, entries, curWeek, streakCount){
    const ch = load();
    // compute week xp and neat minutes
    let weekXP = 0;
    let neatMin = 0;
    for (const e of entries){
      if (e.week === curWeek) weekXP += (e.xp||0);
      if (e.type === "NEAT") neatMin += Number(e.minutes||0);
    }

    container.innerHTML = `
      <div class="card">
        <h2>Challenge Mode</h2>
        <p class="hint">Mini-Challenges für Motivation. (Alles offline)</p>
        <ul class="list" id="chList"></ul>
      </div>
    `;

    const ul = document.getElementById("chList");
    ch.forEach(c=>{
      let prog = 0;
      if (c.type === "streak") prog = streakCount;
      if (c.type === "weekxp") prog = weekXP;
      if (c.type === "neatmin") prog = neatMin;

      const done = prog >= c.goal;
      const pct = Math.max(0, Math.min(100, Math.round((prog/c.goal)*100)));

      const li = document.createElement("li");
      li.innerHTML = `
        <div class="row" style="justify-content:space-between;align-items:center;">
          <div>
            <b>${c.name}</b> ${done?`<span class="badge ok">DONE</span>`:""}
            <div class="small">${c.desc}</div>
            <div class="small">Progress: ${prog} / ${c.goal} (${pct}%)</div>
          </div>
          <button class="btn danger" data-reset="${c.id}" type="button">Reset</button>
        </div>
      `;
      ul.appendChild(li);
    });

    ul.querySelectorAll("[data-reset]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        if (!confirm("Challenge reset?")) return;
        const id = btn.getAttribute("data-reset");
        const fresh = DEFAULT.map(x=>({ ...x }));
        save(fresh);
        alert("Challenges zurückgesetzt ✅");
        location.reload();
      });
    });
  }

  window.IronQuestChallenges = { renderChallenge };
})();
