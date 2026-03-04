(() => {
  "use strict";

  async function render(el){
    const prof = (window.IronQuestProfile && window.IronQuestProfile.get) ? window.IronQuestProfile.get() : { name:"Hunter", startDate:(window.Utils?window.Utils.isoDate(new Date()):"") };
    const entries = (window.IronDB && window.IronDB.getAllEntries) ? await window.IronDB.getAllEntries() : [];
    const totalXP = (entries||[]).reduce((s,e)=>s+Number(e.xp||0),0);

    const lvlObj = (window.IronQuestProgression && window.IronQuestProgression.levelFromTotalXp)
      ? window.IronQuestProgression.levelFromTotalXp(totalXP)
      : { lvl:1, into:0, need:1000 };

    const rank = (window.IronQuestHunterRank && window.IronQuestHunterRank.compute)
      ? window.IronQuestHunterRank.compute(lvlObj.lvl, totalXP)
      : "E";

    el.innerHTML = `
      <div class="card hero">
        <div class="hero-top">
          <div>
            <div class="hero-name">${prof.name || "Hunter"}</div>
            <div class="hint">Start: ${prof.startDate || "-"}</div>
          </div>
          <div class="hero-rank">
            <div class="pill">Rank ${rank}</div>
            <div class="pill">Lvl ${lvlObj.lvl}</div>
          </div>
        </div>
        <div class="bar"><div class="bar-fill" style="width:${Math.min(100, (lvlObj.into/lvlObj.need)*100)}%"></div></div>
        <div class="hint">${Math.round(lvlObj.into)} / ${Math.round(lvlObj.need)} XP to next level</div>
      </div>

      <div id="equipMount"></div>

      <div class="card">
        <h2>Quick Actions</h2>
        <div class="grid2">
          <button class="btn" id="goLog">Open Log</button>
          <button class="btn" id="goRun">Open Run</button>
        </div>
      </div>
    `;

    const equipMount = el.querySelector("#equipMount");
    if(equipMount && window.IronQuestEquipment && window.IronQuestEquipment.renderGrid){
      window.IronQuestEquipment.renderGrid(equipMount);
    }

    const goLog = el.querySelector("#goLog");
    if(goLog) goLog.onclick=()=>window.IronQuestApp && window.IronQuestApp.navigate && window.IronQuestApp.navigate("log");
    const goRun = el.querySelector("#goRun");
    if(goRun) goRun.onclick=()=>window.IronQuestApp && window.IronQuestApp.navigate && window.IronQuestApp.navigate("run");
  }

  window.IronQuestHome = { render };
})();
