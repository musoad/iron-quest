(() => {
  "use strict";

  function computeCollection(){
    const loot = (window.IronQuestLoot && window.IronQuestLoot.state) ? window.IronQuestLoot.state() : { owned: [] };
    const bySet = {};
    for(const it of (loot.owned||[])){
      if(!it.setId) continue;
      bySet[it.setId] = bySet[it.setId] || { count:0, items:[] };
      bySet[it.setId].count += 1;
      bySet[it.setId].items.push(it);
    }
    return bySet;
  }

  function render(el){
    const sets = (window.IronQuestEquipment && window.IronQuestEquipment.SETS) ? window.IronQuestEquipment.SETS : {};
    const bySet = computeCollection();
    el.innerHTML = `
      <div class="card">
        <h2>Set Collection</h2>
        <div class="list">
          ${Object.keys(sets).map(id=>{
            const owned = (bySet[id] && bySet[id].count) ? bySet[id].count : 0;
            return `<div class="row"><div><b>${sets[id].name}</b><div class="hint">${owned} owned</div></div><div class="pill">${owned}/4</div></div>`;
          }).join("")}
        </div>
      </div>
    `;
  }

  window.IronQuestCollections = { render };
})();
