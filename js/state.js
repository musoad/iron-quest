(() => {
  "use strict";

  let _snapshot = null;
  let _building = null;

  function iso(d){ return window.Utils?.isoDate?.(d) || new Date(d).toISOString().slice(0,10); }

  function startOfISOWeek(dateStr){
    const d = new Date(dateStr + "T00:00:00");
    const day = d.getDay() || 7; // 1..7 (Mon..Sun)
    d.setDate(d.getDate() - (day-1));
    return iso(d);
  }

  function withinWeek(dateStr, weekStartStr){
    const a = new Date(dateStr + "T00:00:00").getTime();
    const b = new Date(weekStartStr + "T00:00:00").getTime();
    return a >= b && a < b + 7*86400000;
  }

  async function build(){
    const today = iso(new Date());
    const weekStart = startOfISOWeek(today);

    const entries = await (window.IronDB?.getAllEntries?.() || Promise.resolve([]));
    const runs = await (window.IronDB?.getAllRuns?.() || Promise.resolve([]));

    // totals
    let totalXp = 0, todayXp = 0, weekXp = 0;
    let weekWorkouts = 0, weekRuns = 0;
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
        // count workouts: exclude NEAT if you want (keep simple: any non-zero xp entry counts)
        weekWorkouts += 1;
      }
      allDaysSet.add(d);
    }

    for(const r of runs){
      const d = String(r.date||"").slice(0,10);
      if(!d) continue;
      if(withinWeek(d, weekStart)) weekRuns += 1;
    }

    // streak: consecutive days with >=1 entry up to today
    let streak = 0;
    const days = new Set(entries.map(e=>String(e.date||"").slice(0,10)).filter(Boolean));
    let cur = new Date(today + "T00:00:00");
    while(true){
      const key = iso(cur);
      if(!days.has(key)) break;
      streak += 1;
      cur.setDate(cur.getDate()-1);
      if(streak > 3650) break;
    }

    // level calculation (prefer progression module)
    const lvlObj = window.IronQuestProgression?.levelFromTotalXp?.(totalXp)
      || (() => {
        // fallback RPG curve
        let lvl=1, xp=totalXp, need=500;
        while(xp >= need){
          xp -= need; lvl += 1;
          need = Math.floor(500 * Math.pow(lvl, 1.2));
          if(lvl>999) break;
        }
        return { lvl, remainder: xp, nextNeed: need };
      })();

    const lvl = Number(lvlObj.lvl || lvlObj.level || 1);
    const remainder = Number(lvlObj.remainder || 0);
    const nextNeed = Number(lvlObj.nextNeed || 500);

    const rank = window.IronQuestHunterRank?.compute?.(lvl, totalXp) || "E";

    // goals (tunable in one place)
    const WEEK_XP_GOAL = 1800;     // adjust anytime
    const WEEK_WORKOUT_GOAL = 4;   // days/training entries goal

    const nextUnlock = (lvl < 10)
      ? { title: "Class Unlock", desc: `Unlock your class at Level 10 (${10-lvl} levels left)` }
      : { title: "Next Gate", desc: "Keep training to clear weekly gates." };

    _snapshot = {
      today,
      weekStart,
      totals: { totalXp, todayXp, weekXp },
      week: {
        workouts: weekWorkouts,
        runs: weekRuns,
        daysLogged: weekDaysSet.size,
        xpGoal: WEEK_XP_GOAL,
        workoutGoal: WEEK_WORKOUT_GOAL,
        xpPct: WEEK_XP_GOAL ? Math.min(1, weekXp / WEEK_XP_GOAL) : 0,
        workoutPct: WEEK_WORKOUT_GOAL ? Math.min(1, weekDaysSet.size / WEEK_WORKOUT_GOAL) : 0,
      },
      progression: { level: lvl, xp: remainder, nextNeed },
      rank,
      streak,
      nextUnlock,
    };

    return _snapshot;
  }

  async function getSnapshot(force=false){
    if(_snapshot && !force) return _snapshot;
    if(_building) return _building;
    _building = build().finally(()=>{ _building=null; });
    return _building;
  }

  function invalidate(){ _snapshot = null; }

  window.IronQuestState = { getSnapshot, invalidate };
})();
