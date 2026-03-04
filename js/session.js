(() => {
  "use strict";

  const KEY = "ironquest_session_v5";

  function load(){
    try { return JSON.parse(localStorage.getItem(KEY)) || { active:false, day:1, startedAt:"", done:[] }; }
    catch { return { active:false, day:1, startedAt:"", done:[] }; }
  }
  function save(st){ localStorage.setItem(KEY, JSON.stringify(st)); }

  function start(day){
    const st = load();
    st.active = true;
    st.day = Number(day||1);
    st.startedAt = new Date().toISOString();
    st.done = [];
    save(st);
    return st;
  }

  function stop(){
    const st = load();
    st.active = false;
    save(st);
    return st;
  }

  function toggleDone(exName){
    const st = load();
    const name = String(exName||"");
    if (!name) return st;
    const idx = st.done.indexOf(name);
    if (idx >= 0) st.done.splice(idx,1);
    else st.done.push(name);
    save(st);
    return st;
  }

  function getState(){ return load(); }

  // Bonus reward: finish session → add chest
  function finishAndReward(){
    const st = load();
    if (!st.active) return { ok:false };
    st.active = false;
    save(st);
    (window.IronQuestLoot && (window.IronQuestLoot.addChest) && window.IronQuestLoot.addChest)(1);
    return { ok:true };
  }

  window.IronQuestSession = { start, stop, toggleDone, getState, finishAndReward };
})();
