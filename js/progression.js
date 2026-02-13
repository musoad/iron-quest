// js/progression.js ✅
// Woche/Startdatum + Streak + Mutation + Weekly Reward + Adaptive Engine

(function () {
  const START_KEY = "ironquest_startdate_v4";
  const STREAK_KEY = "ironquest_streak_v1";
  const MUT_KEY = "ironquest_mut_v1";
  const REWARD_KEY = "ironquest_reward_week_v1";

  const MUTATIONS = [
    { id: "tempo", name: "Tempo Week", mult: { Mehrgelenkig: 1.10, Unilateral: 1.05 } },
    { id: "core", name: "Core Focus", mult: { Core: 1.25 } },
    { id: "engine", name: "Engine Mode", mult: { Conditioning: 1.15, NEAT: 1.10 } },
    { id: "unilateral", name: "Unilateral Blessing", mult: { Unilateral: 1.15 } },
    { id: "balanced", name: "Balanced Week", mult: { Mehrgelenkig: 1.05, Core: 1.05, Conditioning: 1.05 } }
  ];

  const isoDate = (d) => new Date(d).toISOString().slice(0, 10);
  const clampWeek = (w) => Math.max(1, Math.min(52, w || 1));
  const daysBetween = (a, b) => Math.floor((new Date(b) - new Date(a)) / 86400000);

  function getStartDate() {
    let s = localStorage.getItem(START_KEY);
    if (!s) {
      s = isoDate(new Date());
      localStorage.setItem(START_KEY, s);
    }
    return s;
  }
  function setStartDate(iso) {
    localStorage.setItem(START_KEY, iso);
  }

  function getWeekNumber(startISO, dateISO) {
    const diff = daysBetween(startISO, dateISO);
    return diff < 0 ? 1 : Math.floor(diff / 7) + 1;
  }

  function currentWeek(dateISO) {
    return clampWeek(getWeekNumber(getStartDate(), dateISO || isoDate(new Date())));
  }

  // Mutation: fix pro Woche
  function loadMutMap() { try { return JSON.parse(localStorage.getItem(MUT_KEY) || "{}"); } catch { return {}; } }
  function saveMutMap(m) { localStorage.setItem(MUT_KEY, JSON.stringify(m)); }

  function mutationForWeek(week) {
    const w = clampWeek(week);
    const map = loadMutMap();
    if (!map[w]) {
      const pick = MUTATIONS[Math.floor(Math.random() * MUTATIONS.length)];
      map[w] = pick.id;
      saveMutMap(map);
    }
    return MUTATIONS.find(x => x.id === map[w]) || MUTATIONS[0];
  }

  function mutationMultiplier(type, week) {
    const m = mutationForWeek(week);
    return Number(m.mult?.[type] || 1);
  }

  // Reward: wenn letzte Woche >= 5 Trainingstage -> +5% in aktueller Woche
  function loadReward() { try { return JSON.parse(localStorage.getItem(REWARD_KEY) || "{}"); } catch { return {}; } }
  function saveReward(m) { localStorage.setItem(REWARD_KEY, JSON.stringify(m)); }

  function rewardActive(week) {
    const map = loadReward();
    return map[String(week)] === true;
  }

  function updateRewardFromEntries(entries, week) {
    const prev = week - 1;
    if (prev < 1) return;

    const trainDays = new Set();
    for (const e of entries) {
      if (e.week !== prev) continue;
      if (e.type === "Rest" || e.type === "NEAT") continue;
      trainDays.add(e.date);
    }
    if (trainDays.size >= 5) {
      const map = loadReward();
      const nowWeek = String(week);
      if (!map[nowWeek]) {
        map[nowWeek] = true;
        saveReward(map);
      }
    }
  }

  // Streak: Trainingtage in Folge (Rest/NEAT zählen nicht)
  function computeStreak(entries) {
    const days = new Set();
    entries.forEach(e => {
      if (e.type === "Rest" || e.type === "NEAT") return;
      days.add(e.date);
    });

    const today = isoDate(new Date());
    let streak = 0;
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const di = isoDate(d);
      if (days.has(di)) streak++;
      else break;
    }
    localStorage.setItem(STREAK_KEY, String(streak));
    return streak;
  }

  function streakMultiplier(streak) {
    // sanft: ab 3 Tagen +2%, ab 7 +5%, ab 14 +8%
    if (streak >= 14) return 1.08;
    if (streak >= 7) return 1.05;
    if (streak >= 3) return 1.02;
    return 1.0;
  }

  // Adaptive: basierend auf XP in Vorwoche -> Empfehlung Sets/Reps +/-
  function adaptiveAdjust(entries, week) {
    const prev = week - 1;
    if (prev < 1) return { setDelta: 0, repDelta: 0, note: "Startwoche: neutral." };

    const dayXP = {};
    for (const e of entries) {
      if (e.week !== prev) continue;
      dayXP[e.date] = (dayXP[e.date] || 0) + (e.xp || 0);
    }
    const days = Object.keys(dayXP);
    const trainDays = days.filter(d => dayXP[d] >= 1200).length;
    const strongDays = days.filter(d => dayXP[d] >= 1600).length;

    if (trainDays >= 5 && strongDays >= 2) return { setDelta: +1, repDelta: +2, note: `Starke Woche (W${prev}) → +1 Satz, +2 Reps.` };
    if (trainDays >= 4) return { setDelta: +1, repDelta: +1, note: `Solide Woche (W${prev}) → +1 Satz, +1 Rep.` };
    if (trainDays <= 2) return { setDelta: -1, repDelta: -1, note: `Deload (W${prev}) → -1 Satz, -1 Rep.` };
    return { setDelta: 0, repDelta: 0, note: `Neutral (W${prev}).` };
  }

  window.IronQuestProgression = {
    isoDate,
    getStartDate,
    setStartDate,
    currentWeek,
    mutationForWeek,
    mutationMultiplier,
    computeStreak,
    streakMultiplier,
    rewardActive,
    updateRewardFromEntries,
    adaptiveAdjust
  };
})();
