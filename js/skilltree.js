(function(){
  const KEY = "iq_skill_v4";

  const TREES = [
    { key:"multi", label:"Mehrgelenkig", type:"Mehrgelenkig" },
    { key:"uni", label:"Unilateral", type:"Unilateral" },
    { key:"core", label:"Core", type:"Core" },
    { key:"cond", label:"Conditioning", type:"Conditioning" },
    { key:"comp", label:"Komplexe", type:"Komplexe" },
  ];

  function defaultState(){
    const nodes = {};
    for (const t of TREES){
      nodes[t.key] = [
        { id:`${t.key}_1`, name:"Tier 1", cost:1, unlocked:false },
        { id:`${t.key}_2`, name:"Tier 2", cost:2, unlocked:false },
        { id:`${t.key}_3`, name:"Tier 3", cost:3, unlocked:false },
        { id:`${t.key}_cap`, name:"Capstone", cost:5, unlocked:false }
      ];
    }
    return { spent:0, nodes };
  }

  function load(){
    try{
      const st = JSON.parse(localStorage.getItem(KEY)) || defaultState();
      if (!st.nodes) return defaultState();
      return st;
    }catch{ return defaultState(); }
  }
  function save(st){ localStorage.setItem(KEY, JSON.stringify(st)); }

  function earnedSkillPoints(entries){
    // simple: 1 point per day with >= 800 XP
    const dayXP = {};
    for (const e of entries){
      dayXP[e.date] = (dayXP[e.date]||0) + (e.xp||0);
    }
    let sp = 0;
    for (const d in dayXP){
      if (dayXP[d] >= 800) sp++;
      if (dayXP[d] >= 1400) sp++; // bonus
    }
    return sp;
  }

  function availableSkillPoints(entries){
    const st = load();
    const earned = earnedSkillPoints(entries);
    const spent = Number(st.spent||0);
    return { earned, spent, available: Math.max(0, earned-spent) };
  }

  function multiplierForType(type){
    const st = load();
    const key =
      type==="Mehrgelenkig" ? "multi" :
      type==="Unilateral" ? "uni" :
      type==="Core" ? "core" :
      type==="Conditioning" ? "cond" :
      type==="Komplexe" ? "comp" : null;
    if (!key) return 1.0;

    const nodes = st.nodes[key] || [];
    const unlocked = nodes.filter(n=>n.unlocked).length;
    const cap = nodes.find(n=>n.id.endsWith("_cap"))?.unlocked === true;

    let mult = 1 + unlocked*0.02;
    if (cap) mult += 0.05;
    if (key==="comp" && cap) mult += 0.03;
    return mult;
  }

  function unlockNode(nodeId, entries){
    const st = load();
    const sp = availableSkillPoints(entries);
    for (const t of TREES){
      const nodes = st.nodes[t.key];
      const n = nodes.find(x=>x.id===nodeId);
      if (!n) continue;
      if (n.unlocked) return { ok:false, msg:"Bereits unlocked." };
      if (sp.available < n.cost) return { ok:false, msg:"Nicht genug Skillpunkte." };
      n.unlocked = true;
      st.spent = (st.spent||0) + n.cost;
      save(st);
      return { ok:true };
    }
    return { ok:false, msg:"Node nicht gefunden." };
  }

  window.IronQuestSkilltree = { TREES, load, save, availableSkillPoints, multiplierForType, unlockNode };
})();
