(() => {
  "use strict";
  // Rank depends on level + achievements (gates cleared / boss clears / total xp)
  const KEY="ironquest_rank_v8";
  const RANKS=[
    { key:"E", name:"E-Rank Hunter", color:"ok" },
    { key:"D", name:"D-Rank Hunter", color:"ok" },
    { key:"C", name:"C-Rank Hunter", color:"gold" },
    { key:"B", name:"B-Rank Hunter", color:"gold" },
    { key:"A", name:"A-Rank Hunter", color:"gold" },
    { key:"S", name:"S-Rank Hunter", color:"gold" },
  ];
  function load(){ try{ return JSON.parse(localStorage.getItem(KEY))||{ gatesCleared:0, bossClears:0 }; }catch{ return { gatesCleared:0, bossClears:0 }; } }
  function save(st){ localStorage.setItem(KEY, JSON.stringify(st)); }

  function compute(level, totalXp){
    const st=load();
    const gates=Number(st.gatesCleared||0);
    const boss=Number(st.bossClears||0);
    const xp=Number(totalXp||0);

    // Requirements (simple but meaningful)
    if(level>=60 && xp>=50000 && gates>=10) return "S";
    if(level>=40 && xp>=25000 && gates>=7) return "A";
    if(level>=25 && (xp>=15000 || (gates>=5 && boss>=3))) return "B";
    if(level>=15 && gates>=3) return "C";
    if(level>=10) return "D";
    return "E";
  }

  function recordGateClear(){ const st=load(); st.gatesCleared=(st.gatesCleared||0)+1; save(st); }
  function recordBossClear(){ const st=load(); st.bossClears=(st.bossClears||0)+1; save(st); }
  function getStats(){ return load(); }
  function getMeta(rankKey){ return RANKS.find(r=>r.key===rankKey) || RANKS[0]; }

  window.IronQuestHunterRank={ compute, recordGateClear, recordBossClear, getStats, getMeta, RANKS };
})();
