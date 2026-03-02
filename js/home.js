(() => {
  "use strict";

  async function render(container){
    const entries=await window.IronDB.getAllEntries();
    const totalXp=entries.reduce((s,e)=>s+Number(e.xp||0),0);
    const L=window.IronQuestProgression.levelFromTotalXp(totalXp);
    const rankKey=window.IronQuestHunterRank.compute(L.lvl, totalXp);
    const rankMeta=window.IronQuestHunterRank.getMeta(rankKey);

    const eqNames=window.IronQuestEquipment.equippedNames();
    const eqBonus=window.IronQuestEquipment.bonuses();
    const cls=window.IronQuestClasses.meta(window.IronQuestClasses.get());

    const week=window.IronQuestProgression.getWeekNumber();
    const stRank=window.IronQuestHunterRank.getStats();

    const pct = Math.max(0, Math.min(100, (L.remainder / L.nextNeed) * 100));

    container.innerHTML=`
      <div class="card">
        <h2>Hunter Card</h2>
        <div class="row2">
          <div class="pill"><b>Rank:</b> <span class="badge ${rankMeta.color}">${rankKey}</span> ${rankMeta.name}</div>
          <div class="pill"><b>Class:</b> ${cls.name}</div>
        </div>

        <div style="margin-top:12px;">
          <div class="itemTop">
            <div>
              <b>Level ${L.lvl}</b>
              <div class="hint">${L.title} • Total XP ${window.Utils.fmt(totalXp)}</div>
            </div>
            <span class="badge gold">W${week}</span>
          </div>
          <div class="bar" style="margin-top:10px;"><div class="barFill" style="width:${pct}%;"></div></div>
          <div class="hint">${window.Utils.fmt(L.remainder)} / ${window.Utils.fmt(L.nextNeed)} XP</div>
        </div>

        <div class="descBox" style="border-color: rgba(255,212,106,.25);">
          <div class="descTitle">Equipment</div>
          <div class="descText">Title: ${eqNames.title}\nBadge: ${eqNames.badge}\nAura: ${eqNames.aura}\nRelic: ${eqNames.relic}</div>
        </div>

        <div class="row2" style="margin-top:12px;">
          <div class="pill"><b>Bonus:</b> XP×${eqBonus.globalXp.toFixed(2)}</div>
          <div class="pill"><b>Gate:</b> DMG×${eqBonus.gateDmg.toFixed(2)}</div>
        </div>

        <div class="row2" style="margin-top:12px;">
          <div class="pill"><b>Gates cleared:</b> ${stRank.gatesCleared||0}</div>
          <div class="pill"><b>Boss clears:</b> ${stRank.bossClears||0}</div>
        </div>

        <div class="btnRow">
          <button class="secondary" id="openChest">Open Chest</button>
          <button class="primary" id="quickSystem">SYSTEM</button>
        </div>
      </div>

      <div id="attrMount"></div>

      <div class="card soft">
        <h2>Quick Links</h2>
        <p class="hint">Gates & Boss sind deine Wochenziele. Review zeigt Coach-Auswertung.</p>
        <div class="btnRow">
          <button class="secondary" data-go="gates">Go to Gates</button>
          <button class="secondary" data-go="boss">Go to Boss</button>
          <button class="secondary" data-go="review">Go to Review</button>
        </div>
      </div>
    `;

    window.IronQuestAttributes.render(container.querySelector("#attrMount"));

    container.querySelector("#openChest").onclick=()=>{
      const res=window.IronQuestLoot.roll();
      if(!res.ok) return window.Toast?.toast("Chest", "Keine Chests verfügbar.");
      window.Toast?.toast("Chest", res.msg);
      render(container);
    };
    container.querySelector("#quickSystem").onclick=()=>{
      window.IronQuestUIFX.showSystem("Hybrid UI enabled.\n\nTrain. Level. Ascend.");
    };

    container.querySelectorAll("[data-go]").forEach(b=>{
      b.onclick=()=>window.IronQuestApp?.navigate?.(b.getAttribute("data-go"));
    });
  }

  window.IronQuestHome={ render };
})();
