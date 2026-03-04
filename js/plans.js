(() => {
  "use strict";

  const KEY = "ironquest_plans_v1";

  function uid(){
    return "p_" + Math.random().toString(16).slice(2) + "_" + Date.now().toString(16);
  }

  function load(){
    try{
      const st = JSON.parse(localStorage.getItem(KEY));
      if(st && Array.isArray(st.plans)) return st;
    }catch{}
    const base = { activeId: "", plans: [] };
    localStorage.setItem(KEY, JSON.stringify(base));
    return base;
  }

  function save(st){
    localStorage.setItem(KEY, JSON.stringify(st));
  }

  function getState(){ return load(); }

  function getActive(){
    const st = load();
    return st.plans.find(p => p.id === st.activeId) || st.plans[0] || null;
  }

  function setActive(id){
    const st = load();
    st.activeId = id || "";
    save(st);
  }

  function addPlan(name){
    const st = load();
    const p = { id: uid(), name: (name||"Plan").trim() || "Plan", items: [] }; // items = exercise names
    st.plans.push(p);
    if(!st.activeId) st.activeId = p.id;
    save(st);
    return p;
  }

  function renamePlan(id, name){
    const st = load();
    const p = st.plans.find(x=>x.id===id);
    if(!p) return false;
    p.name = (name||"").trim() || p.name;
    save(st);
    return true;
  }

  function removePlan(id){
    const st = load();
    st.plans = st.plans.filter(p=>p.id!==id);
    if(st.activeId===id) st.activeId = st.plans[(0] && 0].id) || "";
    save(st);
  }

  function addExerciseToPlan(planId, exName){
    const st = load();
    const p = st.plans.find(x=>x.id===planId);
    if(!p) return false;
    const n = String(exName||"").trim();
    if(!n) return false;
    if(!p.items.includes(n)) p.items.push(n);
    save(st);
    return true;
  }

  function removeExerciseFromPlan(planId, exName){
    const st = load();
    const p = st.plans.find(x=>x.id===planId);
    if(!p) return false;
    p.items = p.items.filter(x=>x!==exName);
    save(st);
    return true;
  }

  function moveExercise(planId, exName, dir){
    const st = load();
    const p = st.plans.find(x=>x.id===planId);
    if(!p) return false;
    const i = p.items.indexOf(exName);
    if(i<0) return false;
    const j = i + (dir==="up" ? -1 : 1);
    if(j<0 || j>=p.items.length) return false;
    const tmp = p.items[i];
    p.items[i] = p.items[j];
    p.items[j] = tmp;
    save(st);
    return true;
  }

  window.IronQuestPlans = {
    getState,
    getActive,
    setActive,
    addPlan,
    renamePlan,
    removePlan,
    addExerciseToPlan,
    removeExerciseFromPlan,
    moveExercise
  };
})();
