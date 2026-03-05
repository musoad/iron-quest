(() => {
  "use strict";

  const AUDIT_KEY = "iq_integrity_audit_v1";
  const AUDIT_VERSION = 1;

  function iso10(d){
    try{
      if(window.Utils && typeof window.Utils.isoDate === "function") return window.Utils.isoDate(d);
    }catch(_){ }
    return new Date(d).toISOString().slice(0,10);
  }

  function toNum(x, def=0){
    const n = Number(x);
    return Number.isFinite(n) ? n : def;
  }

  function normalizeEntry(e){
    if(!e || typeof e !== "object") return { changed:false, entry:e };
    const out = { ...e };
    let changed = false;

    // date
    if(out.date){
      const d = String(out.date);
      const d10 = d.length >= 10 ? d.slice(0,10) : d;
      if(out.date !== d10){ out.date = d10; changed = true; }
    }

    // week
    if((out.date && (out.week === undefined || out.week === null || out.week === "")) && window.IronQuestProgression && typeof window.IronQuestProgression.getWeekNumberFor === "function"){
      out.week = window.IronQuestProgression.getWeekNumberFor(out.date);
      changed = true;
    }

    // xp
    const xp = toNum(out.xp, NaN);
    if(!Number.isFinite(xp) || xp < 0){
      // Recompute if possible
      const exName = out.exercise || out.name;
      const exObj = (window.IronQuestExercises && typeof window.IronQuestExercises.findByName === "function")
        ? window.IronQuestExercises.findByName(exName)
        : null;

      // Running entries
      if(String(out.exercise||"").toLowerCase() === "jogging" || String(out.type||"").toLowerCase() === "joggen"){
        const km = toNum(out.km, 0) || (function(){
          // try parse from detail
          const m = String(out.detail||"").match(/([0-9]+(?:\.[0-9]+)?)\s*km/i);
          return m ? toNum(m[1],0) : 0;
        })();
        const minutes = toNum(out.minutes, 0) || (function(){
          const m = String(out.detail||"").match(/([0-9]+)\s*min/i);
          return m ? toNum(m[1],0) : 0;
        })();
        if(window.IronQuestXP && typeof window.IronQuestXP.jogXP === "function"){
          out.xp = window.IronQuestXP.jogXP(km, minutes);
          changed = true;
        }else{
          out.xp = 0;
          changed = true;
        }
      }else if(window.IronQuestXP && typeof window.IronQuestXP.calcExerciseXP === "function"){
        out.xp = window.IronQuestXP.calcExerciseXP({
          exercise: exObj || { name: exName, type: out.type, recSets: out.recSets, recReps: out.recReps, baseXP: out.baseXP },
          type: out.type,
          recSets: out.recSets,
          recReps: out.recReps,
          sets: out.sets,
          reps: out.reps,
          entries: null,
          buffs: (window.IronQuestSession && typeof window.IronQuestSession.getBuffs === "function") ? window.IronQuestSession.getBuffs() : null
        });
        changed = true;
      }else{
        out.xp = 0;
        changed = true;
      }
    }

    // Type normalization for runs: use Conditioning so Attributes can level END
    if(String(out.exercise||"").toLowerCase() === "jogging" && out.type !== "Conditioning"){
      out.type = "Conditioning";
      changed = true;
    }

    return { changed, entry: out };
  }

  function normalizeRun(r){
    if(!r || typeof r !== "object") return { changed:false, run:r };
    const out = { ...r };
    let changed = false;
    if(out.date){
      const d = String(out.date);
      const d10 = d.length >= 10 ? d.slice(0,10) : d;
      if(out.date !== d10){ out.date = d10; changed = true; }
    }else{
      out.date = iso10(new Date());
      changed = true;
    }
    out.km = toNum(out.km, 0);
    out.minutes = toNum(out.minutes, 0);
    const xp = toNum(out.xp, NaN);
    if(!Number.isFinite(xp) || xp <= 0){
      if(window.IronQuestXP && typeof window.IronQuestXP.jogXP === "function"){
        out.xp = window.IronQuestXP.jogXP(out.km, out.minutes);
      }else{
        out.xp = 0;
      }
      changed = true;
    }
    return { changed, run: out };
  }

  async function ensureRunMirrors(entries, runs){
    const byRunId = new Map();
    for(const e of entries){
      if(e && e.runId !== undefined && e.runId !== null) byRunId.set(String(e.runId), e);
    }
    const created = [];
    for(const r of runs){
      if(!r || r.id === undefined || r.id === null) continue;
      if(byRunId.has(String(r.id))) continue;

      // best-effort: also detect older mirrors without runId
      const exists = entries.some(e => String(e.date||"").slice(0,10) === String(r.date||"").slice(0,10) && String(e.exercise||"").toLowerCase()==="jogging" && Math.round(toNum(e.xp,0)) === Math.round(toNum(r.xp,0)));
      if(exists) continue;

      const date = String(r.date||"").slice(0,10);
      const week = (window.IronQuestProgression && typeof window.IronQuestProgression.getWeekNumberFor === "function") ? window.IronQuestProgression.getWeekNumberFor(date) : 1;
      const detail = `${toNum(r.km,0)} km • ${toNum(r.minutes,0)} min`;
      const entry = {
        date,
        week,
        type: "Conditioning",
        exercise: "Jogging",
        detail,
        xp: toNum(r.xp,0),
        runId: r.id,
        km: toNum(r.km,0),
        minutes: toNum(r.minutes,0)
      };
      await window.IronDB.addEntry(entry);
      created.push(entry);
    }
    return created;
  }

  function rebuildAttributesFromEntries(entries){
    try{
      if(!window.IronQuestAttributes || typeof window.IronQuestAttributes.addXP !== "function") return false;
      // Clear attribute storage then replay
      localStorage.removeItem("ironquest_attributes_v8");
      const validTypes = new Set((window.IronQuestAttributes.ATTRS||[]).map(a=>a.type));
      for(const e of entries){
        const t = String(e && e.type || "");
        if(!validTypes.has(t)) continue;
        window.IronQuestAttributes.addXP(t, toNum(e.xp,0));
      }
      return true;
    }catch(_){
      return false;
    }
  }

  async function run({ force=false } = {}){
    // skip if already audited for this version
    if(!force){
      try{
        const prev = JSON.parse(localStorage.getItem(AUDIT_KEY) || "null");
        if(prev && prev.v === AUDIT_VERSION) return { skipped:true, prev };
      }catch(_){ }
    }

    const report = { skipped:false, fixedEntries:0, fixedRuns:0, createdRunMirrors:0, rebuiltAttributes:false };

    // Ensure DB available
    if(!window.IronDB || typeof window.IronDB.init !== "function") throw new Error("IronDB missing");
    await window.IronDB.init();

    // Entries
    let entries = await window.IronDB.getAllEntries();
    for(const e of entries){
      const { changed, entry } = normalizeEntry(e);
      if(changed){
        report.fixedEntries++;
        if(typeof window.IronDB.updateEntry === "function") await window.IronDB.updateEntry(entry);
        else{
          // fallback: delete+readd
          await window.IronDB.deleteEntry(entry.id);
          await window.IronDB.addEntry(entry);
        }
      }
    }

    // Runs
    let runs = [];
    if(window.IronDB.getAllRuns){
      runs = await window.IronDB.getAllRuns();
      for(const r of runs){
        const { changed, run: rr } = normalizeRun(r);
        if(changed){
          report.fixedRuns++;
          if(typeof window.IronDB.updateRun === "function") await window.IronDB.updateRun(rr);
          else{
            await window.IronDB.deleteRun(rr.id);
            await window.IronDB.addRun(rr);
          }
        }
      }
    }

    // refresh entries after potential changes
    entries = await window.IronDB.getAllEntries();
    runs = window.IronDB.getAllRuns ? await window.IronDB.getAllRuns() : [];

    // Mirror runs into entries if needed
    const created = await ensureRunMirrors(entries, runs);
    report.createdRunMirrors = created.length;

    // Attributes rebuild so XP -> attributes is always consistent
    report.rebuiltAttributes = rebuildAttributesFromEntries(await window.IronDB.getAllEntries());

    try{
      localStorage.setItem(AUDIT_KEY, JSON.stringify({ v: AUDIT_VERSION, at: Date.now(), report }));
    }catch(_){ }

    return report;
  }

  window.IronQuestIntegrity = { run };
})();
