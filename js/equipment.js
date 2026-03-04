(() => {
  "use strict";

  const KEY="iq_equipment_v10";
  const SLOTS = ["weapon","armor","relic","ring"];
  const SETS = {
    berserker:{
      name:"Berserker",
      bonuses:{
        2:{ typeXp:{ Mehrgelenkig:1.10 } },
        4:{ bossDamage:1.25 }
      }
    },
    scholar:{
      name:"Scholar",
      bonuses:{
        2:{ typeXp:{ Core:1.15 } },
        4:{ globalXp:1.10 }
      }
    },
    endurance:{
      name:"Endurance",
      bonuses:{
        2:{ typeXp:{ Conditioning:1.20 } },
        4:{ gateHpMult:0.80 }
      }
    },
    monarch:{
      name:"Monarch",
      bonuses:{
        2:{ globalXp:1.10 },
        4:{ lootLuck:1.30 }
      }
    }
  };

  function load(){
    try{ return JSON.parse(localStorage.getItem(KEY)||"null")||null; }catch(_){ return null; }
  }
  function save(st){ localStorage.setItem(KEY, JSON.stringify(st)); }
  function defaultState(){
    const eq={};
    SLOTS.forEach(s=>eq[s]=null);
    return { slots:eq };
  }
  function state(){
    const st = load() || defaultState();
    if(!st.slots) st.slots = defaultState().slots;
    SLOTS.forEach(s=>{ if(!(s in st.slots)) st.slots[s]=null; });
    return st;
  }
  function equip(slot, item){
    const st = state();
    st.slots[slot]=item||null;
    save(st);
  }
  function unequip(slot){ equip(slot, null); }

  function equippedItems(){
    const st = state();
    return SLOTS.map(s=>st.slots[s]).filter(Boolean);
  }

  function setCounts(){
    const counts={};
    for(const it of equippedItems()){
      if(it.setId){
        counts[it.setId]=(counts[it.setId]||0)+1;
      }
    }
    return counts;
  }

  function activeBonuses(){
    const counts = setCounts();
    const bonus = { globalXp:1, lootLuck:1, bossDamage:1, gateHpMult:1, typeXp:{} };
    for(const setId in counts){
      const c=counts[setId];
      const def=SETS[setId];
      if(!def) continue;
      if(c>=2 && def.bonuses[2]){
        applyBonus(bonus, def.bonuses[2]);
      }
      if(c>=4 && def.bonuses[4]){
        applyBonus(bonus, def.bonuses[4]);
      }
    }
    return bonus;
  }

  function applyBonus(target, b){
    if(b.globalXp) target.globalXp *= b.globalXp;
    if(b.lootLuck) target.lootLuck *= b.lootLuck;
    if(b.bossDamage) target.bossDamage *= b.bossDamage;
    if(b.gateHpMult) target.gateHpMult *= b.gateHpMult;
    if(b.typeXp){
      for(const k in b.typeXp){
        target.typeXp[k] = (target.typeXp[k]||1) * b.typeXp[k];
      }
    }
  }

  function renderGrid(el){
    const st = state();
    const counts = setCounts();
    const items = st.slots;

    el.innerHTML = `
      <div class="card">
        <h2>Equipment</h2>
        <div class="equip-grid">
          ${SLOTS.map(slot=>{
            const it = items[slot];
            const rarity = it && it.rarity ? it.rarity : "common";
            const setId = it && it.setId ? it.setId : "";
            const setName = setId && SETS[setId] ? SETS[setId].name : "";
            const prog = setId ? `${counts[setId]||0}/4` : "";
            return `
              <button class="equip-slot rarity-${rarity}" data-slot="${slot}">
                <div class="equip-slot-title">${slot.toUpperCase()}</div>
                <div class="equip-slot-item">${it? it.name : "Empty"}</div>
                <div class="equip-slot-sub">${setName ? (setName+" "+prog) : ""}</div>
              </button>`;
          }).join("")}
        </div>
      </div>
    `;

    el.querySelectorAll(".equip-slot").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const slot = btn.getAttribute("data-slot");
        const current = state().slots[slot];
        if(current){
          if(confirm("Unequip this item?")) unequip(slot);
        }
        renderGrid(el);
      });
    });
  }

  window.IronQuestEquipment = {
    SLOTS,
    SETS,
    state,
    equip,
    unequip,
    activeBonuses,
    renderGrid
  };
})();
