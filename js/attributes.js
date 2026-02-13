(function(){
  function addAttrTotalsFromEntry(totals, entry){
    const xp = Number(entry.xp||0);
    const t = entry.type || "";

    if (t === "Mehrgelenkig") totals.STR += xp;
    else if (t === "Unilateral") totals.STA += xp;
    else if (t === "Conditioning") totals.END += xp;
    else if (t === "Core") totals.MOB += xp;
    else if (t === "Komplexe") {
      totals.STR += xp*0.4; totals.STA += xp*0.2; totals.END += xp*0.2; totals.MOB += xp*0.2;
    } else if (t === "NEAT") {
      totals.END += xp*0.7; totals.MOB += xp*0.3;
    } else if (t === "Boss") {
      totals.STR += xp*0.25; totals.STA += xp*0.25; totals.END += xp*0.25; totals.MOB += xp*0.25;
    }
  }

  function attrLevelFromXP(xp){
    let lvl = 1;
    let v = Math.max(0, Math.round(xp||0));
    function req(l){ return 900 + (l-1)*150; }
    while (v >= req(lvl) && lvl < 999){
      v -= req(lvl);
      lvl++;
    }
    return { lvl, into: v, need: req(lvl) };
  }

  window.IronQuestAttributes = {
    addAttrTotalsFromEntry,
    attrLevelFromXP
  };
})();
