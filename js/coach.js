(() => {
  "use strict";

  const KEY = "ironquest_coach_v5";

  function load(){
    try { return JSON.parse(localStorage.getItem(KEY)) || { prs:{}, fatigue:{} }; }
    catch { return { prs:{}, fatigue:{} }; }
  }
  function save(st){ localStorage.setItem(KEY, JSON.stringify(st)); }

  function sigExercise(exName){ return String(exName || "").trim().toLowerCase(); }

  function updatePR(entry){
    if (!entry?.exercise) return { isNew:false };
    const st = load();
    const key = sigExercise(entry.exercise);

    let sets = 0, reps = 0;
    const m = String(entry.detail || "").match(/Did\s+(\d+)[x×](\d+)/i);
    if (m){
      sets = Number(m[1]||0);
      reps = Number(m[2]||0);
    }
    const volume = Math.max(0, sets * reps);
    const cur = st.prs[key] || { bestVolume:0, bestDate:"" };

    if (volume > cur.bestVolume){
      st.prs[key] = { bestVolume: volume, bestDate: entry.date || "" };
      save(st);
      return { isNew:true, best: st.prs[key] };
    }
    save(st);
    return { isNew:false, best: cur };
  }

  function nextTarget(exercise, lastSets, lastReps){
    const recSets = Number(exercise?.recSets||0);
    const recReps = Number(exercise?.recReps||0);
    const sets = Number(lastSets||0);
    const reps = Number(lastReps||0);

    if (!recSets || !recReps) return { sets: sets||3, reps: reps||8 };

    let targetSets = recSets;
    let targetReps = recReps;

    if (sets >= recSets && reps >= recReps){
      targetReps = Math.min(recReps + 4, reps + 1);
    }
    return { sets: targetSets, reps: targetReps };
  }

  function deloadHint(entries){
    const today = window.Utils.isoDate(new Date());
    const w = window.IronQuestProgression.getWeekNumberFor(today);

    let weekXp = 0;
    const days = new Set();
    let complexCount = 0;

    for (const e of entries){
      if (Number(e.week||0) !== w) continue;
      weekXp += Number(e.xp||0);
      if (e.date) days.add(e.date);
      if (e.type === "Komplexe") complexCount++;
    }

    const heavy = (weekXp >= 12000) || (days.size >= 5 && complexCount >= 6);
    return { heavy, weekXp, days: days.size, complexCount };
  }

  window.IronQuestCoach = { updatePR, nextTarget, deloadHint };
})();
