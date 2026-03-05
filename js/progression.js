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
    // Harder RPG scaling: sessions should not level you up too fast.
    // Examples (approx): L1~500, L2~740, L3~1070, L4~1470, L5~1930, L10~4880
    const l=Math.max(1,Number(level||1));
    const x = (l-1);
    const need = 500 + (150*x) + (90*(x**1.6));
    return Math.max(500, Math.round(need));
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
    if(xp>=650) return "⭐⭐⭐";
    if(xp>=450) return "⭐⭐";
    if(xp>=300) return "⭐";
    return "—";
  }
  window.IronQuestProgression={ getStartDate, setStartDate, getWeekNumberFor, getWeekNumber:()=>getWeekNumberFor(window.Utils.isoDate(new Date())), levelFromTotalXp, starsForDay };
})();
