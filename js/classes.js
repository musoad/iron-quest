(() => {
  "use strict";

  const KEY = "ironquest_class_v9";
  const UNLOCK_LEVEL = 10;

  const CLASSES = [
    {
      id:"none",
      name:"Unassigned",
      desc:"Wähle ab Level 10 eine Klasse. Bis dahin trainierst du als freier Hunter.",
      perks:["Neutraler Fortschritt","Kein Bonus aktiv"],
      bonus:{}
    },
    {
      id:"berserker",
      name:"Berserker",
      desc:"Explosiver Strength-Build für Mehrgelenkig-Übungen.",
      perks:["+12% Mehrgelenkig XP","+6% Gate Damage"],
      bonus:{ Mehrgelenkig:1.12, gateDmg:1.06, statBias:{ STR:1.08 } }
    },
    {
      id:"assassin",
      name:"Assassin",
      desc:"Schneller, präziser Build für Unilateral- und Tempo-Arbeit.",
      perks:["+12% Unilateral XP","+6% Run XP"],
      bonus:{ Unilateral:1.12, runXp:1.06, statBias:{ AGI:1.08 } }
    },
    {
      id:"guardian",
      name:"Guardian",
      desc:"Zäher Tank mit Fokus auf Core, Kontrolle und Stabilität.",
      perks:["+12% Core XP","+5% Boss Defense"],
      bonus:{ Core:1.12, bossDef:1.05, statBias:{ END:1.08 } }
    },
    {
      id:"ranger",
      name:"Ranger",
      desc:"Conditioning- und Ausdauerklasse für konstante Wochenleistung.",
      perks:["+10% Conditioning/NEAT XP","+8% Weekly Goal Progress"],
      bonus:{ Conditioning:1.10, NEAT:1.10, weekGoal:1.08, statBias:{ PER:1.06, AGI:1.04 } }
    },
    {
      id:"monarch",
      name:"Monarch",
      desc:"Späte Hybridklasse mit globalem Wachstum und Boss-Fokus.",
      perks:["+6% global XP","+8% Boss/Gate Damage"],
      bonus:{ "*":1.06, gateDmg:1.08, statBias:{ INT:1.06, LCK:1.06 } }
    },
  ];

  function norm(id){
    const v = String(id||"none").toLowerCase();
    return (v === "unassigned") ? "none" : v;
  }

  function get(){ return norm(localStorage.getItem(KEY) || "none"); }
  function set(id){ localStorage.setItem(KEY, norm(id)); }
  function meta(id){ return CLASSES.find(c=>c.id===norm(id)) || CLASSES[0]; }

  function multiplierForType(type){
    const c = meta(get());
    const b = c.bonus || {};
    return Number(b[type] || b["*"] || 1) || 1;
  }

  function runMultiplier(){
    const c = meta(get());
    return Number(c.bonus?.runXp || c.bonus?.["*"] || 1) || 1;
  }

  function gateMultiplier(){
    const c = meta(get());
    return Number(c.bonus?.gateDmg || 1) || 1;
  }

  function statBias(){
    return Object.assign({}, meta(get()).bonus?.statBias || {});
  }

  function bossDefense(){
    const c = meta(get());
    return Number(c.bonus?.bossDef || 1) || 1;
  }

  function isUnlocked(level){ return Number(level||0) >= UNLOCK_LEVEL; }

  function preview(level){
    const unlocked = isUnlocked(level);
    const active = unlocked ? meta(get()) : meta("none");
    return {
      unlocked,
      unlockLevel: UNLOCK_LEVEL,
      active,
      available: unlocked ? CLASSES.filter(c=>c.id!=="none") : []
    };
  }

  window.IronQuestClasses = {
    CLASSES,
    UNLOCK_LEVEL,
    get,
    set,
    meta,
    multiplierForType,
    runMultiplier,
    gateMultiplier,
    bossDefense,
    statBias,
    isUnlocked,
    preview
  };
})();
