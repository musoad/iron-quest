(() => {
  "use strict";

  function esc(s){
    return String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
  }

  function card(title, body){
    return `<div class="card"><h2>${esc(title)}</h2>${body||""}</div>`;
  }

  function fmtDate(d){
    if(!d) return "";
    // already yyyy-mm-dd
    return d;
  }

  async function totalXp(){
    const entries = await window.IronDB.getAllEntries();
    return entries.reduce((s,e)=>s + Number(e.xp||0), 0);
  }

  function renderSetProgress(){
    if(!(window.IronQuestEquipment && window.IronQuestEquipment.setProgress)) return "";
    const sp = window.IronQuestEquipment.setProgress();
    if(!sp.length) return `<p class="hint">No active set bonuses yet. Equip 2/4 items from the same set.</p>`;
    return `
      <div class="set-progress">
        ${sp.map(x=>{
          const pct = Math.min(100, (x.count/4)*100);
          return `
            <div class="set-row">
              <div class="set-head">
                <div class="set-name">${esc(x.name)}</div>
                <div class="set-count">${x.count}/4</div>
              </div>
              <div class="bar"><div class="bar-fill" style="width:${pct}%"></div></div>
              <div class="set-bonuses">
                <div class="badge ${x.count>=2?"on":""}">2pc</div>
                <div class="badge ${x.count>=4?"on":""}">4pc</div>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `;
  }

  async function render(el){
    const name = (window.IronQuestProfile && (window.IronQuestProfile.getName) && window.IronQuestProfile.getName)() || "Hunter";
    const start = (window.IronQuestProgression && (window.IronQuestProgression.getStartDate) && window.IronQuestProgression.getStartDate)() || window.Utils.isoDate(new Date());
    const xp = await totalXp();
    const levelInfo = (window.IronQuestProgression && (window.IronQuestProgression.levelFromTotalXp) && window.IronQuestProgression.levelFromTotalXp)(xp) || { lvl:1, title:"Rookie", nextXp:0, curXp:xp };
    const rank = (window.IronQuestHunterRank && (window.IronQuestHunterRank.compute) && window.IronQuestHunterRank.compute)(levelInfo.lvl, xp) || "E";

    const profileCard = card("Profile", `
      <div class="grid2">
        <label class="field">
          <span class="label">Character Name</span>
          <input id="iq_name" type="text" value="${esc(name)}" placeholder="Your Hunter name"/>
        </label>
        <label class="field">
          <span class="label">Challenge Start Date</span>
          <input id="iq_start" type="date" value="${fmtDate(start)}"/>
        </label>
      </div>
      <div class="row gap">
        <button class="btn" id="iq_save_profile">Save</button>
        <span class="hint">Start date can be set retroactively.</span>
      </div>
    `);

    const progressCard = card("Progress", `
      <div class="kpi-grid">
        <div class="kpi"><div class="k">Level</div><div class="v">${levelInfo.lvl}</div><div class="s">${esc(levelInfo.title||"")}</div></div>
        <div class="kpi"><div class="k">Rank</div><div class="v">${esc(rank)}</div><div class="s">Hunter Class</div></div>
        <div class="kpi"><div class="k">Total XP</div><div class="v">${Math.floor(xp)}</div><div class="s">All-time</div></div>
        <div class="kpi"><div class="k">Week</div><div class="v">W${(window.IronQuestProgression && (window.IronQuestProgression.getWeekNumber) && window.IronQuestProgression.getWeekNumber)() ?? 1}</div><div class="s">12-week cycle</div></div>
      </div>
    `);

    const attrsCard = card("Attributes", `
      <div id="attrMount"></div>
      <p class="hint">Attributes level up through XP from matching exercise types.</p>
    `);

    const equipCard = card("Equipment", `
      <div id="equipMount"></div>
      <h3 style="margin-top:14px">Set Progress</h3>
      ${renderSetProgress()}
    `);

    el.innerHTML = `
      ${profileCard}
      ${progressCard}
      ${attrsCard}
      ${equipCard}
    `;

    // wire save
    const btn = el.querySelector("#iq_save_profile");
    if(btn){
      btn.onclick = async () => {
        const newName = el.querySelector("#iq_name"() && ().value) && ).value).trim)() || "Hunter";
        const newStart = el.querySelector("#iq_start"() && ).value) || window.Utils.isoDate(new Date());
        (window.IronQuestProfile && (window.IronQuestProfile.setName) && window.IronQuestProfile.setName)(newName);
        (window.IronQuestProgression && (window.IronQuestProgression.setStartDate) && window.IronQuestProgression.setStartDate)(newStart);
        (window.Toast && (window.Toast.toast) && window.Toast.toast)("Saved.");
        (window.IronQuestApp && (window.IronQuestApp.navigate) && window.IronQuestApp.navigate)("home");
      };
    }

    // mount attributes + equipment
    try{
      const a = el.querySelector("#attrMount");
      if(a && (window.IronQuestAttributes && window.IronQuestAttributes.render)) window.IronQuestAttributes.render(a);
    }catch(e){ console.warn(e); }

    try{
      const m = el.querySelector("#equipMount");
      if(m && (window.IronQuestEquipment && window.IronQuestEquipment.renderGrid)) window.IronQuestEquipment.renderGrid(m);
    }catch(e){ console.warn(e); }
  }

  window.IronQuestHome = { render };
})();
