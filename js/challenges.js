(() => {
  "use strict";

  async function renderChallenges(el){
    const state = window.IronQuestRPG.getState();
    const entries = await window.IronDB.getAllEntries();
    const summary = window.IronQuestRPG.summarize(entries);

    const dailyDef = window.IronQuestRPG.DAILY_POOL.find(x=>x.id===state.daily.id);
    const weeklyDef = window.IronQuestRPG.WEEKLY_POOL.find(x=>x.id===state.weekly.id);

    const totalXp = summary.totalXp;
    const lvl = window.IronQuestProgression.levelFromTotalXp(totalXp);
    const rank = window.IronQuestRPG.getRankName(lvl.lvl);

    const loot = window.IronQuestLoot.getState();

    el.innerHTML = `
      <div class="card">
        <h2>Quests & Achievements</h2>
        <div class="statRow">
          <div class="pill"><b>${rank}</b></div>
          <div class="pill"><b>Lv:</b> ${lvl.lvl}</div>
          <div class="pill"><b>Streak:</b> ${summary.streak}</div>
          <div class="pill"><b>Woche:</b> W${summary.week}</div>
          <div class="pill"><b>Chests:</b> ${loot.chests}</div>
        </div>
      </div>

      <div class="card">
        <h2>Daily Quest</h2>
        <div class="hint">${dailyDef?.title||"—"} – ${dailyDef?.desc||""}</div>
        <div class="pill"><b>Reward:</b> +${dailyDef?.reward||0} XP</div>
        <div class="btnRow">
          <button class="primary" id="qd" ${state.daily.claimed?"disabled":""}>Claim Daily</button>
          <span class="badge ${state.daily.claimed?"ok":"gold"}">${state.daily.claimed?"CLAIMED":"OPEN"}</span>
        </div>
      </div>

      <div class="card">
        <h2>Weekly Quest</h2>
        <div class="hint">${weeklyDef?.title||"—"} – ${weeklyDef?.desc||""}</div>
        <div class="pill"><b>Reward:</b> +${weeklyDef?.reward||0} XP ${weeklyDef?.chest?`• +${weeklyDef.chest} Chest`:""}</div>
        <div class="btnRow">
          <button class="primary" id="qw" ${state.weekly.claimed?"disabled":""}>Claim Weekly</button>
          <span class="badge ${state.weekly.claimed?"ok":"gold"}">${state.weekly.claimed?"CLAIMED":"OPEN"}</span>
        </div>
      </div>

      <div class="card">
        <h2>Loot</h2>
        <div class="btnRow">
          <button class="secondary" id="openChest">Open Chest</button>
        </div>
        <div class="hint">Last drop: ${loot.lastDrop || "—"}</div>
        <div class="hint">Inventory: ${loot.inv.length} items</div>
      </div>

      <div class="card">
        <h2>Achievements</h2>
        <ul class="list" id="achList"></ul>
      </div>
    `;

    el.querySelector("#qd").onclick = async ()=>{
      const ok = await window.IronQuestRPG.claimDaily();
      if(!ok) window.Toast?.toast("Daily", "Noch nicht erfüllt oder bereits geclaimed.");
      await window.IronQuestLevelUp.checkLevelUp();
      await renderChallenges(el);
    };
    el.querySelector("#qw").onclick = async ()=>{
      const ok = await window.IronQuestRPG.claimWeekly();
      if(!ok) window.Toast?.toast("Weekly", "Noch nicht erfüllt oder bereits geclaimed.");
      await window.IronQuestLevelUp.checkLevelUp();
      await renderChallenges(el);
    };
    el.querySelector("#openChest").onclick = ()=>{
      const r = window.IronQuestLoot.rollDrop();
      if(!r.ok) return window.Toast?.toast("Chest", "Keine Chests verfügbar.");
      window.UIEffects?.systemMessage([`Chest opened`, `${r.drop||"XP shard"}`]);
      window.Toast?.toast("Chest opened", r.drop||"XP shard");
      renderChallenges(el);
    };

    const ul = el.querySelector("#achList");
    ul.innerHTML="";
    window.IronQuestRPG.ACHIEVEMENTS.forEach(a=>{
      const done = !!state.ach?.[a.id]?.done;
      let progText="";

      if (!a.type){
        progText = `${Math.min(a.goal, entries.length)} / ${a.goal} Entries`;
      } else if (a.type==="xp"){
        progText = `${Math.min(a.goal, Math.round(totalXp))} / ${a.goal} XP`;
      } else if (a.type==="streak"){
        progText = `${Math.min(a.goal, summary.streak)} / ${a.goal} days`;
      }

      const li=document.createElement("li");
      li.innerHTML=`
        <div class="itemTop">
          <div>
            <b>${a.title}</b>
            <div class="hint">${a.desc}</div>
            <div class="hint">${progText}</div>
          </div>
          <span class="badge ${done?"ok":"lock"}">${done?"DONE":"LOCKED"}</span>
        </div>
      `;
      ul.appendChild(li);
    });
  }

  window.IronQuestChallenges = { renderChallenges };
})();
