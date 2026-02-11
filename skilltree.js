// skilltree.js
import { $, loadJSON, saveJSON } from "./utils.js";

const KEY_SKILL = "ironquest_skilltree_v20";

export const TREES = [
  { key:"multi", name:"Mehrgelenkig (STR)", gateType:"Mehrgelenkig", domList:"tree-multi" },
  { key:"uni",   name:"Unilateral (STA)",   gateType:"Unilateral",   domList:"tree-uni" },
  { key:"core",  name:"Core (MOB/STA)",     gateType:"Core",         domList:"tree-core" },
  { key:"cond",  name:"Conditioning (END)", gateType:"Conditioning", domList:"tree-cond" },
  { key:"comp",  name:"Komplexe (ELITE)",   gateType:"Komplexe",     domList:"tree-comp" },
];

function defaultNodesForTree(treeKey){
  return [
    { id:`${treeKey}_t1a`, tier:1, cost:1, name:"Tier 1: Foundation I", unlocked:false },
    { id:`${treeKey}_t1b`, tier:1, cost:1, name:"Tier 1: Foundation II", unlocked:false },
    { id:`${treeKey}_t1c`, tier:1, cost:1, name:"Tier 1: Foundation III", unlocked:false },
    { id:`${treeKey}_t2a`, tier:2, cost:2, name:"Tier 2: Advanced I", unlocked:false },
    { id:`${treeKey}_t2b`, tier:2, cost:2, name:"Tier 2: Advanced II", unlocked:false },
    { id:`${treeKey}_t3a`, tier:3, cost:3, name:"Tier 3: Mastery", unlocked:false },
    { id:`${treeKey}_cap`, tier:4, cost:5, name:"Capstone: Ascension", unlocked:false },
  ];
}

function loadSkillState(){
  const fallback = {
    spent: 0,
    nodes: Object.fromEntries(TREES.map(t => [t.key, defaultNodesForTree(t.key)]))
  };
  const st = loadJSON(KEY_SKILL, fallback);
  for (const t of TREES) if (!st.nodes?.[t.key]) st.nodes[t.key] = defaultNodesForTree(t.key);
  if (typeof st.spent !== "number") st.spent = 0;
  return st;
}
function saveSkillState(st){ saveJSON(KEY_SKILL, st); }

function countUnlocked(nodes, tier){ return nodes.filter(n => n.tier === tier && n.unlocked).length; }
function isNodeAvailable(nodes, node){
  if (node.unlocked) return false;
  if (node.tier === 1) return true;
  if (node.tier === 2) return countUnlocked(nodes, 1) >= 2;
  if (node.tier === 3) return countUnlocked(nodes, 2) >= 2;
  if (node.tier === 4) return countUnlocked(nodes, 3) >= 1;
  return false;
}

export function computeSkillPointsEarned(entries, starsForDayFn, getStarThresholdsForWeekFn, getWeekFromDateFn){
  const dayXP = {};
  for (const e of entries) dayXP[e.date] = (dayXP[e.date] || 0) + (e.xp || 0);

  let points = 0;
  for (const dayISO of Object.keys(dayXP)){
    const w = getWeekFromDateFn(dayISO);
    const thr = getStarThresholdsForWeekFn(w, entries);
    const s = starsForDayFn(dayXP[dayISO] || 0, thr);
    if (s === "⭐") points += 1;
    else if (s === "⭐⭐") points += 2;
    else if (s === "⭐⭐⭐") points += 3;
  }
  const bossClears = entries.filter(e => e.type === "Boss" && String(e.exercise||"").startsWith("Bossfight CLEARED")).length;
  points += bossClears * 3;

  const ach = entries.filter(e => e.type === "Achievement").length;
  points += ach;

  return points;
}

export function computeSkillPointsAvailable(entries, starsForDayFn, getStarThresholdsForWeekFn, getWeekFromDateFn){
  const earned = computeSkillPointsEarned(entries, starsForDayFn, getStarThresholdsForWeekFn, getWeekFromDateFn);
  const st = loadSkillState();
  const spent = st.spent || 0;
  return { earned, spent, available: Math.max(0, earned - spent) };
}

export function skillMultiplierForType(type){
  const st = loadSkillState();
  const mapKey =
    type === "Mehrgelenkig" ? "multi" :
    type === "Unilateral" ? "uni" :
    type === "Core" ? "core" :
    type === "Conditioning" ? "cond" :
    type === "Komplexe" ? "comp" : null;

  if (!mapKey) return 1;

  const nodes = st.nodes?.[mapKey] || [];
  const unlockedCount = nodes.filter(n => n.unlocked).length;
  const hasCap = nodes.find(n => n.id.endsWith("_cap"))?.unlocked === true;

  let mult = 1 + unlockedCount * 0.02; // +2% pro Node
  if (hasCap) mult += 0.05;            // Capstone +5%
  if (mapKey === "comp" && hasCap) mult += 0.03; // extra für Komplexe

  return mult;
}

function getActiveTreeGates(entries, currentWeek){
  const typesThisWeek = new Set(entries.filter(e => e.week === currentWeek).map(e => e.type));
  return Object.fromEntries(TREES.map(t => [t.key, typesThisWeek.has(t.gateType)]));
}

export function renderSkillTrees(entries, curWeek, spAvailable){
  const st = loadSkillState();
  const gates = getActiveTreeGates(entries, curWeek);

  ["multi","uni","core","cond","comp"].forEach(k=>{
    const el = $("sp-"+k);
    if (el) el.textContent = spAvailable;
  });

  for (const tree of TREES){
    const ul = $(tree.domList);
    if (!ul) continue;
    ul.innerHTML = "";

    const gateOk = !!gates[tree.key];
    const head = document.createElement("li");
    head.innerHTML = `<div class="hint"><b>${tree.name}</b> • Gate: ${gateOk ? "✅ aktiv" : "🔒 gesperrt (diese Woche nicht trainiert)"}</div>`;
    ul.appendChild(head);

    const nodes = st.nodes[tree.key];
    nodes.forEach(node => {
      const available = isNodeAvailable(nodes, node);
      const canBuy = gateOk && available && (spAvailable >= node.cost);

      const li = document.createElement("li");
      const status = node.unlocked ? "✅ unlocked" : (available ? "🔓 verfügbar" : "🔒 locked");
      li.innerHTML = `
        <div class="entryRow">
          <div style="min-width:0;">
            <div><b>${node.name}</b></div>
            <div class="hint">Cost: ${node.cost} SP • ${status} • Effekt: +2% XP (Capstone extra)</div>
          </div>
          <div class="row" style="margin:0; align-items:flex-start;">
            <button class="secondary" style="width:auto; padding:10px 12px;" data-node="${node.id}" ${canBuy ? "" : "disabled"}>
              ${node.unlocked ? "Unlocked" : "Unlock"}
            </button>
          </div>
        </div>
      `;
      ul.appendChild(li);
    });
  }

  qsa("[data-node]").forEach(btn => {
    btn.onclick = () => {
      const id = btn.getAttribute("data-node");
      const st2 = loadSkillState();

      let found=null, treeKey=null;
      for (const t of TREES){
        const n = st2.nodes[t.key].find(x=>x.id===id);
        if (n) { found=n; treeKey=t.key; break; }
      }
      if (!found) return;

      const nodes = st2.nodes[treeKey];
      const gateOk = !!gates[treeKey];
      if (!gateOk) return alert("Tree gesperrt – trainiere den Typ diese Woche.");
      if (found.unlocked) return;
      if (!isNodeAvailable(nodes, found)) return alert("Noch locked – erfülle Tier-Voraussetzungen.");
      if (spAvailable < found.cost) return alert("Nicht genug Skillpunkte.");

      found.unlocked = true;
      st2.spent = (st2.spent || 0) + found.cost;
      saveSkillState(st2);

      document.dispatchEvent(new CustomEvent("iq:rerender"));
    };
  });
}

export function resetSkillTree(){
  const st = loadSkillState();
  st.spent = 0;
  st.nodes = Object.fromEntries(TREES.map(t => [t.key, defaultNodesForTree(t.key)]));
  saveSkillState(st);
}
