/* IRON QUEST – attributes.js (classic)
   ✅ STR/STA/END/MOB aus Einträgen
*/
(function () {
  function fromEntry(e) {
    const out = { STR:0, STA:0, END:0, MOB:0 };
    const xp = e.xp || 0;
    const t = e.type || "";

    if (t === "Mehrgelenkig") out.STR += xp;
    else if (t === "Unilateral") out.STA += xp;
    else if (t === "Conditioning") out.END += xp;
    else if (t === "Core") out.MOB += xp;
    else if (t === "Komplexe") { out.STR += xp*0.4; out.STA += xp*0.2; out.END += xp*0.2; out.MOB += xp*0.2; }
    else if (t === "NEAT") { out.END += xp*0.7; out.MOB += xp*0.3; }
    else if (t === "Boss-Workout") { out.STR += xp*0.25; out.STA += xp*0.25; out.END += xp*0.25; out.MOB += xp*0.25; }
    return out;
  }

  function sum(entries) {
    const a = { STR:0, STA:0, END:0, MOB:0 };
    for (const e of entries) {
      const x = fromEntry(e);
      a.STR += x.STR; a.STA += x.STA; a.END += x.END; a.MOB += x.MOB;
    }
    // round
    a.STR = Math.round(a.STR); a.STA = Math.round(a.STA); a.END = Math.round(a.END); a.MOB = Math.round(a.MOB);
    return a;
  }

  window.IronQuestAttributes = { sum };
})();
