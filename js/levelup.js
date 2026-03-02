(() => {
  "use strict";
  const KEY="ironquest_lastlevel_v6";

  function ensureOverlay(){
    let o = document.getElementById("levelUpOverlay");
    if (!o){
      o = document.createElement("div");
      o.id = "levelUpOverlay";
      o.innerHTML = `
        <div class="levelUpCard">
          <div class="badge purple">LEVEL UP</div>
          <h2 class="levelUpTitle" id="luTitle">Lv —</h2>
          <div class="levelUpSub" id="luSub">—</div>
          <div class="levelUpGlow"></div>
          <div class="hint" style="margin-top:12px;" id="luHint">—</div>
          <div class="btnRow" style="margin-top:14px;">
            <button class="primary" id="luOk">Continue</button>
          </div>
        </div>
      `;
      document.body.appendChild(o);
      o.querySelector("#luOk").onclick = ()=> hide();
    }
    return o;
  }

  function show(level, title){
    const o = ensureOverlay();
    o.classList.add("active");
    o.querySelector("#luTitle").textContent = `Lv ${level}`;
    o.querySelector("#luSub").textContent = title ? `${title}` : "—";
    o.querySelector("#luHint").textContent = "SYSTEM: Your power has increased.";
    try { navigator.vibrate?.(40); } catch {}
  }

  function hide(){
    const o = ensureOverlay();
    o.classList.remove("active");
  }

  function getLastLevel(){
    return Number(localStorage.getItem(KEY) || 1);
  }
  function setLastLevel(lvl){
    localStorage.setItem(KEY, String(Number(lvl||1)));
  }

  async function checkLevelUp(){
    const entries = await window.IronDB.getAllEntries();
    const totalXp = entries.reduce((s,e)=>s+Number(e.xp||0),0);
    const L = window.IronQuestProgression.levelFromTotalXp(totalXp);
    const last = getLastLevel();
    if (L.lvl > last){
      setLastLevel(L.lvl);
      show(L.lvl, L.title);
      window.UIEffects?.systemMessage([`Level increased: Lv ${L.lvl}`, `${L.title}`]);
      // chest every 3 levels
      if (L.lvl % 3 === 0) window.IronQuestLoot?.addChest?.(1);
      // notify rpg
      await window.IronQuestRPG?.onProgressChanged?.(L.lvl);
    }
    return L;
  }

  window.IronQuestLevelUp = { checkLevelUp, getLastLevel };
})();
