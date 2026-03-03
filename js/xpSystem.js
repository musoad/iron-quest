(() => {
  "use strict";

  const BASE_XP = {
    Mehrgelenkig: 180,
    Unilateral: 200,
    Core: 140,
    Conditioning: 240,
    Komplexe: 260,
    NEAT: 80
  };

  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

  function isoDate(d){
    if (window.Utils?.isoDate) return window.Utils.isoDate(d);
    const dt = (d instanceof Date) ? d : new Date(d);
    return dt.toISOString().slice(0,10);
  }

  function addDays(d, delta){
    if (window.Utils?.addDays) return window.Utils.addDays(d, delta);
    const dt = (d instanceof Date) ? d : new Date(d);
    return new Date(dt.getTime() + delta * 86400000);
  }

  function dayXpMap(entries){
    const m = {};
    for (const e of (entries || [])) {
      const d = e?.date;
      if (!d) continue;
      m[d] = (m[d] || 0) + Number(e.xp || 0);
    }
    return m;
  }

  // Streak: consecutive days with >0 XP (based on entries' ISO date)
  function streak(entries){
    const map = dayXpMap(entries);
    let s = 0;
    let d = new Date(isoDate(new Date()));
    while (true) {
      const key = isoDate(d);
      if ((map[key] || 0) > 0) {
        s++;
        d = addDays(d, -1);
      } else {
        break;
      }
      if (s > 365) break;
    }
    return s;
  }

  // Backward-compat alias used by some modules
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

    if (ratio >= 1.25) return 1.10;
    if (ratio >= 1.00) return 1.00;
    if (ratio >= 0.80) return 0.90;
    return 0.80;
  }

  // Used by Log for live preview + final entry XP
  function calcExerciseXP({ type, recSets, recReps, sets, reps, entries, buffs }){
    const base = BASE_XP[type] || 0;
    let xp = base * Math.max(1, Number(sets || 0));

    const repFactor = clamp(
      (Number(reps || 0) / Math.max(1, Number(recReps || 1))),
      0.5,
      1.4
    );
    xp *= repFactor;
    xp *= volumeMult(sets, reps, recSets, recReps);

    const s = streak(entries || []);
    xp *= streakMult(s);

    // Skilltree passive
    xp *= window.IronQuestSkilltreeV2?.passiveMultiplier?.(type) || 1;

    // Class bonus
    xp *= window.IronQuestClasses?.multiplierForType?.(type) || 1;

    // Periodization bias
    xp *= window.IronQuestPeriodization?.multiplierForType?.(type) || 1;

    // Equipment bonuses (if provided)
    if (buffs?.globalXp) xp *= buffs.globalXp;
    if (type === "Core" && buffs?.coreXp) xp *= buffs.coreXp;

    return Math.round(xp);
  }

  // Basic helper for older modules
  function calculateXP(entry){
    return Number(entry?.xp || 0);
  }

  window.IronQuestXP = {
    BASE_XP,
    dayXpMap,
    streak,
    streakFromEntries,
    streakMult,
    volumeMult,
    calcExerciseXP,
    calculateXP
  };
})();
