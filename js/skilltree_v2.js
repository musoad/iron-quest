(() => {
  "use strict";

  const KEY="iq_skilltree_v2";
  function load(){
    try{ return JSON.parse(localStorage.getItem(KEY)||"null") || null; }catch(_){ return null; }
  }
  function save(st){ localStorage.setItem(KEY, JSON.stringify(st)); }
  function defaultState(){
    return {
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
    st.passive[type] = Math.min(25, Number(st.passive[type]||0)+1);
    save(st);
  }
  function passiveMultiplier(type){
    const st = state();
    const pts = Number((st.passive && st.passive[type]) || 0);
    return 1 + Math.min(0.25, pts * 0.02);
  }

  window.IronQuestSkilltreeV2 = {
    // persistence helpers (some screens call .load())
    load: state,
    save: function(st){ save(st); },
    state,
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
