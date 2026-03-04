(() => {
  "use strict";

  const LS_KEY = "iq_plans_v1";

  const DEFAULT = {
    activePlanId: "default",
    plans: [
      { id: "default", name: "Standard", exerciseIds: [] }
    ]
  };

  function safeParse(json, fallback) {
    try { return JSON.parse(json); } catch { return fallback; }
  }
  function clone(x){ return JSON.parse(JSON.stringify(x)); }
  function save(st){ localStorage.setItem(LS_KEY, JSON.stringify(st)); }

  function load() {
    const raw = localStorage.getItem(LS_KEY);
    const st = raw ? safeParse(raw, clone(DEFAULT)) : clone(DEFAULT);
    if (!st.plans || !Array.isArray(st.plans)) st.plans = clone(DEFAULT.plans);
    if (!st.activePlanId) st.activePlanId = st.plans[0]?.id || "default";
    // ensure default exists
    if (!st.plans.find(p => p.id === "default")) st.plans.unshift({ id: "default", name: "Standard", exerciseIds: [] });
    return st;
  }

  let _state = load();

  function getState() { return clone(_state); }     // ✅ required by logFeature.js
  function setState(st){ _state = st ? clone(st) : clone(DEFAULT); save(_state); return getState(); }

  function listPlans(){ return clone(_state.plans); }
  function activePlan(){
    return clone(_state.plans.find(p => p.id === _state.activePlanId) || _state.plans[0]);
  }

  function setActivePlan(id){
    if (_state.plans.find(p => p.id === id)) {
      _state.activePlanId = id;
      save(_state);
    }
  }

  function createPlan(name){
    const id = "plan_" + Math.random().toString(16).slice(2) + "_" + Date.now().toString(16);
    _state.plans.push({ id, name: String(name||"Neuer Plan"), exerciseIds: [] });
    _state.activePlanId = id;
    save(_state);
    return id;
  }

  function deletePlan(id){
    if (id === "default") return;
    _state.plans = _state.plans.filter(p => p.id !== id);
    if (!_state.plans.length) _state.plans = clone(DEFAULT.plans);
    if (_state.activePlanId === id) _state.activePlanId = _state.plans[0].id;
    save(_state);
  }

  function toggleExercise(planId, exerciseId){
    const p = _state.plans.find(x => x.id === planId);
    if (!p) return;
    if (!Array.isArray(p.exerciseIds)) p.exerciseIds = [];
    const idx = p.exerciseIds.indexOf(exerciseId);
    if (idx >= 0) p.exerciseIds.splice(idx, 1);
    else p.exerciseIds.push(exerciseId);
    save(_state);
  }

  // Backwards compat aliases (older code might call these)
  function loadFromStorage(){ _state = load(); return getState(); }
  function saveToStorage(){ save(_state); }

  window.IronQuestPlans = {
    // required
    getState, setState,          // ✅ fixes your log error
    // plan api
    listPlans,
    activePlan,
    setActivePlan,
    createPlan,
    deletePlan,
    toggleExercise,
    // compat
    load: loadFromStorage,
    save: saveToStorage
  };
})();
