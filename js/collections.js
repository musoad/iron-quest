(() => {
  "use strict";

  function _loot(){
    const L = window.IronQuestLoot;
    if(!L) return { inv:[] };
    if(typeof L.getState === 'function') return L.getState();
    if(typeof L.load === 'function') return L.load();
    return { inv:[] };
  }

  function render(mount){
    if(!mount) return;
    const inv = (_loot().inv || []);
    const sets = window.IronQuestEquipment?.SET_BONUSES || {};
    const eqProgress = window.IronQuestEquipment?.setProgress?.() || [];
    const eqMap = new Map(eqProgress.map(s=>[s.setId, s.count]));

    const bySet = {};
    for(const it of inv){
      if(!it.setId) continue;
      bySet[it.setId] = bySet[it.setId] || { count:0, best:"Common" };
      bySet[it.setId].count++;
      const r = String(it.rarity||'Common');
      bySet[it.setId].best = pickBestRarity(bySet[it.setId].best, r);
    }

    const cards = Object.keys(sets).map(setId=>{
      const def = sets[setId];
      const owned = bySet[setId]?.count || 0;
      const equipped = eqMap.get(setId) || 0;
      const best = bySet[setId]?.best || 'Common';
      const bestClass = window.IronQuestEquipment?.rarityClass?.(best) || 'rarCommon';
      const twoOn = equipped >= 2;
      const fourOn = equipped >= 4;

      return `
        <div class="setCard ${fourOn?"setOn4":(twoOn?"setOn2":"")} ${bestClass}">
          <div class="itemTop">
            <div>
              <b>${def.name}</b>
              <div class="hint">Owned: ${owned} • Equipped: ${equipped}/4 • Best: ${escapeHtml(best)}</div>
            </div>
            <span class="badge ${fourOn?"gold":""}">${equipped}/4</span>
          </div>
          <div class="setLine ${twoOn?"on":""}">2/4: ${def.two?.label || "—"} ${twoOn?"✅":"🔒"}</div>
          <div class="setLine ${fourOn?"on":""}">4/4: ${def.four?.label || "—"} ${fourOn?"✅":"🔒"}</div>
        </div>
      `;
    }).join('');

    mount.innerHTML = cards || '<div class="hint">No sets found yet.</div>';
  }

  function pickBestRarity(a,b){
    const order = ['Common','Rare','Epic','Legendary','Monarch'];
    const ai = order.indexOf(norm(a));
    const bi = order.indexOf(norm(b));
    return order[Math.max(ai, bi, 0)];
  }
  function norm(x){
    const s = String(x||'Common');
    if(/monarch/i.test(s)) return 'Monarch';
    if(/legend/i.test(s)) return 'Legendary';
    if(/epic/i.test(s)) return 'Epic';
    if(/rare/i.test(s)) return 'Rare';
    return 'Common';
  }
  function escapeHtml(s){
    return String(s||"")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;");
  }

  window.IronQuestCollections = { render };
})();
