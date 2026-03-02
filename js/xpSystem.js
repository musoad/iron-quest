(() => {
  "use strict";
  const BASE_XP={
    Mehrgelenkig:180,
    Unilateral:200,
    Core:140,
    Conditioning:240,
    Komplexe:260,
    NEAT:80
  };

  function dayXpMap(entries){
    const m={};
    for(const e of entries){
      if(!e?.date) continue;
      m[e.date]=(m[e.date]||0)+Number(e.xp||0);
    }
    return m;
  }

  function streak(entries){
    const map=dayXpMap(entries);
    let s=0;
    let d=new Date(window.Utils.isoDate(new Date()));
    while(true){
      const iso=window.Utils.isoDate(d);
      if((map[iso]||0)>0){ s++; d=window.Utils.addDays(d,-1); }
      else break;
      if(s>365) break;
    }
    return s;
  }
  function streakMult(s){ return 1 + Math.min(0.20, Number(s||0)*0.02); }

  function clamp(n,a,b){ return Math.max(a, Math.min(b,n)); }

  function volumeMult(sets,reps,recSets,recReps){
    const a=Math.max(1, Number(sets||0)*Number(reps||0));
    const r=Math.max(1, Number(recSets||1)*Number(recReps||1));
    const ratio=a/r;
    if(ratio>=1.25) return 1.10;
    if(ratio>=1.00) return 1.00;
    if(ratio>=0.80) return 0.90;
    return 0.80;
  }

  function calcExerciseXP({type, recSets, recReps, sets, reps, entries, buffs}){
    const base=BASE_XP[type]||0;
    let xp = base * Math.max(1, Number(sets||0));
    const repFactor = clamp((Number(reps||0)/Math.max(1,Number(recReps||1))), 0.5, 1.4);
    xp *= repFactor;
    xp *= volumeMult(sets,reps,recSets,recReps);

    const s = streak(entries||[]);
    xp *= streakMult(s);

    // skilltree passive
    xp *= window.IronQuestSkilltreeV2?.passiveMultiplier?.(type) || 1;

    // class bonus
    xp *= window.IronQuestClasses?.multiplierForType?.(type) || 1;

    // active buffs (session scoped)
    if(buffs?.globalXp) xp *= buffs.globalXp;
    if(type==="Core" && buffs?.coreXp) xp *= buffs.coreXp;

    return Math.round(xp);
  }

  window.IronQuestXP={ BASE_XP, streak, calcExerciseXP };
})();
