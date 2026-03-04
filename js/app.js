(() => {
  "use strict";

  function $(sel, root){ return (root||document).querySelector(sel); }
  function $all(sel, root){ return Array.from((root||document).querySelectorAll(sel)); }

  function setStatus(text){
    const el = document.getElementById("statusLine");
    if(el) el.textContent = text;
  }

  // Compatibility shims: prevents crashes if a module failed to load (common on iOS after SW/cache changes).
  function ensureCoreAPIs(){
    // Plans
    if(!window.IronQuestPlans) window.IronQuestPlans = {};
    if(typeof window.IronQuestPlans.getState !== "function"){
      window.IronQuestPlans.getState = ()=>({ activeId:"planA", plans:[{id:"planA", name:"Plan A", items:[]}] });
    }
    if(typeof window.IronQuestPlans.getActive !== "function"){
      window.IronQuestPlans.getActive = ()=>{
        const st = window.IronQuestPlans.getState();
        const plans = st && st.plans ? st.plans : [];
        return plans.find(p=>p.id===st.activeId) || plans[0] || { id:"planA", name:"Plan A", items:[] };
      };
    }

    // Equipment
    if(!window.IronQuestEquipment) window.IronQuestEquipment = {};
    if(typeof window.IronQuestEquipment.getState !== "function"){
      window.IronQuestEquipment.getState = ()=>({ owned:[], equipped:{}, slots:["weapon","armor","ring","boots"] });
    }
    if(typeof window.IronQuestEquipment.load !== "function") window.IronQuestEquipment.load = window.IronQuestEquipment.getState;
    if(typeof window.IronQuestEquipment.bonuses !== "function"){
      window.IronQuestEquipment.bonuses = ()=>({ globalXp:1, gateDmg:1, xpPct:0, gatePct:0, setBonuses:[] });
    }
    if(typeof window.IronQuestEquipment.activeBonuses !== "function") window.IronQuestEquipment.activeBonuses = window.IronQuestEquipment.bonuses;
    if(typeof window.IronQuestEquipment.equippedNames !== "function"){
      window.IronQuestEquipment.equippedNames = ()=>Object.values(window.IronQuestEquipment.getState().equipped||{}).filter(Boolean).map(x=>String(x.name||x.id||"Item"));
    }

    // Skilltree V2
    if(!window.IronQuestSkilltreeV2) window.IronQuestSkilltreeV2 = {};
    if(typeof window.IronQuestSkilltreeV2.load !== "function") window.IronQuestSkilltreeV2.load = ()=>({ points:{}, types:["MULTI","UNI","CORE","END"] });
    if(typeof window.IronQuestSkilltreeV2.save !== "function") window.IronQuestSkilltreeV2.save = ()=>{};
  }


  // Compatibility shims: prevents crashes if a module failed to load (common on iOS after SW/cache changes).
  function ensureCoreAPIs(){
    // Plans
    if(!window.IronQuestPlans) window.IronQuestPlans = {};
    if(typeof window.IronQuestPlans.getState !== "function"){
      window.IronQuestPlans.getState = ()=>({ activeId:"planA", plans:[{id:"planA", name:"Plan A", items:[]}] });
    }
    if(typeof window.IronQuestPlans.getActive !== "function"){
      window.IronQuestPlans.getActive = ()=>{
        const st = window.IronQuestPlans.getState();
        const plans = st && st.plans ? st.plans : [];
        return plans.find(p=>p.id===st.activeId) || plans[0] || { id:"planA", name:"Plan A", items:[] };
      };
    }

    // Equipment
    if(!window.IronQuestEquipment) window.IronQuestEquipment = {};
    if(typeof window.IronQuestEquipment.getState !== "function"){
      window.IronQuestEquipment.getState = ()=>({ owned:[], equipped:{}, slots:["weapon","armor","ring","boots"] });
    }
    if(typeof window.IronQuestEquipment.load !== "function") window.IronQuestEquipment.load = window.IronQuestEquipment.getState;
    if(typeof window.IronQuestEquipment.bonuses !== "function"){
      window.IronQuestEquipment.bonuses = ()=>({ globalXp:1, gateDmg:1, xpPct:0, gatePct:0, setBonuses:[] });
    }
    if(typeof window.IronQuestEquipment.activeBonuses !== "function") window.IronQuestEquipment.activeBonuses = window.IronQuestEquipment.bonuses;
    if(typeof window.IronQuestEquipment.equippedNames !== "function"){
      window.IronQuestEquipment.equippedNames = ()=>Object.values(window.IronQuestEquipment.getState().equipped||{}).filter(Boolean).map(x=>String(x.name||x.id||"Item"));
    }

    // Skilltree V2
    if(!window.IronQuestSkilltreeV2) window.IronQuestSkilltreeV2 = {};
    if(typeof window.IronQuestSkilltreeV2.load !== "function") window.IronQuestSkilltreeV2.load = ()=>({ points:{}, types:["MULTI","UNI","CORE","END"] });
    if(typeof window.IronQuestSkilltreeV2.save !== "function") window.IronQuestSkilltreeV2.save = ()=>{};
  }

  async function initServiceWorker(){
    try{
      if(!("serviceWorker" in navigator)) return;
      const reg = await navigator.serviceWorker.register("./sw.js");
      try{ await reg.update(); }catch(_){}
      // Update banner (shows when SW is waiting)
      try{
        const banner=document.getElementById("updateBanner");
        const btn=document.getElementById("btnUpdateReload");
        function showBanner(){
          if(!banner) return;
          banner.style.display="flex";
          if(btn){
            btn.onclick=function(){
              try{
                if(reg && reg.waiting) reg.waiting.postMessage({ type:"SKIP_WAITING" });
              }catch(_){}
              setTimeout(function(){ location.reload(); }, 250);
            };
          }
        }
        if(reg && reg.waiting) showBanner();
        reg.addEventListener("updatefound", function(){
          const sw=reg.installing;
          if(!sw) return;
          sw.addEventListener("statechange", function(){
            if(sw.state === "installed" && navigator.serviceWorker.controller){
              showBanner();
            }
          });
        });
        navigator.serviceWorker.addEventListener("controllerchange", function(){
          // new SW took control
        });
      }catch(_){}
      return reg;
    }catch(e){
      console.warn("SW register failed", e);
    }
  }

  function setActiveTab(tabId){
    $all(".bottom-nav button").forEach(b=>{
      b.classList.toggle("active", b.dataset.tab === tabId);
    });
    $all("main .tab").forEach(s=>{
      s.classList.toggle("active", s.id === tabId);
    });
  }

  async function renderRoute(tabId){
    const el = document.getElementById(tabId);
    if(!el) return;

    const renders = {
      home: window.IronQuestHome && window.IronQuestHome.render,
      log: window.IronQuestLog && window.IronQuestLog.render,
      run: window.IronQuestRunning && window.IronQuestRunning.renderRunning,
      stats: window.IronQuestAnalytics && window.IronQuestAnalytics.renderAnalytics,
      quests: window.IronQuestChallenges && window.IronQuestChallenges.renderChallenges,
      gates: window.IronQuestGates && window.IronQuestGates.render,
      boss: window.IronQuestBossArena && window.IronQuestBossArena.render,
      skills: window.IronQuestSkillsScreen && window.IronQuestSkillsScreen.render,
      review: window.IronQuestReview && window.IronQuestReview.render,
      health: window.IronQuestHealth && window.IronQuestHealth.render,
      backup: window.IronQuestBackup && window.IronQuestBackup.render
    };

    const fn = renders[tabId];
    if(typeof fn !== "function"){
      el.innerHTML = `<div class="card"><h2>${tabId}</h2><p class="hint">Renderer not found.</p></div>`;
      return;
    }

    try{
      await fn(el);
    }catch(e){
      console.error("Render error", tabId, e);
      el.innerHTML = `<div class="card"><h2>Error</h2><p class="hint">${String(e && e.message || e)}</p><pre class="hint" style="white-space:pre-wrap">${String(e && e.stack || "")}</pre></div>`;
    }
  }

  function navigate(tabId){
    setActiveTab(tabId);
    try{ location.hash = tabId; }catch(_){}
    renderRoute(tabId);
  }

  function wireNav(){
    $all(".bottom-nav button").forEach(b=>{
      b.addEventListener("click", ()=>navigate(b.dataset.tab));
    });
    const initial = (location.hash || "").replace("#","").trim() || "home";
    navigate(initial);
  }

  async function boot(){
    setStatus("Initializing…");
    ensureCoreAPIs();


    if(!window.IronDB || typeof window.IronDB.init !== "function"){
      throw new Error("IronDB missing. js/db.js not loaded.");
    }
    await window.IronDB.init();

    // hook XP pipeline (safe)
    try{
      const origAdd = window.IronDB.addEntry;
      if(typeof origAdd === "function"){
        window.IronDB.addEntry = async (entry)=>{
          const before = await window.IronDB.getAllEntries();
          const totalBefore = before.reduce((s,e)=>s + Number(e.xp||0), 0);

          const lvlBefore = (window.IronQuestProgression && window.IronQuestProgression.levelFromTotalXp)
            ? (window.IronQuestProgression.levelFromTotalXp(totalBefore).lvl || 0)
            : 0;

          const rankBefore = (window.IronQuestHunterRank && window.IronQuestHunterRank.compute)
            ? window.IronQuestHunterRank.compute(lvlBefore, totalBefore)
            : "E";

          const id = await origAdd(entry);

          if(entry && entry.type && window.IronQuestAttributes && window.IronQuestAttributes.addXP){
            window.IronQuestAttributes.addXP(entry.type, Number(entry.xp||0));
          }

          const after = await window.IronDB.getAllEntries();
          const totalAfter = after.reduce((s,e)=>s + Number(e.xp||0), 0);

          const lvlAfter = (window.IronQuestProgression && window.IronQuestProgression.levelFromTotalXp)
            ? (window.IronQuestProgression.levelFromTotalXp(totalAfter).lvl || lvlBefore)
            : lvlBefore;

          const rankAfter = (window.IronQuestHunterRank && window.IronQuestHunterRank.compute)
            ? window.IronQuestHunterRank.compute(lvlAfter, totalAfter)
            : rankBefore;

          if(lvlAfter > lvlBefore && window.IronQuestUIFX && window.IronQuestUIFX.showLevelUp){
            window.IronQuestUIFX.showLevelUp(`You reached Level ${lvlAfter}.`);
          }
          if(rankAfter !== rankBefore && window.IronQuestUIFX && window.IronQuestUIFX.showPromotion){
            window.IronQuestUIFX.showPromotion(`Rank promoted: ${rankBefore} → ${rankAfter}`);
          }

          return id;
        };
      }
    }catch(e){
      console.warn("Pipeline hook failed", e);
    }

    await initServiceWorker();

    // system log button
    const sysBtn = document.getElementById("btnSystemLog");
    if(sysBtn){
      sysBtn.onclick = async ()=>{
        try{
          const list = await window.IronDB.getAllSystem();
          const recent = (list||[]).slice(-40).reverse();
          const msg = recent.length ? recent.map(x=>`${x.date}: ${x.msg}`).join("\n") : "No system messages yet.";
          if(window.IronQuestUIFX && window.IronQuestUIFX.showSystem) window.IronQuestUIFX.showSystem(msg);
          else alert(msg);
        }catch(e){
          alert(String(e && e.stack || e));
        }
      };
    }

    wireNav();
    setStatus("OK • Hunter Ascended");
  }

  window.IronQuestApp = { navigate };

  boot().catch((err)=>{
    console.error(err);
    setStatus("Error • Tap ⌁");
    const home = document.getElementById("home");
    if(home){
      home.innerHTML = `<div class="card"><h2>Boot failed</h2><p class="hint">${String(err && err.message || err)}</p><pre class="hint" style="white-space:pre-wrap">${String(err && err.stack || "")}</pre></div>`;
    }
  });
})();
