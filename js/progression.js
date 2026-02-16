(() => {
  const KEY_START = "ironquest_startdate_v4";

  function getStartDate() {
    let s = localStorage.getItem(KEY_START);
    if (!s) {
      s = (window.Utils?.isoDate ? window.Utils.isoDate(new Date()) : new Date().toISOString().slice(0,10));
      localStorage.setItem(KEY_START, s);
    }
    return s;
  }

  function getWeekNumber(dateISO) {
    const start = new Date(getStartDate());
    const d = new Date(dateISO || (window.Utils?.isoDate ? window.Utils.isoDate(new Date()) : new Date().toISOString().slice(0,10)));
    const diff = Math.floor((d - start) / 86400000);
    const w = diff < 0 ? 1 : Math.floor(diff / 7) + 1;
    return window.Utils?.clamp ? window.Utils.clamp(w, 1, 52) : Math.max(1, Math.min(52, w));
  }

  function xpNeededForNextLevel(level) {
    const l = Math.max(1, level);
    return Math.round(350 + 120 * l + 32 * (l ** 1.75));
  }

  function levelFromTotalXp(totalXp) {
    let lvl = 1;
    let xp = Math.max(0, Math.round(totalXp || 0));
    while (true) {
      const need = xpNeededForNextLevel(lvl);
      if (xp >= need) { xp -= need; lvl += 1; }
      else break;
      if (lvl > 999) break;
    }
    const title =
      (lvl >= 60) ? "Mythic" :
      (lvl >= 40) ? "Legend" :
      (lvl >= 25) ? "Elite" :
      (lvl >= 15) ? "Veteran" :
      (lvl >= 8)  ? "Krieger" : "Anfänger";
    return { lvl, title };
  }

  // ⭐ rule (du wolltest Sterne wieder)
  function starsForDay(dayXp) {
    const xp = Number(dayXp || 0);
    if (xp >= 2000) return "⭐⭐⭐";
    if (xp >= 1600) return "⭐⭐";
    if (xp >= 1200) return "⭐";
    return "—";
  }

  window.IronQuestProgression = {
    getStartDate,
    getWeekNumber: () => getWeekNumber(),
    levelFromTotalXp,
    starsForDay
  };
})();
