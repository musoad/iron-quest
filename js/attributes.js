export function attrReqForLevel(level) {
  return 900 + (Math.max(1, level) - 1) * 150;
}

export function attrLevelFromXp(totalXp) {
  let lvl = 1;
  let xp = Math.max(0, Math.round(totalXp || 0));
  while (lvl < 999) {
    const req = attrReqForLevel(lvl);
    if (xp >= req) { xp -= req; lvl += 1; }
    else break;
  }
  return { lvl, into: xp, need: attrReqForLevel(lvl) };
}

// Mapping: verteilt XP auf Attribute
export function attrFromEntry(e) {
  const out = { STR:0, STA:0, END:0, MOB:0 };
  const xp = Number(e.xp || 0);
  const t = e.type || "";

  if (t === "Mehrgelenkig") out.STR += xp;
  else if (t === "Unilateral") out.STA += xp;
  else if (t === "Conditioning") out.END += xp;
  else if (t === "Core") out.MOB += xp;
  else if (t === "Komplexe") { out.STR += xp*0.4; out.STA += xp*0.2; out.END += xp*0.2; out.MOB += xp*0.2; }
  else if (t === "NEAT") { out.END += xp*0.7; out.MOB += xp*0.3; }

  return out;
}
