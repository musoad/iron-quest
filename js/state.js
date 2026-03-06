(() => {
  "use strict";

  let _snapshot = null;
  let _building = null;

  function iso(d){ return window.Utils?.isoDate?.(d) || new Date(d).toISOString().slice(0,10); }

  function startOfISOWeek(dateStr){
    const d = new Date(dateStr + "T00:00:00");
    const day = d.getDay() || 7;
    d.setDate(d.getDate() - (day-1));
    return iso(d);
  }

  function withinWeek(dateStr, weekStartStr){
    const a = new Date(dateStr + "T00:00:00").getTime();
    const b = new Date(weekStartStr + "T00:00:00").getTime();
    return a >= b && a < b + 7*86400000;
  }

  function levelInfo(totalXp){
    if(window.IronQuestProgression?.levelFromTotalXp){
      const x = window.IronQuestProgression.levelFromTotalXp(totalXp);
      return { level:Number(x.lvl||x.level||1), remainder:Number(x.remainder||0), nextNeed:Number(x.nextNeed||500) };
    }
    const cfg = window.IronQuestBalance?.load?.() || {};
    const base = Number(cfg.levelBase ?? 300) || 300;
    const lin  = Number(cfg.levelLinear ?? 90) || 90;
    const pow  = Number(cfg.levelPower ?? 55) || 55;
    const exp  = Number(cfg.levelExponent ?? 1.5) || 1.5;
    let lvl=1, xp=Number(totalXp||0), need=base;
    while(xp >= need){
      xp -= need; lvl += 1;
      need = Math.floor(base + (lin*(lvl-1)) + (pow*Math.pow((lvl-1), exp)));
      if(lvl>999) break;
    }
    return { level:lvl, remainder:xp, nextNeed:need };
  }

  async function build(){
    const today = iso(new Date());
    const weekStart = startOfISOWeek(today);

    const entries = await (window.IronDB?.getAllEntries?.() || Promise.resolve([]));
    const runs = await (window.IronDB?.getAllRuns?.() || Promise.resolve([]));

    let totalXp = 0, todayXp = 0, weekXp = 0;
    let weekRuns = 0;
    const weekDaysSet = new Set();
    const allDaysSet = new Set();

    for(const e of entries){
      const d = String(e.date||"").slice(0,10);
      if(!d) continue;
      const xp = Number(e.xp||0) || 0;
      totalXp += xp;
      if(d === today) todayXp += xp;
      if(withinWeek(d, weekStart)){
        weekXp += xp;
        weekDaysSet.add(d);
      }
      allDaysSet.add(d);
    }

    for(const r of runs){
      const d = String(r.date||"").slice(0,10);
      if(d && withinWeek(d, weekStart)) weekRuns += 1;
    }

    let streak = 0;
    let cur = new Date(today + "T00:00:00");
    while(true){
      const key = iso(cur);
      if(!allDaysSet.has(key)) break;
      streak += 1;
      cur.setDate(cur.getDate()-1);
      if(streak>3650) break;
    }

    const prog = levelInfo(totalXp);
    const lvl = Number(prog.level || 1);
    const rank = window.IronQuestHunterRank?.compute?.(lvl, totalXp) || "E";
    const bal = window.IronQuestBalance?.load?.() || {};
    const WEEK_XP_GOAL = Number(bal.weekXpGoal ?? 2400) || 2400;
    const WEEK_WORKOUT_GOAL = Number(bal.weekWorkoutGoal ?? 4) || 4;
    const clsPreview = window.IronQuestClasses?.preview?.(lvl) || { unlocked:false, unlockLevel:10, active:{ name:"Unassigned", perks:[] } };

    _snapshot = {
      today,
      weekStart,
      totals: { totalXp, todayXp, weekXp },
      week: {
        runs: weekRuns,
        daysLogged: weekDaysSet.size,
        xpGoal: WEEK_XP_GOAL,
        workoutGoal: WEEK_WORKOUT_GOAL,
        xpPct: WEEK_XP_GOAL ? Math.min(1, weekXp / WEEK_XP_GOAL) : 0,
        workoutPct: WEEK_WORKOUT_GOAL ? Math.min(1, weekDaysSet.size / WEEK_WORKOUT_GOAL) : 0,
      },
      progression: { level: lvl, xp: prog.remainder, nextNeed: prog.nextNeed },
      rank,
      streak,
      classState: clsPreview,
      nextUnlock: (lvl < clsPreview.unlockLevel)
        ? { title: "Class Unlock", desc: `Unlock your class at Level ${clsPreview.unlockLevel}.`, xpLeft: Math.max(0, clsPreview.unlockLevel - lvl) }
        : { title: "Boss Progression", desc: "Clear gates and bosses to earn loot.", xpLeft: 0 }
    };

    return _snapshot;
  }

  async function getSnapshot(force=false){
    if(_snapshot && !force) return _snapshot;
    if(_building) return _building;
    _building = build().finally(()=>{ _building = null; });
    return _building;
  }

  function invalidate(){ _snapshot = null; }
  async function recompute(){ invalidate(); return getSnapshot(true); }

  window.IronQuestState = {
    getSnapshot,
    invalidate,
    recompute,
    get: getSnapshot
  };
})();
