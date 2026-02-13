// js/skilltree.js
window.SkillTree = (function(){
  const KEY = "ironquest_skill_v1";
  const TYPE_BUCKET = {
    Mehrgelenkig: "STR",
    Unilateral: "STA",
    Conditioning: "END",
    Jogging: "END",      // ✅ Jogging = END
    Core: "MOB",
    Komplexe: "ELITE"
  };

  function load(){
    try { return JSON.parse(localStorage.getItem(KEY)) || { STR:0, STA:0, END:0, MOB:0, ELITE:0 }; }
    catch { return { STR:0, STA:0, END:0, MOB:0, ELITE:0 }; }
  }
  function save(s){ localStorage.setItem(KEY, JSON.stringify(s)); }

  function addPoint(bucket){
    const s = load();
    s[bucket] = (s[bucket]||0) + 1;
    save(s);
    return s;
  }

  function getMultiplier(type){
    const s = load();
    const bucket = TYPE_BUCKET[type] || null;
    if(!bucket) return 1.0;
    const pts = Number(s[bucket]||0);
    // 2% pro Punkt + Capstone (wenn >=10) extra 5%
    let mult = 1 + pts*0.02;
    if(pts >= 10) mult += 0.05;
    return Number(mult.toFixed(4));
  }

  function render(container){
    const s = load();
    container.innerHTML = `
      <div class="card">
        <h2>Skilltree</h2>
        <p class="sub">+1 Punkt = +2% XP (ab 10 Punkten +5% extra)</p>

        <div class="grid2">
          ${["STR","STA","END","MOB","ELITE"].map(k=>`
            <div class="mini">
              <div class="row">
                <b>${k}</b>
                <span class="pill">${s[k]||0} Punkte</span>
              </div>
              <button class="btn" data-skill="${k}">+1 Punkt</button>
            </div>
          `).join("")}
        </div>
      </div>
    `;

    container.querySelectorAll("[data-skill]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        addPoint(btn.getAttribute("data-skill"));
        render(container);
      });
    });
  }

  return { load, addPoint, getMultiplier, render };
})();
