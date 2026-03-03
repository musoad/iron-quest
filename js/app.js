(() => {
  "use strict";

  // --- minimal safety stubs (prevents "silent booting" on iOS) ---
  if(!window.Utils){
    window.Utils = {
      isoDate(d=new Date()){
        const pad=n=>String(n).padStart(2,"0");
        return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
      }
    };
  }
  if(!window.IronQuestUIFX){
    window.IronQuestUIFX = {
      ensureParticles(){},
      showLevelUp(){},
      showPromotion(){},
      showLootCard(){},
      showSystem(msg){ alert(msg); },
      burst(){},
      shake(){},
    };
  }
  if(!window.Toast){
    window.Toast = { toast(){ /* no-op */ } };
  }

  function setActiveTab(id){
    document.querySelectorAll(".bottom-nav button").forEach(b=>b.classList.toggle("active", b.dataset.tab===id));
    document.querySelectorAll("main .tab, main section.tab, main > .tab").forEach(s=>s.classList.toggle("active", s.id===id));
  }
  function setStatus(t){
    const el=document.getElementById("statusLine");
    if(el) el.textContent=t;
  }

  function renderFatal(err){
    console.error(err);
    setStatus("Error • Tap ⌁ for log");
    const home = document.getElementById("home") || document.querySelector("main .tab");
    if(home){
      home.innerHTML = `
        <div class="card">
          <h2>Error</h2>
          <p class="hint">Boot failed. Open System Log (⌁) for details.</p>
          <pre class="hint" style="white-space:pre-wrap;opacity:.9">${String((err && err.stack) || err)}</pre>
          <button class="btn" id="btnRepair">Repair Cache</button>
        </div>`;
      const btn = home.querySelector("#btnRepair");
      if(btn){
        btn.onclick = async ()=>{
          try{
            if("serviceWorker" in navigator){
              const regs = await navigator.serviceWorker.getRegistrations();
              await Promise.all(regs.map(r=>r.unregister()));
            }
            if(window.caches){
              const keys = await caches.keys();
              await Promise.all(keys.map(k=>caches.delete(k)));
            }
          }catch(e){ console.warn(e); }
          location.reload();
        };
      }
    }
  }

  async function initSW(){
    try{
      if(!("serviceWorker" in navigator)) return;
      const reg=await navigator.serviceWorker.register("./sw.js");
      try{ await reg.update(); }catch{}
      // don't force reload loops; let Update Banner handle it elsewhere
      reg.addEventListener("updatefound", ()=>{
        const sw=reg.installing;
        if(!sw) return;
        sw.addEventListener("statechange", ()=>{
          // installed - app can show banner if desired
        });
      });
    }catch(e){ console.warn("SW error", e); }
  }

  async function addSystem(msg){
    try{
      const date=window.Utils.isoDate(new Date());
      await window.IronDB.addSystem({ date, msg });
    }catch{}
  }

  async function renderRoute(route){
    const el=document.getElementById(route);
    if(!el) return;

    const renders={
      home: (window.IronQuestHome && window.IronQuestHome.render),
      log: (window.IronQuestLog && window.IronQuestLog.render),
      run: (window.IronQuestRunning && window.IronQuestRunning.renderRunning),
      stats: (window.IronQuestAnalytics && window.IronQuestAnalytics.renderAnalytics),
      quests: (window.IronQuestChallenges && window.IronQuestChallenges.renderChallenges),
      gates: (window.IronQuestGates && window.IronQuestGates.render),
      boss: (window.IronQuestBossArena && window.IronQuestBossArena.render),
      skills: (window.IronQuestSkillsScreen && window.IronQuestSkillsScreen.render),
      review: (window.IronQuestReview && window.IronQuestReview.render),
      health: (window.IronQuestHealth && window.IronQuestHealth.render),
      backup: (window.IronQuestBackup && window.IronQuestBackup.render)
    };

    const fn = renders[route];
    if(typeof fn !== "function"){
      el.innerHTML = `<div class="card"><h2>${route}</h2><p class="hint">Renderer not found.</p></div>`;
      return;
    }

    try{
      await fn(el);
    }catch(e){
      console.error("Render error", route, e);
      el.innerHTML = `<div class="card"><h2>Error</h2><p class="hint">${String((e && e.message)||e)}</p><pre class="hint" style="white-space:pre-wrap">${String((e && e.stack)||"")}</pre></div>`;
    }
  }

  function wireSystemLogButton(){
    const btn=document.getElementById("btnSystemLog");
    if(!btn) return;
    btn.onclick=async()=>{
      try{
        const list = (await window.IronDB.getAllSystem()).sort((a,b)=> (a.date<b.date?1:-1)).slice(0,40);
        const msg = list.length ? list.map(x=>`${x.date}: ${x.msg}`).join("\n") : "No system messages yet.";
        window.IronQuestUIFX.showSystem(msg);
      }catch(e){
        window.IronQuestUIFX.showSystem(String((e && e.stack)||e));
      }
    };
  }

  function wireNav(){
    document.querySelectorAll(".bottom-nav button").forEach(b=>{
      b.addEventListener("click", ()=>navigate(b.dataset.tab));
    });
    const hash=(location.hash||"").replace("#","").trim();
    if(hash) navigate(hash); else navigate("home");
  }

  function navigate(tab){
    setActiveTab(tab);
    try{ location.hash=tab; }catch{}
    renderRoute(tab);
  }

  async function init(){
    setStatus("Initializing…");
    // init core services
    if(!window.IronDB || typeof window.IronDB.init !== "function"){
      throw new Error("IronDB missing. Check that js/db.js loaded correctly.");
    }
    await window.IronDB.init();
    await initSW();

    // hook pipeline only if available
    try{
      const orig=window.IronDB.addEntry;
      if(typeof orig === "function"){
        window.IronDB.addEntry = async(entry)=>{
          const before = await window.IronDB.getAllEntries();
          const totalBefore = before.reduce((s,e)=>s+Number(e.xp||0),0);
          const lvlBefore = (window.IronQuestProgression && (window.IronQuestProgression.levelFromTotalXp) && window.IronQuestProgression.levelFromTotalXp)((totalBefore) && totalBefore).lvl) ?? 0;
          const rankBefore = (window.IronQuestHunterRank && (window.IronQuestHunterRank.compute) && window.IronQuestHunterRank.compute)(lvlBefore, totalBefore) ?? "E";

          const id = await orig(entry);

          if((entry && entry.type) && (window.IronQuestAttributes && window.IronQuestAttributes.addXP)) window.IronQuestAttributes.addXP(entry.type, entry.xp||0);

          const after = await window.IronDB.getAllEntries();
          const totalAfter = after.reduce((s,e)=>s+Number(e.xp||0),0);
          const lvlAfter = (window.IronQuestProgression && (window.IronQuestProgression.levelFromTotalXp) && window.IronQuestProgression.levelFromTotalXp)((totalAfter) && totalAfter).lvl) ?? lvlBefore;
          const rankAfter = (window.IronQuestHunterRank && (window.IronQuestHunterRank.compute) && window.IronQuestHunterRank.compute)(lvlAfter, totalAfter) ?? rankBefore;

          if(lvlAfter>lvlBefore){
            await addSystem(`Level up: ${lvlBefore} → ${lvlAfter}`);
            (window.IronQuestUIFX.showLevelUp && window.IronQuestUIFX.showLevelUp(`You reached Level ${lvlAfter}.\n\nKeep going, Hunter.`);
          }
          if(rankAfter !== rankBefore){
            await addSystem(`Rank promotion: ${rankBefore} → ${rankAfter}`);
            (window.IronQuestUIFX.showPromotion && window.IronQuestUIFX.showPromotion(`Rank promoted: ${rankBefore} → ${rankAfter}`);
          }
          return id;
        };
      }
    }catch(e){
      console.warn("Pipeline hook failed", e);
    }

    wireSystemLogButton();
    wireNav();
    setStatus("OK • Hunter Ascended");
  }

  window.IronQuestApp={ navigate };
  window.addEventListener("error", (e)=>{ console.warn(e.error||e.message); });
  window.addEventListener("unhandledrejection", (e)=>{ console.warn(e.reason); });

  init().catch(renderFatal);
})();
