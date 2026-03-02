(() => {
  "use strict";

  function setActiveTab(tabId){
    document.querySelectorAll("nav button").forEach(b=>{
      b.classList.toggle("active", b.dataset.tab===tabId);
    });
    document.querySelectorAll("main .tab").forEach(sec=>{
      sec.classList.toggle("active", sec.id===tabId);
    });
  }

  function setStatus(text){
    const el=document.getElementById("statusLine");
    if(el) el.textContent=text;
  }

  async function initServiceWorker(){
    try{
      if(!("serviceWorker" in navigator)) return;
      const reg = await navigator.serviceWorker.register("./sw.js");
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
    }catch(e){
      console.warn("SW error", e);
    }
  }

  async function renderRoute(route){
    const el=document.getElementById(route);
    if(!el) return;

    await window.IronDB.init();

    const modules = {
      dashboard: async(c)=> window.IronQuestAnalytics.renderDashboard(c),
      log: async(c)=> window.IronQuestAnalytics.renderLog(c),
      jogging: async(c)=> window.IronQuestRunning.renderRunning(c),
      skills: async(c)=> window.IronQuestSkilltree.renderSkilltree(c),
      analytics: async(c)=> window.IronQuestAnalytics.renderAnalytics(c),
      health: async(c)=> window.IronQuestHealth.renderHealth(c),
      boss: async(c)=> window.IronQuestBoss.renderBoss(c),
      challenge: async(c)=> window.IronQuestChallenges.renderChallenges(c),
      backup: async(c)=> window.IronQuestBackup.renderBackup(c),
    };

    try{
      const fn = modules[route];
      if(!fn) return (el.innerHTML=`<div class="card"><h2>${route}</h2><p class="hint">Route fehlt</p></div>`);
      await fn(el);
    }catch(e){
      console.error("Render error", route, e);
      el.innerHTML=`<div class="card"><h2>Error</h2><p class="hint">${String(e)}</p></div>`;
    }
  }

  function wireTabs(){
    document.querySelectorAll("nav button").forEach(btn=>{
      btn.onclick=async()=>{
        const tab=btn.dataset.tab;
        setActiveTab(tab);
        try{ location.hash=tab; }catch{}
        await renderRoute(tab);
      };
    });

    const initial=(location.hash||"#dashboard").replace("#","");
    const tabExists=document.getElementById(initial);
    const startTab=tabExists?initial:"dashboard";
    setActiveTab(startTab);
    renderRoute(startTab);
  }

  async function hookCore(){
    // Hook: every entry updates attributes + rpg tracker
    const orig = window.IronDB.addEntry;
    window.IronDB.addEntry = async(entry)=>{
      const id = await orig(entry);

      // Attribute leveling (ignore Quest/Boss? they are fine, but only mapped types are used)
      window.IronQuestAttributes?.addXPForEntry?.(entry);

      // RPG
      await window.IronQuestRPG?.onNewEntry?.();

      return id;
    };
  }

  async function init(){
    setStatus("Boot…");
    await initServiceWorker();
    await window.IronDB.init();
    await hookCore();

    // Ensure RPG/loot/session state exists
    window.IronQuestRPG.getState();
    window.IronQuestLoot.getState();
    window.IronQuestSession.getState();

    setStatus("OK • Solo-Levelling Mode");
    wireTabs();
  }

  init();
})();
