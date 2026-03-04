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
