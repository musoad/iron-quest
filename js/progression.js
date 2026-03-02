(() => {
  "use strict";

  const KEY_START = "ironquest_startdate_v5";

  function getStartDate(){
    let s = localStorage.getItem(KEY_START);
    if (!s){
      s = window.Utils.isoDate(new Date());
      localStorage.setItem(KEY_START, s);
    }
    return s;
  }

  function getWeekNumberFor(dateISO){
    const start = new Date(getStartDate());
    const d = new Date(dateISO || window.Utils.isoDate(new Date()));
    const diff = Math.floor((d - start)/86400000);
    const w = diff < 0 ? 1 : Math.floor(diff/7)+1;
    return window.Utils.clamp(w, 1, 52);
  }

  function xpNeededForNextLevel(level){
    const l = Math.max(1, Number(level||1));
    return Math.round(350 + 120*l + 32*(l**1.75));
  }

  function levelFromTotalXp(totalXp){
    let lvl=1;
    let xp = Math.max(0, Math.round(totalXp||0));
    while(true){
      const need = xpNeededForNextLevel(lvl);
      if (xp >= need){ xp -= need; lvl++; }
      else break;
      if (lvl>999) break;
    }
    const title =
      (lvl>=60) ? "Mythic" :
      (lvl>=40) ? "Legend" :
      (lvl>=25) ? "Elite" :
      (lvl>=15) ? "Veteran" :
      (lvl>=8) ? "Krieger" : "Anfänger";
    return { lvl, title };
  }

  function starsForDay(dayXp){
    const xp = Number(dayXp||0);
    if (xp>=2000) return "⭐⭐⭐";
    if (xp>=1600) return "⭐⭐";
    if (xp>=1200) return "⭐";
    return "—";
  }

  window.IronQuestProgression = {
    getStartDate,
    getWeekNumber: () => getWeekNumberFor(window.Utils.isoDate(new Date())),
    getWeekNumberFor,
    levelFromTotalXp,
    starsForDay
  };
})();
