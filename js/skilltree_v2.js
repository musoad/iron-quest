(() => {
  "use strict";

  const KEY="iq_skilltree_v2";
  const MAX_PASSIVE = 25;
  const COOLDOWN_MS = 24*60*60*1000;

  // Simple active-skill definitions (effects are applied as temporary buffs)
  const ACTIVE = [
    { id:"focus", name:"Focus", desc:"+10% XP für den nächsten Log-Eintrag.", effect:{ xpMult:1.10 } },
    { id:"burst", name:"Burst", desc:"+15% Gate Damage für den nächsten Gate-Run.", effect:{ gateDmg:0.15 } },
    { id:"calm", name:"Calm", desc:"-10% Gate HP (leichter) für den nächsten Gate-Run.", effect:{ gateHpMult:0.90 } }
  ];
  function load(){
    try{ return JSON.parse(localStorage.getItem(KEY)||"null") || null; }catch(_){ return null; }
  }
  function save(st){ localStorage.setItem(KEY, JSON.stringify(st)); }
  function defaultState(){
    return {
    getActiveBuff,
    setActiveBuff,
    consumeActiveBuff,
passive: { Mehrgelenkig:0, Unilateral:0, Core:0, Conditioning:0, Komplexe:0, NEAT:0 },
      active: {} // id -> {lastUsed, charges}
    };
  }
  function state(){
    const st = load() || defaultState();
    if(!st.passive) st.passive = defaultState().passive;
    return st;
  }
  function addPassive(type){
    const st = state();
    if(!st.passive[type]) st.passive[type]=0;
    st.passive[type] = Math.min(MAX_PASSIVE, Number(st.passive[type]||0)+1);
    save(st);
  }
  function passiveMultiplier(type){
    const st = state();
    const pts = Number((st.passive && st.passive[type]) || 0);
    return 1 + Math.min(0.25, pts * 0.02);
  }

  function _activeState(){
    const st = state();
    if(!st.active) st.active = {};
    return st;
  }

  function canUseActive(id){
    const st = _activeState();
    const a = st.active[id];
    if(!a || !a.lastUsed) return true;
    return (Date.now() - a.lastUsed) >= COOLDOWN_MS;
  }

  function useActive(id){
    const skill = ACTIVE.find(s=>s.id===id);
    if(!skill) return { ok:false, reason:"not_found" };
    if(!canUseActive(id)) return { ok:false, reason:"cooldown", skill };
    const st = _activeState();
    st.active[id] = { lastUsed: Date.now() };
    save(st);
    
  // ----- Active Skill Buff (used by Log XP calc) -----
  const KEY_ACTIVE_BUFF = "iq_active_buff_v2";
  function _readBuff(){
    let b = window.__IQ_ACTIVE_BUFFS || null;
    if(!b){
      try{
        const raw = localStorage.getItem(KEY_ACTIVE_BUFF);
        if(raw){
          const obj = JSON.parse(raw);
          if(obj && obj.buffs) b = obj.buffs;
        }
      }catch(e){}
    }
    return b;
  }
  function setActiveBuff(buffs){
    window.__IQ_ACTIVE_BUFFS = buffs || null;
    try{
      if(buffs) localStorage.setItem(KEY_ACTIVE_BUFF, JSON.stringify({ buffs, ts: Date.now() }));
      else localStorage.removeItem(KEY_ACTIVE_BUFF);
    }catch(e){}
  }
  function getActiveBuff(){
    // NOTE: read-only; do not consume on read because UI recalculates often
    const b = _readBuff();
    return b || null;
  }
  function consumeActiveBuff(){
    // call this after saving a log entry (one-time buff)
    setActiveBuff(null);
  }
return { ok:true, skill };
  }

  window.IronQuestSkilltreeV2 = {
    // persistence helpers (some screens call .load())
    load: state,
    save: function(st){ save(st); },
    state,
    MAX_PASSIVE,
    ACTIVE,
    canUseActive,
    useActive,
    addPassive,
    passiveMultiplier,
    setPassive: function(type, pts){
      const st = state();
      if(!st.passive) st.passive = defaultState().passive;
      st.passive[type] = Math.max(0, Math.min(25, Number(pts||0)));
      save(st);
    },
    reset: function(){ save(defaultState()); }
  };
})();
