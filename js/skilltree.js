/* skilltree.js – minimal ES Module skilltree + multiplier */

import { loadJSON, saveJSON } from "./utils.js";

const KEY_SKILL = "iq_skilltree_v4";

const TYPES = ["Mehrgelenkig", "Unilateral", "Core", "Conditioning", "Komplexe", "NEAT"];
const DEFAULT = {
  spent: 0,
  nodes: Object.fromEntries(TYPES.map(t => [t, { unlocked: 0 }]))
};

export function getSkillState() {
  const st = loadJSON(KEY_SKILL, DEFAULT);
  for (const t of TYPES) {
    st.nodes[t] ??= { unlocked: 0 };
    if (typeof st.nodes[t].unlocked !== "number") st.nodes[t].unlocked = 0;
  }
  if (typeof st.spent !== "number") st.spent = 0;
  return st;
}

export function saveSkillState(st) {
  saveJSON(KEY_SKILL, st);
}

// simple: each unlock = +2% xp for that type
export function skillMultiplierForType(type) {
  const st = getSkillState();
  const u = st.nodes?.[type]?.unlocked || 0;
  return 1 + u * 0.02;
}

export function renderSkilltreePanel(container, player, entries) {
  if (!container) return;
  const st = getSkillState();

  // earned points: 1 point per 1000 total xp (simple + stable)
  const earned = Math.floor((player.totalXp || 0) / 1000);
  const available = Math.max(0, earned - (st.spent || 0));

  container.innerHTML = `
    <div class="card">
      <h2>Skilltree</h2>
      <p class="hint">Einfaches System: 1 Skillpunkt pro 1000 Gesamt-XP. Jeder Unlock: +2% XP für den Typ.</p>
      <div class="row2">
        <div class="pill"><b>Earned:</b> ${earned}</div>
        <div class="pill"><b>Spent:</b> ${st.spent}</div>
        <div class="pill"><b>Available:</b> ${available}</div>
      </div>
    </div>

    <div class="card">
      <h2>Unlocks</h2>
      <div class="grid2" id="skillGrid"></div>
      <button class="danger" id="skillReset">Skilltree reset</button>
    </div>
  `;

  const grid = container.querySelector("#skillGrid");
  TYPES.forEach(t => {
    const u = st.nodes[t].unlocked || 0;
    const mult = skillMultiplierForType(t);
    const div = document.createElement("div");
    div.className = "skillbox";
    div.innerHTML = `
      <h3>${t}</h3>
      <p>Unlocked: <b>${u}</b></p>
      <p>Multiplier: <b>x${mult.toFixed(2)}</b></p>
      <button class="secondary" data-up="${t}" ${available <= 0 ? "disabled":""}>+1 Unlock (1 SP)</button>
    `;
    grid.appendChild(div);
  });

  container.querySelectorAll("[data-up]").forEach(btn => {
    btn.addEventListener("click", () => {
      const t = btn.getAttribute("data-up");
      const st2 = getSkillState();
      const earned2 = Math.floor((player.totalXp || 0) / 1000);
      const available2 = Math.max(0, earned2 - (st2.spent || 0));
      if (available2 <= 0) return alert("Keine Skillpunkte verfügbar.");
      st2.nodes[t].unlocked = (st2.nodes[t].unlocked || 0) + 1;
      st2.spent = (st2.spent || 0) + 1;
      saveSkillState(st2);
      renderSkilltreePanel(container, player, entries);
    });
  });

  container.querySelector("#skillReset")?.addEventListener("click", () => {
    if (!confirm("Skilltree wirklich resetten?")) return;
    saveSkillState(DEFAULT);
    renderSkilltreePanel(container, player, entries);
  });
}
