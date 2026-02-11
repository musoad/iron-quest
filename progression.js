/* =========================
   IRON QUEST v4 PRO — progression.js
   ✅ Startdatum/Woche stabil (iOS safe)
   ✅ Level System
   ✅ Streak System
   ✅ KI-Adaptive Progression Engine (Set/Rep Empfehlung)
   ========================= */

(function () {
  window.IQ = window.IQ || {};

  const KEY_START = "iq_startdate_v4";
  const KEY_STREAK = "iq_streak_v4";            // { lastDoneISO, streak }
  const KEY_ADAPT = "iq_adapt_v4";              // { week -> { setDelta, repDelta, note } }
  const KEY_WEEKLY_REWARD = "iq_weekly_reward_v4"; // { week -> true }

  function isoDate(d) {
    const dd = d instanceof Date ? d : new Date(d);
    return dd.toISOString().slice(0, 10);
  }

  function daysBetween(aISO, bISO) {
    const a = new Date(aISO);
    const b = new Date(bISO);
    return Math.floor((b - a) / 86400000);
  }

  function clampWeek(w) {
    w = Number(w || 1);
    return Math.max(1, Math.min(52, w));
  }

  function ensureStartDate() {
    let s = localStorage.getItem(KEY_START);
    if (!s) {
      s = isoDate(new Date());
      localStorage.setItem(KEY_START, s);
    }
    return s;
  }

  function setStartDate(newISO) {
    localStorage.setItem(KEY_START, newISO);
  }

  function getWeekNumberFor(dateISO) {
    const start = ensureStartDate();
    const diff = daysBetween(start, dateISO);
    if (diff < 0) return 0;
    return clampWeek(Math.floor(diff / 7) + 1);
  }

  // ---------- Level System ----------
  function xpNeededForNextLevel(level) {
    const l = Math.max(1, Number(level || 1));
    return Math.round(350 + 120 * l + 32 * (l ** 1.75));
  }

  function levelFromTotalXp(totalXp) {
    let lvl = 1;
    let xp = Math.max(0, Math.round(totalXp || 0));
    while (true) {
      const need = xpNeededForNextLevel(lvl);
      if (xp >= need) {
        xp -= need;
        lvl += 1;
      } else break;
      if (lvl > 999) break;
    }
    return { lvl, into: xp, need: xpNeededForNextLevel(lvl) };
  }

  function titleForLevel(lvl) {
    if (lvl >= 60) return "Mythic";
    if (lvl >= 40) return "Legend";
    if (lvl >= 25) return "Elite";
    if (lvl >= 15) return "Veteran";
    if (lvl >= 8) return "Krieger";
    return "Anfänger";
  }

  // ---------- Streak System ----------
  // Streak zählt Trainingstage (nicht Rest) wenn XP >= 500 an einem Tag
  function updateStreakForDay(dayISO, dayXp) {
    const st = loadJSON(KEY_STREAK, { lastDoneISO: null, streak: 0 });
    const THRESH = 500;
    if (dayXp < THRESH) return st;

    const last = st.lastDoneISO;
    if (!last) {
      st.lastDoneISO = dayISO;
      st.streak = 1;
      saveJSON(KEY_STREAK, st);
      return st;
    }

    const diff = daysBetween(last, dayISO);
    if (diff === 0) {
      // same day, no change
    } else if (diff === 1) {
      st.streak += 1;
      st.lastDoneISO = dayISO;
    } else {
      st.streak = 1;
      st.lastDoneISO = dayISO;
    }
    saveJSON(KEY_STREAK, st);
    return st;
  }

  function getStreak() {
    return loadJSON(KEY_STREAK, { lastDoneISO: null, streak: 0 });
  }

  // ---------- KI Adaptive Engine ----------
  // Idee: schaut auf Woche N-1 (Trainingstage/Stars/XP) und setzt Modifikator für Woche N
  // Output: setDelta & repDelta (für Empfehlungen)
  function computeAdaptiveForWeek(entries, week) {
    const prev = week - 1;
    if (prev < 1) return { setDelta: 0, repDelta: 0, note: "Startwoche: neutral." };

    // Tages XP prev
    const dayXp = {};
    for (const e of entries) {
      if (Number(e.week) !== prev) continue;
      dayXp[e.date] = (dayXp[e.date] || 0) + (e.xp || 0);
    }

    const days = Object.keys(dayXp);
    const trainDays = days.filter(d => (dayXp[d] || 0) >= 1200).length; // ⭐ threshold wie vorher
    const twoStarDays = days.filter(d => (dayXp[d] || 0) >= 1600).length;
    const threeStarDays = days.filter(d => (dayXp[d] || 0) >= 2000).length;

    if (trainDays >= 5 && threeStarDays >= 2) return { setDelta: +1, repDelta: +2, note: `Elite Woche (W${prev}) → +1 Satz & +2 Reps.` };
    if (trainDays >= 4 && (twoStarDays >= 2 || threeStarDays >= 1)) return { setDelta: +1, repDelta: +1, note: `Starke Woche (W${prev}) → +1 Satz & +1 Rep.` };
    if (trainDays <= 2) return { setDelta: -1, repDelta: -1, note: `Schwache Woche (W${prev}) → Deload -1 Satz & -1 Rep.` };
    return { setDelta: 0, repDelta: 0, note: `Stabil (W${prev}) → neutral.` };
  }

  function getAdaptiveForWeek(entries, week) {
    const map = loadJSON(KEY_ADAPT, {});
    if (!map[week]) {
      map[week] = computeAdaptiveForWeek(entries, week);
      saveJSON(KEY_ADAPT, map);
    }
    return map[week];
  }

  // Weekly Reward: wenn Woche N >=5 Trainingstage (≥500 XP pro Tag), dann Woche N+1 Reward aktiv
  function updateWeeklyReward(entries, weekJustFinished) {
    const map = loadJSON(KEY_WEEKLY_REWARD, {});
    const dayXp = {};
    for (const e of entries) {
      if (Number(e.week) !== weekJustFinished) continue;
      dayXp[e.date] = (dayXp[e.date] || 0) + (e.xp || 0);
    }
    const trainDays = Object.keys(dayXp).filter(d => (dayXp[d] || 0) >= 500).length;
    const next = clampWeek(weekJustFinished + 1);
    if (trainDays >= 5) {
      map[next] = true;
      saveJSON(KEY_WEEKLY_REWARD, map);
    }
  }

  function getWeeklyRewardMultiplier(week) {
    const map = loadJSON(KEY_WEEKLY_REWARD, {});
    return map[week] ? 1.05 : 1.0;
  }

  // ---------- JSON helpers ----------
  function loadJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
    catch { return fallback; }
  }
  function saveJSON(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  // ---------- Export ----------
  window.IQ.ensureStartDate = ensureStartDate;
  window.IQ.setStartDate = setStartDate;
  window.IQ.getWeekNumberFor = getWeekNumberFor;

  window.IQ.levelFromTotalXp = levelFromTotalXp;
  window.IQ.titleForLevel = titleForLevel;

  window.IQ.getStreak = getStreak;
  window.IQ.updateStreakForDay = updateStreakForDay;

  window.IQ.getAdaptiveForWeek = getAdaptiveForWeek;

  window.IQ.updateWeeklyReward = updateWeeklyReward;
  window.IQ.getWeeklyRewardMultiplier = getWeeklyRewardMultiplier;

})();
