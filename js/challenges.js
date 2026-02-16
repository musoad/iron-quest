// js/challenges.js
window.Challenges = (function(){
  async function render(elId){
    const el = document.getElementById(elId);
    if (!el) return;

    el.innerHTML = `
      <div class="card">
        <h2>Challenge Mode</h2>
        <p class="hint">Challenge Mode ist aktiv als stabiler Rahmen. (Als nächstes können wir hier Weekly/Monthly Challenges + Rewards einbauen.)</p>
        <div class="pill"><b>Status:</b> OK</div>
      </div>
    `;
  }

  return { render };
})();
