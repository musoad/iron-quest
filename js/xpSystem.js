(() => {
  "use strict";

  // Legacy fallback per type if an exercise doesn't provide baseXP
  const BASE_XP_BY_TYPE = {
    Mehrgelenkig: 190,
    Unilateral: 170,
    Core: 120,
    Conditioning: 200,
    Komplexe: 240,
    NEAT: 80
  };

  function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

  function iso(d){
    return window.Utils?.isoDate ? window.Utils.isoDate(d) : new Date(d).toISOString().slice(0,10);
  }
  function addDays(d, delta){
    return window.Utils?.addDays ? window.Utils.addDays(d, delta) : new Date(d.getTime() + delta*86400000);
  }

  function dayXpMap(entries){
    const m = {};
    for(const e of (entries || [])){
      const d = e?.date;
      if(!d) continue;
      m[d] = (m[d] || 0) + Number(e.xp || 0);
    }
    return m;
  }

  function streak(entries){
    const map = dayXpMap(entries);
    let s = 0;
    let d = new Date(iso(new Date()));
    while(true){
      const key = iso(d);
      if((map[key] || 0) > 0){
        s++;
        d = addDays(d, -1);
      } else break;
      if(s > 365) break;
    }
    return s;
  }

  // ✅ Backward compatibility for Challenges
  function streakFromEntries(entries){
    return streak(entries);
  }

  function streakMult(s){
    return 1 + Math.min(0.20, Number(s || 0) * 0.02);
  }

  function volumeMult(sets, reps, recSets, recReps){
    const a = Math.max(1, Number(sets || 0) * Number(reps || 0));
    const r = Math.max(1, Number(recSets || 1) * Number(recReps || 1));
    const ratio = a / r;

    if(ratio >= 1.25) return 1.10;
    if(ratio >= 1.00) return 1.00;
    if(ratio >= 0.80) return 0.90;
    return 0.80;
  }

  function calcExerciseXP({ exercise, type, recSets, recReps, sets, reps, entries, buffs }){
    // exercise may be full object
    const ex = exercise || null;
    const exType = type || ex?.type || "Mehrgelenkig";

    // baseXP is per set (new system)
    const basePerSet = Number(ex?.baseXP || 0) || Number(BASE_XP_BY_TYPE[exType] || 0);

    // start with baseXP * performed sets
    let xp = basePerSet * Math.max(1, Number(sets || 0));

    // reps factor relative to recommendation
    const rr = Number(recReps || ex?.recReps || 1);
    const repFactor = clamp((Number(reps || 0) / Math.max(1, rr)), 0.5, 1.4);
    xp *= repFactor;

    // volume scaling vs recommendation
    const rs = Number(recSets || ex?.recSets || 1);
    xp *= volumeMult(sets, reps, rs, rr);

    // streak
    const s = streak(entries || []);
    xp *= streakMult(s);

    // Skilltree passive
    xp *= window.IronQuestSkilltreeV2?.passiveMultiplier?.(exType) || 1;

    // Class bonus
    xp *= window.IronQuestClasses?.multiplierForType?.(exType) || 1;

    // Periodization bias
    xp *= window.IronQuestPeriodization?.multiplierForType?.(exType) || 1;

    // Equipment / Set bonuses (global)
    if(window.IronQuestEquipment?.bonuses){
      const b = window.IronQuestEquipment.bonuses();
      if(b?.globalXp) xp *= b.globalXp;
      // Optional type bonuses (set bonuses can set these)
      if(b?.typeXp && b.typeXp[exType]) xp *= b.typeXp[exType];
      if(b?.coreXp && exType === "Core") xp *= b.coreXp;
    }

    // Active buffs (session scoped)
    if(buffs?.globalXp) xp *= buffs.globalXp;
    if(buffs?.typeXp && buffs.typeXp[exType]) xp *= buffs.typeXp[exType];

    return Math.round(xp);
  }

  // Older modules might store xp directly; keep for compatibility
  function calculateXP(entry){
    return Number(entry?.xp || 0);
  }

  window.IronQuestXP = {
    BASE_XP_BY_TYPE,
    streak,
    streakFromEntries,
    streakMult,
    calcExerciseXP,
    calculateXP
  };
})();
