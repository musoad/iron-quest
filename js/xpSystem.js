(function(){
  const KEY_PR = "iq_pr_v4";

  function loadPR(){
    try{ return JSON.parse(localStorage.getItem(KEY_PR)) || {}; }catch{ return {}; }
  }
  function savePR(map){
    localStorage.setItem(KEY_PR, JSON.stringify(map));
  }

  function baseXPByType(type){
    if (type === "Mehrgelenkig") return 180;
    if (type === "Unilateral") return 200;
    if (type === "Core") return 140;
    if (type === "Conditioning") return 240;
    if (type === "Komplexe") return 260;
    if (type === "NEAT") return 0;
    if (type === "Rest") return 0;
    return 120;
  }

  function neatXP(minutes){
    const m = Math.max(0, Number(minutes||0));
    return Math.round(m * 2.5); // 60 -> 150
  }

  // PR Logic:
  // - For strength types: PR = max(sets*reps) OR reps if sets missing
  // - For NEAT: PR = minutes
  function computePRMetric(type, sets, reps, minutes){
    if (type === "NEAT") return Math.max(0, Number(minutes||0));
    const s = Number(sets||0), r = Number(reps||0);
    if (s > 0 && r > 0) return Math.round(s*r);
    if (r > 0) return Math.round(r);
    return 0;
  }

  function checkAndUpdatePR(exerciseName, metric){
    if (!exerciseName || metric <= 0) return { isPR:false, old:0, now:metric };
    const pr = loadPR();
    const old = Number(pr[exerciseName] || 0);
    if (metric > old){
      pr[exerciseName] = metric;
      savePR(pr);
      return { isPR:true, old, now:metric };
    }
    return { isPR:false, old, now:metric };
  }

  function getTopPRs(limit){
    const pr = loadPR();
    return Object.entries(pr)
      .sort((a,b)=>Number(b[1])-Number(a[1]))
      .slice(0, limit || 10);
  }

  // XP calc combines:
  // base(type) + volume factor (sets/reps) + streak bonus + skill multiplier + mutation/reward placeholders
  function computeXP(payload){
    const type = payload.type;
    const sets = Number(payload.sets||0);
    const reps = Number(payload.reps||0);
    const minutes = Number(payload.minutes||0);

    let base = 0;
    if (type === "NEAT") base = neatXP(minutes);
    else base = baseXPByType(type);

    // volume factor (small)
    let vol = 1.0;
    if (type !== "NEAT" && type !== "Rest"){
      const v = (sets>0 && reps>0) ? (sets*reps) : (reps>0?reps:0);
      vol = 1.0 + Math.min(0.35, v / 200); // capped
    }

    const streakMult = Number(payload.streakMult || 1.0);
    const skillMult = Number(payload.skillMult || 1.0);

    const xp = Math.max(0, Math.round(base * vol * streakMult * skillMult));

    const metric = computePRMetric(type, sets, reps, minutes);
    const prRes = checkAndUpdatePR(payload.exercise, metric);

    return {
      xp,
      base,
      volMult: vol,
      streakMult,
      skillMult,
      pr: prRes
    };
  }

  window.IronQuestXP = {
    computeXP,
    getTopPRs,
    loadPR
  };
})();
