// js/challenges.js ✅

(function () {
  const KEY = "ironquest_challenges_v1";

  const DEFAULT = [
    { id: "c1", name: "5 Trainingstage", desc: "Trainiere an 5 Tagen in einer Woche.", reward: "+5% Reward nächste Woche (auto)" },
    { id: "c2", name: "2x 1600+ XP Tage", desc: "Schaffe 2 starke Tage in einer Woche.", reward: "Motivation Badge" },
    { id: "c3", name: "NEAT 3x", desc: "3x Walking Desk in einer Woche.", reward: "END-Boost (gefühlter Vorteil)" }
  ];

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY) || "null") || { active: null }; } catch { return { active: null }; }
  }
  function save(m) { localStorage.setItem(KEY, JSON.stringify(m)); }

  function render(container) {
    const st = load();
    container.innerHTML = `
      <div class="card">
        <h2>🏆 Challenge Mode</h2>
        <p class="hint">Wähle eine Challenge – rein motivational. Rewards sind „soft“.</p>

        <div class="pill"><b>Aktiv:</b> <span id="cActive">${st.active || "—"}</span></div>
        <div class="divider"></div>

        <ul class="list" id="cList"></ul>
        <button id="cClear" type="button" class="secondary">Challenge deaktivieren</button>
      </div>
    `;

    const ul = container.querySelector("#cList");
    DEFAULT.forEach(c => {
      const li = document.createElement("li");
      li.innerHTML = `
        <div class="entryRow">
          <div style="min-width:0;">
            <b>${c.name}</b>
            <div class="hint">${c.desc}</div>
            <div class="hint">Reward: ${c.reward}</div>
          </div>
          <button class="secondary" type="button" data-c="${c.id}" style="width:auto;">Aktivieren</button>
        </div>
      `;
      ul.appendChild(li);
    });

    ul.querySelectorAll("[data-c]").forEach(btn => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-c");
        save({ active: id });
        alert("Challenge aktiviert ✅");
        render(container);
      });
    });

    container.querySelector("#cClear").addEventListener("click", () => {
      save({ active: null });
      render(container);
    });
  }

  window.IronQuestChallenges = { render };
})();
