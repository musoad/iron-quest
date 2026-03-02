(() => {
  "use strict";

  const KEY = "ironquest_gates_v6";

  const RANKS = [
    { r:"E", minLvl:1,  minStr:1,  minEnd:1,  weeklyXp:2000,  hp: 3000, rewardXp:600,  chest:1 },
    { r:"D", minLvl:8,  minStr:6,  minEnd:5,  weeklyXp:4000,  hp: 5000, rewardXp:900,  chest:1 },
    { r:"C", minLvl:15, minStr:10, minEnd:9,  weeklyXp:6500,  hp: 8000, rewardXp:1300, chest:2 },
    { r:"B", minLvl:25, minStr:16, minEnd:14, weeklyXp:9000,  hp:11000, rewardXp:1800, chest:2 },
    { r:"A", minLvl:40, minStr:22, minEnd:20, weeklyXp:12000, hp:15000, rewardXp:2400, chest:3 },
    { r:"S", minLvl:60, minStr:30, minEnd:28, weeklyXp:16000, hp:20000, rewardXp:3200, chest:4 },
  ];

  function load(){
    try { return JSON.parse(localStorage.getItem(KEY)) || { cleared:{} }; }
    catch { return { cleared:{} }; }
  }
  function save(st){ localStorage.setItem(KEY, JSON.stringify(st)); }

  function currentRank(week){
    // rotate difficulty by week, slowly ramps
    const idx = Math.min(RANKS.length-1, Math.floor((week-1)/2));
    return RANKS[idx];
  }

  async function awardGateClear(rank){
    const date = window.Utils.isoDate(new Date());
    const week = window.IronQuestProgression.getWeekNumberFor(date);

    await window.IronDB.addEntry({
      date, week,
      type:"Gate",
      exercise:`Gate ${rank.r}-Rank Cleared`,
      detail:`Reward: +${rank.rewardXp} XP • Chests: +${rank.chest}`,
      xp: rank.rewardXp
    });

    window.IronQuestLoot?.addChest?.(rank.chest);
  }

  function meetsReq(rank, levelObj, attrs, weekXp){
    const str = attrs?.STR?.level || 1;
    const end = attrs?.END?.level || 1;
    const okLvl = (levelObj?.lvl || 1) >= rank.minLvl;
    const okStr = str >= rank.minStr;
    const okEnd = end >= rank.minEnd;
    const okXp  = Number(weekXp||0) >= rank.weeklyXp;
    return { ok: okLvl && okStr && okEnd && okXp, okLvl, okStr, okEnd, okXp, str, end };
  }

  async function renderGates(el){
    const entries = await window.IronDB.getAllEntries();
    const today = window.Utils.isoDate(new Date());
    const week = window.IronQuestProgression.getWeekNumberFor(today);

    const totalXp = entries.reduce((s,e)=>s+Number(e.xp||0),0);
    const L = window.IronQuestProgression.levelFromTotalXp(totalXp);
    const attrs = window.IronQuestAttributes?.getState?.() || {};
    const weekXp = entries.filter(e=>Number(e.week||0)===week).reduce((s,e)=>s+Number(e.xp||0),0);

    const st = load();
    const rank = currentRank(week);
    const cleared = !!st.cleared?.[week];

    const req = meetsReq(rank, L, attrs, weekXp);
    const hp = rank.hp;
    const dmg = Math.min(hp, Math.round(weekXp * 0.9)); // weekly effort damages gate core
    const pct = Math.max(0, Math.min(100, (dmg/hp)*100));

    el.innerHTML = `
      <div class="card gateArena">
        <h2>Gate Detected</h2>
        <div class="systemBox">[ SYSTEM ] New Gate has appeared. Rank: <b>${rank.r}</b></div>

        <div class="statRow">
          <div class="pill"><b>Week:</b> W${week}</div>
          <div class="pill"><b>Gate HP:</b> ${hp}</div>
          <div class="pill"><b>Damage:</b> ${dmg}</div>
          <div class="pill"><b>Weekly XP:</b> ${Math.round(weekXp)}</div>
        </div>

        <div class="hpBar"><div class="hpFill" style="width:${pct}%;"></div></div>
        <div class="hint">Deal damage by training this week. When HP reaches 100% and requirements are met, you can clear the Gate.</div>

        <hr>
        <h2>Requirements</h2>
        <div class="row2">
          <div class="pill ${req.okLvl?'okPill':''}"><b>Level:</b> ${L.lvl} / ${rank.minLvl}</div>
          <div class="pill ${req.okStr?'okPill':''}"><b>STR:</b> ${req.str} / ${rank.minStr}</div>
          <div class="pill ${req.okEnd?'okPill':''}"><b>END:</b> ${req.end} / ${rank.minEnd}</div>
          <div class="pill ${req.okXp?'okPill':''}"><b>Weekly XP:</b> ${Math.round(weekXp)} / ${rank.weeklyXp}</div>
        </div>

        <hr>
        <h2>Rewards</h2>
        <div class="statRow">
          <div class="pill"><b>XP:</b> +${rank.rewardXp}</div>
          <div class="pill"><b>Chests:</b> +${rank.chest}</div>
        </div>

        <div class="btnRow">
          <button class="primary" id="enterGate" ${(cleared || !req.ok || dmg < hp) ? "disabled":""}>Clear Gate</button>
          <span class="badge ${cleared?'ok':'gold'}">${cleared ? "CLEARED" : "OPEN"}</span>
        </div>

        ${cleared ? `<div class="hint">Cleared on: ${st.cleared[week].date}</div>` : `<div class="hint">Tip: hit the weekly XP goal to unlock the clear.</div>`}
      </div>

      <div class="card">
        <h2>Chests</h2>
        <div class="pill"><b>Available:</b> ${window.IronQuestLoot?.getState?.().chests || 0}</div>
        <div class="btnRow">
          <button class="secondary" id="openChest">Open Chest</button>
        </div>
        <div class="hint" id="dropResult">—</div>
      </div>
    `;

    el.querySelector("#openChest").onclick = ()=>{
      const res = window.IronQuestLoot.rollDrop();
      if (!res.ok) return window.Toast?.toast("Chest", "No chests available.");
      window.Toast?.toast("Loot", res.drop ? res.drop : "XP shard");
      el.querySelector("#dropResult").textContent = res.drop ? `You obtained: ${res.drop}` : "Nothing found… but you gained resolve.";
    };

    el.querySelector("#enterGate").onclick = async ()=>{
      if (cleared) return;
      const st2 = load();
      st2.cleared = st2.cleared || {};
      st2.cleared[week] = { date: window.Utils.isoDate(new Date()), rank: rank.r };
      save(st2);
      await awardGateClear(rank);
      window.Toast?.toast("Gate Cleared!", `Rank ${rank.r} (+${rank.rewardXp} XP)`);
      await renderGates(el);
    };
  }

  window.IronQuestGates = { RANKS, renderGates };
})();
