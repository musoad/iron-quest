(() => {
  "use strict";

  // Skilltree V2 (passive points + active buffs)
  // iOS/Safari-safe: uses localStorage only.

  const STORAGE_KEY = "iq_skilltree_v2_state";
  const ACTIVE_KEY = "iq_skilltree_v2_active";
  const COOLDOWN_KEY = "iq_skilltree_v2_cooldowns";

  const TYPES = ["MULTI", "UNI", "CORE", "END"];
  const MAX_PASSIVE = 25; // max points per type
  const PASSIVE_PER_POINT = 0.02; // +2% per point

  // Active buffs are multipliers (XP system multiplies directly).
  const ACTIVE = [
    {
      id: "FOCUS_SURGE",
      name: "Focus Surge",
      desc: "Next entry gets +15% XP.",
      durationMin: 30,
      cooldownMin: 240,
      effect: { globalXp: 1.15 }
    },
    {
      id: "IRON_WILL",
      name: "Iron Will",
      desc: "Next entry gets +10% XP and +5% streak power.",
      durationMin: 60,
      cooldownMin: 360,
      effect: { globalXp: 1.10, streakXp: 1.05 }
    },
    {
      id: "BLOOD_RUSH",
      name: "Blood Rush",
      desc: "Next entry gets +10% XP and +10% volume bonus.",
      durationMin: 30,
      cooldownMin: 360,
      effect: { globalXp: 1.10, volume: 1.10 }
    }
  ];

  function safeParse(json, fallback) {
    try {
      const v = JSON.parse(json);
      return v ?? fallback;
    } catch {
      return fallback;
    }
  }

  function defaultState() {
    return {
      passive: { MULTI: 0, UNI: 0, CORE: 0, END: 0 },
      updatedAt: Date.now()
    };
  }

  function load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    const state = raw ? safeParse(raw, defaultState()) : defaultState();
    state.passive = state.passive || {};
    for (const t of TYPES) {
      const n = Number(state.passive[t] || 0);
      state.passive[t] = Number.isFinite(n) ? Math.max(0, Math.min(MAX_PASSIVE, n)) : 0;
    }
    return state;
  }

  function save(state) {
    const s = state || defaultState();
    s.updatedAt = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    return s;
  }

  function passiveMultiplier(type) {
    const s = load();
    const pts = Number(s.passive?.[type] || 0);
    return 1 + (Math.max(0, Math.min(MAX_PASSIVE, pts)) * PASSIVE_PER_POINT);
  }

  function allPassiveMultipliers() {
    const out = {};
    for (const t of TYPES) out[t] = passiveMultiplier(t);
    return out;
  }

  function addPassivePoint(type, delta = 1) {
    const s = load();
    if (!TYPES.includes(type)) return s;
    const v = Number(s.passive[type] || 0) + Number(delta || 0);
    s.passive[type] = Math.max(0, Math.min(MAX_PASSIVE, v));
    return save(s);
  }

  function resetPassive() {
    return save(defaultState());
  }

  // --- Active buff helpers ---
  function getCooldowns() {
    return safeParse(localStorage.getItem(COOLDOWN_KEY) || "{}", {});
  }

  function setCooldown(id, until) {
    const cd = getCooldowns();
    cd[id] = until;
    localStorage.setItem(COOLDOWN_KEY, JSON.stringify(cd));
  }

  function getActiveBuff() {
    const raw = localStorage.getItem(ACTIVE_KEY);
    if (!raw) return null;
    const a = safeParse(raw, null);
    if (!a || !a.id) return null;
    if (a.expiresAt && Date.now() > a.expiresAt) {
      localStorage.removeItem(ACTIVE_KEY);
      return null;
    }
    return a;
  }

  function clearActiveBuff() {
    localStorage.removeItem(ACTIVE_KEY);
  }

  function canUseActive(id) {
    const skill = ACTIVE.find(x => x.id === id);
    if (!skill) return { ok: false, reason: "Unknown skill" };
    const cd = getCooldowns();
    const until = Number(cd[id] || 0);
    if (until && Date.now() < until) {
      const mins = Math.ceil((until - Date.now()) / 60000);
      return { ok: false, reason: `Cooldown: ${mins} min` };
    }
    return { ok: true };
  }

  function useActive(id) {
    const skill = ACTIVE.find(x => x.id === id);
    if (!skill) return { ok: false, reason: "Unknown skill" };
    const check = canUseActive(id);
    if (!check.ok) return check;

    const payload = {
      id: skill.id,
      name: skill.name,
      effect: skill.effect || {},
      usedAt: Date.now(),
      expiresAt: Date.now() + (Number(skill.durationMin || 0) * 60000)
    };

    localStorage.setItem(ACTIVE_KEY, JSON.stringify(payload));
    setCooldown(id, Date.now() + (Number(skill.cooldownMin || 0) * 60000));
    return { ok: true, active: payload };
  }

  // Consume active buff once (Log calls after successful save)
  function consumeActiveBuff() {
    const a = getActiveBuff();
    if (!a) return null;
    clearActiveBuff();
    return a;
  }

  window.IronQuestSkilltreeV2 = {
    TYPES,
    MAX_PASSIVE,
    PASSIVE_PER_POINT,
    ACTIVE,
    load,
    save,
    passiveMultiplier,
    allPassiveMultipliers,
    addPassivePoint,
    resetPassive,
    getActiveBuff,
    clearActiveBuff,
    canUseActive,
    useActive,
    consumeActiveBuff
  };
})();
