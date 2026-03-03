(() => {
  "use strict";

  // Hunter rank depends on level + total xp + clears.
  // Stored stats track clears.
  const KEY = "ironquest_rank_v9";

  const RANKS = [
    { key: "E", name: "E-Rank Hunter", color: "rankE" },
    { key: "D", name: "D-Rank Hunter", color: "rankD" },
    { key: "C", name: "C-Rank Hunter", color: "rankC" },
    { key: "B", name: "B-Rank Hunter", color: "rankB" },
    { key: "A", name: "A-Rank Hunter", color: "rankA" },
    { key: "S", name: "S-Rank Hunter", color: "rankS" },
    { key: "SS", name: "SS-Rank Hunter", color: "rankSS" },
    { key: "SSS", name: "SSS-Rank Hunter", color: "rankSSS" },
    { key: "MONARCH", name: "Shadow Monarch", color: "rankM" },
  ];

  function load(){
    try {
      return JSON.parse(localStorage.getItem(KEY)) || { gatesCleared: 0, bossClears: 0 };
    } catch {
      return { gatesCleared: 0, bossClears: 0 };
    }
  }
  function save(st){ localStorage.setItem(KEY, JSON.stringify(st)); }

  function compute(level, totalXp){
    const st = load();
    const gates = Number(st.gatesCleared || 0);
    const boss  = Number(st.bossClears || 0);
    const xp    = Number(totalXp || 0);

    // Long-term ranks (tuned for 50/50 RPG+Fitness)
    if (level >= 85 && xp >= 140000 && gates >= 30 && boss >= 18) return "MONARCH";
    if (level >= 75 && xp >= 100000 && gates >= 24 && boss >= 14) return "SSS";
    if (level >= 65 && xp >= 70000  && gates >= 18 && boss >= 10) return "SS";

    if (level >= 55 && xp >= 45000 && gates >= 12 && boss >= 6) return "S";
    if (level >= 40 && xp >= 25000 && gates >= 7) return "A";
    if (level >= 25 && (xp >= 15000 || (gates >= 5 && boss >= 3))) return "B";
    if (level >= 15 && gates >= 3) return "C";
    if (level >= 10) return "D";
    return "E";
  }

  function recordGateClear(){ const st = load(); st.gatesCleared = (st.gatesCleared||0) + 1; save(st); }
  function recordBossClear(){ const st = load(); st.bossClears  = (st.bossClears||0) + 1; save(st); }
  function getStats(){ return load(); }
  function getMeta(rankKey){ return RANKS.find(r => r.key === rankKey) || RANKS[0]; }

  // Simple inline SVG emblems (offline friendly). Colors come from CSS via currentColor.
  function getEmblemSVG(rankKey){
    const key = String(rankKey || "E").toUpperCase();
    const base = `viewBox="0 0 64 64" width="36" height="36" aria-hidden="true" focusable="false"`;

    // Crown/diamond variants by tier
    if (key === "MONARCH"){
      return `<svg ${base}><path fill="currentColor" d="M32 6l8 14 16 4-12 12 2 18-14-8-14 8 2-18-12-12 16-4z"/><path fill="rgba(255,255,255,.18)" d="M32 14l5 9 10 3-7 7 1 10-9-5-9 5 1-10-7-7 10-3z"/></svg>`;
    }
    if (key === "SSS"){
      return `<svg ${base}><path fill="currentColor" d="M32 6l14 10-6 16 6 16-14 10-14-10 6-16-6-16z"/><circle cx="32" cy="32" r="10" fill="rgba(255,255,255,.16)"/></svg>`;
    }
    if (key === "SS"){
      return `<svg ${base}><path fill="currentColor" d="M32 8l18 14-7 22H21l-7-22z"/><path fill="rgba(255,255,255,.18)" d="M32 16l10 8-4 12H26l-4-12z"/></svg>`;
    }
    if (key === "S"){
      return `<svg ${base}><path fill="currentColor" d="M32 10l16 12-6 20H22l-6-20z"/></svg>`;
    }
    if (key === "A"){
      return `<svg ${base}><path fill="currentColor" d="M32 10l16 12-16 32-16-32z"/></svg>`;
    }
    if (key === "B"){
      return `<svg ${base}><path fill="currentColor" d="M32 12l18 10-18 30-18-30z"/></svg>`;
    }
    if (key === "C"){
      return `<svg ${base}><path fill="currentColor" d="M32 12l14 12-14 28-14-28z"/></svg>`;
    }
    if (key === "D"){
      return `<svg ${base}><path fill="currentColor" d="M32 14l12 10-12 26-12-26z"/></svg>`;
    }
    return `<svg ${base}><path fill="currentColor" d="M32 16l10 8-10 24-10-24z"/></svg>`;
  }

  window.IronQuestHunterRank = {
    compute,
    recordGateClear,
    recordBossClear,
    getStats,
    getMeta,
    getEmblemSVG,
    RANKS,
  };
})();
