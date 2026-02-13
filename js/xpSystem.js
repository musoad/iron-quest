// js/xpSystem.js ✅
// XP Engine + einfacher PR (Best Volume = sets*reps) pro Übung

(function () {
  const XP_BASE = {
    "Mehrgelenkig": 180,
    "Unilateral": 200,
    "Core": 140,
    "Conditioning": 240,
    "Komplexe": 260,
    "NEAT": 0,
    "Rest": 0
  };

  const PR_KEY = "ironquest_pr_volume_v1";

  function loadPR() {
    try { return JSON.parse(localStorage.getItem(PR_KEY) || "{}"); } catch { return {}; }
  }
  function savePR(m) { localStorage.setItem(PR_KEY, JSON.stringify(m)); }

  function neatXP(minutes) {
    const m = Math.max(0, Number(minutes || 0));
    return Math.round(m * 2.5); // 60min -> 150 XP
  }

  function computeXP({ exercise, type, sets, reps, minutes, streakMult, skillMult, mutationMult, rewardMult }) {
    let base = XP_BASE[type] ?? 0;

    if (type === "NEAT") base = neatXP(minutes);
    if (type === "Rest") base = 0;

    // Optional: kleiner Trainings-Boost wenn echte Sets/Reps vorhanden
    let volumeBoost = 1;
    const s = Number(sets || 0);
    const r = Number(reps || 0);

    if (type !== "NEAT" && type !== "Rest" && s > 0 && r > 0) {
      const vol = s * r;
      // sanfter Boost
      volumeBoost = 1 + Math.min(0.25, vol / 400);
    }

    const mult =
      (Number(streakMult) || 1) *
      (Number(skillMult) || 1) *
      (Number(mutationMult) || 1) *
      (Number(rewardMult) || 1) *
      volumeBoost;

    const xp = Math.round(base * mult);
    return { xp, base, mult, volumeBoost };
  }

  function checkAndSetPR({ exercise, sets, reps }) {
    const s = Number(sets || 0);
    const r = Number(reps || 0);
    if (!exercise || s <= 0 || r <= 0) return { isPR: false, best: 0, now: 0 };

    const now = s * r;
    const map = loadPR();
    const best = Number(map[exercise] || 0);

    if (now > best) {
      map[exercise] = now;
      savePR(map);
      return { isPR: true, best, now };
    }
    return { isPR: false, best, now };
  }

  window.IronQuestXP = {
    computeXP,
    checkAndSetPR,
    neatXP
  };
})();
