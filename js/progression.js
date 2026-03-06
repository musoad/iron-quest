(() => {
  "use strict";

  const KEY_START = "ironquest_startdate_v8";

  function getStartDate(){
    let s = localStorage.getItem(KEY_START);
    if(!s){
      s = window.Utils?.isoDate?.(new Date()) || new Date().toISOString().slice(0,10);
      localStorage.setItem(KEY_START, s);
    }
    return s;
  }

  function setStartDate(iso){
    localStorage.setItem(KEY_START, String(iso || getStartDate()));
  }

  function getWeekNumberFor(dateISO){
    const start = new Date(getStartDate() + "T00:00:00");
    const d = new Date(String(dateISO || (window.Utils?.isoDate?.(new Date()) || new Date().toISOString().slice(0,10))) + "T00:00:00");
    const diff = Math.floor((d - start) / 86400000);
    const w = diff < 0 ? 1 : Math.floor(diff / 7) + 1;
    return window.Utils?.clamp ? window.Utils.clamp(w, 1, 520) : Math.max(1, Math.min(520, w));
  }

  function xpNeededForNextLevel(level){
    const l = Math.max(1, Number(level || 1));
    const x = l - 1;
    const cfg = window.IronQuestBalance?.load?.() || {};
    const base = Number(cfg.levelBase ?? 300) || 300;
    const lin  = Number(cfg.levelLinear ?? 90) || 90;
    const pow  = Number(cfg.levelPower ?? 55) || 55;
    const exp  = Number(cfg.levelExponent ?? 1.5) || 1.5;
    const need = base + (lin * x) + (pow * Math.pow(x, exp));
    return Math.max(100, Math.round(need));
  }

  function levelFromTotalXp(totalXp){
    let lvl = 1;
    let xp = Math.max(0, Math.round(Number(totalXp || 0)));
    while(true){
      const need = xpNeededForNextLevel(lvl);
      if(xp >= need){
        xp -= need;
        lvl += 1;
      }else{
        break;
      }
      if(lvl > 999) break;
    }
    const title = (lvl >= 60) ? "Mythic" : (lvl >= 40) ? "Legend" : (lvl >= 25) ? "Elite" : (lvl >= 15) ? "Veteran" : (lvl >= 8) ? "Krieger" : "Anfänger";
    return { lvl, level:lvl, title, remainder: xp, nextNeed: xpNeededForNextLevel(lvl) };
  }

  function starsForDay(dayXp){
    const xp = Number(dayXp || 0);
    if(xp >= 650) return "⭐⭐⭐";
    if(xp >= 450) return "⭐⭐";
    if(xp >= 300) return "⭐";
    return "—";
  }

  window.IronQuestProgression = {
    getStartDate,
    setStartDate,
    getWeekNumberFor,
    getWeekNumber: () => getWeekNumberFor(window.Utils?.isoDate?.(new Date()) || new Date().toISOString().slice(0,10)),
    xpNeededForNextLevel,
    levelFromTotalXp,
    starsForDay
  };
})();
