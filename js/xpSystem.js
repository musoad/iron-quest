/* =========================
   IRON QUEST v4 PRO — xpSystem.js
   ✅ XP pro Typ
   ✅ Tatsächliche Sets/Reps beeinflussen XP
   ✅ NEAT Minuten XP
   ✅ Hooks: Skilltree / Mutation / Reward / Challenge
   ========================= */

(function () {
  window.IQ = window.IQ || {};

  // Base XP pro Übungstyp (ohne Multiplikatoren)
  const XP_BASE = {
    "Mehrgelenkig": 180,
    "Unilateral": 200,
    "Core": 140,
    "Conditioning": 240,
    "Komplexe": 260,
    "NEAT": 0,
    "Rest": 0
  };

  function neatXP(minutes) {
    const m = Math.max(0, Number(minutes || 0));
    // 60 Min = 150 XP (wie vorher)
    return Math.round(m * 2.5);
  }

  function clamp(n, a, b) {
    n = Number(n || 0);
    return Math.max(a, Math.min(b, n));
  }

  // Scale anhand tatsächlicher Sets/Reps — leicht, damit es nicht exploitable wird
  function volumeMultiplier(type, actualSets, actualReps, recSets, recReps) {
    // NEAT/Rest kein Volumen
    if (type === "NEAT" || type === "Rest") return 1;

    const aS = clamp(actualSets, 0, 99);
    const aR = clamp(actualReps, 0, 999);

    const rS = clamp(recSets, 1, 20);
    const rR = clamp(recReps, 1, 50);

    // Verhältnis (0..2) und dann weich auf 0.7..1.25 mappen
    const volActual = aS * aR;
    const volRec = rS * rR;

    if (volActual <= 0) return 0.85; // wenn nichts eingetragen, trotzdem etwas XP (aber weniger)
    const ratio = clamp(volActual / volRec, 0.5, 1.8);
    // Map ratio 0.5..1.8 -> 0.75..1.25
    const mult = 0.75 + ((ratio - 0.5) / (1.3)) * 0.50;
    return clamp(mult, 0.7, 1.25);
  }

  function rpeMultiplier(rpe) {
    // rpe: 6..10 (optional)
    const r = Number(rpe || 0);
    if (!r) return 1;
    if (r >= 9) return 1.08;
    if (r >= 8) return 1.04;
    if (r >= 7) return 1.02;
    return 1.0;
  }

  // Central XP calc (nutzt Hooks aus anderen Modulen)
  function computeXp(payload) {
    // payload:
    // { exerciseName, type, recSets, recReps, sets, reps, minutes, rpe, week, dateISO }
    const type = payload.type || "Mehrgelenkig";

    let base = XP_BASE[type] || 0;
    if (type === "NEAT") base = neatXP(payload.minutes);
    if (type === "Rest") base = 0;

    const volMult = volumeMultiplier(
      type,
      payload.sets,
      payload.reps,
      payload.recSets,
      payload.recReps
    );

    const rpeMult = rpeMultiplier(payload.rpe);

    // Hooks (wenn Module existieren, sonst 1.0)
    const skillMult = window.IQ.getSkillMultiplier ? window.IQ.getSkillMultiplier(type) : 1.0;
    const mutationMult = window.IQ.getMutationMultiplier ? window.IQ.getMutationMultiplier(type, payload.week) : 1.0;
    const rewardMult = window.IQ.getWeeklyRewardMultiplier ? window.IQ.getWeeklyRewardMultiplier(payload.week) : 1.0;
    const challengeMult = window.IQ.getChallengeMultiplier ? window.IQ.getChallengeMultiplier(payload.dateISO) : 1.0;

    const total = Math.round(base * volMult * rpeMult * skillMult * mutationMult * rewardMult * challengeMult);

    return {
      base,
      volMult,
      rpeMult,
      skillMult,
      mutationMult,
      rewardMult,
      challengeMult,
      xp: Math.max(0, total)
    };
  }

  function buildDetailString(payload, calc) {
    const parts = [];
    parts.push(`Empf: ${payload.recSets}x${payload.recReps}`);
    if (payload.type === "NEAT") parts.push(`Ist: ${payload.minutes} Min`);
    else if (payload.type !== "Rest") parts.push(`Ist: ${payload.sets}x${payload.reps}`);
    if (payload.rpe) parts.push(`RPE ${payload.rpe}`);

    parts.push(`Base ${calc.base}`);
    parts.push(`Vol x${calc.volMult.toFixed(2)}`);
    parts.push(`RPE x${calc.rpeMult.toFixed(2)}`);
    parts.push(`Skill x${calc.skillMult.toFixed(2)}`);
    parts.push(`Mut x${calc.mutationMult.toFixed(2)}`);
    parts.push(`Reward x${calc.rewardMult.toFixed(2)}`);
    parts.push(`Chal x${calc.challengeMult.toFixed(2)}`);

    return parts.join(" • ");
  }

  window.IQ.XP_BASE = XP_BASE;
  window.IQ.neatXP = neatXP;
  window.IQ.computeXp = computeXp;
  window.IQ.buildDetailString = buildDetailString;

})();
