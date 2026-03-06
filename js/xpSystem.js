(() => {
  "use strict";

  // Legacy fallback per type if an exercise doesn't provide baseXP
  const BASE_XP_BY_TYPE = {
    Mehrgelenkig: 25,
    Unilateral: 22,
    Core: 16,
    Conditioning: 20,
    Komplexe: 30,
    NEAT: 8
  };

  function clamp(n, a, b){ return Math.max(a, Math.min(b, n)); }

  function iso(d){
    return (window.Utils && window.Utils.isoDate) ? window.Utils.isoDate(d) : new Date(d).toISOString().slice(0,10);
  }
  function addDays(d, delta){
    return (window.Utils && window.Utils.addDays) ? window.Utils.addDays(d, delta) : new Date(d.getTime() + delta*86400000);
  }

  function dayXpMap(entries){
    const m = {};
    for(const e of (entries || [])){
      const d = (e && e.date);
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
    const exType = type || (ex && ex.type) || "Mehrgelenkig";

    // baseXP is per set (new system)
    const basePerSet = Number((ex && ex.baseXP) || 0) || Number(BASE_XP_BY_TYPE[exType] || 0);

    // start with baseXP * performed sets
    let xp = basePerSet * Math.max(1, Number(sets || 0));

    // reps factor relative to recommendation
    const rr = Number(recReps || (ex && ex.recReps) || 1);
    const repFactor = clamp((Number(reps || 0) / Math.max(1, rr)), 0.6, 1.25);
    xp *= repFactor;

    // volume scaling vs recommendation
    const rs = Number(recSets || (ex && ex.recSets) || 1);
    xp *= volumeMult(sets, reps, rs, rr);

    // streak
    const s = streak(entries || []);
    xp *= streakMult(s);

    // Skilltree passive
    xp *= (window.IronQuestSkilltreeV2 && (window.IronQuestSkilltreeV2.passiveMultiplier) && window.IronQuestSkilltreeV2.passiveMultiplier)(exType) || 1;

    // Class bonus
    xp *= (window.IronQuestClasses && (window.IronQuestClasses.multiplierForType) && window.IronQuestClasses.multiplierForType)(exType) || 1;

    // Periodization bias
    xp *= (window.IronQuestPeriodization && (window.IronQuestPeriodization.multiplierForType) && window.IronQuestPeriodization.multiplierForType)(exType) || 1;

    // Equipment / Set bonuses (global)
    if((window.IronQuestEquipment && window.IronQuestEquipment.bonuses)){
      const b = window.IronQuestEquipment.bonuses();
      if((b && b.globalXp)) xp *= b.globalXp;
      // Optional type bonuses (set bonuses can set these)
      if((b && b.typeXp) && b.typeXp[exType]) xp *= b.typeXp[exType];
      if((b && b.coreXp) && exType === "Core") xp *= b.coreXp;
    }

    // Active buffs (session scoped)
    if((buffs && buffs.globalXp)) xp *= buffs.globalXp;
    if((buffs && buffs.typeXp) && buffs.typeXp[exType]) xp *= buffs.typeXp[exType];

    const mult = Number((window.IronQuestBalance?.load?.()||{}).exerciseXPMult ?? 1) || 1;
    xp *= mult;
    return Math.round(xp);
  }
// Older modules might store xp directly; keep for compatibility
  function calculateXP(entry){
    return Number((entry && entry.xp) || 0);
  }

  // Running XP (Jogging)
  // Stable formula that scales well with the new level curve.
  function jogXP(km, minutes){
    const d = Math.max(0, Number(km||0));
    const t = Math.max(0, Number(minutes||0));
    if(d<=0 || t<=0) return 0;

    // Base: distance dominates, time adds effort
    let xp = (d * 32) + (t * 1.5);

    // Pace modifier (min/km)
    const p = t / d;
    if(p > 0){
      if(p <= 6) xp *= 1.06;
      else if(p >= 9) xp *= 0.95;
    }

    // Equipment/global XP bonuses
    try{
      if(window.IronQuestEquipment && typeof window.IronQuestEquipment.bonuses === "function"){
        const b = window.IronQuestEquipment.bonuses();
        if(b && b.globalXp) xp *= b.globalXp;
        if(b && b.runXp) xp *= b.runXp;
      }
    }catch(_){}

    try{ xp *= Number(window.IronQuestClasses?.runMultiplier?.() || 1); }catch(_){}
    xp *= Number((window.IronQuestBalance?.load?.()||{}).runXPMult ?? 1) || 1;

    // Clamp
    xp = Math.max(60, Math.min(2500, xp));
    return Math.round(xp);
  }


  window.IronQuestXP = {
    BASE_XP_BY_TYPE,
    streak,
    streakFromEntries,
    streakMult,
    calcExerciseXP,
    calculateXP,
    jogXP
  };
})();
