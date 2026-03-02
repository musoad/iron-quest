(() => {
  "use strict";
  const KEY="ironquest_class_v6";

  const CLASSES = [
    { id:"berserker", name:"Berserker", desc:"Mehrgelenkig Fokus. +6% MULTI XP.", bonus:{ Mehrgelenkig:1.06 } },
    { id:"assassin",  name:"Assassin",  desc:"Unilateral Fokus. +8% UNI XP.", bonus:{ Unilateral:1.08 } },
    { id:"guardian",  name:"Guardian",  desc:"Core/Health Fokus. +6% CORE XP.", bonus:{ Core:1.06 } },
    { id:"ranger",    name:"Ranger",    desc:"Run/Endurance. +10% END (Cond/NEAT/Jog).", bonus:{ Conditioning:1.08, NEAT:1.08, Joggen:1.10 } },
    { id:"monarch",   name:"Monarch",   desc:"Komplexe Skills. +6% SKILL XP.", bonus:{ Komplexe:1.06 } },
  ];

  function load(){ try{ return JSON.parse(localStorage.getItem(KEY))||{ chosen:null }; }catch{ return { chosen:null }; } }
  function save(st){ localStorage.setItem(KEY, JSON.stringify(st)); }
  function getChosen(){ return load().chosen; }
  function setChosen(id){ const st=load(); st.chosen=id; save(st); }

  function multiplierForType(type){
    const c = CLASSES.find(x=>x.id===getChosen());
    if (!c) return 1;
    return c.bonus?.[type] || 1;
  }

  function renderClassPanel(el, level){
    const chosen = getChosen();
    const unlock = Number(level||1) >= 10;

    el.innerHTML = `
      <div class="card">
        <h2>Klasse</h2>
        <p class="hint">Freischaltung ab Level 10. Klasse gibt kleine XP-Boni.</p>
        <div class="pill"><b>Status:</b> ${unlock ? "UNLOCKED" : "LOCKED (Lv 10)"} </div>
        <div class="hint">Aktiv: <b>${(CLASSES.find(x=>x.id===chosen)?.name)||"—"}</b></div>
        <hr />
        <div class="row2" id="classGrid"></div>
      </div>
    `;
    const grid = el.querySelector("#classGrid");
    CLASSES.forEach(c=>{
      const isActive = c.id===chosen;
      const box = document.createElement("div");
      box.className = "skillbox";
      box.innerHTML = `
        <h3>${c.name} ${isActive?'<span class="badge ok">ACTIVE</span>':''}</h3>
        <div class="hint">${c.desc}</div>
        <div class="btnRow">
          <button class="${isActive?'secondary':'primary'}" ${(!unlock || isActive)?"disabled":""} data-pick="${c.id}">Wählen</button>
        </div>
      `;
      grid.appendChild(box);
    });
    grid.querySelectorAll("[data-pick]").forEach(b=>{
      b.onclick=()=>{
        setChosen(b.dataset.pick);
        window.UIEffects?.systemMessage([`Class selected: ${CLASSES.find(x=>x.id===b.dataset.pick)?.name}`]);
        window.Toast?.toast("Klasse gewählt");
        renderClassPanel(el, level);
      };
    });
  }

  window.IronQuestClasses = { CLASSES, getChosen, setChosen, multiplierForType, renderClassPanel };
})();
