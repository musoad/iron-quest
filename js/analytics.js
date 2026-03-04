(() => {
  "use strict";

  async function renderAnalytics(el){
    const entries = (window.IronDB && window.IronDB.getAllEntries) ? await window.IronDB.getAllEntries() : [];
    const total = (entries||[]).reduce((s,e)=>s+Number(e.xp||0),0);
    el.innerHTML = `
      <div class="card">
        <h2>Analytics</h2>
        <div class="row"><div>Total XP</div><div class="pill">${Math.round(total)}</div></div>
        <div class="hint">Charts can be re-enabled after confirming iOS stability.</div>
      </div>
    `;
  }

  window.IronQuestAnalytics = { renderAnalytics };
})();
