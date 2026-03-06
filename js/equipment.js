(() => {
  "use strict";

  const KEY = "ironquest_equipment_v9";
  const SLOTS = ["title","badge","aura","relic"];

  const DEFAULT_STATE = {
    slots: { title:null, badge:null, aura:null, relic:null },
    inventory: [],
    lastUpdated: Date.now()
  };

  function clone(v){ return JSON.parse(JSON.stringify(v)); }
  function safeParse(raw, fallback){ try{ return JSON.parse(raw); }catch(_){ return fallback; } }
  function id(){ return "eq_" + Math.random().toString(16).slice(2) + Date.now().toString(16); }

  function normalizeBonus(b){
    const out = Object.assign({ globalXp:1, gateDmg:1, runXp:1, crit:0, def:0 }, b||{});
    Object.keys(out).forEach(k=>{
      const n = Number(out[k]);
      out[k] = Number.isFinite(n) ? n : out[k];
    });
    if(!Number.isFinite(Number(out.globalXp))) out.globalXp = 1;
    if(!Number.isFinite(Number(out.gateDmg))) out.gateDmg = 1;
    if(!Number.isFinite(Number(out.runXp))) out.runXp = 1;
    if(!Number.isFinite(Number(out.crit))) out.crit = 0;
    if(!Number.isFinite(Number(out.def))) out.def = 0;
    return out;
  }

  function bonusFromLootBonus(bonus){
    const b = bonus || {};
    return normalizeBonus({
      globalXp: Number(b.globalXp || 1),
      gateDmg: Number(b.gateDmg || 1),
      runXp: Number(b.runXp || 1),
      crit: Number(b.crit || 0),
      def: Number(b.def || 0)
    });
  }

  function rarityFromName(name){
    const n = String(name||"").toLowerCase();
    if(n.includes("monarch") || n.includes("abyss")) return "Epic";
    if(n.includes("gold") || n.includes("gate")) return "Rare";
    return "Common";
  }

  function normalizeItem(it){
    if(!it || typeof it !== "object") return null;
    const kind = String(it.kind || it.slot || "relic").toLowerCase();
    return {
      id: String(it.id || id()),
      name: String(it.name || "Unknown Item"),
      kind,
      slot: kind,
      rarity: String(it.rarity || rarityFromName(it.name)),
      bonus: bonusFromLootBonus(it.bonus || it.bonuses),
      date: String(it.date || (window.Utils?.isoDate?.(new Date()) || new Date().toISOString().slice(0,10)))
    };
  }

  function hydrateFromLoot(st){
    try{
      const loot = window.IronQuestLoot?.load?.();
      const inv = Array.isArray(loot?.inv) ? loot.inv : [];
      const have = new Set((st.inventory||[]).map(x=>String(x.id)));
      inv.forEach(raw=>{
        if(have.has(String(raw.id))) return;
        st.inventory.push(normalizeItem(raw));
      });
    }catch(_){ }
    return st;
  }

  function loadState(){
    const raw = localStorage.getItem(KEY);
    let st = raw ? safeParse(raw, clone(DEFAULT_STATE)) : clone(DEFAULT_STATE);
    if(!st.slots) st.slots = clone(DEFAULT_STATE.slots);
    SLOTS.forEach(s=>{ if(!(s in st.slots)) st.slots[s] = null; });
    st.inventory = (Array.isArray(st.inventory) ? st.inventory : []).map(normalizeItem).filter(Boolean);
    hydrateFromLoot(st);
    return st;
  }

  let _state = loadState();

  function save(){
    _state.lastUpdated = Date.now();
    localStorage.setItem(KEY, JSON.stringify(_state));
    return getState();
  }

  function load(){ _state = loadState(); return getState(); }
  function getState(){ return clone(_state); }
  function setState(next){ _state = loadStateFrom(next); return save(); }

  function loadStateFrom(candidate){
    const st = candidate && typeof candidate === "object" ? clone(candidate) : clone(DEFAULT_STATE);
    if(!st.slots) st.slots = clone(DEFAULT_STATE.slots);
    SLOTS.forEach(s=>{ if(!(s in st.slots)) st.slots[s] = null; });
    st.inventory = (Array.isArray(st.inventory) ? st.inventory : []).map(normalizeItem).filter(Boolean);
    hydrateFromLoot(st);
    return st;
  }

  function addItem(item){
    const it = normalizeItem(item);
    if(!it) return null;
    if(!_state.inventory.find(x=>String(x.id)===String(it.id))){
      _state.inventory.push(it);
      save();
    }
    return it.id;
  }

  function itemById(itemId){ return _state.inventory.find(x=>String(x.id)===String(itemId)) || null; }

  function equip(slot, itemId){
    if(!SLOTS.includes(String(slot))) return false;
    if(!itemId){ _state.slots[slot] = null; save(); return true; }
    const it = itemById(itemId);
    if(!it) return false;
    _state.slots[slot] = String(itemId);
    save();
    return true;
  }

  function unequip(slot){
    if(!SLOTS.includes(String(slot))) return;
    _state.slots[slot] = null;
    save();
  }

  function equippedItems(){
    return SLOTS.map(slot => itemById(_state.slots[slot])).filter(Boolean);
  }

  function equippedNames(){
    const out = { title:"—", badge:"—", aura:"—", relic:"—" };
    SLOTS.forEach(slot=>{
      const it = itemById(_state.slots[slot]);
      out[slot] = it ? it.name : "—";
    });
    return out;
  }

  function activeBonuses(){
    const items = equippedItems();
    const out = { globalXp:1, gateDmg:1, runXp:1, crit:0, def:0, equipped:items };
    items.forEach(it=>{
      const b = normalizeBonus(it.bonus);
      out.globalXp *= Number(b.globalXp || 1);
      out.gateDmg *= Number(b.gateDmg || 1);
      out.runXp *= Number(b.runXp || 1);
      out.crit += Number(b.crit || 0);
      out.def += Number(b.def || 0);
    });
    return out;
  }

  function bonuses(){ return activeBonuses(); }

  function render(container){
    const st = load();
    const names = equippedNames();
    const inv = st.inventory || [];
    const bon = bonuses();

    container.innerHTML = `
      <div class="card iqPanel">
        <div class="slHeader">
          <div>
            <div class="slEyebrow">Hunter Arsenal</div>
            <h2>Equipment</h2>
          </div>
          <div class="pill">${inv.length} collected</div>
        </div>
        <p class="hint">Drops aus Gates und Bossen landen hier. Ausrüstung verändert XP, Gate Damage und Run Efficiency.</p>
      </div>

      <div class="card soft eqSummary">
        <div class="eqBonus"><span>Global XP</span><b>x${Number(bon.globalXp||1).toFixed(2)}</b></div>
        <div class="eqBonus"><span>Run XP</span><b>x${Number(bon.runXp||1).toFixed(2)}</b></div>
        <div class="eqBonus"><span>Gate Damage</span><b>x${Number(bon.gateDmg||1).toFixed(2)}</b></div>
        <div class="eqBonus"><span>Defense</span><b>${Number(bon.def||0).toFixed(0)}%</b></div>
      </div>

      <div class="card soft">
        <h2>Equipped</h2>
        <div class="eqGrid">
          ${SLOTS.map(slot=>{
            const current = names[slot] || "—";
            const options = inv.filter(x=>x.kind===slot);
            return `
              <label class="eqSlot">
                <span class="eqSlotTitle">${slot.toUpperCase()}</span>
                <select data-eq-slot="${slot}">
                  <option value="">—</option>
                  ${options.map(it=>`<option value="${it.id}" ${st.slots[slot]===it.id?"selected":""}>${it.name}</option>`).join("")}
                </select>
                <span class="muted">${current}</span>
              </label>
            `;
          }).join("")}
        </div>
      </div>

      <div class="card soft">
        <h2>Inventory</h2>
        <div class="eqInv">
          ${inv.length ? inv.map(it=>`
            <div class="eqItem">
              <div>
                <div class="eqName">${it.name}</div>
                <div class="muted">${it.kind} • ${it.rarity}</div>
              </div>
              <div class="eqMeta">
                ${it.bonus.globalXp && it.bonus.globalXp !== 1 ? `<span class="pill small">XP x${Number(it.bonus.globalXp).toFixed(2)}</span>` : ``}
                ${it.bonus.runXp && it.bonus.runXp !== 1 ? `<span class="pill small">Run x${Number(it.bonus.runXp).toFixed(2)}</span>` : ``}
                ${it.bonus.gateDmg && it.bonus.gateDmg !== 1 ? `<span class="pill small">Gate x${Number(it.bonus.gateDmg).toFixed(2)}</span>` : ``}
              </div>
            </div>
          `).join("") : `<div class="hint">Noch keine Items. Öffne Chests in Gates oder besiege Bosse.</div>`}
        </div>
      </div>
    `;

    container.querySelectorAll("[data-eq-slot]").forEach(sel=>{
      sel.addEventListener("change", ()=>{
        equip(sel.getAttribute("data-eq-slot"), sel.value || null);
        render(container);
      });
    });
  }

  window.IronQuestEquipment = {
    SLOTS,
    load,
    save,
    getState,
    setState,
    addItem,
    equip,
    unequip,
    equippedItems,
    equippedNames,
    activeBonuses,
    bonuses,
    render
  };
})();
