(() => {
  "use strict";

  function ensureParticles(){
    if(document.querySelector(".bgParticles")) return;
    const d=document.createElement("div");
    d.className="bgParticles";
    document.body.appendChild(d);
  }

  function _mkOverlay(id, title, extraHtml=""){
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
          ${extraHtml}
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
      const o=_mkOverlay("systemOverlay","System");
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

    // Loot reveal overlay
    if(!document.getElementById("itemOverlay")){
      const extra = `
        <div class="lootStage">
          <div class="chest" aria-hidden="true"></div>
          <div class="itemCard" id="itemOverlay_card" style="display:none;"></div>
        </div>
      `;
      const o=_mkOverlay("itemOverlay","LOOT ACQUIRED", extra);
      o.querySelector(".sysTitle").textContent="LOOT ACQUIRED";
    }

    // Equip manager overlay
    if(!document.getElementById("equipOverlay")){
      const extra = `
        <div class="equipModalHdr" id="equipOverlay_hdr"></div>
        <div class="equipList" id="equipOverlay_list"></div>
      `;
      const o=_mkOverlay("equipOverlay","EQUIPMENT", extra);
      o.querySelector(".sysTitle").textContent="EQUIPMENT";
    }
  }

  function show(id, message){
    ensureOverlays();
    const o=document.getElementById(id);
    if(!o) return;
    const body=o.querySelector(`#${id}_body`);
    if(body) body.textContent = message || "";
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

  // Count-up helper
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

  // Loot reveal card (with chest animation)
  function showItem(item, message){
    ensureOverlays();
    const o=document.getElementById("itemOverlay");
    const body=o.querySelector("#itemOverlay_body");
    const card=o.querySelector("#itemOverlay_card");
    const chest=o.querySelector(".chest");

    if(body) body.textContent = message || "";

    card.style.display = "none";
    card.className = "itemCard";
    chest.classList.remove("open");

    // Build card HTML
    const name = item?.name || "XP Dust";
    const rarity = item?.rarity || "Common";
    const setName = item?.setName || (item?.setId ? (window.IronQuestEquipment?.SET_BONUSES?.[item.setId]?.name || item.setId) : "—");
    const bonus = item?.bonus ? JSON.stringify(item.bonus) : "";

    const rarClass = window.IronQuestEquipment?.rarityClass?.(rarity) || "rarCommon";

    card.innerHTML = `
      <div class="icTop ${rarClass}">
        <div class="icName">${escapeHtml(name)}</div>
        <div class="icMeta">${escapeHtml(rarity)} • ${escapeHtml(setName)}</div>
      </div>
      <div class="icBody">
        <div class="hint">${bonus ? "Bonus: " + escapeHtml(bonus) : "A new item has been added to your inventory."}</div>
      </div>
    `;

    o.classList.add("show");

    // Animate chest then reveal
    setTimeout(()=>{
      chest.classList.add("open");
      setTimeout(()=>{
        card.style.display = "block";
        card.classList.add("reveal");
      }, 320);
    }, 120);
  }

  // Equipment modal
  function openEquipModal(slot){
    ensureOverlays();
    const o=document.getElementById("equipOverlay");
    const hdr=o.querySelector("#equipOverlay_hdr");
    const list=o.querySelector("#equipOverlay_list");

    const slotMeta={ title:"Title", badge:"Badge", aura:"Aura", relic:"Relic" };
    const label = slotMeta[slot] || slot;

    hdr.textContent = `Choose ${label}`;

    const loot = (window.IronQuestLoot?.getState?.() || window.IronQuestLoot?.load?.() || { inv:[] });
    const inv = loot.inv || [];

    const kindMap = { title:"title", badge:"badge", aura:"aura", relic:"relic" };
    const wanted = kindMap[slot] || slot;

    const items = inv.filter(it => (it.kind || "").toLowerCase() === wanted);

    const eq = window.IronQuestEquipment.load();

    const rows = [
      { id:null, name:"— Unequip —", rarity:"", setName:"" },
      ...items
    ];

    list.innerHTML = rows.map(it=>{
      const active = (it.id && eq[slot]===it.id) ? "active" : (!it.id && !eq[slot]) ? "active" : "";
      const rarClass = window.IronQuestEquipment.rarityClass(it.rarity);
      const setName = it.setName || (it.setId ? (window.IronQuestEquipment?.SET_BONUSES?.[it.setId]?.name || it.setId) : "—");
      return `
        <button class="equipRow ${active} ${rarClass}" data-equip-id="${it.id||""}">
          <div class="equipRowName">${escapeHtml(it.name || "—")}</div>
          <div class="equipRowMeta">${escapeHtml(it.rarity || "")} ${it.id?"•":""} ${it.id?escapeHtml(setName):""}</div>
        </button>
      `;
    }).join("");

    list.querySelectorAll("[data-equip-id]").forEach(btn=>{
      btn.onclick = ()=>{
        const id = btn.getAttribute("data-equip-id") || null;
        window.IronQuestEquipment.equip(slot, id);
        window.Toast?.toast("Equipment", `${label} updated.`);
        hide("equipOverlay");
        // refresh home if visible
        const homeEl = document.getElementById('home');
        if(homeEl && homeEl.classList.contains('active')){
          window.IronQuestHome?.render?.(homeEl);
        }
      };
    });

    o.classList.add("show");
  }

  function escapeHtml(s){
    return String(s||"")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;");
  }

  window.IronQuestUIFX = {
    ensureParticles,
    showSystem,
    showLevelUp,
    showPromotion,
    showFinish,
    showItem,
    openEquipModal,
    countUp,
    hide
  };
})();
