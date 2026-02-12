// js/skilltree.js – IRON QUEST v4 PRO
// ✅ ES Module (wichtig für iOS/GitHub Pages)
// ✅ Skilltree (Unlocks) + XP-Multiplikator pro Übungstyp
// Speichert NUR Skilltree-State in localStorage (keine Trainings-Einträge werden verändert)

import { storage } from "./utils.js";

const KEY = "ironquest_skilltree_v4";

const TREES = [
  { key: "multi", title: "Mehrgelenkig (STR)", type: "Mehrgelenkig" },
  { key: "uni",   title: "Unilateral (STA)",   type: "Unilateral" },
  { key: "core",  title: "Core (MOB)",         type: "Core" },
  { key: "cond",  title: "Conditioning (END)", type: "Conditioning" },
  { key: "comp",  title: "Komplexe (ELITE)",   type: "Komplexe" },
];

function defaultNodes(treeKey){
  return [
    { id: `${treeKey}_t1a`, tier: 1, cost: 1, name: "Foundation I", unlocked: false },
    { id: `${treeKey}_t1b`, tier: 1, cost: 1, name: "Foundation II", unlocked: false },
    { id: `${treeKey}_t1c`, tier: 1, cost: 1, name: "Foundation III", unlocked: false },
    { id: `${treeKey}_t2a`, tier: 2, cost: 2, name: "Advanced I", unlocked: false },
    { id: `${treeKey}_t2b`, tier: 2, cost: 2, name: "Advanced II", unlocked: false },
    { id: `${treeKey}_t3a`, tier: 3, cost: 3, name: "Mastery", unlocked: false },
    { id: `${treeKey}_cap`, tier: 4, cost: 5, name: "Capstone", unlocked: false },
  ];
}

function normalize(st){
  st.spent = Number.isFinite(st.spent) ? st.spent : 0;
  st.nodes = st.nodes && typeof st.nodes === "object" ? st.nodes : {};
  for (const t of TREES){
    if (!Array.isArray(st.nodes[t.key])) st.nodes[t.key] = defaultNodes(t.key);
    // add missing nodes if schema changed
    const ids = new Set(st.nodes[t.key].map(n=>n.id));
    for (const n of defaultNodes(t.key)){
      if (!ids.has(n.id)) st.nodes[t.key].push(n);
    }
  }
  return st;
}

function loadState(){
  const st = storage.get(KEY, null);
  if (st && st.nodes) return normalize(st);
  return normalize({ spent: 0, nodes: {} });
}

function saveState(st){ storage.set(KEY, st); }

function countUnlocked(nodes, tier){
  return nodes.filter(n => n.tier === tier && n.unlocked).length;
}

function isAvailable(nodes, node){
  if (node.unlocked) return false;
  if (node.tier === 1) return true;
  if (node.tier === 2) return countUnlocked(nodes, 1) >= 2;
  if (node.tier === 3) return countUnlocked(nodes, 2) >= 2;
  if (node.tier === 4) return countUnlocked(nodes, 3) >= 1;
  return false;
}

// ---- Skillpoints (einfach & stabil)
// 1 SP pro 1000 Gesamt-XP + 2 SP pro Boss-Clear + 1 SP pro Achievement
function computeEarnedSP(entries){
  const totalXp = entries.reduce((s,e)=>s+(Number(e.xp)||0),0);
  const fromXp = Math.floor(totalXp / 1000);

  const bossClears = entries.filter(e =>
    String(e.type||"").toLowerCase() === "boss" &&
    String(e.exercise||"").toLowerCase().includes("cleared")
  ).length;

  const achievements = entries.filter(e => String(e.type||"").toLowerCase() === "achievement").length;

  return fromXp + bossClears * 2 + achievements * 1;
}

function getTreeKeyForType(type){
  return (
    type === "Mehrgelenkig" ? "multi" :
    type === "Unilateral" ? "uni" :
    type === "Core" ? "core" :
    type === "Conditioning" ? "cond" :
    type === "Komplexe" ? "comp" : null
  );
}

export function skillMultiplierForType(type){
  const key = getTreeKeyForType(type);
  if (!key) return 1;

  const st = loadState();
  const nodes = st.nodes[key] || [];
  const unlocked = nodes.filter(n => n.unlocked);
  const hasCap = unlocked.some(n => n.id.endsWith("_cap"));

  let mult = 1 + unlocked.length * 0.02; // +2% je Node
  if (hasCap) mult += 0.05;              // +5% extra
  if (key === "comp" && hasCap) mult += 0.03; // Komplexe Bonus

  return Number(mult.toFixed(4));
}

function renderTreeUI(tree, nodes, spAvail){
  const unlocked = nodes.filter(n=>n.unlocked).length;
  const cap = nodes.find(n=>n.id.endsWith("_cap"))?.unlocked ? "✅" : "—";

  let html = `
    <div class="skillbox">
      <h3>${tree.title}</h3>
      <div class="hint">Unlocked: <b>${unlocked}</b> • Capstone: <b>${cap}</b> • Mult: <b>x${skillMultiplierForType(tree.type).toFixed(2)}</b></div>
      <ul class="skilllist">
  `;

  for (const n of nodes){
    const available = isAvailable(nodes, n);
    const canBuy = available && !n.unlocked && spAvail >= n.cost;

    html += `
      <li class="skillRow">
        <div class="skillLeft">
          <div><b>${n.name}</b> <span class="hint">Tier ${n.tier}</span></div>
          <div class="hint">Kosten: ${n.cost} SP • Effekt: +2% XP (Capstone extra)</div>
        </div>
        <div class="skillRight">
          <button class="secondary" data-skill="${tree.key}" data-node="${n.id}" ${canBuy ? "" : "disabled"}>
            ${n.unlocked ? "Unlocked" : (available ? "Unlock" : "Locked")}
          </button>
        </div>
      </li>
    `;
  }

  html += `</ul></div>`;
  return html;
}

export async function renderSkilltreePanel(container, db){
  if (!container) return;

  const entries = await db.getEntries();
  const st = loadState();

  const earned = computeEarnedSP(entries);
  const spent = st.spent || 0;
  const avail = Math.max(0, earned - spent);

  container.innerHTML = `
    <div class="card">
      <h2>Skilltree</h2>
      <p class="hint">Skillpoints sind ein Motivations-System. Unlocks geben XP-Multiplikator je Übungstyp.</p>

      <div class="row2">
        <div class="pill"><b>Skillpoints earned:</b> <span>${earned}</span></div>
        <div class="pill"><b>Spent:</b> <span>${spent}</span></div>
        <div class="pill"><b>Available:</b> <span id="spAvail">${avail}</span></div>
      </div>

      <div class="divider"></div>

      <div class="grid2" id="skillGrid"></div>

      <div class="divider"></div>
      <button id="resetSkilltree" class="danger" type="button">Skilltree zurücksetzen</button>
    </div>
  `;

  const grid = container.querySelector("#skillGrid");
  if (grid){
    grid.innerHTML = TREES.map(t => renderTreeUI(t, st.nodes[t.key], avail)).join("");
  }

  container.querySelectorAll("button[data-node]").forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      const treeKey = btn.getAttribute("data-skill");
      const nodeId = btn.getAttribute("data-node");

      const entries2 = await db.getEntries();
      const st2 = loadState();
      const earned2 = computeEarnedSP(entries2);
      const avail2 = Math.max(0, earned2 - (st2.spent||0));

      const nodes = st2.nodes?.[treeKey] || [];
      const node = nodes.find(n=>n.id===nodeId);
      if (!node) return;

      if (node.unlocked) return;
      if (!isAvailable(nodes, node)) return;
      if (avail2 < node.cost) return;

      node.unlocked = true;
      st2.spent = (st2.spent||0) + node.cost;
      saveState(st2);

      await renderSkilltreePanel(container, db);
    });
  });

  container.querySelector("#resetSkilltree")?.addEventListener("click", async ()=>{
    if (!confirm("Skilltree wirklich zurücksetzen?")) return;
    saveState({ spent: 0, nodes: {} });
    await renderSkilltreePanel(container, db);
  });
}
