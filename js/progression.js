// js/progression.js
window.Progression = (function(){
  const { isoDate, loadJSON, saveJSON, clamp } = window.Utils;

  const KEY_START = "ironquest_startdate_v4";
  const KEY_STREAK = "ironquest_streak_v4";

  function ensureStartDate(){
    let s = localStorage.getItem(KEY_START);
    if (!s) { s = isoDate(new Date()); localStorage.setItem(KEY_START, s); }
    return s;
  }
  function setStartDate(iso){ localStorage.setItem(KEY_START, iso); }

  function daysBetween(aISO, bISO){
    return Math.floor((new Date(bISO) - new Date(aISO)) / 86400000);
  }
  function weekNumberFor(dateISO){
    const start = ensureStartDate();
    const diff = daysBetween(start, dateISO);
    if (diff < 0) return 0;
    return Math.floor(diff/7) + 1;
  }

  function clampWeek(w){ return clamp(w||1, 1, 52); }
  function weekBlock(w){
    const ww = clampWeek(w);
    return ww <= 4 ? 1 : (ww <= 8 ? 2 : 3);
  }

  function starThresholds(){ return { one:1200, two:1600, three:2000 }; }
  function starsForXP(xp){
    const t = starThresholds();
    if (xp >= t.three) return "⭐⭐⭐";
    if (xp >= t.two) return "⭐⭐";
    if (xp >= t.one) return "⭐";
    return "—";
  }

  function xpNeededForNextLevel(level){
    const l = Math.max(1, level);
    return Math.round(350 + 120*l + 32*(l**1.75));
  }
  function levelFromTotalXP(total){
    let lvl=1, xp=Math.max(0, Math.round(total||0));
    while(true){
      const need = xpNeededForNextLevel(lvl);
      if (xp >= need){ xp -= need; lvl++; }
      else break;
      if (lvl>999) break;
    }
    return { lvl, into: xp, need: xpNeededForNextLevel(lvl) };
  }
  function titleForLevel(lvl){
    if (lvl>=60) return "Mythic";
    if (lvl>=40) return "Legend";
    if (lvl>=25) return "Elite";
    if (lvl>=15) return "Veteran";
    if (lvl>=8) return "Krieger";
    return "Anfänger";
  }

  // Streak: zählt Tage mit >= ⭐
  function computeStreak(entries){
    const t = starThresholds();
    const map = {};
    for (const e of entries){
      map[e.date] = (map[e.date]||0) + (e.xp||0);
    }
    const days = Object.keys(map).sort(); // ASC
    if (!days.length) return { current:0, best:0 };

    let best=0, cur=0;
    let prev=null;

    for (const d of days){
      const ok = (map[d]||0) >= t.one;
      if (!ok) continue;

      if (!prev){
        cur=1; best=Math.max(best,cur); prev=d; continue;
      }
      const gap = Math.round((new Date(d)-new Date(prev))/86400000);
      if (gap === 1) cur++;
      else cur = 1;
      prev = d;
      best = Math.max(best, cur);
    }

    // current streak: walk backwards from today
    const today = isoDate(new Date());
    let c=0;
    for (let i=0;i<366;i++){
      const dd = isoDate(new Date(Date.now() - i*86400000));
      const xp = map[dd]||0;
      if (xp >= t.one) c++;
      else break;
      if (dd === "1970-01-01") break;
    }

    const saved = loadJSON(KEY_STREAK, { best:0 });
    if (best > (saved.best||0)) { saved.best = best; saveJSON(KEY_STREAK, saved); }
    return { current:c, best: Math.max(saved.best||0, best) };
  }

  // Empfehlungen: abhängig von Block
  function recommendedSets(type, week){
    const b = weekBlock(week);
    if (type==="NEAT") return "Minuten statt Sätze";
    if (type==="Jogging") return "Distanz + Zeit";
    if (type==="Rest") return "—";
    if (type==="Conditioning") return b===1 ? "4–5 Runden" : (b===2 ? "5–6 Runden" : "5–6 Runden");
    if (type==="Core") return b===1 ? "3 Sätze" : "4 Sätze";
    if (type==="Komplexe") return b===1 ? "4–5 Runden" : (b===2 ? "5–6 Runden" : "6 Runden");
    return b===1 ? "3–4 Sätze" : (b===2 ? "4–5 Sätze" : "4–5 Sätze");
  }
  function recommendedReps(type, week){
    const b = weekBlock(week);
    if (type==="NEAT") return "30–60 Min";
    if (type==="Jogging") return "z. B. 2–6 km locker";
    if (type==="Rest") return "Mobility/Recovery 10–20 Min";
    if (type==="Core") return b===1 ? "30–45s" : "40–60s";
    if (type==="Conditioning") return b===1 ? "30–40s Arbeit / 60s Pause" : (b===2 ? "35–45s / 45–60s" : "40–45s / 30–45s");
    if (type==="Komplexe") return b===1 ? "6–8 Wdh pro Movement" : "6 Wdh pro Movement";
    return b===1 ? "10–12 Wdh" : (b===2 ? "8–10 Wdh" : "6–8 Wdh");
  }

  return {
    ensureStartDate, setStartDate, weekNumberFor, clampWeek, weekBlock,
    starThresholds, starsForXP,
    levelFromTotalXP, titleForLevel,
    computeStreak,
    recommendedSets, recommendedReps
  };
})();
