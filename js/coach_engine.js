(() => {
  "use strict";
  // Smart layer: PRs, imbalance, deload hints, next targets
  const KEY="ironquest_coach_v8";
  function load(){ try{ return JSON.parse(localStorage.getItem(KEY))||{ prs:{} }; }catch{ return { prs:{} }; } }
  function save(st){ localStorage.setItem(KEY, JSON.stringify(st)); }

  function _sig(name){ return String(name||"").trim().toLowerCase(); }

  function parseDid(detail){
    const m=String(detail||"").match(/Did\s+(\d+)[x×](\d+)/i);
    if(!m) return { sets:0, reps:0 };
    return { sets:Number(m[1]||0), reps:Number(m[2]||0) };
  }

  function updatePR(entry){
    if(!(entry && entry.exercise)) return { isNew:false };
    const st=load();
    const key=_sig(entry.exercise);
    const {sets,reps}=parseDid(entry.detail||"");
    const vol=Math.max(0, sets*reps);
    const cur=st.prs[key]||{ bestVolume:0, date:"" };
    if(vol>cur.bestVolume){
      st.prs[key]={ bestVolume: vol, date: entry.date||"" };
      save(st);
      return { isNew:true, best: st.prs[key] };
    }
    save(st);
    return { isNew:false, best: cur };
  }

  function weeklySummary(entries){
    const today=window.Utils.isoDate(new Date());
    const week=window.IronQuestProgression.getWeekNumberFor(today);

    const dayXp={};
    let weekXp=0;
    const types={};
    const days=new Set();

    for(const e of entries){
      const xp=Number(e.xp||0);
      if(!e.date) continue;
      dayXp[e.date]=(dayXp[e.date]||0)+xp;
      if(Number(e.week||0)===week){
        weekXp+=xp;
        days.add(e.date);
        types[e.type]=(types[e.type]||0)+xp;
      }
    }

    let threeStar=0;
    for(const [d,xp] of Object.entries(dayXp)){
      if(window.IronQuestProgression.getWeekNumberFor(d)!==week) continue;
      if(window.IronQuestProgression.starsForDay(xp)==="⭐⭐⭐") threeStar++;
    }

    // Balance heuristics
    const push = (types["Mehrgelenkig"]||0) + (types["Unilateral"]||0);
    const core = (types["Core"]||0);
    const end  = (types["Conditioning"]||0) + (types["NEAT"]||0);

    const imbalance = [];
    if(core < push*0.18) imbalance.push("Core wirkt niedrig. 1–2 Core-Einheiten ergänzen.");
    if(end < push*0.12) imbalance.push("Ausdauer/Conditioning niedrig. 1 kurze End-Session einbauen.");
    // Rough fatigue heuristic: very high weekly XP or too many training days.
    const heavy = (weekXp>=12000) || (days.size>=6);
    const fatigue = heavy ? "Fatigue hoch. Nächste Woche 20–30% weniger Volumen (Deload)." : "Recovery ok.";

    return { week, weekXp, days: days.size, threeStar, types, imbalance, fatigue };
  }

  function nextTarget(ex, lastSets, lastReps){
    const recS=Number((ex && ex.recSets)||3), recR=Number((ex && ex.recReps)||8);
    const s=Number(lastSets||recS), r=Number(lastReps||recR);
    if(s>=recS && r>=recR) return { sets: recS, reps: Math.min(recR+4, r+1) };
    return { sets: recS, reps: recR };
  }

  window.IronQuestCoach={ load, save, updatePR, weeklySummary, nextTarget, parseDid };
})();


/* ---------------------------------------------------------
   CoachPlus – lightweight "fatigue" signal (0–100)
   Used by Log to suggest deload / progression.
--------------------------------------------------------- */
(function(){
  function parseDateAny(d){
    if(!d) return null;
    if(d instanceof Date) return d;
    // expected ISO "YYYY-MM-DD"
    if(typeof d === "string"){
      const m = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
      if(m){
        const y=+m[1], mo=+m[2]-1, da=+m[3];
        return new Date(y, mo, da);
      }
      const t = Date.parse(d);
      if(!Number.isNaN(t)) return new Date(t);
    }
    return null;
  }

  function fatigueScore(entries){
    try{
      const now = new Date();
      const cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate()-6); // last 7 days incl today
      const recent = (entries||[]).filter(e=>{
        const dt = parseDateAny(e.date) || parseDateAny(e.createdAt) || null;
        return dt && dt >= cutoff;
      });
      const daySet = new Set();
      let xp = 0;
      for(const e of recent){
        if(e && e.date) daySet.add(String(e.date));
        xp += Number(e.xp||0);
      }
      const days = daySet.size;
      // heuristic: training frequency + load
      //  - 5-7 days/week and/or very high XP => high fatigue
      let score = 0;
      score += days * 12;        // 0..84
      score += xp / 300;         // +0.. (depends)
      // small streak penalty if training many consecutive days
      if(days >= 5) score += 10;
      if(days >= 6) score += 10;
      if(days >= 7) score += 10;
      score = Math.max(0, Math.min(100, score));
      return Math.round(score);
    }catch(err){
      return 0;
    }
  }

  window.IronQuestCoachPlus = window.IronQuestCoachPlus || {};
  if(typeof window.IronQuestCoachPlus.fatigueScore !== "function"){
    window.IronQuestCoachPlus.fatigueScore = fatigueScore;
  }
})();

