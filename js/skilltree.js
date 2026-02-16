(() => {
  "use strict";

  const KEY = "ironquest_skilltree_v5";

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || { multi:0, uni:0, core:0, cond:0, comp:0 }; }
    catch { return { multi:0, uni:0, core:0, cond:0, comp:0 }; }
  }
  function save(st) { localStorage.setItem(KEY, JSON.stringify(st)); }

  function multiplierForType(type) {
    const st = load();
    const k =
      type === "Mehrgelenkig" ? "multi" :
      type === "Unilateral"   ? "uni" :
      type === "Core"         ? "core" :
      type === "Conditioning" ? "cond" :
      type === "Komplexe"     ? "comp" : null;
    if (!k) return 1.0;
    const pts = Number(st[k] || 0);
    return 1.0 + Math.min(0.25, pts * 0.02);
  }

  async function renderSkilltree(el) {
    const st = load();
    el.innerHTML = `
      <div class="card">
        <h2>Skilltree</h2>
        <p class="hint">Jeder Punkt gibt +2% XP auf den Typ (max 25%).</p>
        <div class="grid2">
          ${["multi","uni","core","cond","comp"].map(k => `
            <div class="skillbox">
              <h3>${k.toUpperCase()}</h3>
              <div class="pill"><b>Punkte:</b> ${st[k]||0}</div>
              <button class="secondary" data-add="${k}">+1 Punkt</button>
              <button class="danger" data-sub="${k}">-1 Punkt</button>
            </div>
          `).join("")}
        </div>
      </div>
    `;

    el.querySelectorAll("[data-add]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const k = btn.getAttribute("data-add");
        const s2 = load();
        s2[k] = (s2[k]||0) + 1;
        save(s2);
        renderSkilltree(el);
      });
    });
    el.querySelectorAll("[data-sub]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const k = btn.getAttribute("data-sub");
        const s2 = load();
        s2[k] = Math.max(0, (s2[k]||0) - 1);
        save(s2);
        renderSkilltree(el);
      });
    });
  }

  window.IronQuestSkilltree = { multiplierForType, renderSkilltree };
})();
