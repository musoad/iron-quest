(() => {
  "use strict";
  const KEY_START="ironquest_startdate_v8";
  function getStartDate(){
    let s=localStorage.getItem(KEY_START);
    if(!s){ s=window.Utils.isoDate(new Date()); localStorage.setItem(KEY_START,s); }
    return s;
  }
  function setStartDate(iso){ localStorage.setItem(KEY_START, iso); }
  function getWeekNumberFor(dateISO){
    const start=new Date(getStartDate());
    const d=new Date(dateISO || window.Utils.isoDate(new Date()));
    const diff=Math.floor((d-start)/86400000);
    const w = diff<0 ? 1 : Math.floor(diff/7)+1;
    return window.Utils.clamp(w,1,52);
  }
  function xpNeededForNextLevel(level){
    // New scaling: starts light, ramps harder (RPG feel)
    // Examples (approx): L1~100, L2~145, L3~205, L4~295, L5~425 ... and keeps accelerating.
    const l=Math.max(1,Number(level||1));
    const rate = 1.33;
    const lin  = 0.08;
    const need = 100 * (rate ** (l-1)) * (1 + lin*(l-1));
    return Math.max(100, Math.round(need));
  }
  function levelFromTotalXp(totalXp){
    let lvl=1; let xp=Math.max(0,Math.round(totalXp||0));
    while(true){
      const need=xpNeededForNextLevel(lvl);
      if(xp>=need){ xp-=need; lvl++; }
      else break;
      if(lvl>999) break;
    }
    const title=(lvl>=60)?"Mythic":(lvl>=40)?"Legend":(lvl>=25)?"Elite":(lvl>=15)?"Veteran":(lvl>=8)?"Krieger":"Anfänger";
    return { lvl, title, remainder: xp, nextNeed: xpNeededForNextLevel(lvl) };
  }
  function starsForDay(dayXp){
    const xp=Number(dayXp||0);
    if(xp>=2000) return "⭐⭐⭐";
    if(xp>=1600) return "⭐⭐";
    if(xp>=1200) return "⭐";
    return "—";
  }
  window.IronQuestProgression={ getStartDate, setStartDate, getWeekNumberFor, getWeekNumber:()=>getWeekNumberFor(window.Utils.isoDate(new Date())), levelFromTotalXp, starsForDay };
})();
