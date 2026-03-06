(() => {
  "use strict";

  const KEY = "ironquest_balance_v1";

  function defaults(){
    return {
      exerciseXPMult: 1.0,
      runXPMult: 1.0,
      levelCurve: 1.2,
      levelBase: 300,
      levelLinear: 90,
      levelPower: 55,
      levelExponent: 1.5,
      weekXpGoal: 2400,
      weekWorkoutGoal: 4
    };
  }

  function load(){
    try{ return Object.assign(defaults(), JSON.parse(localStorage.getItem(KEY) || "{}")); }
    catch(_){ return defaults(); }
  }

  function save(cfg){
    const out = Object.assign(defaults(), cfg || {});
    localStorage.setItem(KEY, JSON.stringify(out));
    return out;
  }

  function number(v, fallback){
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  }

  function render(hostEl){
    const host = hostEl || document.getElementById("balance");
    if(!host || !window.UI?.card) return;
    const cfg = load();
    host.innerHTML = `
      <div class="card">
        <div class="card-title">Balance (Dev)</div>
        <div class="card-body">
          <div class="form">
            <label>Exercise XP Multiplier</label>
            <input id="bal_ex" type="number" step="0.05" min="0.1" max="5" value="${cfg.exerciseXPMult}">
            <label>Run XP Multiplier</label>
            <input id="bal_run" type="number" step="0.05" min="0.1" max="5" value="${cfg.runXPMult}">
            <label>Level Curve (Exponent)</label>
            <input id="bal_curve" type="number" step="0.05" min="1.0" max="2.0" value="${cfg.levelCurve}">
            <div class="muted" style="margin-top:6px">Ziel: Level 10 in ca. 4 Wochen bei ~4 Workouts/Woche.</div>
            <div class="hr"></div>
            <label>Level Base XP (L1→2)</label>
            <input id="bal_lbase" type="number" step="10" min="50" max="5000" value="${cfg.levelBase}">
            <label>Level Linear</label>
            <input id="bal_llin" type="number" step="5" min="0" max="2000" value="${cfg.levelLinear}">
            <label>Level Power</label>
            <input id="bal_lpow" type="number" step="5" min="0" max="5000" value="${cfg.levelPower}">
            <label>Level Exponent</label>
            <input id="bal_lexp" type="number" step="0.05" min="1.0" max="3.0" value="${cfg.levelExponent}">
            <div class="hr"></div>
            <label>Weekly XP Goal</label>
            <input id="bal_wx" type="number" step="50" min="0" max="50000" value="${cfg.weekXpGoal}">
            <label>Weekly Workout Goal (days)</label>
            <input id="bal_ww" type="number" step="1" min="0" max="7" value="${cfg.weekWorkoutGoal}">
            <div class="row">
              <button id="bal_save" class="btn primary">Save</button>
              <button id="bal_reset" class="btn">Reset</button>
            </div>
            <div class="muted" style="margin-top:10px">Tipp: Änderungen wirken sofort auf Level/Goals und auf neue XP-Berechnungen.</div>
          </div>
        </div>
      </div>`;

    const $ = (id) => host.querySelector(id);
    const saveBtn = $("#bal_save");
    const resetBtn = $("#bal_reset");
    if(saveBtn){
      saveBtn.addEventListener("click", async ()=>{
        save({
          exerciseXPMult: number($("#bal_ex")?.value, cfg.exerciseXPMult),
          runXPMult: number($("#bal_run")?.value, cfg.runXPMult),
          levelCurve: number($("#bal_curve")?.value, cfg.levelCurve),
          levelBase: number($("#bal_lbase")?.value, cfg.levelBase),
          levelLinear: number($("#bal_llin")?.value, cfg.levelLinear),
          levelPower: number($("#bal_lpow")?.value, cfg.levelPower),
          levelExponent: number($("#bal_lexp")?.value, cfg.levelExponent),
          weekXpGoal: number($("#bal_wx")?.value, cfg.weekXpGoal),
          weekWorkoutGoal: number($("#bal_ww")?.value, cfg.weekWorkoutGoal)
        });
        window.IronQuestState?.invalidate?.();
        await window.IronQuestHome?.render?.();
        window.Toast?.show?.("Balance saved");
        render(host);
      });
    }
    if(resetBtn){
      resetBtn.addEventListener("click", ()=>{
        localStorage.removeItem(KEY);
        window.IronQuestState?.invalidate?.();
        window.Toast?.show?.("Balance reset");
        render(host);
      });
    }
  }

  window.IronQuestBalance = { load, save, render, KEY };
})();
