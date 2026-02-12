/* =========================
   IRON QUEST – challenges.js (Classic)
   Exposes:
   - window.IronQuestChallenges.render(state)
   - window.IQ.getChallengeMultiplier()
========================= */

(function () {
  const KEY = "ironquest_challenge_v1";
  window.IQ = window.IQ || {};

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || { active:false, mode:"none" }; }
    catch { return { active:false, mode:"none" }; }
  }
  function save(st) { localStorage.setItem(KEY, JSON.stringify(st)); }

  const MODES = [
    { id:"none", name:"Aus", mult:1.00, desc:"Kein Bonus." },
    { id:"hard", name:"Hard Mode", mult:1.05, desc:"+5% XP wenn aktiv." },
    { id:"iron", name:"IRON Mode", mult:1.10, desc:"+10% XP wenn aktiv." }
  ];

  window.IQ.getChallengeMultiplier = function () {
    const st = load();
    if (!st.active) return 1.0;
    const m = MODES.find(x => x.id === st.mode) || MODES[0];
    return m.mult;
  };

  function render(_state) {
    const sec = document.getElementById("challenge");
    if (!sec) return;

    const st = load();
    const current = MODES.find(x => x.id === st.mode) || MODES[0];

    sec.innerHTML = `
      <h2>🏆 Challenge Mode</h2>
      <p class="hint">Aktivierbar – gibt XP Multiplikator.</p>

      <div class="card">
        <div class="row2">
          <div class="pill"><b>Status:</b> ${st.active ? "✅ aktiv" : "— aus"}</div>
          <div class="pill"><b>Aktueller Modus:</b> ${current.name} (x${current.mult.toFixed(2)})</div>
        </div>

        <label>
          <input id="chActive" type="checkbox" ${st.active ? "checked":""}>
          Challenge aktiv
        </label>

        <label>Mode
          <select id="chMode">
            ${MODES.map(m => `<option value="${m.id}" ${m.id===st.mode?"selected":""}>${m.name} — ${m.desc}</option>`).join("")}
          </select>
        </label>

        <button id="chSave">Speichern</button>
      </div>
    `;

    document.getElementById("chSave")?.addEventListener("click", () => {
      const active = !!document.getElementById("chActive").checked;
      const mode = document.getElementById("chMode").value;
      save({ active, mode });
      alert("Challenge gespeichert ✅");
      render({});
    });
  }

  window.IronQuestChallenges = { render };
})();
