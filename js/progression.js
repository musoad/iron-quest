/* IRON QUEST – progression.js (classic)
   ✅ Level/Titel
   ✅ Adaptive Engine (empfohlene Sets/Reps Shift je nach letzter Woche)
*/
(function () {
  function xpNeededForNextLevel(level) {
    const l = Math.max(1, Number(level || 1));
    return Math.round(350 + 120 * l + 32 * (l ** 1.75));
  }

  function levelFromTotalXp(totalXp) {
    let lvl = 1;
    let xp = Math.max(0, Math.round(totalXp || 0));
    while (lvl < 999) {
      const need = xpNeededForNextLevel(lvl);
      if (xp >= need) { xp -= need; lvl += 1; } else break;
    }
    return { lvl, into: xp, need: xpNeededForNextLevel(lvl) };
  }

  function titleForLevel(lvl) {
    const n = Number(lvl || 1);
    if (n >= 60) return "Mythic";
    if (n >= 40) return "Legend";
    if (n >= 25) return "Elite";
    if (n >= 15) return "Veteran";
    if (n >= 8) return "Krieger";
    return "Anfänger";
  }

  // ⭐ thresholds (fix)
  function thresholds() { return { one:1200, two:1600, three:2000 }; }

  function computeDayXP(entries) {
    const map = {};
    for (const e of entries) map[e.date] = (map[e.date] || 0) + (e.xp || 0);
    return map;
  }

  // Adaptive: schaut auf Vorwoche → setDelta/repDelta
  function adaptiveForWeek(entries, curWeek) {
    const prev = Number(curWeek || 1) - 1;
    if (prev < 1) return { setDelta:0, repDelta:0, note:"Startwoche: neutral." };

    const thr = thresholds();
    const dayXP = computeDayXP(entries.filter(e => e.week === prev));
    const days = Object.keys(dayXP);

    const trainDays = days.filter(d => dayXP[d] >= thr.one).length;
    const twoStarDays = days.filter(d => dayXP[d] >= thr.two).length;
    const threeStarDays = days.filter(d => dayXP[d] >= thr.three).length;

    if (trainDays >= 5 && threeStarDays >= 2) return { setDelta:+1, repDelta:+2, note:`Elite Woche (W${prev}) → +1 Satz & +2 Reps.` };
    if (trainDays >= 4 && (twoStarDays >= 2 || threeStarDays >= 1)) return { setDelta:+1, repDelta:+1, note:`Starke Woche (W${prev}) → +1 Satz & +1 Rep.` };
    if (trainDays <= 2) return { setDelta:-1, repDelta:-1, note:`Schwache Woche (W${prev}) → Deload -1 Satz & -1 Rep.` };
    return { setDelta:0, repDelta:0, note:`Stabil (W${prev}) → neutral.` };
  }

  window.IronQuestProgression = { thresholds, levelFromTotalXp, titleForLevel, adaptiveForWeek };
})();
