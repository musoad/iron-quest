(() => {
  "use strict";

  // Normalizes and validates entries/runs/plans before writing to storage.
  // Keeps the data model consistent so derived XP/level/stats don't drift over time.

  function isoDate(d){
    try{
      if(!d) return (window.Utils?.isoDate?.(new Date()) || new Date().toISOString().slice(0,10));
      if(typeof d === "string"){
        // Accept YYYY-MM-DD
        if(/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
        const parsed = new Date(d);
        if(!isNaN(parsed.getTime())) return parsed.toISOString().slice(0,10);
      }
      if(d instanceof Date) return (window.Utils?.isoDate?.(d) || d.toISOString().slice(0,10));
      const parsed = new Date(d);
      if(!isNaN(parsed.getTime())) return parsed.toISOString().slice(0,10);
    }catch(_){}
    return new Date().toISOString().slice(0,10);
  }

  function weekNumberFromISODate(dateStr){
    // ISO week number (1-53), Monday start
    try{
      const d = new Date(dateStr + "T00:00:00Z");
      // Thursday in current week decides the year
      d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay()||7));
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(),0,1));
      const weekNo = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
      return weekNo;
    }catch(_){ return 1; }
  }

  function n(v, def=0){
    const x = Number(v);
    return Number.isFinite(x) ? x : def;
  }

  function normalizeEntry(entry){
    const e = Object.assign({}, entry || {});
    const report = { fixed:false, reasons:[] };

    e.date = isoDate(e.date);
    if(!e.week || !Number.isFinite(Number(e.week))){
      e.week = weekNumberFromISODate(e.date);
      report.fixed = true; report.reasons.push("week");
    }

    // numeric fields
    if("sets" in e) e.sets = n(e.sets, 0);
    if("reps" in e) e.reps = n(e.reps, 0);
    if("km" in e) e.km = n(e.km, 0);
    if("minutes" in e) e.minutes = n(e.minutes, 0);

    // Normalize type for runs
    if(String(e.exercise||"").toLowerCase().includes("jog") || String(e.type||"").toLowerCase().includes("jog")){
      e.exercise = "Jogging";
      e.type = "Conditioning";
    }

    // XP repair
    if(!Number.isFinite(Number(e.xp)) || Number(e.xp) < 0){
      const before = e.xp;
      let xp = 0;
      if(window.IronQuestXP){
        if(e.exercise === "Jogging"){
          xp = window.IronQuestXP.jogXP(e.km || 0, e.minutes || 0);
        }else{
          xp = window.IronQuestXP.calcExerciseXP(e.exercise, e.sets || 0, e.reps || 0, e.type);
        }
      }
      e.xp = n(xp, 0);
      report.fixed = true; report.reasons.push("xp");
      report.beforeXp = before; report.afterXp = e.xp;
    }

    return { entry: e, report };
  }

  function normalizeRun(run){
    const r = Object.assign({}, run || {});
    const report = { fixed:false, reasons:[] };

    r.date = isoDate(r.date);
    if(!r.week || !Number.isFinite(Number(r.week))){
      r.week = weekNumberFromISODate(r.date);
      report.fixed=true; report.reasons.push("week");
    }
    r.km = n(r.km, 0);
    r.minutes = n(r.minutes, 0);

    if(!Number.isFinite(Number(r.xp)) || Number(r.xp) < 0){
      const before = r.xp;
      r.xp = n(window.IronQuestXP?.jogXP?.(r.km, r.minutes), 0);
      report.fixed=true; report.reasons.push("xp");
      report.beforeXp = before; report.afterXp = r.xp;
    }
    return { run: r, report };
  }

  window.IronQuestSchema = {
    isoDate,
    weekNumberFromISODate,
    normalizeEntry,
    normalizeRun,
  };
})();
