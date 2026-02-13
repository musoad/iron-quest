// js/attributes.js
window.Attributes = (function(){
  function fromEntry(e){
    const xp = Number(e?.xp || 0);
    const t = e?.type || "";
    const out = { STR:0, STA:0, END:0, MOB:0 };

    if(t==="Mehrgelenkig") out.STR += xp;
    else if(t==="Unilateral") out.STA += xp;
    else if(t==="Conditioning") out.END += xp;
    else if(t==="Jogging") out.END += xp;            // ✅ Jogging = END
    else if(t==="Core") out.MOB += xp;
    else if(t==="Komplexe"){ out.STR += xp*0.4; out.STA += xp*0.2; out.END += xp*0.2; out.MOB += xp*0.2; }
    else if(t==="NEAT"){ out.END += xp*0.7; out.MOB += xp*0.3; }

    return out;
  }

  return { fromEntry };
})();
