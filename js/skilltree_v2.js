(() => {
  "use strict";
  const KEY="ironquest_skilltree_v8";
  // Passive points per type + Active skills with cooldown
  const MAX_PASSIVE=25; // points
  const PASSIVE_PER_POINT=0.02; // +2%
  const ACTIVE=[
    { id:"adrenaline", name:"Adrenaline Surge", desc:"+15% XP für die nächste Session", cdHours:24, effect:{ globalXp:1.15, sessions:1 } },
    { id:"gatebreaker", name:"Gate Breaker", desc:"+20% Gate Damage für 1 Gate Versuch", cdHours:24, effect:{ gateDmg:1.20, gates:1 } },
    { id:"coreOverdrive", name:"Core Overdrive", desc:"Core XP zählt doppelt für 1 Session", cdHours:24, effect:{ coreXp:2.0, sessions:1 } },
  ];
  function load(){
    try{
      return JSON.parse(localStorage.getItem(KEY)) || { passive:{ Mehrgelenkig:0, Unilateral:0, Core:0, Conditioning:0, Komplexe:0, NEAT:0 }, active:{} };
    }catch{
      return { passive:{ Mehrgelenkig:0, Unilateral:0, Core:0, Conditioning:0, Komplexe:0, NEAT:0 }, active:{} };
    }
  }
  function save(st){ localStorage.setItem(KEY, JSON.stringify(st)); }

  function passiveMultiplier(type){
    const st=load();
    const pts=Math.min(MAX_PASSIVE, Number((st.passive && st.passive[type]) || 0));
    return 1 + Math.min(0.25, pts*PASSIVE_PER_POINT);
  }

  function _now(){ return Date.now(); }
  function canUseActive(id){
    const st=load();
    const a=ACTIVE.find(x=>x.id===id);
    if(!a) return false;
    const info=(st.active && st.active[id]) || { lastUsed:0, charges:0 };
    const ms = a.cdHours*3600*1000;
    return (_now()-Number(info.lastUsed||0)) >= ms;
  }

  function useActive(id){
    const st=load();
    const a=ACTIVE.find(x=>x.id===id);
    if(!a) return { ok:false, reason:"unknown" };
    if(!canUseActive(id)) return { ok:false, reason:"cooldown" };
    st.active[id] = { lastUsed:_now(), charges: (st.active[(id] && id].charges)||0)+1 };
    save(st);
    return { ok:true, skill:a };
  }

  // Active buffs are stored in session state (see logFeature/app hooks)
  window.IronQuestSkilltreeV2={ ACTIVE, load, save, passiveMultiplier, canUseActive, useActive, MAX_PASSIVE };
})();
