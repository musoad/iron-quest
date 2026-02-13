// js/attributes.js ✅

(function () {
  function computeAttributes(entries) {
    const a = { STR: 0, STA: 0, END: 0, MOB: 0 };

    for (const e of entries) {
      const xp = Number(e.xp || 0);
      const t = e.type || "";

      if (t === "Mehrgelenkig") a.STR += xp;
      else if (t === "Unilateral") a.STA += xp;
      else if (t === "Conditioning") a.END += xp;
      else if (t === "Core") a.MOB += xp;
      else if (t === "Komplexe") { a.STR += xp * 0.4; a.STA += xp * 0.2; a.END += xp * 0.2; a.MOB += xp * 0.2; }
      else if (t === "NEAT") { a.END += xp * 0.7; a.MOB += xp * 0.3; }
    }

    return a;
  }

  function levelFromXP(xp) {
    xp = Math.max(0, Math.round(xp || 0));
    let lvl = 1;
    let need = 900;

    while (xp >= need && lvl < 999) {
      xp -= need;
      lvl++;
      need = 900 + (lvl - 1) * 150;
    }
    return { lvl, into: xp, need };
  }

  window.IronQuestAttributes = { computeAttributes, levelFromXP };
})();
