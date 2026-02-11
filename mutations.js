// mutations.js
import { loadJSON, saveJSON } from "./utils.js";

const KEY_MUT = "ironquest_mutations_v20";

export const MUTATIONS = [
  { id:"tempo", name:"Tempo Week", desc:"Langsame Exzentrik, saubere ROM.", effect:"STR/STA XP +10%", mult:{ STR:1.10, STA:1.10 } },
  { id:"corefocus", name:"Core Focus", desc:"Core & Kontrolle im Zentrum.", effect:"MOB XP +25%", mult:{ MOB:1.25 } },
  { id:"engine", name:"Engine Mode", desc:"Konditionierung bekommt den Boost.", effect:"END XP +15%", mult:{ END:1.15 } },
  { id:"neatboost", name:"NEAT Boost", desc:"Alltag zählt mehr.", effect:"NEAT XP +20%", mult:{ NEAT:1.20 } },
  { id:"unilateral", name:"Unilateral Blessing", desc:"Stabilität und Balance.", effect:"STA XP +15%", mult:{ STA:1.15 } },
];

function loadMutMap(){ return loadJSON(KEY_MUT, {}); }
function saveMutMap(m){ saveJSON(KEY_MUT, m); }

export function getMutationForWeek(week) {
  const w = Math.max(1, Math.min(52, Number(week || 1)));
  const map = loadMutMap();
  if (!map[w]) {
    const choice = MUTATIONS[Math.floor(Math.random() * MUTATIONS.length)];
    map[w] = choice.id;
    saveMutMap(map);
  }
  return MUTATIONS.find(m => m.id === map[w]) || MUTATIONS[0];
}

export function mutationXpMultiplierForType(type, mutation) {
  if (!mutation?.mult) return 1;
  if (type === "NEAT" && mutation.mult.NEAT) return mutation.mult.NEAT;
  if (type === "Mehrgelenkig" && mutation.mult.STR) return mutation.mult.STR;
  if (type === "Unilateral" && mutation.mult.STA) return mutation.mult.STA;
  if (type === "Conditioning" && mutation.mult.END) return mutation.mult.END;
  if (type === "Core" && mutation.mult.MOB) return mutation.mult.MOB;
  if (type === "Komplexe") {
    const ms = [mutation.mult.STR, mutation.mult.STA, mutation.mult.END, mutation.mult.MOB].filter(Boolean);
    if (!ms.length) return 1;
    return ms.reduce((a,b)=>a+b,0) / ms.length;
  }
  return 1;
}

export function resetMutations() {
  localStorage.removeItem(KEY_MUT);
}
