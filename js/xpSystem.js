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
  // - Pace Bonus: schneller -> mehr XP (über km/h)
  function joggingXP(distanceKm, timeMin){
    const dist = Math.max(0, Number(distanceKm||0));
    const t = Math.max(1, Number(timeMin||0));
    if (dist <= 0) return 0;

    const speed = dist / (t/60);         // km/h
    const base = dist * 120;

    // Bonus: ab 8 km/h +30 XP pro km/h über 8 (gedeckelt)
    const bonus = Math.max(0, Math.min(6, speed - 8)) * 30 * dist;
    return Math.round(base + bonus);
  }

  function baseXPForType(type, payload){
    if (type === "NEAT") return neatXP(payload?.minutes || 0);
    if (type === "Jogging") return joggingXP(payload?.distanceKm || 0, payload?.timeMin || 0);
    return BASE[type] ?? 0;
  }

  return { baseXPForType, neatXP, joggingXP };
})();
