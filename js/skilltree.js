(() => {
  "use strict";
  const KEY="ironquest_skilltree_v5";

  function load(){
    try{ return JSON.parse(localStorage.getItem(KEY)) || { multi:0, uni:0, core:0, cond:0, comp:0 }; }
    catch{ return { multi:0, uni:0, core:0, cond:0, comp:0 }; }
  }
  function save(st){ localStorage.setItem(KEY, JSON.stringify(st)); }

  function multiplierForType(type){
    const st = load();
    const k =
      type==="Mehrgelenkig" ? "multi" :
      type==="Unilateral" ? "uni" :
      type==="Core" ? "core" :
      (type==="Conditioning" || type==="NEAT" || type==="Joggen") ? "cond" :
      type==="Komplexe" ? "comp" : null;
    if (!k) return 1;
    const pts = Number(st[k]||0);
    return 1 + Math.min(0.25, pts*0.02);
  }

  function renderSkilltree(el){
    const st = load();
    const rows = [
      ["multi","MULTI (Mehrgelenkig)"],
      ["uni","UNI (Unilateral)"],
      ["core","CORE"],
      ["cond","END (Conditioning/NEAT)"],
      ["comp","SKILL (Komplex)"],
    ];

    el.innerHTML = `
      <div class="card">
        <h2>Skilltree</h2>
        <p class="hint">Jeder Punkt: +2% XP (max 25%).</p>
        <div class="row2">
          ${rows.map(([k,label])=>`
            <div class="skillbox">
              <h3>${label}</h3>
              <div class="pill"><b>Punkte:</b> ${st[k]||0}</div>
              <div class="btnRow">
                <button class="secondary" data-add="${k}">+1</button>
                <button class="danger" data-sub="${k}">-1</button>
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    `;

    el.querySelectorAll("[data-add]").forEach(b=>b.onclick=()=>{
      const k=b.dataset.add; const s=load(); s[k]=(s[k]||0)+1; save(s); renderSkilltree(el);
      window.Toast?.toast("Skill Point", `${k.toUpperCase()} +1`);
    });
    el.querySelectorAll("[data-sub]").forEach(b=>b.onclick=()=>{
      const k=b.dataset.sub; const s=load(); s[k]=Math.max(0,(s[k]||0)-1); save(s); renderSkilltree(el);
    });
  }

  window.IronQuestSkilltree = { multiplierForType, renderSkilltree };
})();
