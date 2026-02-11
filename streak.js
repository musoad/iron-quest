// streak.js
import { loadJSON, saveJSON } from "./utils.js";

const KEY_STREAK = "iq_streak_v3";

function loadSt(){ return loadJSON(KEY_STREAK, { current:0, best:0, lastTrainDate:null }); }
function saveSt(s){ saveJSON(KEY_STREAK, s); }

function dayDiff(aISO, bISO){
  return Math.floor((new Date(bISO) - new Date(aISO)) / 86400000);
}

export function updateStreakOnTrainingDay(dayISO){
  const st = loadSt();

  if (!st.lastTrainDate) {
    st.current = 1;
    st.best = Math.max(st.best, st.current);
    st.lastTrainDate = dayISO;
    saveSt(st);
    return st;
  }

  const diff = dayDiff(st.lastTrainDate, dayISO);
  if (diff === 0) {
    // already counted today
  } else if (diff === 1) {
    st.current += 1;
    st.best = Math.max(st.best, st.current);
    st.lastTrainDate = dayISO;
  } else if (diff > 1) {
    st.current = 1;
    st.best = Math.max(st.best, st.current);
    st.lastTrainDate = dayISO;
  } else {
    // retroactive older date: ignore streak update
  }

  saveSt(st);
  return st;
}

export function getStreak(){ return loadSt(); }

export function resetStreak(){
  localStorage.removeItem(KEY_STREAK);
}
