(() => {
  "use strict";

  function $(sel, root){ return (root||document).querySelector(sel); }
  function $all(sel, root){ return Array.from((root||document).querySelectorAll(sel)); }

  function escapeHtml(s){
    return String(s||"")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;");
  }

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
      // dataset.tab exists only on primary buttons
      b.classList.toggle("active", b.dataset && b.dataset.tab === tabId);
    });
    const moreBtn = document.getElementById("btnMore");
    if(moreBtn){
      const primary = new Set(["home","log","run","stats"]);
      moreBtn.classList.toggle("active", !primary.has(tabId));
    }
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
      history: window.IronQuestHistory && window.IronQuestHistory.render,
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

  // Small public navigation API so modules (Home quick actions etc.) can jump without tight coupling.
  window.IronQuestNav = {
    go: navigate,
    render: renderRoute,
    setActiveTab
  };

  // Intent bus for 1-tap flows (e.g., Home → prefilled Log)
  if(!window.IronQuestIntent) window.IronQuestIntent = {};

  function wireNav(){
    $all(".bottom-nav button").forEach(b=>{
      if(b.dataset && b.dataset.tab){
        b.addEventListener("click", ()=>navigate(b.dataset.tab));
      }
    });

    // "More" sheet (keeps app intuitive on iPhone while preserving all tabs)
    const btnMore = document.getElementById("btnMore");
    if(btnMore){
      btnMore.addEventListener("click", ()=>openMoreSheet());
    }

    // Global Quick-Add FAB (less clicks from anywhere)
    const fab = document.getElementById("fabGlobal");
    if(fab){
      fab.addEventListener("click", ()=>openFabSheet());
    }

    const initial = (location.hash || "").replace("#","").trim() || "home";
    navigate(initial);
  }

  // --- Quick Add sheet (global) ---
  const FAV_KEY = "iq_fav_ex";
  function getFavs(){
    try{ return JSON.parse(localStorage.getItem(FAV_KEY)||"[]") || []; }catch(_){ return []; }
  }
  function ensureFabSheet(){
    if(document.getElementById("fabSheet")) return;
    const o=document.createElement("div");
    o.id="fabSheet";
    o.className="fabSheet";
    o.innerHTML = `
      <div class="fabDim" data-close="1"></div>
      <div class="fabCard">
        <div class="fabHdr">
          <div class="fabTitle">Quick Add</div>
          <button class="iconBtn" data-close="1">✕</button>
        </div>
        <div class="fabBody">
          <div class="miniHint">1 Tap → Log ist vorausgewählt & ready.</div>

          <div class="chipHdr"><div class="t">Favorites</div></div>
          <div class="chipRow" id="fabFavRow"></div>

          <div class="chipHdr" style="margin-top:10px;"><div class="t">Recent</div></div>
          <div class="chipRow" id="fabRecentRow"></div>

          <div class="chipHdr" style="margin-top:12px;"><div class="t">Actions</div></div>
          <div class="fabGrid" id="fabGrid"></div>
        </div>
      </div>
    `;
    document.body.appendChild(o);
    o.querySelectorAll("[data-close]").forEach(x=>x.addEventListener("click", ()=>closeFabSheet()));
  }

  async function getRecentExercises(limit=10){
    try{
      const entries = await window.IronDB.getAllEntries();
      // newest first
      entries.sort((a,b)=> (a.date<b.date?1:-1));
      const seen = new Set();
      const out = [];
      for(const e of entries){
        const name = String(e.exercise||"").trim();
        if(!name) continue;
        if(seen.has(name)) continue;
        seen.add(name);
        out.push(name);
        if(out.length>=limit) break;
      }
      return out;
    }catch(_){ return []; }
  }

  function toLogWithExercise(exName){
    window.IronQuestIntent = window.IronQuestIntent || {};
    window.IronQuestIntent.log = { exercise: exName, date: window.Utils.isoDate(new Date()) };
    closeFabSheet();
    navigate("log");
  }

  async function openFabSheet(){
    ensureFabSheet();
    const o=document.getElementById("fabSheet");
    if(!o) return;

    const favRow=document.getElementById("fabFavRow");
    const recentRow=document.getElementById("fabRecentRow");
    const grid=document.getElementById("fabGrid");

    const favs = getFavs();
    const recent = await getRecentExercises(10);

    if(favRow){
      favRow.innerHTML = favs.length ? favs.map(n=>`<button class="chip star" data-ex="${escapeHtml(n)}">⭐ ${escapeHtml(n)}</button>`).join("")
                                  : `<div class="miniHint">No favorites yet. Star exercises in Log.</div>`;
      favRow.querySelectorAll("[data-ex]").forEach(b=>b.addEventListener("click", ()=>toLogWithExercise(b.getAttribute("data-ex"))));
    }
    if(recentRow){
      recentRow.innerHTML = recent.length ? recent.map(n=>`<button class="chip" data-ex="${escapeHtml(n)}">${escapeHtml(n)}</button>`).join("")
                                     : `<div class="miniHint">No recent logs yet.</div>`;
      recentRow.querySelectorAll("[data-ex]").forEach(b=>b.addEventListener("click", ()=>toLogWithExercise(b.getAttribute("data-ex"))));
    }

    if(grid){
      const actions = [
        { tab:"log", label:"Log", icon:"➕" },
        { tab:"run", label:"Run", icon:"🏃" },
        { tab:"history", label:"History", icon:"🗓️" },
        { tab:"gates", label:"Gates", icon:"🌀" },
      ];
      grid.innerHTML = actions.map(a=>`
        <button class="fabItem" data-tab="${a.tab}">
          <span class="miIcon">${a.icon}</span>
          <span class="miLabel">${a.label}</span>
        </button>
      `).join("");
      grid.querySelectorAll("[data-tab]").forEach(b=>b.addEventListener("click", ()=>{ closeFabSheet(); navigate(b.getAttribute("data-tab")); }));
    }

    o.classList.add("show");
  }

  function closeFabSheet(){
    const o=document.getElementById("fabSheet");
    if(o) o.classList.remove("show");
  }

  function ensureMoreSheet(){
    if(document.getElementById("moreSheet")) return;
    const o=document.createElement("div");
    o.id="moreSheet";
    o.className="moreSheet";
    o.innerHTML = `
      <div class="moreDim" data-close="1"></div>
      <div class="moreCard">
        <div class="moreHdr">
          <div class="moreTitle">More</div>
          <button class="iconBtn" data-close="1">✕</button>
        </div>
        <div class="moreSearch">
          <input id="moreSearchInput" type="text" placeholder="Search tabs & actions…" autocomplete="off" />
        </div>
        <div class="moreQuick" id="moreQuick"></div>
        <div class="moreGrid" id="moreGrid"></div>
      </div>
    `;
    document.body.appendChild(o);
    o.querySelectorAll("[data-close]").forEach(x=>x.addEventListener("click", ()=>closeMoreSheet()));
  }
  function openMoreSheet(){
    ensureMoreSheet();
    const o=document.getElementById("moreSheet");
    const grid=document.getElementById("moreGrid");
    const quick=document.getElementById("moreQuick");
    const q=document.getElementById("moreSearchInput");
    if(!o || !grid) return;
    const itemsAll = [
      { tab:"history", label:"History", icon:"🗓️" },
      { tab:"quests", label:"Quests", icon:"🗺️" },
      { tab:"gates", label:"Gates", icon:"🌀" },
      { tab:"boss", label:"Boss", icon:"👑" },
      { tab:"skills", label:"Skills", icon:"🧬" },
      { tab:"review", label:"Review", icon:"📈" },
      { tab:"health", label:"Health", icon:"❤️" },
      { tab:"backup", label:"Backup", icon:"💾" },
    ];

    const quickActions = [
      { tab:"home", label:"Hunter Card", icon:"🏠" },
      { tab:"log", label:"New Log", icon:"➕" },
      { tab:"run", label:"Start Run", icon:"🏃" },
      { tab:"history", label:"History", icon:"🗓️" },
    ];
    if(quick){
      quick.innerHTML = quickActions.map(a=>`
        <button class="moreQBtn" data-tab="${a.tab}">
          <span class="miIcon">${a.icon}</span>
          <span class="miLabel">${a.label}</span>
        </button>
      `).join("");
      quick.querySelectorAll("[data-tab]").forEach(b=>b.addEventListener("click", ()=>{ closeMoreSheet(); navigate(b.getAttribute("data-tab")); }));
    }

    function renderItems(filterText){
      const t = String(filterText||"").trim().toLowerCase();
      const items = !t ? itemsAll : itemsAll.filter(it => it.label.toLowerCase().includes(t) || it.tab.toLowerCase().includes(t));
      grid.innerHTML = items.map(it=>`
        <button class="moreItem" data-tab="${it.tab}">
          <span class="miIcon">${it.icon}</span>
          <span class="miLabel">${it.label}</span>
        </button>
      `).join("");
      grid.querySelectorAll("[data-tab]").forEach(b=>{
        b.addEventListener("click", ()=>{
          closeMoreSheet();
          navigate(b.getAttribute("data-tab"));
        });
      });
    }

    renderItems("");

    if(q){
      q.value = "";
      q.oninput = ()=>renderItems(q.value);
      setTimeout(()=>{ try{ q.focus(); }catch(_){} }, 60);
    }
    o.classList.add("show");
  }
  function closeMoreSheet(){
    const o=document.getElementById("moreSheet");
    if(o) o.classList.remove("show");
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
