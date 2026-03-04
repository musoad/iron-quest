(() => {
  "use strict";

  const KEY = "ironquest_equipment_v9";
  const SLOTS = ["title","badge","aura","relic"];

  const SET_BONUSES = {
    berserker:{
      name:"Berserker",
      two:{ label:"+10% Mehrgelenkig XP (+5% Unilateral)", patch:{ typeXp:{ Mehrgelenkig:1.10, Unilateral:1.05 } } },
      four:{ label:"Boss Damage +25% • Global XP +5%", patch:{ gateDmg:1.25, globalXp:1.05 } }
    },
    scholar:{
      name:"Scholar",
      two:{ label:"Core XP +15%", patch:{ typeXp:{ Core:1.15 } } },
      four:{ label:"Global XP +8%", patch:{ globalXp:1.08 } }
    },
    endurance:{
      name:"Endurance",
      two:{ label:"Conditioning XP +20%", patch:{ typeXp:{ Conditioning:1.20 } } },
      four:{ label:"Global XP +6%", patch:{ globalXp:1.06 } }
    },
    monarch:{
      name:"Monarch",
      two:{ label:"Global XP +10%", patch:{ globalXp:1.10 } },
      four:{ label:"Global XP +15% • Loot Luck +30%", patch:{ globalXp:1.15, lootLuck:1.30 } }
    }
  };

  function load(){
    try { return JSON.parse(localStorage.getItem(KEY)) || { title:null, badge:null, aura:null, relic:null }; }
    catch { return { title:null, badge:null, aura:null, relic:null }; }
  }
  function save(st){ localStorage.setItem(KEY, JSON.stringify(st)); }

  function equip(slot, itemId){
    if(!SLOTS.includes(slot)) return;
    const st = load();
    st[slot] = itemId || null;
    save(st);
  }

  function _loot(){
    // Backward compat: loot module may expose load() or getState()
    const L = window.IronQuestLoot;
    if(!L) return { inv:[], chests:0 };
    if(typeof L.getState === "function") return L.getState();
    if(typeof L.load === "function") return L.load();
    return { inv:[], chests:0 };
  }

  function _byId(){
    const loot = _loot();
    return new Map((loot.inv||[]).map(i=>[i.id,i]));
  }

  function applyBonus(target, patch){
    if(!patch) return;
    if(patch.globalXp) target.globalXp *= patch.globalXp;
    if(patch.gateDmg)  target.gateDmg  *= patch.gateDmg;
    if(patch.lootLuck) target.lootLuck *= patch.lootLuck;
    if(patch.typeXp){
      for(const [k,v] of Object.entries(patch.typeXp)){
        target.typeXp[k] = (target.typeXp[k]||1) * v;
      }
    }
  }

  function setProgress(){
    const eq = load();
    const byId = _byId();

    const items = SLOTS.map(s=>eq[s] ? byId.get(eq[s]) : null).filter(Boolean);
    const counts = {};
    for(const it of items){
      if(!it.setId) continue;
      counts[it.setId] = (counts[it.setId]||0) + 1;
    }

    const out = [];
    for(const [setId, c] of Object.entries(counts)){
      const def = SET_BONUSES[setId];
      if(!def) continue;
      out.push({ setId, name: def.name, count: c, two: def.two, four: def.four });
    }
    out.sort((a,b)=> (b.count-a.count) || a.name.localeCompare(b.name));
    return out;
  }

  function bonuses(){
    const eq = load();
    const byId = _byId();

    const bonus = { globalXp:1, gateDmg:1, lootLuck:1, typeXp:{} };

    const relic = eq.relic ? byId.get(eq.relic) : null;
    if((relic && (relic.bonus) && relic.bonus).globalXp)) bonus.globalXp *= relic.bonus.globalXp;
    if((relic && (relic.bonus) && relic.bonus).gateDmg))  bonus.gateDmg  *= relic.bonus.gateDmg;
    if((relic && (relic.bonus) && relic.bonus).lootLuck)) bonus.lootLuck *= relic.bonus.lootLuck;
    if((relic && (relic.bonus) && relic.bonus).typeXp)){
      for(const [k,v] of Object.entries(relic.bonus.typeXp)){
        bonus.typeXp[k] = (bonus.typeXp[k]||1) * v;
      }
    }

    for(const sp of setProgress()){
      if(sp.count >= 2) applyBonus(bonus, (sp.two && sp.two.patch));
      if(sp.count >= 4) applyBonus(bonus, (sp.four && sp.four.patch));
    }

    return bonus;
  }

  function equippedItems(){
    const eq = load();
    const byId = _byId();
    const slotToItem = {};
    for(const s of SLOTS){
      const it = eq[s] ? byId.get(eq[s]) : null;
      slotToItem[s] = it || null;
    }
    return slotToItem;
  }

  function equippedNames(){
    const slotToItem = equippedItems();
    const name = (it)=> (it && it.name) || "—";
    return {
      title: name(slotToItem.title),
      badge: name(slotToItem.badge),
      aura:  name(slotToItem.aura),
      relic: name(slotToItem.relic),
    };
  }

  function rarityClass(r){
    const x = String(r||"").toLowerCase();
    if(x.includes("monarch")) return "rarMonarch";
    if(x.includes("legend")) return "rarLegend";
    if(x.includes("epic")) return "rarEpic";
    if(x.includes("rare")) return "rarRare";
    return "rarCommon";
  }

  function renderGrid(mount){
    if(!mount) return;
    const slotToItem = equippedItems();
    const sp = setProgress();

    const slotMeta = {
      title: { icon:"🏷️", label:"Title" },
      badge: { icon:"🎖️", label:"Badge" },
      aura:  { icon:"✨", label:"Aura" },
      relic: { icon:"🗿", label:"Relic" },
    };

    const slotCards = SLOTS.map(slot=>{
      const it = slotToItem[slot];
      const m = slotMeta[slot];
      const setName = (it && it.setName) || ((it && it.setId) ? (SET_BONUSES[(it.setId] && it.setId].name) || it.setId) : "—");
      const rc = rarityClass((it && it.rarity));
      const name = (it && it.name) || "—";
      const sub = it ? `${setName}` : "Not equipped";
      return `
        <div class="eqSlot ${rc}" data-slot="${slot}">
          <div class="eqTop">
            <div class="eqIcon">${m.icon}</div>
            <div class="eqLabel">${m.label}</div>
          </div>
          <div class="eqName">${name}</div>
          <div class="eqSub">${sub}</div>
          <div class="eqHint">Tap to manage</div>
        </div>
      `;
    }).join("");

    const setBlocks = sp.length ? sp.map(s=>{
      const twoOn  = s.count >= 2;
      const fourOn = s.count >= 4;
      const badge = `${s.count}/4`;
      return `
        <div class="setCard ${fourOn?"setOn4":(twoOn?"setOn2":"")}">
          <div class="itemTop">
            <div>
              <b>${s.name}</b>
              <div class="hint">Set progress: <span class="badge ${fourOn?"gold":"ok"}">${badge}</span></div>
            </div>
          </div>
          <div class="setLine ${twoOn?"on":""}">2/4: ${(s.two && s.two.label) || "—"} ${twoOn?"✅":"🔒"}</div>
          <div class="setLine ${fourOn?"on":""}">4/4: ${(s.four && s.four.label) || "—"} ${fourOn?"✅":"🔒"}</div>
        </div>
      `;
    }).join("") : `<div class="hint">Rüste Items aus, um Set-Boni zu aktivieren (2/4 & 4/4).</div>`;

    mount.innerHTML = `
      <div class="eqGrid">${slotCards}</div>
      <div style="margin-top:12px;">${setBlocks}</div>
    `;

    // Open equipment manager modal (inventory)
    mount.querySelectorAll('.eqSlot').forEach(el=>{
      el.onclick = ()=>{
        const slot = el.getAttribute('data-slot');
        (window.IronQuestUIFX && (window.IronQuestUIFX.openEquipModal) && window.IronQuestUIFX.openEquipModal)(slot);
      };
    });
  }

  window.IronQuestEquipment = {
    load,
    save,
    equip,
    bonuses,
    equippedItems,
    equippedNames,
    setProgress,
    renderGrid,
    rarityClass,
    SET_BONUSES,
    SLOTS
  };
})();
