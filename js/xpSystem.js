/* IRON QUEST – xpSystem.js (classic)
   ✅ XP Berechnung (Basis + NEAT Minuten)
   ✅ Multiplikatoren: Mutation, Skilltree, Weekly Reward (optional)
   ✅ PR-System Hook (wenn prSystem.js vorhanden)
*/
(function () {
  const { loadJSON } = window.IQ;

  const KEY_START = "ironquest_startdate_v20";
  const KEY_WEEK_REWARD = "ironquest_week_rewards_v20"; // optional (true/false per week)

  function getStartDate() {
    return localStorage.getItem(KEY_START) || window.IQ.isoDate(new Date());
  }

  function daysBetween(aISO, bISO) {
    return Math.floor((new Date(bISO) - new Date(aISO)) / 86400000);
  }
  function weekFor(dateISO) {
    const start = getStartDate();
    const diff = daysBetween(start, dateISO);
    return diff < 0 ? 1 : (Math.floor(diff / 7) + 1);
  }

  function rewardActiveForWeek(week) {
    const map = loadJSON(KEY_WEEK_REWARD, {});
    return map?.[String(week)] === true;
  }

  function neatXP(minutes) {
    // iOS-safe integers
    const m = Math.max(0, Number(minutes || 0));
    return Math.round(m * 2.5); // 60min = 150
  }

  function calcXP(input, ctx) {
    const exName = input.exercise;
    const type = window.IronQuestExercises.typeFor(exName);
    const base = (type === "NEAT")
      ? neatXP(input.minutes || 0)
      : window.IronQuestExercises.baseXPForType(type);

    const mutMult = (ctx?.mutationMultByType?.[type] ?? 1);
    const skillMult = (ctx?.skillMultByType?.[type] ?? 1);
    const rewardMult = rewardActiveForWeek(input.week) ? 1.05 : 1.0;

    const xp = Math.round(base * mutMult * skillMult * rewardMult);

    return { xp, base, type, mutMult, skillMult, rewardMult };
  }

  window.IronQuestXP = { weekFor, neatXP, calcXP, rewardActiveForWeek };
})();
