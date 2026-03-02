(() => {
  "use strict";

  const KEY="ironquest_rpg_v5";

  const RANKS = [
    { min:1,  name:"E-Rank Hunter" },
    { min:8,  name:"D-Rank Hunter" },
    { min:15, name:"C-Rank Hunter" },
    { min:25, name:"B-Rank Hunter" },
    { min:40, name:"A-Rank Hunter" },
    { min:60, name:"S-Rank Hunter" },
  ];

  const ACHIEVEMENTS = [
    { id:"a1", title:"Gate Opener",      desc:"10 Trainings-Einträge", goal:10 },
    { id:"a2", title:"Shadow Grinder",   desc:"50 Trainings-Einträge", goal:50 },
    { id:"a3", title:"Monarch Rising",   desc:"100 Trainings-Einträge", goal:100 },
    { id:"a4", title:"10k XP",           desc:"10.000 Total XP", goal:10000, type:"xp" },
    { id:"a5", title:"30-Day Streak",    desc:"Streak 30 Tage", goal:30, type:"streak" },
  ];

  // Simple story questline (Chapter progression)
  const STORY = [
    { id:"s1", title:"Chapter 1 — The Weakest",  desc:"Log 5 Trainingseinträge.", check:(s,c)=>c>=5, reward:300 },
    { id:"s2", title:"Chapter 2 — First Gate",   desc:"Erreiche 5.000 Total XP.",  check:(s,c)=>s.totalXp>=5000, reward:600 },
    { id:"s3", title:"Chapter 3 — Shadow Form",  desc:"Streak 10 Tage.",          check:(s,c)=>s.streak>=10, reward:800 },
    { id:"s4", title:"Chapter 4 — Monarch Path", desc:"Erreiche Level 20.",       check:(s,c)=>s.level>=20, reward:1200 },
  ];

  const DAILY_POOL = [
    { id:"d1", title:"Warm-Up Ritual",   desc:"1 Core-Übung loggen", check:(s)=>s.todayCore>=1, reward:120 },
    { id:"d2", title:"Iron Push",        desc:"1 Mehrgelenkig loggen", check:(s)=>s.todayMulti>=1, reward:150 },
    { id:"d3", title:"Shadow Pull",      desc:"Irgendein Eintrag heute", check:(s)=>s.todayAny>=1, reward:100 },
    { id:"d4", title:"Endurance Spark",  desc:"Conditioning/NEAT/Joggen loggen", check:(s)=>s.todayEnd>=1, reward:140 },
  ];

  const WEEKLY_POOL = [
    { id:"w1", title:"Dungeon Week", desc:"Diese Woche 5 Trainingstage", check:(s)=>s.weekDays>=5, reward:600 },
    { id:"w2", title:"Triple Star",  desc:"2 Tage ⭐⭐⭐ diese Woche", check:(s)=>s.weekThreeStar>=2, reward:800 },
  ];

  function load(){ try{ return JSON.parse(localStorage.getItem(KEY))||{}; }catch{ return {}; } }
  function save(st){ localStorage.setItem(KEY, JSON.stringify(st)); }

  function getRankName(level){
    const l = Number(level||1);
    let name = RANKS[0].name;
    for (const r of RANKS){ if (l>=r.min) name=r.name; }
    return name;
  }

  function ensureState(state){
    const today = window.Utils.isoDate(new Date());
    const week = window.IronQuestProgression.getWeekNumberFor(today);

    if (!state.daily || state.daily.date !== today){
      const pick = DAILY_POOL[Math.floor(Math.random()*DAILY_POOL.length)];
      state.daily = { date: today, id: pick.id, claimed:false };
    }
    if (!state.weekly || state.weekly.week !== week){
      const pick = WEEKLY_POOL[Math.floor(Math.random()*WEEKLY_POOL.length)];
      state.weekly = { week, id: pick.id, claimed:false };
    }
    if (!state.story) state.story = { idx:0, claimed:{} };
    if (!state.ach) state.ach = {};
    return state;
  }

  function summarize(entries){
    const today = window.Utils.isoDate(new Date());
    const week = window.IronQuestProgression.getWeekNumberFor(today);

    let totalXp=0;
    const dayXp = {};
    const weekDaySet = new Set();
    let todayCore=0, todayMulti=0, todayEnd=0, todayAny=0;

    for (const e of entries){
      const xp = Number(e.xp||0);
      totalXp += xp;
      if (e.date) dayXp[e.date]=(dayXp[e.date]||0)+xp;
      if (Number(e.week||0)===week && xp>0) weekDaySet.add(e.date);
      if (e.date===today && xp>0){
        todayAny++;
        if (e.type==="Core") todayCore++;
        if (e.type==="Mehrgelenkig") todayMulti++;
        if (e.type==="Conditioning" || e.type==="NEAT" || e.type==="Joggen") todayEnd++;
      }
    }

    let weekThreeStar=0;
    for (const [d,xp] of Object.entries(dayXp)){
      if (window.IronQuestProgression.getWeekNumberFor(d)!==week) continue;
      if (window.IronQuestProgression.starsForDay(xp)==="⭐⭐⭐") weekThreeStar++;
    }

    const streak = window.IronQuestXP.streakFromEntries(entries);
    const level = window.IronQuestProgression.levelFromTotalXp(totalXp).lvl;

    return {
      totalXp,
      level,
      streak,
      week,
      weekDays: weekDaySet.size,
      weekThreeStar,
      todayCore,
      todayMulti,
      todayEnd,
      todayAny
    };
  }

  async function awardQuestXP(title, xp){
    const date = window.Utils.isoDate(new Date());
    const week = window.IronQuestProgression.getWeekNumberFor(date);
    await window.IronDB.addEntry({
      date, week,
      type:"Quest",
      exercise:`Quest: ${title}`,
      detail:`Reward claimed`,
      xp: Math.round(xp||0)
    });
  }

  function updateAchievements(state, summary, entriesCount){
    for (const a of ACHIEVEMENTS){
      const cur = state.ach[a.id] || { done:false };
      if (cur.done) continue;

      let ok=false;
      if (!a.type) ok = entriesCount >= a.goal;
      if (a.type==="xp") ok = summary.totalXp >= a.goal;
      if (a.type==="streak") ok = summary.streak >= a.goal;

      if (ok){
        state.ach[a.id] = { done:true, date: window.Utils.isoDate(new Date()) };
        window.Toast?.toast("Achievement unlocked!", a.title);
      }
    }
  }

  function storyStatus(state, summary, entriesCount){
    const idx = Math.max(0, Math.min(STORY.length-1, Number(state.story?.idx||0)));
    const cur = STORY[idx];
    const done = cur ? !!cur.check(summary, entriesCount) : true;
    const claimed = !!state.story?.claimed?.[cur?.id||""];
    return { idx, cur, done, claimed, isLast: idx>=STORY.length-1 };
  }

  async function claimStory(){
    const state = ensureState(load());
    const entries = await window.IronDB.getAllEntries();
    const summary = summarize(entries);
    const ss = storyStatus(state, summary, entries.length);
    if (!ss.cur) return false;
    if (!ss.done || ss.claimed) return false;

    state.story.claimed[ss.cur.id] = true;
    await awardQuestXP(ss.cur.title, ss.cur.reward);
    window.IronQuestLoot?.addChest?.(1);
    window.Toast?.toast("Story cleared!", `${ss.cur.title} (+${ss.cur.reward} XP, +1 Chest)`);

    if (!ss.isLast) state.story.idx = ss.idx + 1;
    save(state);
    return true;
  }

  async function claimDaily(){
    const state = ensureState(load());
    const entries = await window.IronDB.getAllEntries();
    const s = summarize(entries);
    const def = DAILY_POOL.find(x=>x.id===state.daily.id);
    if (!def || state.daily.claimed || !def.check(s)) return false;
    state.daily.claimed = true;
    save(state);
    await awardQuestXP(def.title, def.reward);
    window.IronQuestLoot?.addChest?.(1);
    window.Toast?.toast("Daily claimed", `+${def.reward} XP, +1 Chest`);
    return true;
  }

  async function claimWeekly(){
    const state = ensureState(load());
    const entries = await window.IronDB.getAllEntries();
    const s = summarize(entries);
    const def = WEEKLY_POOL.find(x=>x.id===state.weekly.id);
    if (!def || state.weekly.claimed || !def.check(s)) return false;
    state.weekly.claimed = true;
    save(state);
    await awardQuestXP(def.title, def.reward);
    window.IronQuestLoot?.addChest?.(2);
    window.Toast?.toast("Weekly claimed", `+${def.reward} XP, +2 Chests`);
    return true;
  }

  async function onNewEntry(){
    const state = ensureState(load());
    const entries = await window.IronDB.getAllEntries();
    const summary = summarize(entries);
    updateAchievements(state, summary, entries.length);
    save(state);
  }

  function getState(){ return ensureState(load()); }

  window.IronQuestRPG = {
    RANKS, ACHIEVEMENTS, STORY, DAILY_POOL, WEEKLY_POOL,
    getRankName, getState, summarize, storyStatus,
    claimDaily, claimWeekly, claimStory,
    onNewEntry
  };
})();
