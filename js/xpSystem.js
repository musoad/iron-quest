// js/xpSystem.js
window.XP = (function(){
  const BASE = {
    Mehrgelenkig: 180,
    Unilateral: 200,
    Core: 140,
    Conditioning: 240,
    Komplexe: 260,
    NEAT: 0,
    Rest: 0,
    Jogging: 0
  };

  function neatXP(minutes){
    const m = Math.max(0, Number(minutes||0));
    return Math.round(m * 2.5); // 60min=150
  }

  // Jogging XP:
  // - Base: 120 XP pro km
  // - Speed Bonus: ab 8.0 km/h +30 XP pro km/h über 8 (gedeckelt)
  function joggingXP(distanceKm, timeMin){
    const dist = Math.max(0, Number(distanceKm||0));
    const t = Math.max(1, Number(timeMin||0));
    const speed = dist / (t/60); // km/h

    const base = dist * 120;
    const bonus = Math.max(0, Math.min(6, speed - 8)) * 30; // max +180
    return Math.round(base + bonus);
  }

  // preview/compute XP with multipliers from other modules
  function compute(entry){
    const type = entry.type || "Mehrgelenkig";

    let base = 0;
    if(type === "NEAT") base = neatXP(entry.minutes || 0);
    else if(type === "Jogging") base = joggingXP(entry.distanceKm || 0, entry.timeMin || 0);
    else base = BASE[type] ?? 0;

    // Volume multiplier (optional)
    let vol = 1.0;
    if(entry.sets && entry.reps && (type !== "NEAT" && type !== "Rest" && type !== "Jogging")){
      const sets = Math.max(0, Number(entry.sets||0));
      const reps = Math.max(0, Number(entry.reps||0));
      const volScore = sets * reps;
      // soft scaling: 30 reps = baseline
      vol = Math.max(0.85, Math.min(1.25, volScore / 30));
    }

    const week = Number(entry.week || 1);

    // mutation: Jogging zählt wie Conditioning
    const mutType = (type === "Jogging") ? "Conditioning" : type;
    const mut = (window.Progression?.mutationMultiplier?.(mutType, week)) ?? 1.0;

    const streak = (window.Progression?.streakMultiplier?.()) ?? 1.0;

    // skill: Jogging zählt wie END (siehe skilltree.js Update)
    const skill = (window.SkillTree?.getMultiplier?.(type)) ?? 1.0;

    const xp = Math.round(base * vol * mut * streak * skill);

    return {
      xp,
      breakdown: {
        base: Math.round(base),
        vol: Number(vol.toFixed(2)),
        mut: Number(mut.toFixed(2)),
        streak: Number(streak.toFixed(2)),
        skill: Number(skill.toFixed(2))
      }
    };
  }

  return { BASE, neatXP, joggingXP, compute };
})();
