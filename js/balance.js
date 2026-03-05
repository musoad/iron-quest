(() => {
  "use strict";

  const KEY = "ironquest_balance_v1";

  function defaults(){
    return {
      exerciseXPMult: 1.0,
      runXPMult: 1.0,
      levelCurve: 1.2,        // used as exponent in fallback curve
      weekXpGoal: 1800,
      weekWorkoutGoal: 4      // days with logs
    };
  }

  function load(){
    try{
      return Object.assign(defaults(), JSON.parse(localStorage.getItem(KEY) || "{}"));
    }catch(e){
      return defaults();
    }
  }

  function save(cfg){
    const out = Object.assign(defaults(), cfg||{});
    localStorage.setItem(KEY, JSON.stringify(out));
    return out;
  }

  function number(v, fallback){
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  function render(){
    const host = document.getElementById("balance");
    if(!host) return;

    const cfg = load();

    host.innerHTML = "";
    host.appendChild(UI.card("Balance (Dev)", `
      <div class="form">
        <label>Exercise XP Multiplier</label>
        <input id="bal_ex" type="number" step="0.05" min="0.1" max="5" value="${cfg.exerciseXPMult}">
        <label>Run XP Multiplier</label>
        <input id="bal_run" type="number" step="0.05" min="0.1" max="5" value="${cfg.runXPMult}">
        <label>Level Curve (Exponent)</label>
        <input id="bal_curve" type="number" step="0.05" min="1.0" max="2.0" value="${cfg.levelCurve}">
        <div class="hr"></div>
        <label>Weekly XP Goal</label>
        <input id="bal_wx" type="number" step="50" min="0" max="50000" value="${cfg.weekXpGoal}">
        <label>Weekly Workout Goal (days)</label>
        <input id="bal_ww" type="number" step="1" min="0" max="7" value="${cfg.weekWorkoutGoal}">
        <div class="row">
          <button id="bal_save" class="btn primary">Save</button>
          <button id="bal_reset" class="btn">Reset</button>
        </div>
        <div class="muted" style="margin-top:10px">
          Tipp: Änderungen wirken sofort auf Level/Goals, und auf neue XP-Berechnungen (nicht rückwirkend).
        </div>
      </div>
    `));

    const $ = (id)=>document.getElementById(id);
    $("#bal_save").addEventListener("click", async ()=>{
      const next = save({
        exerciseXPMult: number($("#bal_ex").value, cfg.exerciseXPMult),
        runXPMult: number($("#bal_run").value, cfg.runXPMult),
        levelCurve: number($("#bal_curve").value, cfg.levelCurve),
        weekXpGoal: number($("#bal_wx").value, cfg.weekXpGoal),
        weekWorkoutGoal: number($("#bal_ww").value, cfg.weekWorkoutGoal),
      });
      window.IronQuestState?.invalidate?.();
      await window.IronQuestHome?.render?.();
      window.Toast?.show?.("Balance saved");
      render(); // refresh
    });

    $("#bal_reset").addEventListener("click", ()=>{
      localStorage.removeItem(KEY);
      window.IronQuestState?.invalidate?.();
      window.Toast?.show?.("Balance reset");
      render();
    });
  }

  window.IronQuestBalance = { load, save, render, KEY };
})();
