(() => {
  "use strict";
  const KEY="ironquest_attributes_v8";
  const ATTRS=[
    { key:"STR", name:"Stärke", type:"Mehrgelenkig" },
    { key:"UNI", name:"Unilateral", type:"Unilateral" },
    { key:"CORE", name:"Core", type:"Core" },
    { key:"END", name:"Ausdauer", type:"Conditioning" },
    { key:"SKILL", name:"Skill", type:"Komplexe" },
  ];
  function load(){ try{ return JSON.parse(localStorage.getItem(KEY))||{}; }catch{ return {}; } }
  function save(st){ localStorage.setItem(KEY, JSON.stringify(st)); }
  function xpNeed(l){ const L=Math.max(1,Number(l||1)); return Math.round(600 + 220*L + 60*(L**1.75)); }
  function get(){
    const raw=load();
    const st={};
    for(const a of ATTRS){
      st[a.key]=raw[a.key]||{ level:1, xp:0 };
    }
    return st;
  }
  function addXP(type, xp){
    const raw=load();
    for(const a of ATTRS){
      if(a.type!==type) continue;
      raw[a.key]=raw[a.key]||{ level:1, xp:0 };
      raw[a.key].xp += Math.max(0, Number(xp||0));
      while(raw[a.key].xp >= xpNeed(raw[a.key].level)){
        raw[a.key].xp -= xpNeed(raw[a.key].level);
        raw[a.key].level += 1;
      }
    }
    save(raw);
  }
  function render(container){
    const st=get();
    container.innerHTML = `
      <div class="card soft">
        <h2>Attributes</h2>
        <p class="hint">Langsames Leveln wie im RPG. Jede Trainingseinheit macht dich stärker.</p>
        <div class="attrGrid">
          ${ATTRS.map(a=>{
            const s=st[a.key];
            const need=xpNeed(s.level);
            const pct=Math.max(0, Math.min(100, (s.xp/need)*100));
            return `
              <div class="attrCard">
                <div class="itemTop">
                  <div><b>${a.name}</b><div class="hint">${a.key}</div></div>
                  <span class="badge">${"Lv "+s.level}</span>
                </div>
                <div class="bar" style="margin-top:10px;"><div class="barFill" style="width:${pct}%;"></div></div>
                <div class="hint">${Math.round(s.xp)} / ${need} XP</div>
              </div>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }
  window.IronQuestAttributes={ ATTRS, get, addXP, render, xpNeed };
})();
