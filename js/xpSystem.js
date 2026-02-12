import { EXERCISE_TYPES, getExercise } from "./exercises.js";

export function neatXP(minutes) {
  const m = Math.max(0, Number(minutes || 0));
  return Math.round(m * 2.5); // 60 min = 150 XP
}

// Multipliers: mutation * skill * challenge * streakBonus etc.
export function calcEntryXP({ exerciseName, minutes, baseOverride }, multipliers = {}) {
  const ex = getExercise(exerciseName);
  const type = ex?.type || "Mehrgelenkig";

  let base = 0;
  if (type === "NEAT") base = neatXP(minutes);
  else if (type === "Rest") base = 0;
  else base = EXERCISE_TYPES[type]?.baseXP ?? 150;

  if (typeof baseOverride === "number") base = Math.max(0, Math.round(baseOverride));

  const mult =
    (multipliers.mutation ?? 1) *
    (multipliers.skill ?? 1) *
    (multipliers.challenge ?? 1) *
    (multipliers.streak ?? 1);

  const xp = Math.max(0, Math.round(base * mult));

  return { xp, base, type };
}
