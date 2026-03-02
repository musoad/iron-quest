(() => {
  "use strict";

  const KEY="ironquest_rpg_v6";

  const RANKS = [
    { min:1,  name:"E-Rank Hunter" },
    { min:8,  name:"D-Rank Hunter" },
    { min:15, name:"C-Rank Hunter" },
    { min:25, name:"B-Rank Hunter" },
    { min:40, name:"A-Rank Hunter" },
    { min:60, name:"S-Rank Hunter" },
  ];

  const STORY = [
    { id:"s1", unlock:{ level:1 },  title:"The System", text:"[SYSTEM]\nA strange window appears…\n\nYou feel a pull towards training.\nYour path begins." },
    { id:"s2", unlock:{ level:8 },  title:"First Gate", text:"A low-rank Gate opens.\n\nYou realize: consistency is power." },
    { id:"s3", unlock:{ level:15 }, title:"Shadow Steps", text:"Your body adapts.\n\nThe shadows move when you move." },
    { id:"s4", unlock:{ level:25 }, title:"Hunter’s Instinct", text:"You sense weakness.\n\nYou correct form without thinking." },
    { id:"s5", unlock:{ level:40 }, title:"Awakening", text:"Your stats climb slower now…\n\nBut your will is stronger than numbers." },
  ];

  const ACHIEVEMENTS = [
    { id:"a1", title:"Gate Opener",      desc:"10 Trainings-Einträge", goal:10 },
    { id:"a2", title:"Shadow Grinder",   desc:"50 Trainings-Einträge", goal:50 },
    { id:"a3", title:"Monarch Rising",   desc:"100 Trainings-Einträge", goal:100 },
    { id:"a4", title:"10k XP",           desc:"10.000 Total XP", goal:10000, type:"xp" },
    { id:"a5", title:"30-Day Streak",    desc:"Streak 30 Tage", goal:30, type:"streak" },
  ];

  const DAILY_POOL = [
    { id:"d1", title:"Warm-Up Ritual",   desc:"1 Core-Übung loggen", check:(s)=>s.todayCore>=1, reward:140 },
    { id:"d2", title:"Iron Push",        desc:"1 Mehrgelenkig loggen", check:(s)=>s.todayMulti>=1, reward:160 },
    { id:"d3", title:"Shadow Pull",      desc:"1 Pull-Entry loggen", check:(s)=>s.todayAny>=1, reward:120 },
    { id:"d4", title:"Endurance Spark",  desc:"Conditioning/NEAT/Run loggen", check:(s)=>s.todayEnd>=1, reward:160 },
  ];

  const WEEKLY_POOL = [
    { id:"w1", title:"Dungeon Week", desc:"In dieser Woche 5 Trainingstage", check:(s)=>s.weekDays>=5, reward:700, chest:1 },
    { id:"w2", title:"Triple Star",  desc:"2 Tage ⭐⭐⭐ diese Woche", check:(s)=>s.weekThreeStar>=2, reward:900, chest:1 },
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
    if (!state.story) state.story = { unlocked:{} };
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

    return {
      totalXp,
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

  async function awardXP(title, xp, type="Quest"){
    const date = window.Utils.isoDate(new Date());
    const week = window.IronQuestProgression.getWeekNumberFor(date);
    await window.IronDB.addEntry({
      date, week,
      type,
      exercise:`${type}: ${title}`,
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
        window.UIEffects?.systemMessage([`Achievement unlocked:`, a.title]);
        // bonus chest on big milestones
        if (a.id==="a3") window.IronQuestLoot?.addChest?.(1);
      }
    }
  }

  function unlockStory(state, level){
    for (const s of STORY){
      const need = s.unlock?.level || 1;
      if (Number(level||1) >= need){
        if (!state.story.unlocked[s.id]){
          state.story.unlocked[s.id] = window.Utils.isoDate(new Date());
          window.UIEffects?.systemMessage([`Story unlocked:`, s.title]);
        }
      }
    }
  }

  async function onProgressChanged(level){
    const state = ensureState(load());
    const entries = await window.IronDB.getAllEntries();
    const summary = summarize(entries);
    updateAchievements(state, summary, entries.length);
    unlockStory(state, level);
    save(state);
  }

  async function claimDaily(){
    const state = ensureState(load());
    const entries = await window.IronDB.getAllEntries();
    const s = summarize(entries);
    const def = DAILY_POOL.find(x=>x.id===state.daily.id);
    if (!def || state.daily.claimed || !def.check(s)) return false;
    state.daily.claimed = true; save(state);
    await awardXP(def.title, def.reward, "Quest");
    window.Toast?.toast("Daily Quest claimed", `+${def.reward} XP`);
    return true;
  }

  async function claimWeekly(){
    const state = ensureState(load());
    const entries = await window.IronDB.getAllEntries();
    const s = summarize(entries);
    const def = WEEKLY_POOL.find(x=>x.id===state.weekly.id);
    if (!def || state.weekly.claimed || !def.check(s)) return false;
    state.weekly.claimed = true; save(state);
    await awardXP(def.title, def.reward, "Quest");
    if (def.chest) window.IronQuestLoot?.addChest?.(def.chest);
    window.Toast?.toast("Weekly Quest claimed", `+${def.reward} XP`);
    return true;
  }

  function getState(){
    return ensureState(load());
  }

  function getStoryUnlocked(){
    const st = ensureState(load());
    return STORY.filter(s=>st.story?.unlocked?.[s.id]);
  }

  window.IronQuestRPG = {
    RANKS, STORY, ACHIEVEMENTS, DAILY_POOL, WEEKLY_POOL,
    getRankName, getState, summarize,
    claimDaily, claimWeekly,
    onProgressChanged,
    getStoryUnlocked
  };
})();
