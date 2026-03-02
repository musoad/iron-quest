(() => {
  "use strict";

  const KEY = "ironquest_class_v6";

  const CLASSES = [
    { id:"none", name:"Unassigned", desc:"No specialization bonus." },
    { id:"berserker", name:"Berserker", desc:"+6% MULTI (Mehrgelenkig) XP.", bonus:{ Mehrgelenkig: 1.06 } },
    { id:"assassin", name:"Assassin", desc:"+8% UNI (Unilateral) XP.", bonus:{ Unilateral: 1.08 } },
    { id:"guardian", name:"Guardian", desc:"+6% CORE XP and +2% END XP.", bonus:{ Core: 1.06, Conditioning:1.02, NEAT:1.02, Joggen:1.02 } },
    { id:"ranger", name:"Ranger", desc:"+8% Jogging XP and +3% END XP.", bonus:{ Joggen:1.08, Conditioning:1.03, NEAT:1.03 } },
    { id:"artificer", name:"Artificer", desc:"+6% SKILL (Komplexe) XP.", bonus:{ Komplexe:1.06 } },
  ];

  function load(){
    try { return JSON.parse(localStorage.getItem(KEY)) || { id:"none" }; }
    catch { return { id:"none" }; }
  }
  function save(st){ localStorage.setItem(KEY, JSON.stringify(st)); }

  function get(){
    const st = load();
    const c = CLASSES.find(x=>x.id===st.id) || CLASSES[0];
    return c;
  }

  function set(id){
    const c = CLASSES.find(x=>x.id===id);
    if (!c) return false;
    save({ id:c.id });
    return true;
  }

  function multiplierForType(type){
    const c = get();
    const b = c.bonus || {};
    return Number(b[type] || 1);
  }

  function isUnlocked(level){
    return Number(level||0) >= 10;
  }

  window.IronQuestClass = { CLASSES, get, set, multiplierForType, isUnlocked };
})();
