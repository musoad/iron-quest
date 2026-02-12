/* challenges.js – CLASSIC SCRIPT
   Exposes: window.IronQuestChallenges
*/

(function () {
  const KEY = "iq_challenges_v4";

  const CHALLENGES = [
    { id: "c1", name: "5 Trainingstage diese Woche", desc: "Schaffe 5 Tage mit Trainingseinträgen." },
    { id: "c2", name: "2x ⭐⭐⭐ Tage", desc: "Zwei Tage mit sehr hoher XP-Ausbeute." },
    { id: "c3", name: "NEAT Streak 3 Tage", desc: "3 Tage Walking/NEAT hintereinander (oder täglich)." },
  ];

  function load() {
    return (window.IQ?.loadJSON?.(KEY, {})) || {};
  }
  function save(st) {
    window.IQ?.saveJSON?.(KEY, st);
  }

  function renderChallengePanel(targetSelector) {
    const root = document.querySelector(targetSelector);
    if (!root) return;

    const st = load();

    root.innerHTML = `
      <div class="card">
        <h2>Challenge Mode</h2>
        <p class="hint">Einfach & stabil: Challenges abhaken → Motivation.</p>
        <ul class="checklist" id="chList"></ul>
        <div class="divider"></div>
        <button class="danger" id="chReset">Reset</button>
      </div>
    `;

    const ul = root.querySelector("#chList");
    ul.innerHTML = "";

    CHALLENGES.forEach((c) => {
      const done = st[c.id] === true;
      const li = document.createElement("li");
      li.innerHTML = `
        <div class="checkItem">
          <input type="checkbox" ${done ? "checked" : ""} data-id="${c.id}">
          <div class="checkMain">
            <div class="checkTitle">${c.name}</div>
            <div class="checkSub">${c.desc}</div>
          </div>
          <div class="xpBadge">${done ? "DONE" : "OPEN"}</div>
        </div>
      `;
      ul.appendChild(li);
    });

    ul.querySelectorAll("input[type=checkbox]").forEach((cb) => {
      cb.onchange = () => {
        const id = cb.getAttribute("data-id");
        const s = load();
        s[id] = cb.checked;
        save(s);
      };
    });

    root.querySelector("#chReset").onclick = () => {
      if (!confirm("Challenges zurücksetzen?")) return;
      save({});
      renderChallengePanel(targetSelector);
    };
  }

  window.IronQuestChallenges = { renderChallengePanel };
})();
