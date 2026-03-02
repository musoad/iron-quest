(() => {
  "use strict";

  const KEY = "ironquest_loot_v6";

  // Includes equipment-relevant kinds
  const DROP_TABLE = [
    { id:"t_shadow",  name:"Title: Shadow Trainee", kind:"title", chance:0.16 },
    { id:"t_gate",    name:"Title: Gate Breaker",   kind:"title", chance:0.10 },
    { id:"b_emerald", name:"Badge: Emerald Rune",   kind:"badge", chance:0.12 },
    { id:"b_gold",    name:"Badge: Golden Crest",   kind:"badge", chance:0.06 },
    { id:"r_relic",   name:"Relic: XP Sigil",       kind:"relic", chance:0.08 },
    { id:"a_abyss",   name:"Aura: Abyss Glow",      kind:"aura",  chance:0.06 },
  ];

  function load(){
    try { return JSON.parse(localStorage.getItem(KEY)) || { inv:[], chests:0, lastDrop:"" }; }
    catch { return { inv:[], chests:0, lastDrop:"" }; }
  }
  function save(st){ localStorage.setItem(KEY, JSON.stringify(st)); }

  function addChest(n=1){
    const st = load();
    st.chests = Math.max(0, Number(st.chests||0) + Number(n||0));
    save(st);
  }

  function rollDrop(){
    const st = load();
    if ((st.chests||0) <= 0) return { ok:false, reason:"no_chest" };
    st.chests -= 1;

    const totalChance = DROP_TABLE.reduce((s,x)=>s+x.chance,0);
    const r = Math.random() * Math.max(1e-6, totalChance);
    let acc = 0;
    let drop = null;
    for (const item of DROP_TABLE){
      acc += item.chance;
      if (r <= acc){ drop = item; break; }
    }

    if (!drop){
      st.lastDrop = "Nothing (XP shard)";
      save(st);
      return { ok:true, drop:null };
    }

    if (!st.inv.find(x=>x.id===drop.id)){
      st.inv.push({ id: drop.id, name: drop.name, kind: drop.kind, date: window.Utils.isoDate(new Date()) });
      st.lastDrop = drop.name;
    } else {
      st.lastDrop = "Duplicate → XP shard";
    }

    save(st);
    return { ok:true, drop: st.lastDrop };
  }

  function getState(){ return load(); }

  window.IronQuestLoot = { DROP_TABLE, getState, addChest, rollDrop };
})();
