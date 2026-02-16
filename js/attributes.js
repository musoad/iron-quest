(() => {
  function computeAttributes(entries) {
    const attr = { STR:0, STA:0, END:0, MOB:0 };
    for (const e of entries || []) {
      const xp = Number(e.xp || 0);
      const t = e.type || "";
      if (t === "Mehrgelenkig") attr.STR += xp;
      else if (t === "Unilateral") attr.STA += xp;
      else if (t === "Conditioning") attr.END += xp;
      else if (t === "Core") attr.MOB += xp;
      else if (t === "Joggen") { attr.END += xp * 0.8; attr.MOB += xp * 0.2; }
      else if (t === "Komplexe") { attr.STR += xp*0.4; attr.STA += xp*0.2; attr.END += xp*0.2; attr.MOB += xp*0.2; }
    }
    return attr;
  }

  window.IronQuestAttributes = { computeAttributes };
})();
