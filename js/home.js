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
  <section class="hunterScreen">
    <div class="hunterHero card">
      <div class="heroTop">
        <div class="heroLeft">
          <div class="heroTitle">Hunter Card</div>
          <div class="heroNameRow">
            <div class="heroName">${escapeHtml(hunterName)}</div>
            <button class="miniBtn" id="btnEditName" title="Name ändern">✎</button>
          </div>
          <div class="heroMeta">
            <span class="pill">${rankMeta.name}</span>
            <span class="pill">Woche ${week}</span>
            <span class="pill">Klasse: <b>${cls.name}</b></span>
          </div>
        </div>

        <div class="heroRight">
          <div class="rankEmblemWrap ${rankMeta.color}">
            ${window.IronQuestHunterRank.getEmblemSVG(rankKey)}
            <div class="rankKey">${rankKey}</div>
          </div>
        </div>
      </div>

      <div class="heroBars">
        <div class="barLine">
          <div class="barLabel">Level <b id="homeLvl">${L.lvl}</b></div>
          <div class="barOuter"><div class="barInner" style="width:${pct.toFixed(1)}%"></div></div>
          <div class="barSub"><span>${L.remainder} / ${L.nextNeed} XP</span><span>Total: ${totalXp}</span></div>
        </div>
      </div>

      <div class="heroActions">
        <button class="secondary" id="btnShareHunter">Share</button>
        <button class="secondary" id="btnOpenSystem">System Log</button>
        <button class="secondary" id="btnOpenDiag">Diagnose</button>
      </div>

      <div class="heroSettings">
        <div class="row2">
          <div>
            <label>Challenge/Week Startdatum</label>
            <input type="date" id="startDateInput" value="${startDate}">
            <div class="small">Rückwirkend möglich. Beeinflusst Wochenberechnung & Challenge.</div>
          </div>
          <div>
            <label>Klasse</label>
            <select id="classSelect">
              ${window.IronQuestClasses.options().map(o => `<option value="${o.key}" ${o.key===cls.key?'selected':''}>${o.name}</option>`).join("")}
            </select>
          </div>
        </div>
      </div>
    </div>

    <div class="card">
      <h2 style="margin:0 0 8px;">Attribute</h2>
      <div id="attrGridHome"></div>
    </div>

    <div class="card">
      <h2 style="margin:0 0 8px;">Equipment</h2>
      <div id="equipmentGridHome"></div>
      <div id="setBonusesHome" style="margin-top:10px;"></div>
    </div>

    <div class="row2">
      <div class="card">
        <h2 style="margin:0 0 8px;">Active Gate</h2>
        <div id="homeGate"></div>
      </div>
      <div class="card">
        <h2 style="margin:0 0 8px;">Quests</h2>
        <div id="homeQuests"></div>
      </div>
    </div>
  </section>
`;

// Wire: start date
const sd = container.querySelector("#startDateInput");
if(sd){
  sd.addEventListener("change", () => {
    const v = sd.value;
    if(!v) return;
    window.IronQuestProgression.setStartDate(v);
    window.Toast?.show?.("System", "Startdatum gesetzt.");
    window.IronQuestApp?.renderActive?.();
  });
}

// Wire: class
const cs = container.querySelector("#classSelect");
if(cs){
  cs.addEventListener("change", () => {
    window.IronQuestClasses.set(cs.value);
    window.Toast?.show?.("System","Klasse aktualisiert.");
    window.IronQuestApp?.renderActive?.();
  });
}

// Wire: edit name (simple prompt)
const bn = container.querySelector("#btnEditName");
if(bn){
  bn.addEventListener("click", () => {
    const cur = window.IronQuestProfile?.getName?.() || "Hunter";
    const n = prompt("Charaktername (max 22 Zeichen):", cur);
    if(n===null) return;
    const saved = window.IronQuestProfile?.setName?.(n) || n;
    window.Toast?.show?.("System", `Name gesetzt: ${saved}`);
    window.IronQuestApp?.renderActive?.();
  });
}

// Share / system log / diag
container.querySelector("#btnShareHunter")?.addEventListener("click", () => window.IronQuestShare?.shareHunterCard?.());
container.querySelector("#btnOpenSystem")?.addEventListener("click", () => window.UIEffects?.showSystem?.("System Log geöffnet."));
container.querySelector("#btnOpenDiag")?.addEventListener("click", () => window.IronQuestDiagnostics?.open?.());

// Render attributes (reuse module)
container.querySelector("#attrGridHome").innerHTML = window.IronQuestAttributes?.renderMini?.(entries) || `<div class="hint">Attribute Modul nicht gefunden.</div>`;

// Render equipment grid + set bonuses
const eqWrap = container.querySelector("#equipmentGridHome");
if(eqWrap){
  eqWrap.innerHTML = window.IronQuestEquipment?.renderGrid?.() || `<div class="hint">Equipment Modul nicht gefunden.</div>`;
  const sb = container.querySelector("#setBonusesHome");
  if(sb) sb.innerHTML = window.IronQuestEquipment?.renderSetBonuses?.() || "";
  eqWrap.querySelectorAll("[data-equip-open]").forEach(btn=>{
    btn.addEventListener("click", ()=> window.IronQuestEquipment.openManage());
  });
}

// Gate + quests summary
container.querySelector("#homeGate").innerHTML = window.IronQuestGates?.renderMini?.() || `<div class="hint">Gates Modul nicht gefunden.</div>`;
container.querySelector("#homeQuests").innerHTML = window.IronQuestChallenges?.renderMini?.() || `<div class="hint">Quests Modul nicht gefunden.</div>`;// Attributes
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
