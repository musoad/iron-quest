import { isoDate, clamp, loadJSON, saveJSON } from "./utils.js";

export const KEYS = {
  startDate: "iq_startdate_v4",
  streak: "iq_streak_v4",
};

export function ensureStartDate() {
  let s = localStorage.getItem(KEYS.startDate);
  if (!s) {
    s = isoDate(new Date());
    localStorage.setItem(KEYS.startDate, s);
  }
  return s;
}

export function setStartDate(newISO) {
  localStorage.setItem(KEYS.startDate, newISO);
}

export function getWeekNumber(dateISO) {
  const start = ensureStartDate();
  const a = new Date(start);
  const b = new Date(dateISO);
  const diff = Math.floor((b - a) / 86400000);
  if (diff < 0) return 0;
  return Math.floor(diff / 7) + 1;
}

export function clampWeek(w) {
  return clamp(w || 1, 1, 52);
}

/* ---------- Level ---------- */
export function xpNeededForNextLevel(level) {
  const l = Math.max(1, Number(level || 1));
  return Math.round(350 + 120 * l + 32 * (l ** 1.75));
}

export function levelFromTotalXp(totalXp) {
  let lvl = 1;
  let xp = Math.max(0, Math.round(totalXp || 0));
  while (lvl < 999) {
    const need = xpNeededForNextLevel(lvl);
    if (xp >= need) { xp -= need; lvl += 1; }
    else break;
  }
  return { lvl, into: xp, need: xpNeededForNextLevel(lvl) };
}

export function titleForLevel(lvl) {
  if (lvl >= 60) return "Mythic";
  if (lvl >= 40) return "Legend";
  if (lvl >= 25) return "Elite";
  if (lvl >= 15) return "Veteran";
  if (lvl >= 8) return "Krieger";
  return "Anfänger";
}

/* ---------- Streak System ----------
   streak zählt Trainingstage (>= 1 Training Entry am Tag)
   - wenn heute trainiert und gestern trainiert: +1
   - wenn heute trainiert und gestern nicht: streak=1
*/
export function computeStreak(entries) {
  const byDate = new Map();
  for (const e of entries) {
    const d = e.date;
    if (!byDate.has(d)) byDate.set(d, { trained:false });
    // training = nicht Rest und nicht Quest (wenn du Quests einführst) und nicht "0 xp info"
    if ((e.type || "") !== "Rest" && (e.xp || 0) > 0) byDate.get(d).trained = true;
  }

  const today = isoDate(new Date());
  const yesterday = isoDate(new Date(Date.now() - 86400000));

  const st = loadJSON(KEYS.streak, { current:0, lastTrainDate:null });

  const trainedToday = byDate.get(today)?.trained === true;

  if (!trainedToday) return { ...st, trainedToday:false };

  // trained today:
  if (st.lastTrainDate === yesterday) {
    st.current = (st.current || 0) + 1;
  } else if (st.lastTrainDate !== today) {
    st.current = 1;
  }
  st.lastTrainDate = today;

  saveJSON(KEYS.streak, st);
  return { ...st, trainedToday:true };
}

export function streakMultiplier(streakCount) {
  // sehr mild (Motivation ohne zu eskalieren)
  const s = Math.max(0, Number(streakCount || 0));
  if (s >= 14) return 1.06;
  if (s >= 7) return 1.04;
  if (s >= 3) return 1.02;
  return 1.00;
}

/* ---------- Adaptive Engine (KI-light)
   liest letzte Woche und setzt Empfehlung:
   - gute Woche => Empfehlung + (in UI)
   - schwache Woche => Deload Empfehlung
*/
export function starsForXP(xp) {
  if (xp >= 2000) return 3;
  if (xp >= 1600) return 2;
  if (xp >= 1200) return 1;
  return 0;
}

export function adaptiveHint(entries, currentWeek) {
  const prev = currentWeek - 1;
  if (prev < 1) return { setDelta:0, repDelta:0, text:"Startwoche: neutral." };

  const dayXP = {};
  for (const e of entries) {
    if (e.week !== prev) continue;
    dayXP[e.date] = (dayXP[e.date] || 0) + (e.xp || 0);
  }

  const days = Object.keys(dayXP);
  const trainDays = days.filter(d => dayXP[d] >= 1200).length;
  const twoStarDays = days.filter(d => dayXP[d] >= 1600).length;
  const threeStarDays = days.filter(d => dayXP[d] >= 2000).length;

  if (trainDays >= 5 && threeStarDays >= 2) return { setDelta:+1, repDelta:+2, text:`Elite Woche (W${prev}) → +1 Satz & +2 Reps.` };
  if (trainDays >= 4 && (twoStarDays >= 2 || threeStarDays >= 1)) return { setDelta:+1, repDelta:+1, text:`Starke Woche (W${prev}) → +1 Satz & +1 Rep.` };
  if (trainDays <= 2) return { setDelta:-1, repDelta:-1, text:`Schwache Woche (W${prev}) → Deload (-1 Satz / -1 Rep).` };
  return { setDelta:0, repDelta:0, text:`Stabil (W${prev}) → neutral.` };
}
