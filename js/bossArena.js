(() => {
  "use strict";
  const KEY="ironquest_boss_v9";
  const BOSSES=[
    { week:2, name:"Foundation Beast", rank:"D", hp:6500, reward:1, xp:650 },
    { week:4, name:"Asymmetry Lord", rank:"C", hp:9000, reward:1, xp:900 },
    { week:6, name:"Core Guardian", rank:"C", hp:9800, reward:1, xp:950 },
    { week:8, name:"Abyss Reaper", rank:"B", hp:12500, reward:2, xp:1200 },
    { week:10, name:"Iron Champion", rank:"A", hp:16000, reward:2, xp:1600 },
    { week:12, name:"MONARCH", rank:"S", hp:22000, reward:3, xp:2400 },
  ];

  function load(){ try{ return JSON.parse(localStorage.getItem(KEY))||{ cleared:{} }; }catch{ return { cleared:{} }; } }
  function save(st){ localStorage.setItem(KEY, JSON.stringify(st)); }

  function weekDamage(entries, week){
    let dmg=0;
    for(const e of entries){ if(Number(e.week||0)===week) dmg += Number(e.xp||0); }
    const eq=window.IronQuestEquipment.bonuses();
    const cls=window.IronQuestClasses.gateMultiplier?.() || 1;
    const active=(window.__IQ_ACTIVE_BUFFS && window.__IQ_ACTIVE_BUFFS.gateDmg) || 1;
    dmg *= (eq.gateDmg||1) * cls * active;
    return Math.round(dmg);
  }

  async function render(container){
    const entries=await window.IronDB.getAllEntries();
    const snap = await window.IronQuestState.getSnapshot();
    const today=window.Utils.isoDate(new Date());
    const week=window.IronQuestProgression.getWeekNumberFor(today);
    const st=load();
    const boss = BOSSES.find(b=>b.week===week) || null;
    const gateState = window.IronQuestGates?.load?.() || { clearedWeeks:{} };
    const gateCleared = !!gateState.clearedWeeks?.[String(week)];
    const cls = window.IronQuestClasses.meta(window.IronQuestClasses.get());
    const eq = window.IronQuestEquipment.bonuses();

    container.innerHTML=`
      <div class="card iqPanel">
        <div class="slHeader">
          <div>
            <div class="slEyebrow">Raid Encounter</div>
            <h2>Boss Arena</h2>
          </div>
          <div class="pill">Week ${week}</div>
        </div>
        <p class="hint">Boss fights are the payoff of your training loop. Clear the gate first, then finish the boss for chests and bonus XP.</p>
      </div>

      <div class="card soft" id="bossCard"></div>

      <div class="card soft">
        <h2>Boss Timeline</h2>
        <ul class="list" id="bossList"></ul>
      </div>
    `;

    const bossCard=container.querySelector("#bossCard");
    if(!boss){
      bossCard.innerHTML = `<b>Kein Boss diese Woche.</b><div class="hint">Nächster Boss erscheint in Boss-Wochen (W2, W4, …)</div>`;
    }else{
      const dmg=weekDamage(entries, week);
      const cleared=!!st.cleared[String(week)];
      const rem=Math.max(0, boss.hp-dmg);
      const pct=Math.max(0, Math.min(100, (dmg/boss.hp)*100));
      const ready = snap.week.daysLogged >= 3 && gateCleared;
      bossCard.innerHTML=`
        <div class="itemTop">
          <div>
            <b>${boss.name}</b>
            <div class="hint">Week ${boss.week} • Rank ${boss.rank}</div>
            <div class="hint">Class: ${cls.name} • Eq Gate Bonus x${Number(eq.gateDmg||1).toFixed(2)}</div>
          </div>
          <span class="badge ${cleared?"ok":"gold"}">${cleared?"CLEARED":"ACTIVE"}</span>
        </div>
        <div style="margin-top:12px;">
          <div class="hint">Boss HP</div>
          <div class="bar" style="margin-top:8px;"><div class="barFill" style="width:${pct}%;"></div></div>
          <div class="row2" style="margin-top:10px;">
            <div class="pill"><b>Damage:</b> ${window.Utils.fmt(dmg)}</div>
            <div class="pill"><b>Remaining:</b> ${window.Utils.fmt(rem)}</div>
          </div>
        </div>
        <div class="systemBox compact" style="margin-top:12px;">
          <div class="sysTitle">[ RAID CONDITIONS ]</div>
          <div class="sysBody">Training days this week: ${snap.week.daysLogged}/3\nGate cleared: ${gateCleared ? 'Yes' : 'No'}\nReady: ${ready ? 'Yes' : 'Not yet'}</div>
        </div>
        <div class="btnRow"><button class="primary" id="btnFinish" ${(cleared || !ready)?"disabled":""}>FINISH</button></div>
        <div class="hint">Reward: +${boss.reward} Chest • +${boss.xp} XP (Boss bonus entry)</div>
      `;

      bossCard.querySelector("#btnFinish").onclick=async()=>{
        if(cleared) return;
        if(!ready){
          window.IronQuestUIFX.showSystem(`Boss locked.\n\nRequirements:\n- 3 training days this week\n- Gate cleared for this week`);
          return;
        }
        if(dmg<boss.hp){
          window.IronQuestUIFX.showSystem(`Boss not defeated.\n\nDamage: ${dmg} / ${boss.hp}\nTrain more this week.`);
          return;
        }
        st.cleared[String(week)] = { date: today, name: boss.name };
        save(st);
        window.IronQuestLoot.addChests(boss.reward);
        window.IronQuestHunterRank.recordBossClear();
        await window.IronDB.addEntry({ date: today, week, type:"Boss", exercise:`Boss: ${boss.name}`, detail:`Defeated • Reward +${boss.reward} Chest`, xp: boss.xp });
        await window.IronDB.addSystem({ date: today, msg:`Boss defeated: ${boss.name}. Reward: +${boss.reward} chest.` });
        window.IronQuestUIFX.showFinish(`FINISH!\n\n${boss.name} defeated.\nReward: +${boss.reward} Chest\nBonus: +${boss.xp} XP`);
        (window.Toast && window.Toast.toast)("Boss defeated", `+${boss.reward} Chest`);
        await render(container);
      };
    }

    const ul=container.querySelector("#bossList");
    ul.innerHTML="";
    for(const b of BOSSES){
      const cleared=!!st.cleared[String(b.week)];
      const li=document.createElement("li");
      li.innerHTML=`<div class="itemTop"><div><b>W${b.week} — ${b.name}</b><div class="hint">Rank ${b.rank} • HP ${b.hp} • Reward ${b.reward} chest</div></div><span class="badge ${cleared?"ok":"lock"}">${cleared?"DONE":"LOCKED"}</span></div>`;
      ul.appendChild(li);
    }
  }

  window.IronQuestBossArena={ render };
})();
