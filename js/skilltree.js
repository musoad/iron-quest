/* skilltree.js – CLASSIC SCRIPT
   Exposes: window.IronQuestSkilltree
*/

(function () {
  const KEY = "iq_skilltree_v4";

  function load() {
    return (window.IQ?.loadJSON?.(KEY, null)) || {
      spent: 0,
      unlocked: { STR: 0, STA: 0, END: 0, MOB: 0 }, // each point = +2%
    };
  }

  function save(st) {
    window.IQ?.saveJSON?.(KEY, st);
  }

  function getMultiplier(type) {
    const st = load();
    // map exercise type -> attribute bucket
    const bucket =
      type === "Mehrgelenkig" ? "STR" :
      type === "Unilateral" ? "STA" :
      type === "Conditioning" ? "END" :
      type === "Core" ? "MOB" : null;

    if (!bucket) return 1;
    const pts = st.unlocked[bucket] || 0;
    return 1 + pts * 0.02;
  }

  function renderSkilltreePanel(targetSelector) {
    const root = document.querySelector(targetSelector);
    if (!root) return;

    const st = load();
    const rows = ["STR", "STA", "END", "MOB"].map((k) => {
      const pts = st.unlocked[k] || 0;
      const mult = (1 + pts * 0.02).toFixed(2);
      return `
        <div class="card">
          <h3>${k}</h3>
          <div class="row2">
            <div class="pill"><b>Punkte:</b> ${pts}</div>
            <div class="pill"><b>XP Mult:</b> x${mult}</div>
          </div>
          <div class="row2">
            <button class="secondary" data-add="${k}">+1 Punkt</button>
            <button class="danger" data-sub="${k}">-1 Punkt</button>
          </div>
          <p class="hint">Jeder Punkt = +2% XP für passende Übungen.</p>
        </div>
      `;
    }).join("");

    root.innerHTML = `
      <div class="card">
        <h2>Skilltree</h2>
        <p class="hint">Einfaches System (stabil): STR/STA/END/MOB Punkte → XP Bonus.</p>
      </div>
      ${rows}
      <div class="card">
        <button class="danger" id="resetSkill">Reset Skilltree</button>
      </div>
    `;

    root.querySelectorAll("[data-add]").forEach((btn) => {
      btn.onclick = () => {
        const k = btn.getAttribute("data-add");
        const s = load();
        s.unlocked[k] = (s.unlocked[k] || 0) + 1;
        save(s);
        renderSkilltreePanel(targetSelector);
      };
    });

    root.querySelectorAll("[data-sub]").forEach((btn) => {
      btn.onclick = () => {
        const k = btn.getAttribute("data-sub");
        const s = load();
        s.unlocked[k] = Math.max(0, (s.unlocked[k] || 0) - 1);
        save(s);
        renderSkilltreePanel(targetSelector);
      };
    });

    root.querySelector("#resetSkill").onclick = () => {
      if (!confirm("Skilltree wirklich resetten?")) return;
      save({ spent: 0, unlocked: { STR: 0, STA: 0, END: 0, MOB: 0 } });
      renderSkilltreePanel(targetSelector);
    };
  }

  window.IronQuestSkilltree = { getMultiplier, renderSkilltreePanel };
})();
