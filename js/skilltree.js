/* =========================
   IRON QUEST – skilltree.js (Classic)
   Exposes:
   - window.IronQuestSkilltree.render(state)
   - window.IQ.getSkillMultiplier(type)
========================= */

(function () {
  const KEY = "ironquest_skilltree_v1";
  window.IQ = window.IQ || {};

  const TYPES = ["Mehrgelenkig", "Unilateral", "Core", "Conditioning", "Komplexe", "NEAT"];

  function load() {
    try {
      const st = JSON.parse(localStorage.getItem(KEY));
      if (st && st.nodes) return st;
    } catch {}
    const nodes = {};
    TYPES.forEach(t => nodes[t] = 0); // points per type
    return { nodes };
  }

  function save(st) {
    localStorage.setItem(KEY, JSON.stringify(st));
  }

  // Each point = +2% XP, cap at 30% (15 points)
  function getMultiplier(type) {
    const st = load();
    const pts = Math.max(0, Math.min(15, Number(st.nodes[type] || 0)));
    return 1 + pts * 0.02;
  }

  window.IQ.getSkillMultiplier = function (type) {
    return getMultiplier(type);
  };

  function render(state) {
    const sec = document.getElementById("skills");
    if (!sec) return;

    const st = load();

    sec.innerHTML = `
      <h2>🌳 Skilltree</h2>
      <p class="hint">Pro Typ kannst du Punkte vergeben. Jeder Punkt gibt +2% XP (max 30%).</p>

      <div class="card">
        <div id="skList"></div>
        <button id="skReset" class="danger">Skilltree Reset</button>
      </div>
    `;

    const wrap = document.getElementById("skList");
    if (!wrap) return;

    wrap.innerHTML = TYPES.map(t => {
      const pts = Number(st.nodes[t] || 0);
      const mult = getMultiplier(t).toFixed(2);
      return `
        <div class="row2" style="align-items:center;margin:10px 0;">
          <div class="pill" style="flex:1;">
            <b>${t}</b><br><span class="hint">Punkte: ${pts} • Mult: x${mult}</span>
          </div>
          <button data-add="${t}" class="secondary">+1</button>
          <button data-sub="${t}" class="secondary">-1</button>
        </div>
      `;
    }).join("");

    wrap.querySelectorAll("button[data-add]").forEach(btn => {
      btn.addEventListener("click", () => {
        const t = btn.getAttribute("data-add");
        const st2 = load();
        st2.nodes[t] = Math.min(15, Number(st2.nodes[t] || 0) + 1);
        save(st2);
        render(state);
      });
    });

    wrap.querySelectorAll("button[data-sub]").forEach(btn => {
      btn.addEventListener("click", () => {
        const t = btn.getAttribute("data-sub");
        const st2 = load();
        st2.nodes[t] = Math.max(0, Number(st2.nodes[t] || 0) - 1);
        save(st2);
        render(state);
      });
    });

    document.getElementById("skReset")?.addEventListener("click", () => {
      if (confirm("Skilltree wirklich zurücksetzen?")) {
        localStorage.removeItem(KEY);
        render(state);
      }
    });
  }

  window.IronQuestSkilltree = { render };
})();
