(() => {
  "use strict";

  const KEY = "iq_plans_v10";
  function load(){
    try{ return JSON.parse(localStorage.getItem(KEY) || "null") || null; }catch(_){ return null; }
  }
  function save(st){
    localStorage.setItem(KEY, JSON.stringify(st));
  }
  function defaultState(){
    return { activeId: "planA", plans: [{ id:"planA", name:"Plan A", items: [] }] };
  }
  function state(){
    const st = load() || defaultState();
    if(!st.plans || !st.plans.length) return defaultState();
    if(!st.activeId) st.activeId = st.plans[0].id;
    return st;
  }
  function getActive(){
    const st = state();
    return st.plans.find(p=>p.id===st.activeId) || st.plans[0];
  }
  function setActive(id){
    const st = state();
    if(st.plans.some(p=>p.id===id)) st.activeId = id;
    save(st);
  }
  function createPlan(name){
    const st = state();
    const id = "plan_" + (window.Utils && window.Utils.uid ? window.Utils.uid() : (Date.now()+""));
    st.plans.push({ id, name: name || "New Plan", items: [] });
    st.activeId = id;
    save(st);
    return id;
  }
  function renamePlan(id, name){
    const st = state();
    const p = st.plans.find(x=>x.id===id);
    if(p){ p.name = name || p.name; save(st); }
  }
  function removePlan(id){
    const st = state();
    st.plans = st.plans.filter(p=>p.id!==id);
    if(!st.plans.length) st.plans = defaultState().plans;
    if(!st.plans.some(p=>p.id===st.activeId)) st.activeId = st.plans[0].id;
    save(st);
  }
  function addExercise(exId){
    const st = state();
    const p = st.plans.find(x=>x.id===st.activeId);
    if(!p) return;
    if(!p.items.includes(exId)) p.items.push(exId);
    save(st);
  }
  function removeExercise(exId){
    const st = state();
    const p = st.plans.find(x=>x.id===st.activeId);
    if(!p) return;
    p.items = p.items.filter(x=>x!==exId);
    save(st);
  }

  window.IronQuestPlans = {
    state,
    getActive,
    setActive,
    createPlan,
    renamePlan,
    removePlan,
    addExercise,
    removeExercise
  };
})();
