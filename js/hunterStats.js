(() => {
  "use strict";

  // Hunter stats derived from your logs.
  // Goal: feels "round" and logical without adding extra manual steps.
  //
  // Mapping philosophy:
  // - Mehrgelenkig  -> STR
  // - Unilateral    -> AGI
  // - Core          -> END
  // - Conditioning / NEAT / Jogging -> END (+ small AGI)
  // - Komplexe      -> INT
  // - Consistency (days logged) -> LCK
  // - Everything else -> PER

  const ORDER = ["STR","END","AGI","INT","PER","LCK"];
  const LABELS = {
    STR: "Strength",
    END: "Endurance",
    AGI: "Agility",
    INT: "Intellect",
    PER: "Perception",
    LCK: "Luck",
  };

  function xpNeed(level){
    const L = Math.max(1, Number(level||1));
    // slow RPG curve
    return Math.round(180 + 70*L + 26*(L**1.55));
  }

  function levelFromXp(totalXp){
    let lvl = 1;
    let xp = Math.max(0, Number(totalXp||0));
    while(xp >= xpNeed(lvl)){
      xp -= xpNeed(lvl);
      lvl += 1;
      if(lvl > 999) break;
    }
    return { level: lvl, remainder: xp, nextNeed: xpNeed(lvl) };
  }

  function iso(d){
    try{ return window.Utils?.isoDate?.(d) || d.toISOString().slice(0,10); }catch{ return ""; }
  }

  function mapTypeToStats(type){
    const t = String(type||"").toLowerCase();
    if(t.includes("mehrgelenk")) return { STR: 1 };
    if(t.includes("unilateral")) return { AGI: 1 };
    if(t.includes("core")) return { END: 1 };
    if(t.includes("condition")) return { END: 0.85, AGI: 0.15 };
    if(t.includes("neat")) return { END: 0.8, PER: 0.2 };
    if(t.includes("jog") || t.includes("run")) return { END: 0.75, AGI: 0.25 };
    if(t.includes("komplex")) return { INT: 1 };
    if(!t) return { PER: 1 };
    return { PER: 1 };
  }

  async function compute(){
    const base = { STR:0, END:0, AGI:0, INT:0, PER:0, LCK:0 };
    let entries = [];
    try{ entries = await window.IronDB.getAllEntries(); }catch{ entries = []; }

    // XP from entries -> stats
    for(const e of entries){
      const xp = Math.max(0, Number(e.xp||0));
      if(!xp) continue;
      const weights = mapTypeToStats(e.type);
      for(const k of Object.keys(weights)){
        base[k] += xp * Number(weights[k]||0);
      }
    }

    // Consistency -> Luck
    const days = new Set(entries.map(e=>String(e.date||"").slice(0,10)).filter(Boolean));
    base.LCK += days.size * 65; // ~1 LCK level per few consistent days

    const stats = {};
    for(const k of ORDER){
      stats[k] = levelFromXp(base[k]);
    }
    return {
      order: ORDER.slice(),
      labels: Object.assign({}, LABELS),
      totalsXp: base,
      stats,
      daysLogged: days.size,
      lastUpdated: iso(new Date()),
    };
  }

  // Simple memoization so Home can render instantly.
  let _cache = null;
  let _cacheAt = 0;
  async function getSnapshot(){
    const now = Date.now();
    if(_cache && (now - _cacheAt) < 1200) return _cache;
    _cache = await compute();
    _cacheAt = now;
    return _cache;
  }

  window.IronQuestHunterStats = { getSnapshot, xpNeed, levelFromXp };
})();
