(() => {
  "use strict";
  const KEY="ironquest_class_v8";
  const CLASSES=[
    { id:"none", name:"Unassigned", desc:"Wähle ab Level 10 eine Klasse." , bonus:{} },
    { id:"berserker", name:"Berserker", desc:"+6% Mehrgelenkig XP", bonus:{ Mehrgelenkig:1.06 } },
    { id:"assassin", name:"Assassin", desc:"+8% Unilateral XP", bonus:{ Unilateral:1.08 } },
    { id:"guardian", name:"Guardian", desc:"+8% Core XP", bonus:{ Core:1.08 } },
    { id:"ranger", name:"Ranger", desc:"+8% Conditioning/NEAT XP", bonus:{ Conditioning:1.08, NEAT:1.08 } },
    { id:"monarch", name:"Monarch", desc:"+4% global XP", bonus:{ "*":1.04 } },
  ];
  function norm(id){
    const v = String(id||"none").toLowerCase();
    return (v === "unassigned") ? "none" : v;
  }
  function get(){ return norm(localStorage.getItem(KEY) || "none"); }
  function set(id){ localStorage.setItem(KEY, norm(id)); }
  function meta(id){ return CLASSES.find(c=>c.id===norm(id)) || CLASSES[0]; }
  function multiplierForType(type){
    const c=meta(get());
    const b=c.bonus||{};
    return (b[type]||b["*"]||1);
  }
  window.IronQuestClasses={ CLASSES, get, set, meta, multiplierForType };
})();
