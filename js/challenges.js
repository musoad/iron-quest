(() => {
  "use strict";

  async function renderChallenges(el){
    const state = window.IronQuestRPG.getState();
    const loot = (window.IronQuestLoot?.getState ? window.IronQuestLoot.getState() : (window.IronQuestLoot?.load ? window.IronQuestLoot.load() : { chests:0, inv:[] }));
    const entries = await window.IronDB.getAllEntries();
    const summary = window.IronQuestRPG.summarize(entries);

    const dailyDef = window.IronQuestRPG.DAILY_POOL.find(x=>x.id===state.daily.id);
    const weeklyDef = window.IronQuestRPG.WEEKLY_POOL.find(x=>x.id===state.weekly.id);
    const story = window.IronQuestRPG.storyStatus(state, summary, entries.length);

    const lvl = window.IronQuestProgression.levelFromTotalXp(summary.totalXp);
    const rank = window.IronQuestRPG.getRankName(lvl.lvl);

    el.innerHTML = `
      <div class="card">
        <h2>Quests & Achievements</h2>
        <div class="statRow">
          <div class="pill"><b>${rank}</b></div>
          <div class="pill"><b>Lv:</b> ${lvl.lvl}</div>
          <div class="pill"><b>Streak:</b> ${summary.streak}</div>
          <div class="pill"><b>Woche:</b> W${summary.week}</div>
          <div class="pill"><b>Chests:</b> ${loot.chests||0}</div>
        </div>
      </div>

      <div class="card">
        <h2>Story</h2>
        <div class="hint"><b>${story.cur?.title||"—"}</b></div>
        <div class="hint">${story.cur?.desc||""}</div>
        <div class="pill"><b>Reward:</b> +${story.cur?.reward||0} XP + 1 Chest</div>
        <div class="btnRow">
          <button class="primary" id="qs" ${(!story.done || story.claimed)?"disabled":""}>Claim Story</button>
          <span class="badge ${story.claimed?"ok":(story.done?"gold":"lock")}">${story.claimed?"CLAIMED":(story.done?"READY":"LOCKED")}</span>
        </div>
      </div>

      <div class="row2">
        <div class="card">
          <h2>Daily</h2>
          <div class="hint">${dailyDef?.title||"—"} – ${dailyDef?.desc||""}</div>
          <div class="pill"><b>Reward:</b> +${dailyDef?.reward||0} XP + 1 Chest</div>
          <div class="btnRow">
            <button class="secondary" id="qd" ${state.daily.claimed?"disabled":""}>Claim Daily</button>
            <span class="badge ${state.daily.claimed?"ok":"gold"}">${state.daily.claimed?"CLAIMED":"OPEN"}</span>
          </div>
        </div>

        <div class="card">
          <h2>Weekly</h2>
          <div class="hint">${weeklyDef?.title||"—"} – ${weeklyDef?.desc||""}</div>
          <div class="pill"><b>Reward:</b> +${weeklyDef?.reward||0} XP + 2 Chests</div>
          <div class="btnRow">
            <button class="secondary" id="qw" ${state.weekly.claimed?"disabled":""}>Claim Weekly</button>
            <span class="badge ${state.weekly.claimed?"ok":"gold"}">${state.weekly.claimed?"CLAIMED":"OPEN"}</span>
          </div>
        </div>
      </div>

      <div class="card">
        <h2>Inventory</h2>
        <div class="btnRow">
          <button class="primary" id="openChest" ${((loot.chests||0)>0)?"":"disabled"}>Chest öffnen</button>
        </div>
        <div class="hint">${loot.lastDrop?`Letzter Drop: ${loot.lastDrop}`:""}</div>
        <ul class="list" id="invList"></ul>
      </div>

      <div class="card">
        <h2>Achievements</h2>
        <ul class="list" id="achList"></ul>
      </div>
    `;

    el.querySelector("#qd").onclick = async ()=>{
      const ok = await window.IronQuestRPG.claimDaily();
      if(!ok) window.Toast?.toast("Daily", "Noch nicht erfüllt oder bereits geclaimed.");
      await renderChallenges(el);
    };
    el.querySelector("#qw").onclick = async ()=>{
      const ok = await window.IronQuestRPG.claimWeekly();
      if(!ok) window.Toast?.toast("Weekly", "Noch nicht erfüllt oder bereits geclaimed.");
      await renderChallenges(el);
    };
    el.querySelector("#qs").onclick = async ()=>{
      const ok = await window.IronQuestRPG.claimStory();
      if(!ok) window.Toast?.toast("Story", "Noch nicht bereit oder bereits geclaimed.");
      await renderChallenges(el);
    };

    el.querySelector("#openChest").onclick = ()=>{
      const api = window.IronQuestLoot;
      const res = api?.rollDrop ? api.rollDrop() : (api?.roll ? api.roll() : { ok:false });
      if (!res || !res.ok) return window.Toast?.toast("Chest", "Keine Chest verfügbar.");

      // Support multiple loot response shapes
      const msg = res.drop || res.msg || (res.item?.name ? `Obtained: ${res.item.name}` : "Nothing (XP dust)");
      window.Toast?.toast("Chest opened", msg);

      // refresh UI
      renderChallenges(el);
    };

    const invUl = el.querySelector("#invList");
    invUl.innerHTML = "";
    if (!loot.inv?.length) invUl.innerHTML = "<li>—</li>";
    else{
      loot.inv.slice().reverse().slice(0,50).forEach(it=>{
        const li=document.createElement("li");
        li.innerHTML=`<div class="itemTop"><div><b>${it.name}</b><div class="hint">${it.kind} • ${it.date}</div></div></div>`;
        invUl.appendChild(li);
      });
    }

    const achUl = el.querySelector("#achList");
    achUl.innerHTML="";

    window.IronQuestRPG.ACHIEVEMENTS.forEach(a=>{
      const done = !!state.ach?.[a.id]?.done;
      let progText="";
      if (!a.type){
        progText = `${Math.min(a.goal, entries.length)} / ${a.goal} Entries`;
      } else if (a.type==="xp"){
        progText = `${Math.min(a.goal, Math.round(summary.totalXp))} / ${a.goal} XP`;
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
      achUl.appendChild(li);
    });
  }

  window.IronQuestChallenges = { renderChallenges };
})();
