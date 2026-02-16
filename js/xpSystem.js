(() => {
  "use strict";

  const BASE_XP = {
    Mehrgelenkig: 180,
    Unilateral: 200,
    Core: 140,
    Conditioning: 240,
    Komplexe: 260,
    NEAT: 0,
    Joggen: 0
  };

  function volumeMultiplier(actualSets, actualReps, recSets, recReps) {
    const a = Math.max(1, Number(actualSets || 0) * Number(actualReps || 0));
    const r = Math.max(1, Number(recSets || 0) * Number(recReps || 0));
    const ratio = a / r;
    if (ratio >= 1.25) return 1.10;
    if (ratio >= 1.00) return 1.00;
    if (ratio >= 0.80) return 0.90;
    return 0.80;
  }

  function jogXP(distanceKm, minutes) {
    const km = Math.max(0, Number(distanceKm || 0));
    const min = Math.max(0, Number(minutes || 0));
    return Math.round(km * 80 + min * 1);
  }

  window.IronQuestXP = { BASE_XP, volumeMultiplier, jogXP };
})();
