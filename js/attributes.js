(() => {
  "use strict";

  const KEY = "ironquest_attributes_v5";

  const ATTRS = [
    { key:"STR",  name:"Stärke",   types:["Mehrgelenkig"] },
    { key:"UNI",  name:"Unilateral",types:["Unilateral"] },
    { key:"CORE", name:"Core",     types:["Core"] },
    { key:"END",  name:"Ausdauer", types:["Conditioning","NEAT","Joggen"] },
    { key:"SKILL",name:"Skill",    types:["Komplexe"] },
  ];

  function load(){
    try{
      return JSON.parse(localStorage.getItem(KEY)) || {};
    } catch { return {}; }
  }
  function save(st){ localStorage.setItem(KEY, JSON.stringify(st)); }

  function xpNeeded(level){
    // wird immer langsamer: exponentiell
    const l = Math.max(1, Number(level||1));
    return Math.round(250 + 120*l + 30*(l**1.7));
  }

  function getState(){
    const st = load();
    const out = {};
    for (const a of ATTRS){
      const cur = st[a.key] || { xp:0, level:1 };
      out[a.key] = { ...cur };
    }
    return out;
  }

  function addXPForEntry(entry){
    const st = load();
    const type = entry?.type || "";
    const xp = Math.max(0, Number(entry?.xp||0));

    for (const a of ATTRS){
      if (!a.types.includes(type)) continue;
      if (!st[a.key]) st[a.key] = { xp:0, level:1 };
      st[a.key].xp += xp;

      // Level-ups
      while(st[a.key].xp >= xpNeeded(st[a.key].level)){
        st[a.key].xp -= xpNeeded(st[a.key].level);
        st[a.key].level += 1;
        if (st[a.key].level > 999) break;
      }
    }
    save(st);
  }

  function renderAttributes(container){
    const st = getState();
    container.innerHTML = `
      <div class="card">
        <h2>Stats</h2>
        <p class="hint">Diese Werte leveln automatisch mit deinen Trainings-XP (immer langsamer).</p>
        <div class="attrGrid">
          ${ATTRS.map(a=>{
            const s = st[a.key];
            const need = xpNeeded(s.level);
            const pct = Math.max(0, Math.min(100, (s.xp/need)*100));
            return `
              <div class="attrCard">
                <div class="attrTop">
                  <div class="attrName">${a.name}</div>
                  <div class="attrLvl">Lv ${s.level}</div>
                </div>
                <div class="attrBar"><div class="attrFill" style="width:${pct}%;"></div></div>
                <div class="hint">${Math.round(s.xp)} / ${need} XP</div>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }

  window.IronQuestAttributes = {
    ATTRS,
    xpNeeded,
    getState,
    addXPForEntry,
    renderAttributes
  };
})();
