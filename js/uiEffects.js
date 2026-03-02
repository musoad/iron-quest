(() => {
  "use strict";

  function ensureParticles(){
    if(document.querySelector(".bgParticles")) return;
    const d=document.createElement("div");
    d.className="bgParticles";
    document.body.appendChild(d);
  }

  function _mkOverlay(id, title){
    const o=document.createElement("div");
    o.id=id;
    o.className="overlay";
    o.innerHTML = `
      <div class="overlayDim"></div>
      <div class="overlayCard">
        <div class="systemBox">
          <div class="sysHdr">[ SYSTEM ]</div>
          <div class="sysTitle">${title}</div>
          <div class="sysBody" id="${id}_body"></div>
        </div>
        <div class="btnRow" style="margin-top:12px;">
          <button class="primary" id="${id}_ok">OK</button>
        </div>
      </div>
    `;
    document.body.appendChild(o);
    o.querySelector(".overlayDim").onclick=()=>hide(id);
    o.querySelector(`#${id}_ok`).onclick=()=>hide(id);
    return o;
  }

  function ensureOverlays(){
    ensureParticles();
    if(!document.getElementById("systemOverlay")){
      const o=_mkOverlay("systemOverlay","Message");
      o.querySelector(".sysTitle").textContent="System";
    }
    if(!document.getElementById("levelOverlay")){
      const o=_mkOverlay("levelOverlay","LEVEL UP");
      o.querySelector(".sysTitle").textContent="LEVEL UP";
    }
    if(!document.getElementById("promoOverlay")){
      const o=_mkOverlay("promoOverlay","RANK PROMOTION");
      o.querySelector(".sysTitle").textContent="RANK PROMOTION";
    }
    if(!document.getElementById("finishOverlay")){
      const o=_mkOverlay("finishOverlay","FINISH");
      o.querySelector(".sysTitle").textContent="FINISH";
    }
  }

  function show(id, message){
    ensureOverlays();
    const o=document.getElementById(id);
    if(!o) return;
    const body=o.querySelector(`#${id}_body`);
    if(body) body.textContent = message;
    o.classList.add("show");
  }
  function hide(id){
    const o=document.getElementById(id);
    if(o) o.classList.remove("show");
  }

  function showSystem(message){ show("systemOverlay", message); }
  function showLevelUp(message){ show("levelOverlay", message); }
  function showPromotion(message){ show("promoOverlay", message); }
  function showFinish(message){ show("finishOverlay", message); }

  // lightweight count-up helper for small numbers
  function countUp(el, from, to, ms=650){
    if(!el) return;
    const start=performance.now();
    const f=Number(from||0), t=Number(to||0);
    function step(now){
      const p=Math.min(1,(now-start)/ms);
      const v=Math.round(f+(t-f)*p);
      el.textContent=String(v);
      if(p<1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  window.IronQuestUIFX = {
    ensureParticles,
    showSystem,
    showLevelUp,
    showPromotion,
    showFinish,
    countUp
  };
})();
