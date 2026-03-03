(() => {
  "use strict";

  async function render(container){
    const entries = await window.IronDB.getAllEntries();
    const totalXp = (entries||[]).reduce((s,e)=> s + Number(e.xp||0), 0);

    const L = window.IronQuestProgression.levelFromTotalXp(totalXp);
    const rankKey = window.IronQuestHunterRank.compute(L.lvl, totalXp);
    const rankMeta = window.IronQuestHunterRank.getMeta(rankKey);

    const hunterName = window.IronQuestProfile?.getName?.() || "Hunter";
    const startDate  = window.IronQuestProgression.getStartDate();

    const cls = window.IronQuestClasses.meta(window.IronQuestClasses.get());
    const week = window.IronQuestProgression.getWeekNumber();
    const stRank = window.IronQuestHunterRank.getStats();

    const eqBonus = window.IronQuestEquipment.bonuses();

    const pct = Math.max(0, Math.min(100, (L.remainder / Math.max(1, L.nextNeed)) * 100));

    container.innerHTML = `
      <div class="card">
        <div class="itemTop">
          <div>
            <h2 style="margin:0;">Hunter Card</h2>
            <div class="hint">Name: <b>${escapeHtml(hunterName)}</b></div>
          </div>
          <div class="rankEmblem ${rankMeta.color}">${window.IronQuestHunterRank.getEmblemSVG(rankKey)}</div>
        </div>

        <div class="row2" style="margin-top:10px;">
          <div class="pill"><b>Rank:</b> <span class="badge ${rankMeta.color}">${rankKey}</span> ${rankMeta.name}</div>
          <div class="pill"><b>Class:</b> ${escapeHtml(cls.name)}</div>
        </div>

        <div style="margin-top:12px;">
          <div class="itemTop">
            <div>
              <b>Level ${L.lvl}</b>
              <div class="hint">${escapeHtml(L.title)} • Total XP ${window.Utils.fmt(totalXp)}</div>
            </div>
            <span class="badge gold">W${week}</span>
          </div>
          <div class="bar" style="margin-top:10px;"><div class="barFill" style="width:${pct}%;"></div></div>
          <div class="hint">${window.Utils.fmt(L.remainder)} / ${window.Utils.fmt(L.nextNeed)} XP</div>
        </div>

        <div class="descBox" style="margin-top:12px;">
          <div class="descTitle">Profile</div>
          <div class="row2" style="margin-top:10px;">
            <input id="nameInput" class="input" placeholder="Character name" value="${escapeAttr(hunterName)}" />
            <input id="startInput" class="input" type="date" value="${escapeAttr(startDate)}" />
          </div>
          <div class="btnRow" style="margin-top:10px;">
            <button class="secondary" id="saveProfile">Save</button>
            <button class="secondary" id="todayStart">Start Today</button>
            <button class="secondary" id="shareCard">Share Card</button>
          </div>
          <div class="hint">Startdatum kann rückwirkend gesetzt werden. Woche & Challenge passen sich automatisch an.</div>
        </div>

        <div class="descBox" style="margin-top:12px; border-color: rgba(255,212,106,.25);">
          <div class="descTitle">Equipment</div>
          <div id="equipMount" style="margin-top:10px;"></div>
        </div>

        <div class="row2" style="margin-top:12px;">
          <div class="pill"><b>XP Bonus:</b> ×${eqBonus.globalXp.toFixed(2)}</div>
          <div class="pill"><b>Gate/Boss:</b> DMG×${eqBonus.gateDmg.toFixed(2)}</div>
        </div>

        <div class="row2" style="margin-top:12px;">
          <div class="pill"><b>Loot Luck:</b> ×${(eqBonus.lootLuck||1).toFixed(2)}</div>
          <div class="pill"><b>Week 1:</b> ${escapeHtml(startDate)}</div>
        </div>

        <div class="row2" style="margin-top:12px;">
          <div class="pill"><b>Gates cleared:</b> ${stRank.gatesCleared||0}</div>
          <div class="pill"><b>Boss clears:</b> ${stRank.bossClears||0}</div>
        </div>

        <div class="btnRow" style="margin-top:12px;">
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
          <button class="secondary" data-go="skills">Go to Skills</button>
        </div>
      </div>
    `;

    // Attributes
    window.IronQuestAttributes.render(container.querySelector("#attrMount"));

    // Equipment grid + set progress
    window.IronQuestEquipment.renderGrid(container.querySelector("#equipMount"));

    // Backup reminder (every 7 days)
    try {
      const last = localStorage.getItem("ironquest_last_backup");
      if(last){
        const d = new Date(last);
        const days = Math.floor((Date.now()-d.getTime())/86400000);
        if(days >= 7) window.Toast?.toast("Backup Reminder", `Dein letzter Export ist ${days} Tage her. (Backup Tab)`);
      } else if((entries||[]).length >= 10){
        window.Toast?.toast("Backup Reminder", "Bitte exportiere ein Backup (Backup Tab)." );
      }
    } catch {}

    // Profile save
    container.querySelector("#saveProfile").onclick = ()=>{
      const name = container.querySelector("#nameInput").value;
      const start = container.querySelector("#startInput").value;
      window.IronQuestProfile?.setName?.(name);
      if(start) window.IronQuestProgression.setStartDate(start);
      window.Toast?.toast("Profile", "Saved.");
      render(container);
    };

    container.querySelector("#todayStart").onclick = ()=>{
      const today = window.Utils.isoDate(new Date());
      container.querySelector("#startInput").value = today;
      window.IronQuestProgression.setStartDate(today);
      window.Toast?.toast("Start date", "Set to today.");
      render(container);
    };

    container.querySelector("#shareCard").onclick = async ()=>{
      try{
        await window.IronQuestShare?.shareHunterCard?.();
      }catch(e){
        window.Toast?.toast("Share", "Sharing not available.");
      }
    };

    container.querySelector("#openChest").onclick = ()=>{
      const res = window.IronQuestLoot.roll();
      if(!res?.ok) return window.Toast?.toast("Chest", "Keine Chests verfügbar.");
      window.IronQuestUIFX?.showItem?.(res.item, res.msg);
      render(container);
    };

    container.querySelector("#quickSystem").onclick = ()=>{
      window.IronQuestUIFX.showSystem("Hybrid UI enabled.\n\nTrain. Level. Ascend.");
    };

    container.querySelectorAll("[data-go]").forEach(b=>{
      b.onclick = ()=> window.IronQuestApp?.navigate?.(b.getAttribute("data-go"));
    });
  }

  function escapeHtml(s){
    return String(s||"")
      .replaceAll("&","&amp;")
      .replaceAll("<","&lt;")
      .replaceAll(">","&gt;");
  }
  function escapeAttr(s){
    return escapeHtml(s).replaceAll('"','&quot;');
  }

  window.IronQuestHome = { render };
})();
