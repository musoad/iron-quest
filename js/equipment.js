(() => {
  "use strict";

  const LS_KEY = "iq_equipment_v1";

  const DEFAULT_STATE = {
    // simple equipment model
    slots: {
      weapon: null,
      armor: null,
      accessory: null
    },
    inventory: [], // [{id,name,rarity,setId,bonuses:{xpPct,gateDmg,crit,def}}]
    lastUpdated: Date.now()
  };

  function safeParse(json, fallback) {
    try { return JSON.parse(json); } catch { return fallback; }
  }

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function ensureItemShape(it) {
    if (!it || typeof it !== "object") return null;
    const out = Object.assign({
      id: String(it.id || cryptoId()),
      name: String(it.name || "Unknown Item"),
      rarity: it.rarity || "Common",
      setId: it.setId || null,
      bonuses: Object.assign({ xpPct: 0, gateDmg: 0, crit: 0, def: 0 }, it.bonuses || {})
    }, it);

    // hard safety
    if (typeof out.bonuses.xpPct !== "number") out.bonuses.xpPct = Number(out.bonuses.xpPct) || 0;
    if (typeof out.bonuses.gateDmg !== "number") out.bonuses.gateDmg = Number(out.bonuses.gateDmg) || 0;
    if (typeof out.bonuses.crit !== "number") out.bonuses.crit = Number(out.bonuses.crit) || 0;
    if (typeof out.bonuses.def !== "number") out.bonuses.def = Number(out.bonuses.def) || 0;

    return out;
  }

  function cryptoId() {
    // iOS-safe fallback
    return "it_" + Math.random().toString(16).slice(2) + "_" + Date.now().toString(16);
  }

  function loadState() {
    const raw = localStorage.getItem(LS_KEY);
    const st = raw ? safeParse(raw, clone(DEFAULT_STATE)) : clone(DEFAULT_STATE);

    // ensure shape
    if (!st.slots) st.slots = clone(DEFAULT_STATE.slots);
    if (!st.inventory) st.inventory = [];
    if (!st.slots.weapon) st.slots.weapon = null;
    if (!st.slots.armor) st.slots.armor = null;
    if (!st.slots.accessory) st.slots.accessory = null;

    // normalize inventory items
    st.inventory = st.inventory.map(ensureItemShape).filter(Boolean);

    return st;
  }

  function saveState(st) {
    st.lastUpdated = Date.now();
    localStorage.setItem(LS_KEY, JSON.stringify(st));
  }

  // --- Public API ---
  let _state = loadState();

  function getState() { return clone(_state); }
  function setState(next) {
    _state = next ? next : clone(DEFAULT_STATE);
    // normalize
    _state = loadStateFrom(_state);
    saveState(_state);
    return getState();
  }

  function load() {
    _state = loadState();
    return getState();
  }

  function save() {
    saveState(_state);
  }

  function loadStateFrom(candidate) {
    const st = candidate && typeof candidate === "object" ? clone(candidate) : clone(DEFAULT_STATE);
    if (!st.slots) st.slots = clone(DEFAULT_STATE.slots);
    if (!st.inventory) st.inventory = [];
    st.inventory = st.inventory.map(ensureItemShape).filter(Boolean);
    if (!("weapon" in st.slots)) st.slots.weapon = null;
    if (!("armor" in st.slots)) st.slots.armor = null;
    if (!("accessory" in st.slots)) st.slots.accessory = null;
    return st;
  }

  function addItem(item) {
    const it = ensureItemShape(item);
    if (!it) return null;
    _state.inventory.push(it);
    save();
    return it.id;
  }

  function equip(slot, itemId) {
    if (!slot) return;
    const it = _state.inventory.find(x => x.id === itemId);
    if (!it) return;
    if (!_state.slots) _state.slots = clone(DEFAULT_STATE.slots);
    _state.slots[slot] = it.id;
    save();
  }

  function unequip(slot) {
    if (!_state.slots) _state.slots = clone(DEFAULT_STATE.slots);
    _state.slots[slot] = null;
    save();
  }

  function equippedItems() {
    const ids = Object.values(_state.slots || {}).filter(Boolean);
    return ids.map(id => _state.inventory.find(x => x.id === id)).filter(Boolean);
  }

  // ✅ required by gates.js in your screenshots
  function equippedNames() {
    return equippedItems().map(it => it.name);
  }

  function activeBonuses() {
    const items = equippedItems();
    const sum = { xpPct: 0, gateDmg: 0, crit: 0, def: 0 };

    items.forEach(it => {
      const b = it.bonuses || {};
      sum.xpPct += Number(b.xpPct || 0);
      sum.gateDmg += Number(b.gateDmg || 0);
      sum.crit += Number(b.crit || 0);
      sum.def += Number(b.def || 0);
    });

    // ✅ hard defaults so .toFixed never crashes
    if (!isFinite(sum.gateDmg)) sum.gateDmg = 0;
    if (!isFinite(sum.xpPct)) sum.xpPct = 0;
    if (!isFinite(sum.crit)) sum.crit = 0;
    if (!isFinite(sum.def)) sum.def = 0;

    return sum;
  }

  // Backwards compatible aliases used by older modules:
  // gates/log refer to bonuses()
  function bonuses() { return activeBonuses(); }

  window.IronQuestEquipment = {
    // core
    load, save,
    getState, setState,
    // inventory
    addItem,
    equip, unequip,
    // computed
    equippedItems,
    equippedNames,      // ✅ fix for your gates error
    activeBonuses,
    bonuses             // ✅ compat alias
  };
})();
