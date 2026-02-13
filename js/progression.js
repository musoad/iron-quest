(function(){
  const KEY_START = "iq_start_v4";
  const KEY_STREAK = "iq_streak_v4";

  function ensureStartDate(){
    let s = localStorage.getItem(KEY_START);
    if (!s){
      s = window.IQ.isoDate(new Date());
      localStorage.setItem(KEY_START, s);
    }
    return s;
  }
  function setStartDate(iso){
    localStorage.setItem(KEY_START, iso);
  }

  function daysBetween(aISO, bISO){
    const a = new Date(aISO);
    const b = new Date(bISO);
    return Math.floor((b - a) / 86400000);
  }
  function weekForDate(dateISO){
    const start = ensureStartDate();
    const diff = daysBetween(start, dateISO);
    const w = diff < 0 ? 1 : (Math.floor(diff/7) + 1);
    return window.IQ.clamp(w, 1, 99);
  }

  function xpNeeded(level){
    const l = Math.max(1, Number(level||1));
    return Math.round(350 + 120*l + 32*Math.pow(l, 1.75));
  }
  function levelFromXP(total){
    let lvl = 1;
    let xp = Math.max(0, Math.round(total||0));
    while (xp >= xpNeeded(lvl) && lvl < 999){
      xp -= xpNeeded(lvl);
      lvl++;
    }
    return { lvl, into: xp, need: xpNeeded(lvl) };
  }
  function titleForLevel(lvl){
    if (lvl >= 60) return "Mythic";
    if (lvl >= 40) return "Legend";
    if (lvl >= 25) return "Elite";
    if (lvl >= 15) return "Veteran";
    if (lvl >= 8) return "Krieger";
    return "Anfänger";
  }

  // Streak: count consecutive days with >= 1 entry that is not Rest
  function loadStreak(){
    try{ return JSON.parse(localStorage.getItem(KEY_STREAK)) || { count:0, lastDay:null }; }
    catch{ return { count:0, lastDay:null }; }
  }
  function saveStreak(s){ localStorage.setItem(KEY_STREAK, JSON.stringify(s)); }

  function updateStreakFromEntries(entries){
    const today = window.IQ.isoDate(new Date());
    const byDay = {};
    for (const e of entries){
      if (!e.date) continue;
      if (e.type === "Rest") continue;
      byDay[e.date] = true;
    }
    // compute streak backwards
    let count = 0;
    let day = today;
    while (byDay[day]){
      count++;
      const d = new Date(day);
      d.setDate(d.getDate()-1);
      day = window.IQ.isoDate(d);
      if (count > 999) break;
    }
    const s = { count, lastDay: today };
    saveStreak(s);
    return s;
  }

  function streakMultiplier(streakCount){
    const s = Math.max(0, Number(streakCount||0));
    if (s >= 30) return 1.15;
    if (s >= 14) return 1.10;
    if (s >= 7) return 1.06;
    if (s >= 3) return 1.03;
    return 1.0;
  }

  // Adaptive recommendation: simple (based on last week XP)
  function adaptiveHint(entries, currentWeek){
    const cur = Number(currentWeek||1);
    const prev = cur-1;
    if (prev < 1) return { note:"Startwoche: neutral.", setDelta:0, repDelta:0 };

    let curXP = 0, prevXP = 0;
    for (const e of entries){
      if (e.week === cur) curXP += (e.xp||0);
      if (e.week === prev) prevXP += (e.xp||0);
    }
    if (prevXP <= 0) return { note:`W${prev}: keine Daten → neutral.`, setDelta:0, repDelta:0 };

    const ratio = curXP / prevXP;
    if (ratio >= 1.15) return { note:"Stark im Trend → +1 Satz oder +1-2 Reps (wenn sauber).", setDelta:+1, repDelta:+1 };
    if (ratio <= 0.75) return { note:"Drop → Deload: -1 Satz oder Fokus Technik/ROM.", setDelta:-1, repDelta:-1 };
    return { note:"Stabil → neutral.", setDelta:0, repDelta:0 };
  }

  window.IronQuestProgression = {
    ensureStartDate,
    setStartDate,
    weekForDate,
    levelFromXP,
    titleForLevel,
    updateStreakFromEntries,
    streakMultiplier,
    adaptiveHint
  };
})();
