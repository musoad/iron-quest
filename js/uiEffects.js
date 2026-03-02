(() => {
  "use strict";

  function ensureOverlay(){
    let el = document.getElementById("systemOverlay");
    if (!el){
      el = document.createElement("div");
      el.id = "systemOverlay";
      el.innerHTML = `<div class="sysCard"><div class="sysTitle">[ SYSTEM ]</div><div class="sysBody" id="sysBody"></div></div>`;
      document.body.appendChild(el);
    }
    return el;
  }

  function systemMessage(text, ms=1800){
    const ov = ensureOverlay();
    const body = ov.querySelector("#sysBody");
    body.textContent = text;
    ov.classList.add("show");
    setTimeout(()=>ov.classList.remove("show"), ms);
  }

  function xpPop(xp){
    const n = document.createElement("div");
    n.className = "xpPop";
    n.textContent = `+${Math.round(Number(xp||0))} XP`;
    document.body.appendChild(n);
    setTimeout(()=>n.remove(), 900);
  }

  function levelUpOverlay(level){
    let el = document.getElementById("levelUpOverlay");
    if (!el){
      el = document.createElement("div");
      el.id = "levelUpOverlay";
      el.innerHTML = `
        <div class="lvlCard">
          <div class="lvlBig">LEVEL UP</div>
          <div class="lvlSub">Hunter Rank Increased</div>
          <div class="lvlNum" id="lvlNum"></div>
          <button class="primary" id="lvlOk">Continue</button>
        </div>
      `;
      document.body.appendChild(el);
      el.querySelector("#lvlOk").onclick = ()=> el.classList.remove("show");
    }
    el.querySelector("#lvlNum").textContent = `Lv ${level}`;
    el.classList.add("show");
  }

  window.IronQuestUI = { systemMessage, xpPop, levelUpOverlay };
})();
