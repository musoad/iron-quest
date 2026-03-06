(() => {
  "use strict";

  // Plans are stored in localStorage (simple + offline friendly)
  // Items are exercise entries.
  // v11+: { name, sets, reps }
  // (Older saves were string names → auto-upgraded.)
  const KEY = "iq_plans_v10";
  const WEEK_KEYS = ["mon","tue","wed","thu","fri","sat","sun"];

  function normalizeWeek(w){
    const o = (w && typeof w === "object") ? w : {};
    const out = {};
    for(const k of WEEK_KEYS){
      const arr = Array.isArray(o[k]) ? o[k].map(x=>String(x||"").trim()).filter(Boolean) : [];
      // keep unique order
      out[k] = Array.from(new Set(arr));
    }
    return out;
  }

  function load(){
    try{ return JSON.parse(localStorage.getItem(KEY) || "null") || null; }catch(_){ return null; }
  }
  function save(st){
    localStorage.setItem(KEY, JSON.stringify(st));
    try{ if(window.IronQuestState) window.IronQuestState.invalidate(); }catch(_){ }
  }
  function defaultState(){
    return { activeId: "planA", plans: [{ id:"planA", name:"Plan A", items: [], week: normalizeWeek(null) }] };
  }

  function normalizeState(st){
    const s = st || defaultState();
    if(!Array.isArray(s.plans) || !s.plans.length) return defaultState();
    if(!s.activeId) s.activeId = s.plans[0].id;
    // normalize plan shape
    s.plans = s.plans.map(p => ({
      id: String(p.id || ("plan_" + Date.now())),
      name: String(p.name || "Plan"),
      items: Array.isArray(p.items) ? p.items.map(it => {
        if(typeof it === "string") return { name: String(it), sets:"", reps:"" };
        const name = String(it && (it.name||it.exercise||"") || "").trim();
        const sets = (it && (it.sets ?? it.recSets ?? ""));
        const reps = (it && (it.reps ?? it.recReps ?? ""));
        return { name, sets: sets==null?"":String(sets), reps: reps==null?"":String(reps) };
      }).filter(x=>x.name) : [],
      week: normalizeWeek(p.week)
    }));
    if(!s.plans.some(p=>p.id===s.activeId)) s.activeId = s.plans[0].id;
    return s;
  }

  function getState(){
    return normalizeState(load());
  }
  function setState(st){
    save(normalizeState(st));
  }

  function state(){
    return getState();
  }

  function getActive(){
    const st = getState();
    return st.plans.find(p=>p.id===st.activeId) || st.plans[0];
  }
  function setActive(id){
    const st = getState();
    if(st.plans.some(p=>p.id===id)) st.activeId = id;
    save(st);
  }
  function createPlan(name){
    const st = getState();
    const id = "plan_" + (window.Utils && window.Utils.uid ? window.Utils.uid() : (Date.now()+""));
    st.plans.push({ id, name: name || "New Plan", items: [], week: normalizeWeek(null) });
    st.activeId = id;
    save(st);
    return id;
  }
  function renamePlan(id, name){
    const st = getState();
    const p = st.plans.find(x=>x.id===id);
    if(p){ p.name = name || p.name; save(st); }
  }
  function removePlan(id){
    const st = getState();
    st.plans = st.plans.filter(p=>p.id!==id);
    if(!st.plans.length) st.plans = defaultState().plans;
    if(!st.plans.some(p=>p.id===st.activeId)) st.activeId = st.plans[0].id;
    save(st);
  }

  // Active plan helpers
  function addExercise(name){
    const st = getState();
    const p = st.plans.find(x=>x.id===st.activeId);
    if(!p) return;
    const ex = String(name || "").trim();
    if(!ex) return;
    if(!p.items.some(x=>x.name===ex)) p.items.push({ name: ex, sets:"", reps:"" });
    save(st);
  }
  function removeExercise(name){
    const st = getState();
    const p = st.plans.find(x=>x.id===st.activeId);
    if(!p) return;
    const ex = String(name || "").trim();
    p.items = p.items.filter(x=>x.name!==ex);
    save(st);
  }

  // Explicit plan helpers (used by UI)
  function addExerciseToPlan(planId, name, params){
    const st = getState();
    const p = st.plans.find(x=>x.id===planId);
    if(!p) return;
    const ex = String(name || "").trim();
    if(!ex) return;
    if(!p.items.some(x=>x.name===ex)){
      const sets = params && params.sets != null ? String(params.sets) : "";
      const reps = params && params.reps != null ? String(params.reps) : "";
      p.items.push({ name: ex, sets, reps });
    }
    save(st);
  }
  function removeExerciseFromPlan(planId, name){
    const st = getState();
    const p = st.plans.find(x=>x.id===planId);
    if(!p) return;
    const ex = String(name || "").trim();
    p.items = p.items.filter(x=>x.name!==ex);
    save(st);
  }
  function moveExercise(planId, name, dir){
    const st = getState();
    const p = st.plans.find(x=>x.id===planId);
    if(!p) return;
    const ex = String(name || "").trim();
    const i = p.items.findIndex(x=>x.name===ex);
    if(i<0) return;
    const j = dir === "up" ? i-1 : i+1;
    if(j<0 || j>=p.items.length) return;
    const tmp = p.items[i];
    p.items[i] = p.items[j];
    p.items[j] = tmp;
    save(st);
  }

  function setParams(planId, name, sets, reps){
    const st = getState();
    const p = st.plans.find(x=>x.id===planId);
    if(!p) return;
    const ex = String(name||"").trim();
    const it = p.items.find(x=>x.name===ex);
    if(!it) return;
    it.sets = sets==null?"":String(sets);
    it.reps = reps==null?"":String(reps);
    save(st);
  }

  
  function setDayAssignments(planId, dayKey, names){
    const st = getState();
    const p = st.plans.find(x=>x.id===planId);
    if(!p) return;
    const k = String(dayKey||"").toLowerCase();
    if(!p.week) p.week = normalizeWeek(null);
    if(!p.week[k]) p.week[k] = [];
    const arr = Array.isArray(names) ? names.map(x=>String(x||"").trim()).filter(Boolean) : [];
    p.week[k] = Array.from(new Set(arr));
    save(st);
  }

  function assignToDay(planId, dayKey, name){
    const st = getState();
    const p = st.plans.find(x=>x.id===planId);
    if(!p) return;
    const k = String(dayKey||"").toLowerCase();
    if(!p.week) p.week = normalizeWeek(null);
    if(!p.week[k]) p.week[k] = [];
    const ex = String(name||"").trim();
    if(!ex) return;
    if(!p.week[k].includes(ex)) p.week[k].push(ex);
    save(st);
  }

  function removeFromDay(planId, dayKey, name){
    const st = getState();
    const p = st.plans.find(x=>x.id===planId);
    if(!p) return;
    const k = String(dayKey||"").toLowerCase();
    if(!p.week) p.week = normalizeWeek(null);
    const ex = String(name||"").trim();
    p.week[k] = (p.week[k]||[]).filter(x=>x!==ex);
    save(st);
  }

  function dayKeyForDate(d){
    const day = (d instanceof Date ? d : new Date());
    // JS: 0=Sun..6=Sat. We use mon..sun
    const map = ["sun","mon","tue","wed","thu","fri","sat"];
    return map[day.getDay()] || "mon";
  }

window.IronQuestPlans = {
    // state
    getState,
    setState,
    state,

    // plans
    getActive,
    setActive,
    createPlan,
    renamePlan,
    removePlan,

    // items
    addExercise,
    removeExercise,
    addExerciseToPlan,
    removeExerciseFromPlan,
    moveExercise,
    setParams
  };
})();
