// js/boss.js
window.Boss = (function(){
  async function render(elId){
    const el = document.getElementById(elId);
    if (!el) return;

    el.innerHTML = `
      <div class="card">
        <h2>Boss</h2>
        <p class="hint">Boss-System ist als stabiler Platzhalter aktiv. (Du kannst hier später wieder deine Boss-Wochenliste reinbauen.)</p>
        <div class="pill"><b>Status:</b> OK</div>
      </div>
    `;
  }

  return { render };
})();
