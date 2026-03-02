(() => {
  "use strict";

  function ensureParticles(){
    if(document.querySelector(".bgParticles")) return;
    const d=document.createElement("div");
    d.className="bgParticles";
    document.body.appendChild(d);
  }

  function ensureOverlays(){
    if(document.getElementById("systemOverlay")) return;

    const system=document.createElement("div");
    system.id="systemOverlay";
    system.className="overlay";
    system.innerHTML = `
      <div class="overlayDim"></div>
      <div class="overlayCard">
        <div class="systemBox">
          <div class="sysTitle">[ SYSTEM ]</div>
          <div class="sysBody" id="sysBody">—</div>
        </div>
        <div class="btnRow" style="margin-top:12px;">
          <button class="primary" id="sysOk">OK</button>
        </div>
      </div>
    `;
    document.body.appendChild(system);

    const level=document.createElement("div");
    level.id="levelOverlay";
    level.className="overlay";
    level.innerHTML = `
      <div class="overlayDim"></div>
      <div class="overlayCard" style="border-color: rgba(255,212,106,.30);">
        <div class="systemBox" style="border-color: rgba(255,212,106,.35);">
          <div class="sysTitle" style="color: rgba(255,212,106,.92);">LEVEL UP</div>
          <div class="sysBody" id="lvlBody">—</div>
        </div>
        <div class="btnRow" style="margin-top:12px;">
          <button class="primary" id="lvlOk">CONTINUE</button>
        </div>
      </div>
    `;
    document.body.appendChild(level);

    system.querySelector("#sysOk").onclick=()=>hideSystem();
    system.querySelector(".overlayDim").onclick=()=>hideSystem();
    level.querySelector("#lvlOk").onclick=()=>hideLevelUp();
    level.querySelector(".overlayDim").onclick=()=>hideLevelUp();
  }

  function showSystem(message){
    ensureOverlays();
    const o=document.getElementById("systemOverlay");
    o.querySelector("#sysBody").textContent = message;
    o.classList.add("show");
  }
  function hideSystem(){
    const o=document.getElementById("systemOverlay");
    if(o) o.classList.remove("show");
  }

  function showLevelUp(message){
    ensureOverlays();
    const o=document.getElementById("levelOverlay");
    o.querySelector("#lvlBody").textContent = message;
    o.classList.add("show");
  }
  function hideLevelUp(){
    const o=document.getElementById("levelOverlay");
    if(o) o.classList.remove("show");
  }

  window.IronQuestUIFX = { ensureParticles, showSystem, showLevelUp };
})();
