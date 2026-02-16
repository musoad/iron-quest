(() => {
  "use strict";

  const BASE_XP = {
    Mehrgelenkig: 180,
    Unilateral: 200,
    Core: 140,
    Conditioning: 240,
    Komplexe: 260,
    NEAT: 80,
    Joggen: 0
  };

  function clamp(n,a,b){ return Math.max(a, Math.min(b,n)); }

  function volumeMultiplier(actualSets, actualReps, recSets, recReps) {
    const a = Math.max(1, Number(actualSets||0) * Number(actualReps||0));
    const r = Math.max(1, Number(recSets||1) * Number(recReps||1));
    const ratio = a / r;
    if (ratio >= 1.25) return 1.10;
    if (ratio >= 1.00) return 1.00;
    if (ratio >= 0.80) return 0.90;
    return 0.80;
  }

  function streakFromEntries(entries){
    const dayXp = {};
    for (const e of entries){
      if (!e?.date) continue;
      dayXp[e.date] = (dayXp[e.date]||0) + (Number(e.xp||0));
    }
    const today = window.Utils.isoDate(new Date());
    let streak = 0;
    let d = new Date(today);
    while(true){
      const iso = window.Utils.isoDate(d);
      if ((dayXp[iso]||0) > 0){
        streak++;
        d = window.Utils.addDays(d, -1);
      } else break;
      if (streak > 365) break;
    }
    return streak;
  }

  // +2% pro Streak-Tag, capped bei 20%
  function streakMultiplier(streak){
    return 1 + Math.min(0.20, Number(streak||0) * 0.02);
  }

  // Skilltree Multiplikator: kommt aus skilltree.js
  function skillMultiplierForType(type){
    if (!window.IronQuestSkilltree?.multiplierForType) return 1.0;
    return window.IronQuestSkilltree.multiplierForType(type);
  }

  function calcExerciseXP({ type, recSets, recReps, sets, reps, entries }) {
    const base = BASE_XP[type] || 0;

    // Grund-xp proportional zu Sets
    let xp = base * Math.max(1, Number(sets||0));

    // Reps-Faktor relativ zur Empfehlung
    const repFactor = clamp((Number(reps||0) / Math.max(1, Number(recReps||1))), 0.5, 1.4);
    xp *= repFactor;

    // Volumen-Faktor (Sets*Reps vs Empfehlung)
    xp *= volumeMultiplier(sets, reps, recSets, recReps);

    // Streak
    const st = streakFromEntries(entries || []);
    xp *= streakMultiplier(st);

    // Skilltree
    xp *= skillMultiplierForType(type);

    return Math.round(xp);
  }

  function jogXP(distanceKm, minutes) {
    const km = Math.max(0, Number(distanceKm || 0));
    const min = Math.max(0, Number(minutes || 0));
    return Math.round(km * 80 + min * 1);
  }

  window.IronQuestXP = {
    BASE_XP,
    volumeMultiplier,
    streakFromEntries,
    streakMultiplier,
    skillMultiplierForType,
    calcExerciseXP,
    jogXP
  };
})();
