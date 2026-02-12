import { loadJSON, saveJSON } from "./utils.js";

const KEY = "iq_skilltree_v4";

const TREES = [
  { key:"multi", name:"Mehrgelenkig (STR)", type:"Mehrgelenkig" },
  { key:"uni",   name:"Unilateral (STA)",   type:"Unilateral" },
  { key:"core",  name:"Core (MOB)",         type:"Core" },
  { key:"cond",  name:"Conditioning (END)", type:"Conditioning" },
  { key:"comp",  name:"Komplexe (ELITE)",   type:"Komplexe" },
];

function defaultState() {
  const nodes = {};
  for (const t of TREES) {
    nodes[t.key] = [
      { id:`${t.key}_1`, name:"Foundation I", cost:1, unlocked:false },
      { id:`${t.key}_2`, name:"Foundation II", cost:1, unlocked:false },
      { id:`${t.key}_3`, name:"Advanced", cost:2, unlocked:false },
      { id:`${t.key}_4`, name:"Mastery", cost:3, unlocked:false },
      { id:`${t.key}_cap`, name:"Capstone", cost:5, unlocked:false },
    ];
  }
  return { spent:0, nodes };
}

export function loadSkill() {
  const st = loadJSON(KEY, defaultState());
  if (!st.nodes) return defaultState();
  return st;
}

export function saveSkill(st) {
  saveJSON(KEY, st);
}

export function skillMultiplierForType(type) {
  const st = loadSkill();
  const key =
    type === "Mehrgelenkig" ? "multi" :
    type === "Unilateral" ? "uni" :
    type === "Core" ? "core" :
    type === "Conditioning" ? "cond" :
    type === "Komplexe" ? "comp" : null;

  if (!key) return 1;

  const nodes = st.nodes[key] || [];
  const unlocked = nodes.filter(n => n.unlocked).length;
  const cap = nodes.find(n => n.id.endsWith("_cap"))?.unlocked === true;

  let mult = 1 + unlocked * 0.02;
  if (cap) mult += 0.05;
  return mult;
}

export function computeSkillPoints(entries) {
  // Punkte: pro Tag 0..3 nach Sternen; Boss/Challenge können später addiert werden
  const dayXP = {};
  for (const e of entries) dayXP[e.date] = (dayXP[e.date] || 0) + (e.xp || 0);

  let earned = 0;
  for (const d of Object.keys(dayXP)) {
    const xp = dayXP[d];
    if (xp >= 2000) earned += 3;
    else if (xp >= 1600) earned += 2;
    else if (xp >= 1200) earned += 1;
  }

  const st = loadSkill();
  const spent = Number(st.spent || 0);
  return { earned, spent, available: Math.max(0, earned - spent) };
}

export function skillTrees() {
  return TREES;
}

export function unlockNode(nodeId, entries) {
  const st = loadSkill();
  const sp = computeSkillPoints(entries);

  for (const t of TREES) {
    const nodes = st.nodes[t.key] || [];
    const node = nodes.find(n => n.id === nodeId);
    if (!node) continue;

    if (node.unlocked) return { ok:false, msg:"Schon freigeschaltet." };
    if (sp.available < node.cost) return { ok:false, msg:"Nicht genug Skillpunkte." };

    node.unlocked = true;
    st.spent = (st.spent || 0) + node.cost;
    saveSkill(st);
    return { ok:true, msg:"Unlocked ✅" };
  }

  return { ok:false, msg:"Node nicht gefunden." };
}

export function resetSkill() {
  saveSkill(defaultState());
}
