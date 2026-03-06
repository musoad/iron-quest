(() => {
  "use strict";
  const KEY="ironquest_gates_v9";
  const GATE_TYPES=[
    { id:"e", name:"E-Rank Gate", hp:1800, desc:"Warm-up dungeon. Focus on consistency." },
    { id:"d", name:"D-Rank Gate", hp:3200, desc:"Solid gate for building momentum." },
    { id:"c", name:"C-Rank Gate", hp:5200, desc:"Requires a strong week and good form." },
    { id:"b", name:"B-Rank Gate", hp:7600, desc:"A serious threat for rising hunters." },
    { id:"a", name:"A-Rank Gate", hp:9800, desc:"High damage check before boss weeks." },
    { id:"s", name:"S-Rank Gate", hp:12800, desc:"Elite gate. Enter only with a stacked week." }
  ];

  function load(){ try{ return JSON.parse(localStorage.getItem(KEY))||{ clearedWeeks:{} }; }catch{ return { clearedWeeks:{} }; } }
  function save(st){ localStorage.setItem(KEY, JSON.stringify(st)); }

  function gateOfWeek(week){
    if(week<=2) return GATE_TYPES[0];
    if(week<=4) return GATE_TYPES[1];
    if(week<=6) return GATE_TYPES[2];
    if(week<=8) return GATE_TYPES[3];
    if(week<=10) return GATE_TYPES[4];
    return GATE_TYPES[5];
  }

  function weekDamage(entries, week){
    let dmg=0;
    for(const e of entries){
      if(Number(e.week||0)!==week) continue;
      dmg += Number(e.xp||0);
    }
    const eq = window.IronQuestEquipment?.bonuses?.() || { gateDmg:1 };
    const cls = window.IronQuestClasses?.gateMultiplier?.() || 1;
    const active = (window.__IQ_ACTIVE_BUFFS && window.__IQ_ACTIVE_BUFFS.gateDmg) || 1;
    dmg *= Number(eq.gateDmg||1) * Number(cls||1) * Number(active||1);
    return Math.round(dmg);
  }

  async function render(container){
    const entries=await window.IronDB.getAllEntries();
    const snap = await window.IronQuestState.getSnapshot();
    const today=window.Utils.isoDate(new Date());
    const week=window.IronQuestProgression.getWeekNumberFor(today);
    const gate=gateOfWeek(week);
    const st=load();
    const rankKey=window.IronQuestHunterRank.compute(snap.progression.level, snap.totals.totalXp);
    const rankMeta=(window.IronQuestHunterRank.getMeta ? window.IronQuestHunterRank.getMeta(rankKey) : {name:rankKey,color:"rankE"});
    const dmg=weekDamage(entries, week);
    const hp=gate.hp + Math.max(0, (snap.progression.level-1) * 90);
    const cleared=!!st.clearedWeeks[String(week)];
    const remaining=Math.max(0, hp-dmg);
    const pct=Math.max(0, Math.min(100, (dmg/hp)*100));
    const reqDays = 2;
    const gateReady = snap.week.daysLogged >= reqDays;
    const eq=window.IronQuestEquipment.bonuses();
    const cls = window.IronQuestClasses.meta(window.IronQuestClasses.get());

    container.innerHTML = `
      <div class="card iqPanel">
        <div class="slHeader">
          <div>
            <div class="slEyebrow">Weekly Dungeon</div>
            <h2>Gates</h2>
          </div>
          <span class="badge ${cleared?"ok":"gold"}">${cleared?"CLEARED":"ACTIVE"}</span>
        </div>
        <p class="hint">Training → Weekly XP → Gate Damage. Deine Klasse und Ausrüstung verstärken den Clear.</p>
      </div>

      <div class="card soft gateHero">
        <div class="itemTop">
          <div>
            <b>${gate.name}</b>
            <div class="hint">${gate.desc}</div>
            <div class="hint">Hunter Rank: <span class="badge ${rankMeta.color}">${rankKey}</span> ${rankMeta.name}</div>
          </div>
          <span class="pill">Week ${week}</span>
        </div>

        <div class="gateStats">
          <div class="pill"><b>Requirement:</b> ${snap.week.daysLogged}/${reqDays} training days</div>
          <div class="pill"><b>Class:</b> ${cls.name}</div>
          <div class="pill"><b>Eq Gate Bonus:</b> x${Number(eq.gateDmg||1).toFixed(2)}</div>
        </div>

        <div style="margin-top:12px;">
          <div class="hint">Gate HP</div>
          <div class="bar" style="margin-top:8px;"><div class="barFill" style="width:${pct}%;"></div></div>
          <div class="row2" style="margin-top:10px;">
            <div class="pill"><b>Damage:</b> ${window.Utils.fmt(dmg)}</div>
            <div class="pill"><b>Remaining:</b> ${window.Utils.fmt(remaining)}</div>
          </div>
        </div>

        <div class="systemBox compact" style="margin-top:14px;">
          <div class="sysTitle">[ CLEAR GUIDE ]</div>
          <div class="sysBody">1. Train on at least 2 days this week.\n2. Complete Today Plan to raise weekly XP.\n3. Use relics and class perks to increase Gate Damage.</div>
        </div>

        <div class="btnRow">
          <button class="primary" id="btnEnter" ${(cleared || !gateReady)?"disabled":""}>Enter Gate</button>
          <button class="secondary" id="btnOpenChest">Open Chest</button>
        </div>
        <div class="hint">Reward: 1 Chest + Gate Clear Counter. Boss weeks become easier when your gate is cleared.</div>
      </div>

      <div class="card"><div id="invMount"></div></div>
    `;

    window.IronQuestEquipment.render(container.querySelector("#invMount"));

    container.querySelector("#btnOpenChest").onclick=()=>{
      const res=window.IronQuestLoot.roll();
      if(!res.ok) return (window.Toast && window.Toast.toast)("Chest", "Keine Chests verfügbar.");
      (window.Toast && window.Toast.toast)("Chest", res.msg);
      window.IronQuestEquipment.render(container.querySelector("#invMount"));
    };

    container.querySelector("#btnEnter").onclick=async()=>{
      if(cleared) return;
      if(dmg < hp){
        window.IronQuestUIFX.showSystem(`Gate not cleared.\n\nDamage: ${dmg} / ${hp}\nTrain more this week.`);
        return;
      }
      st.clearedWeeks[String(week)] = { date: today, rank: rankKey, gate: gate.id };
      save(st);
      window.IronQuestLoot.addChests(1);
      window.IronQuestHunterRank.recordGateClear();
      await window.IronDB.addSystem({ date: today, msg:`Gate cleared (W${week}) — Rank ${rankKey}. Reward: +1 Chest.` });
      window.IronQuestUIFX.showSystem(`Gate cleared.\n\n[ REWARD ]\n+1 Chest\nHunter Rank progress increased.`);
      (window.Toast && window.Toast.toast)("Gate cleared", "+1 Chest");
      await render(container);
    };
  }

  window.IronQuestGates={ render, gateOfWeek, GATE_TYPES, load };
})();
