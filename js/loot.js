(() => {
  "use strict";
  const KEY="ironquest_loot_v8";
  const DROP_TABLE=[
    { id:"title_shadow", name:"Title: Shadow Trainee", kind:"title", chance:0.18 },
    { id:"title_gate", name:"Title: Gate Breaker", kind:"title", chance:0.12 },
    { id:"badge_emerald", name:"Badge: Emerald Rune", kind:"badge", chance:0.16 },
    { id:"badge_gold", name:"Badge: Golden Crest", kind:"badge", chance:0.08 },
    { id:"aura_abyss", name:"Aura: Abyss Mist", kind:"aura", chance:0.10 },
    { id:"relic_xp", name:"Relic: XP Shard", kind:"relic", chance:0.10, bonus:{ globalXp:1.02 } },
    { id:"relic_gate", name:"Relic: Gate Core", kind:"relic", chance:0.08, bonus:{ gateDmg:1.05 } },
  ];

  function load(){ try{ return JSON.parse(localStorage.getItem(KEY))||{ chests:0, inv:[] }; }catch{ return { chests:0, inv:[] }; } }
  function save(st){ localStorage.setItem(KEY, JSON.stringify(st)); }

  function addChests(n=1){ const st=load(); st.chests=Math.max(0, Number(st.chests||0)+Number(n||0)); save(st); }

  function roll(){
    const st=load();
    if((st.chests||0)<=0) return { ok:false, reason:"no_chest" };
    st.chests-=1;

    // cumulative
    const r=Math.random();
    let acc=0;
    let pick=null;
    for(const it of DROP_TABLE){
      acc += it.chance;
      if(r<=acc){ pick=it; break; }
    }

    if(!pick){
      save(st);
      return { ok:true, item:null, msg:"Nothing found (XP dust)" };
    }

    if(!st.inv.find(x=>x.id===pick.id)){
      st.inv.push({ id:pick.id, name:pick.name, kind:pick.kind, bonus:pick.bonus||{}, date: window.Utils.isoDate(new Date()) });
      save(st);
      return { ok:true, item:pick, msg:`Obtained: ${pick.name}` };
    }

    save(st);
    return { ok:true, item:null, msg:"Duplicate → converted to XP dust" };
  }

  window.IronQuestLoot={ load, save, addChests, addChest:(n=1)=>addChests(n), roll, rollDrop:()=>roll(), getState:()=>load(), DROP_TABLE };
})();
