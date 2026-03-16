(() => {
  "use strict";

  function $(sel, root){ return (root||document).querySelector(sel); }
  function $all(sel, root){ return Array.from((root||document).querySelectorAll(sel)); }
  function setStatus(text){ const el=document.getElementById('statusLine'); if(el) el.textContent=text; }
  function escapeHtml(s){ return String(s||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }

  async function initServiceWorker(){
    try{
      if(!('serviceWorker' in navigator)) return;
      const reg = await navigator.serviceWorker.register('./sw.js');
      try{ await reg.update(); }catch(_){ }
      const banner=document.getElementById('updateBanner');
      const btn=document.getElementById('btnUpdateReload');
      function showBanner(){ if(banner) banner.style.display='flex'; if(btn) btn.onclick=()=>{ try{ reg.waiting && reg.waiting.postMessage({ type:'SKIP_WAITING' }); }catch(_){ } setTimeout(()=>location.reload(),250); }; }
      if(reg && reg.waiting) showBanner();
      reg.addEventListener('updatefound', ()=>{ const sw=reg.installing; if(!sw) return; sw.addEventListener('statechange', ()=>{ if(sw.state==='installed' && navigator.serviceWorker.controller) showBanner(); }); });
      return reg;
    }catch(e){ console.warn('SW register failed', e); }
  }

  function setActiveTab(tabId){
    $all('.bottom-nav button').forEach(b=> b.classList.toggle('active', b.dataset && b.dataset.tab === tabId));
    const moreBtn=document.getElementById('btnMore');
    if(moreBtn){ const primary=new Set(['home','log','run','stats']); moreBtn.classList.toggle('active', !primary.has(tabId)); }
    $all('main .tab').forEach(s=> s.classList.toggle('active', s.id===tabId));
  }

  async function renderRoute(tabId){
    const el=document.getElementById(tabId); if(!el) return;
    const renders={
      home: window.IronQuestHome?.render,
      log: window.IronQuestLog?.render,
      history: window.IronQuestHistory?.render,
      plans: window.IronQuestPlansView?.render,
      run: window.IronQuestRunning?.renderRunning,
      stats: window.IronQuestAnalytics?.renderAnalytics,
      review: window.IronQuestReview?.render,
      health: window.IronQuestHealth?.render,
      backup: window.IronQuestBackup?.render,
    };
    const fn=renders[tabId];
    if(typeof fn !== 'function'){ el.innerHTML = `<div class="card"><h2>${tabId}</h2><p class="hint">Renderer not found.</p></div>`; return; }
    try{ await fn(el); }catch(e){ console.error('Render error', tabId, e); el.innerHTML=`<div class="card"><h2>Error</h2><p class="hint">${String(e?.message||e)}</p></div>`; }
  }

  function navigate(tabId){ setActiveTab(tabId); try{ location.hash=tabId; }catch(_){ } renderRoute(tabId); }
  window.IronQuestNav = { go:navigate, render:renderRoute, setActiveTab };
  if(!window.IronQuestIntent) window.IronQuestIntent = {};

  const FAV_KEY='iq_fav_ex';
  function getFavs(){ try{ return JSON.parse(localStorage.getItem(FAV_KEY)||'[]') || []; }catch(_){ return []; } }

  async function getRecentExercises(limit=10){
    try{
      const entries = await window.IronDB.getAllEntries();
      entries.sort((a,b)=> (a.date<b.date?1:-1));
      const seen=new Set(), out=[];
      for(const e of entries){ const name=String(e.exercise||'').trim(); if(!name || seen.has(name)) continue; seen.add(name); out.push(name); if(out.length>=limit) break; }
      return out;
    }catch(_){ return []; }
  }

  function ensureFabSheet(){
    if(document.getElementById('fabSheet')) return;
    const o=document.createElement('div');
    o.id='fabSheet'; o.className='fabSheet';
    o.innerHTML=`<div class="fabDim" data-close="1"></div><div class="fabCard"><div class="fabHdr"><div class="fabTitle">Quick Add</div><button class="iconBtn" data-close="1">✕</button></div><div class="fabBody"><div class="miniHint">1 Tap → Log ist vorausgewählt & ready.</div><div class="chipHdr"><div class="t">Favorites</div></div><div class="chipRow" id="fabFavRow"></div><div class="chipHdr" style="margin-top:10px;"><div class="t">Recent</div></div><div class="chipRow" id="fabRecentRow"></div><div class="chipHdr" style="margin-top:12px;"><div class="t">Actions</div></div><div class="fabGrid" id="fabGrid"></div></div></div>`;
    document.body.appendChild(o);
    o.querySelectorAll('[data-close]').forEach(x=>x.addEventListener('click', ()=>closeFabSheet()));
  }
  function closeFabSheet(){ const o=document.getElementById('fabSheet'); if(o) o.classList.remove('show'); }
  function toLogWithExercise(exName){ window.IronQuestIntent = window.IronQuestIntent || {}; window.IronQuestIntent.log = { exercise: exName, date: window.Utils.isoDate(new Date()) }; closeFabSheet(); navigate('log'); }
  async function openFabSheet(){
    ensureFabSheet();
    const o=document.getElementById('fabSheet'); if(!o) return;
    const favRow=document.getElementById('fabFavRow');
    const recentRow=document.getElementById('fabRecentRow');
    const grid=document.getElementById('fabGrid');
    const favs=getFavs(); const recent=await getRecentExercises(10);
    if(favRow){ favRow.innerHTML=favs.length ? favs.map(n=>`<button class="chip star" data-ex="${escapeHtml(n)}">⭐ ${escapeHtml(n)}</button>`).join('') : `<div class="miniHint">No favorites yet.</div>`; favRow.querySelectorAll('[data-ex]').forEach(b=>b.addEventListener('click', ()=>toLogWithExercise(b.getAttribute('data-ex')))); }
    if(recentRow){ recentRow.innerHTML=recent.length ? recent.map(n=>`<button class="chip" data-ex="${escapeHtml(n)}">${escapeHtml(n)}</button>`).join('') : `<div class="miniHint">No recent logs yet.</div>`; recentRow.querySelectorAll('[data-ex]').forEach(b=>b.addEventListener('click', ()=>toLogWithExercise(b.getAttribute('data-ex')))); }
    if(grid){ const actions=[{tab:'log',label:'Log',icon:'➕'},{tab:'run',label:'Run',icon:'🏃'},{tab:'history',label:'History',icon:'🗓️'},{tab:'plans',label:'Plan A/B',icon:'🧾'}]; grid.innerHTML=actions.map(a=>`<button class="fabItem" data-tab="${a.tab}"><span class="miIcon">${a.icon}</span><span class="miLabel">${a.label}</span></button>`).join(''); grid.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click', ()=>{ closeFabSheet(); navigate(b.getAttribute('data-tab')); })); }
    o.classList.add('show');
  }

  function ensureMoreSheet(){
    if(document.getElementById('moreSheet')) return;
    const o=document.createElement('div');
    o.id='moreSheet'; o.className='moreSheet';
    o.innerHTML=`<div class="moreDim" data-close="1"></div><div class="moreCard"><div class="moreHdr"><div class="moreTitle">More</div><button class="iconBtn" data-close="1">✕</button></div><div class="moreSearch"><input id="moreSearchInput" type="text" placeholder="Suche Seiten…" autocomplete="off" /></div><div class="moreQuick" id="moreQuick"></div><div class="moreGrid" id="moreGrid"></div></div>`;
    document.body.appendChild(o);
    o.querySelectorAll('[data-close]').forEach(x=>x.addEventListener('click', ()=>closeMoreSheet()));
  }
  function closeMoreSheet(){ const o=document.getElementById('moreSheet'); if(o) o.classList.remove('show'); }
  function openMoreSheet(){
    ensureMoreSheet();
    const o=document.getElementById('moreSheet'); const grid=document.getElementById('moreGrid'); const quick=document.getElementById('moreQuick'); const q=document.getElementById('moreSearchInput'); if(!o || !grid) return;
    const itemsAll=[{tab:'history',label:'History',icon:'🗓️'},{tab:'plans',label:'Plan A/B',icon:'🧾'},{tab:'review',label:'Review',icon:'📈'},{tab:'health',label:'Health',icon:'❤️'},{tab:'backup',label:'Backup',icon:'💾'}];
    const quickActions=[{tab:'home',label:'Dashboard',icon:'🏠'},{tab:'log',label:'New Log',icon:'➕'},{tab:'run',label:'Run',icon:'🏃'},{tab:'plans',label:'Plan A/B',icon:'🧾'}];
    if(quick){ quick.innerHTML=quickActions.map(a=>`<button class="moreQBtn" data-tab="${a.tab}"><span class="miIcon">${a.icon}</span><span class="miLabel">${a.label}</span></button>`).join(''); quick.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click', ()=>{ closeMoreSheet(); navigate(b.getAttribute('data-tab')); })); }
    function renderItems(filterText){ const t=String(filterText||'').trim().toLowerCase(); const items=!t?itemsAll:itemsAll.filter(it=>it.label.toLowerCase().includes(t)||it.tab.toLowerCase().includes(t)); grid.innerHTML=items.map(it=>`<button class="moreItem" data-tab="${it.tab}"><span class="miIcon">${it.icon}</span><span class="miLabel">${it.label}</span></button>`).join(''); grid.querySelectorAll('.moreItem').forEach(b=>b.addEventListener('click', ()=>{ closeMoreSheet(); navigate(b.getAttribute('data-tab')); })); }
    renderItems(''); if(q){ q.value=''; q.oninput=()=>renderItems(q.value); setTimeout(()=>{ try{ q.focus(); }catch(_){ } }, 60); } o.classList.add('show');
  }

  function wireNav(){
    $all('.bottom-nav button').forEach(b=>{ if(b.dataset && b.dataset.tab){ b.addEventListener('click', ()=>navigate(b.dataset.tab)); } });
    document.getElementById('btnMore')?.addEventListener('click', ()=>openMoreSheet());
    document.getElementById('fabGlobal')?.addEventListener('click', ()=>openFabSheet());
    const initial=(location.hash||'').replace('#','').trim() || 'home';
    navigate(initial);
  }

  async function boot(){
    setStatus('Initializing…');
    if(!window.IronDB || typeof window.IronDB.init !== 'function') throw new Error('IronDB missing.');
    await window.IronDB.init();
    try{ if(window.IronQuestIntegrity?.run) await window.IronQuestIntegrity.run(); }catch(e){ console.warn('Integrity audit failed', e); }
    try{ if(window.IronQuestState?.recompute) await window.IronQuestState.recompute(); }catch(_){ }

    const sysBtn=document.getElementById('btnSystemLog');
    if(sysBtn){ sysBtn.onclick=async ()=>{ try{ const list=await window.IronDB.getAllSystem(); const recent=(list||[]).slice(-40).reverse(); const msg=recent.length?recent.map(x=>`${x.date}: ${x.msg}`).join('\n'):'No system messages yet.'; if(window.IronQuestUIFX?.showSystem) window.IronQuestUIFX.showSystem(msg); else alert(msg); }catch(e){ alert(String(e?.message||e)); } }; }

    await initServiceWorker();
    wireNav();
    setStatus('Plan A/B • Joggen • Stats • Health');
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
