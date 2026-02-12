/* progression.js – Startdate/Week/Level/Streak (ES Module) */

import { isoDate, clamp, loadJSON, saveJSON } from "./utils.js";

const KEY_START = "iq_startdate_v4";
const KEY_STREAK = "iq_streak_v4";

export function ensureStartDate() {
  let s = localStorage.getItem(KEY_START);
  if (!s) {
    s = isoDate(new Date());
    localStorage.setItem(KEY_START, s);
  }
  return s;
}

export function setStartDate(newISO) {
  localStorage.setItem(KEY_START, newISO);
}

export function computeWeekFromStart(startISO, dateISO) {
  const a = new Date(startISO);
  const b = new Date(dateISO);
  const diff = Math.floor((b - a) / 86400000);
  if (diff < 0) return 0;
  return Math.floor(diff / 7) + 1;
}

export function clampWeek(w) {
  return clamp(w || 1, 1, 52);
}

export function levelFromTotalXp(totalXp) {
  let lvl = 1;
  let xp = Math.max(0, Math.round(totalXp || 0));
  while (true) {
    const need = Math.round(350 + 120 * lvl + 32 * (lvl ** 1.75));
    if (xp >= need) { xp -= need; lvl++; }
    else break;
    if (lvl > 999) break;
  }
  return { lvl, into: xp };
}

export function titleForLevel(lvl) {
  if (lvl >= 60) return "Mythic";
  if (lvl >= 40) return "Legend";
  if (lvl >= 25) return "Elite";
  if (lvl >= 15) return "Veteran";
  if (lvl >= 8) return "Krieger";
  return "Anfänger";
}

function computeDayXp(entries) {
  const m = {};
  for (const e of entries) {
    m[e.date] = (m[e.date] || 0) + (e.xp || 0);
  }
  return m;
}

export function computeStreak(entries) {
  const dayXp = computeDayXp(entries);
  const days = Object.keys(dayXp).sort(); // ISO sorts fine
  if (!days.length) return { streak: 0, lastDay: null };

  // streak definition: consecutive days with >= 1 entry XP>0
  let streak = 0;
  let last = isoDate(new Date());
  for (let i = days.length - 1; i >= 0; i--) {
    const d = days[i];
    const xp = dayXp[d] || 0;
    if (xp <= 0) continue;
    // first valid streak anchor:
    last = d;
    streak = 1;
    // walk backwards day-by-day
    let cur = new Date(d);
    while (true) {
      cur.setDate(cur.getDate() - 1);
      const prev = isoDate(cur);
      if ((dayXp[prev] || 0) > 0) streak++;
      else break;
    }
    return { streak, lastDay: d };
  }
  return { streak: 0, lastDay: null };
}

export function getPlayerState(entries) {
  const startDate = ensureStartDate();
  const today = isoDate(new Date());
  const week = clampWeek(computeWeekFromStart(startDate, today));

  let totalXp = 0;
  let weekXp = 0;
  let todayXp = 0;

  for (const e of entries) {
    totalXp += (e.xp || 0);
    if (e.week === week) weekXp += (e.xp || 0);
    if (e.date === today) todayXp += (e.xp || 0);
  }

  const lv = levelFromTotalXp(totalXp);
  const { streak } = computeStreak(entries);

  // persist streak (optional)
  saveJSON(KEY_STREAK, { streak, at: today });

  return {
    startDate,
    today,
    week,
    totalXp,
    weekXp,
    todayXp,
    level: lv.lvl,
    title: titleForLevel(lv.lvl),
    streak
  };
}
