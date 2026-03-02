(() => {
  "use strict";

  function setActiveTab(id){
    document.querySelectorAll(".bottom-nav button").forEach(b=>b.classList.toggle("active", b.dataset.tab===id));
    document.querySelectorAll("main .tab").forEach(s=>s.classList.toggle("active", s.id===id));
  }
  function setStatus(t){
    const el=document.getElementById("statusLine");
    if(el) el.textContent=t;
  }

  async function initSW(){
    // simple inline SW registration (offline)
    // Note: sw.js in root is fetched via navigator.serviceWorker; script tag above is harmless fallback
    try{
      if(!("serviceWorker" in navigator)) return;
      const reg=await navigator.serviceWorker.register("./sw.js");
      try{ await reg.update(); }catch{}
      if(reg.waiting) reg.waiting.postMessage({type:"SKIP_WAITING"});
      reg.addEventListener("updatefound", ()=>{
        const sw=reg.installing;
        if(!sw) return;
        sw.addEventListener("statechange", ()=>{
          if(sw.state==="installed" && reg.waiting) reg.waiting.postMessage({type:"SKIP_WAITING"});
        });
      });
      navigator.serviceWorker.addEventListener("controllerchange", ()=>location.reload());
    }catch(e){ console.warn("SW error", e); }
  }

  async function addSystem(msg){
    const date=window.Utils.isoDate(new Date());
    await window.IronDB.addSystem({ date, msg });
  }

  async function renderRoute(route){
    const el=document.getElementById(route);
    if(!el) return;

    const renders={
      home: window.IronQuestHome.render,
      log: window.IronQuestLog.render,
      run: window.IronQuestRunning.renderRunning,
      stats: window.IronQuestAnalytics.renderAnalytics,
      quests: window.IronQuestChallenges.renderChallenges,
      gates: window.IronQuestGates.render,
      boss: window.IronQuestBossArena.render,
      skills: window.IronQuestSkillsScreen.render,
      review: window.IronQuestReview.render,
      health: window.IronQuestHealth.render,
      backup: window.IronQuestBackup.render
    };

    try{
      await renders[route](el);
    }catch(e){
      console.error("Render error", route, e);
      el.innerHTML = `<div class="card"><h2>Error</h2><p class="hint">${String(e)}</p></div>`;
    }
  }

  function hookEntryPipeline(){
    const orig=window.IronDB.addEntry;
    window.IronDB.addEntry = async(entry)=>{
      const before = await window.IronDB.getAllEntries();
      const totalBefore = before.reduce((s,e)=>s+Number(e.xp||0),0);
      const lvlBefore = window.IronQuestProgression.levelFromTotalXp(totalBefore).lvl;
      const rankBefore = window.IronQuestHunterRank.compute(lvlBefore, totalBefore);

      const id = await orig(entry);

      // Attributes gain
      if(entry?.type) window.IronQuestAttributes.addXP(entry.type, entry.xp||0);

      // Coach PR
      const pr=window.IronQuestCoach.updatePR(entry);
      if(pr.isNew) window.Toast?.toast("New PR!", `${entry.exercise} • Volume ${pr.best.bestVolume}`);

      // Level up detection
      const after = await window.IronDB.getAllEntries();
      const totalAfter = after.reduce((s,e)=>s+Number(e.xp||0),0);
      const lvlAfter = window.IronQuestProgression.levelFromTotalXp(totalAfter).lvl;
      const rankAfter = window.IronQuestHunterRank.compute(lvlAfter, totalAfter);

      if(lvlAfter>lvlBefore){
        await addSystem(`Level up: ${lvlBefore} → ${lvlAfter}`);
        window.IronQuestUIFX.showLevelUp(`You reached Level ${lvlAfter}.\n\nKeep going, Hunter.`);
        // Chest every 3 levels
        if(lvlAfter % 3 === 0){
          window.IronQuestLoot.addChests(1);
          await addSystem(`Milestone reward: +1 chest (Level ${lvlAfter})`);
          window.Toast?.toast("Milestone", "+1 Chest");
        }
      // Rank promotion ceremony
      if(rankAfter !== rankBefore){
        const order=["E","D","C","B","A","S"];
        if(order.indexOf(rankAfter) > order.indexOf(rankBefore)){
          await addSystem(`Rank promotion: ${rankBefore} → ${rankAfter}`);
          window.IronQuestUIFX.showPromotion(`Congratulations, Hunter.\n\nRank promoted: ${rankBefore} → ${rankAfter}\n\nNew gates await.`);
          window.Toast?.toast("RANK UP!", `${rankBefore} → ${rankAfter}`);
        }
      }

      return id;
    };
  }

  function wireNav(){
    document.querySelectorAll(".bottom-nav button").forEach(btn=>{
      btn.onclick=async()=>{
        const tab=btn.dataset.tab;
        setActiveTab(tab);
        try{ location.hash=tab; }catch{}
        await renderRoute(tab);
      };
    });

    const initial=(location.hash||"#home").replace("#","");
    const start = document.getElementById(initial) ? initial : "home";
    setActiveTab(start);
    renderRoute(start);
  }

  function wireSystemLogButton(){
    const btn=document.getElementById("btnSystemLog");
    btn.onclick=async()=>{
      const list = (await window.IronDB.getAllSystem()).sort((a,b)=> (a.date<b.date?1:-1)).slice(0,20);
      const msg = list.length ? list.map(x=>`${x.date}: ${x.msg}`).join("\n") : "No system messages yet.";
      window.IronQuestUIFX.showSystem(msg);
    };
  }

  function navigate(tab){
    setActiveTab(tab);
    try{ location.hash=tab; }catch{}
    renderRoute(tab);
  }

  async function init(){
    window.IronQuestUIFX.ensureParticles();
    setStatus("Initializing…");
    await window.IronDB.init();
    await initSW();

    hookEntryPipeline();
    wireSystemLogButton();

    // ensure default class stored
    if(!localStorage.getItem("ironquest_class_v8")) localStorage.setItem("ironquest_class_v8","none");

    wireNav();
    setStatus("OK • Hunter Ascended");
  }

  window.IronQuestApp={ navigate };
  init();
})();
