(() => {
  "use strict";

  const BASE_XP = {
    Mehrgelenkig: 180,
    Unilateral: 200,
    Core: 140,
    Conditioning: 240,
    Komplexe: 260,
    NEAT: 80,
    Joggen: 0,
    Quest: 0,
    Gate: 0,
    Boss: 0
  };

  function clamp(n,a,b){ return Math.max(a, Math.min(b,n)); }

  function volumeMultiplier(actualSets, actualReps, recSets, recReps){
    const a = Math.max(1, Number(actualSets||0)*Number(actualReps||0));
    const r = Math.max(1, Number(recSets||1)*Number(recReps||1));
    const ratio = a/r;
    if (ratio >= 1.25) return 1.10;
    if (ratio >= 1.00) return 1.00;
    if (ratio >= 0.80) return 0.90;
    return 0.80;
  }

  function streakFromEntries(entries){
    const dayXp = {};
    for (const e of entries){
      if (!e?.date) continue;
      dayXp[e.date] = (dayXp[e.date]||0) + Number(e.xp||0);
    }
    const today = window.Utils.isoDate(new Date());
    let streak=0;
    let d = new Date(today);
    while(true){
      const iso = window.Utils.isoDate(d);
      if ((dayXp[iso]||0) > 0){ streak++; d = window.Utils.addDays(d,-1); }
      else break;
      if (streak>365) break;
    }
    return streak;
  }

  function streakMultiplier(streak){
    return 1 + Math.min(0.20, Number(streak||0)*0.02);
  }

  function skillMultiplierForType(type){
    const a = window.IronQuestSkilltree?.multiplierForType ? window.IronQuestSkilltree.multiplierForType(type) : 1;
    const b = window.IronQuestClasses?.multiplierForType ? window.IronQuestClasses.multiplierForType(type) : 1;
    const c = window.IronQuestEquipment?.multiplierForType ? window.IronQuestEquipment.multiplierForType(type) : 1;
    return a*b*c;
  }

  function calcExerciseXP({type,recSets,recReps,sets,reps,entries}){
    const base = BASE_XP[type] || 0;
    let xp = base * Math.max(1, Number(sets||0));
    const repFactor = clamp((Number(reps||0)/Math.max(1,Number(recReps||1))), 0.5, 1.4);
    xp *= repFactor;
    xp *= volumeMultiplier(sets,reps,recSets,recReps);
    xp *= streakMultiplier(streakFromEntries(entries||[]));
    xp *= skillMultiplierForType(type);
    return Math.round(xp);
  }

  function jogXP(distanceKm, minutes){
    const km = Math.max(0, Number(distanceKm||0));
    const min = Math.max(0, Number(minutes||0));
    // A bit more RPG-ish scaling
    return Math.round(km*85 + min*1.2);
  }

  window.IronQuestXP = { BASE_XP, calcExerciseXP, jogXP, streakFromEntries };
})();
