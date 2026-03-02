(() => {
  "use strict";
  const KEY="ironquest_boss_state_v5";

  const BOSSES = [
    { week:2,  name:"Foundation Beast", hp: 7000,  xp:650,  rule:"Leg Day clean", reward:"Title: Gate Opener" },
    { week:4,  name:"Asymmetry Lord",   hp: 9000,  xp:800,  rule:"Unilateral discipline", reward:"Title: Shadow Grinder" },
    { week:6,  name:"Core Guardian",    hp: 10000, xp:900,  rule:"Core without mercy", reward:"Title: Core Guardian" },
    { week:8,  name:"Abyss Reaper",     hp: 12000, xp:1100, rule:"Conditioning week", reward:"Title: Abyss Runner" },
    { week:10, name:"Iron Champion",    hp: 15000, xp:1400, rule:"Full Body mastery", reward:"Title: Iron Champion" },
    { week:12, name:"MONARCH",          hp: 20000, xp:2400, rule:"Final trial", reward:"Title: MONARCH" },
  ];

  function load(){ try{ return JSON.parse(localStorage.getItem(KEY))||{}; }catch{ return {}; } }
  function save(st){ localStorage.setItem(KEY, JSON.stringify(st)); }

  async function awardBossXP(b){
    const date=window.Utils.isoDate(new Date());
    const week=b.week;
    await window.IronDB.addEntry({
      date, week,
      type:"Boss",
      exercise:`Boss: ${b.name}`,
      detail:`${b.rule} • Reward: ${b.reward}`,
      xp:b.xp
    });
  }

  async function renderBoss(el){
    const curWeek = window.IronQuestProgression.getWeekNumber();
    const state = load();
    const entries = await window.IronDB.getAllEntries();

    el.innerHTML=`
      <div class="card">
        <h2>Dungeon Boss</h2>
        <p class="hint">Boss ist nur in seiner Woche clearbar. Clear gibt XP + Titel + Chests.</p>
        <div class="pill"><b>Aktuelle Woche:</b> W${curWeek}</div>
      </div>

      <div class="card">
        <h2>Boss-Liste</h2>
        <div id="bossList"></div>
      </div>
    `;

    const list=el.querySelector("#bossList");
    list.innerHTML="";

    BOSSES.forEach(b=>{
      const weekXp = entries.filter(e=>Number(e.week||0)===b.week).reduce((s,e)=>s+Number(e.xp||0),0);
      const dmg = Math.min(b.hp, Math.round(weekXp * 0.9));
      const pct = Math.max(0, Math.min(100, (dmg / b.hp) * 100));

      const cleared=!!state[b.week]?.cleared;
      const unlocked=Number(curWeek)===Number(b.week);

      const row=document.createElement("div");
      row.className="bossRow";
      row.innerHTML=`
        <div style="min-width:0;">
          <div class="bossTitle">W${b.week} — ${b.name}</div>
          <div class="hint">${b.rule}</div>
          <div class="hint">Reward: 2 Chests • <b>+${b.xp} XP</b></div>
          ${cleared?`<div class="hint">✅ Cleared: ${state[b.week].date}</div>`:""}
          ${!unlocked?`<div class="hint">🔒 Locked — nur in Woche ${b.week}</div>`:`<div class="hint">✅ Diese Woche aktiv</div>`}
        </div>
        <div class="bossActions">
          <span class="badge ${cleared?"ok":(unlocked?"gold":"lock")}">${cleared?"CLEARED":(unlocked?"OPEN":"LOCKED")}</span>
          <button class="secondary" ${(!unlocked||cleared||pct<100)?"disabled":""} data-clear="${b.week}">Clear</button>
        </div>
      `;
      list.appendChild(row);
    });

    list.querySelectorAll("[data-clear]").forEach(btn=>{
      btn.onclick=async()=>{
        const w=Number(btn.dataset.clear);
        const b=BOSSES.find(x=>x.week===w);
        if(!b) return;
        const cur=window.IronQuestProgression.getWeekNumber();
        if(cur!==w) return window.Toast?.toast("Locked", `Boss nur in W${w}`);
        await awardBossXP(b);
        window.IronQuestLoot?.addChest?.(2);
        const st=load();
        st[w]={cleared:true, date: window.Utils.isoDate(new Date())};
        save(st);
        window.Toast?.toast("Boss cleared!", `${b.name} (+${b.xp} XP, +2 Chests)`);
        await renderBoss(el);
      };
    });
  }

  window.IronQuestBoss = { renderBoss };
})();
