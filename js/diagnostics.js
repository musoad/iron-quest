(() => {
  "use strict";
  function open(){
    const msg = [];
    msg.push("Iron Quest v9.5 Master");
    msg.push("DB: " + ((window.IronDB && window.IronDB.db) ? "ready" : "unknown"));
    msg.push("SW: " + ((navigator.serviceWorker && navigator.serviceWorker.controller) ? "active" : "none"));
    msg.push("Modules: " + [
      "XP:"+!!window.IronQuestXP,
      "Loot:"+!!window.IronQuestLoot,
      "Equip:"+!!window.IronQuestEquipment,
      "Gates:"+!!window.IronQuestGates,
      "Boss:"+!!window.IronQuestBossArena,
      "Coach:"+!!window.IronQuestCoach
    ].join("  "));
    (window.UIEffects && (window.UIEffects.showSystem) && window.UIEffects.showSystem)(msg.join("\n"));
  }
  window.IronQuestDiagnostics = { open };
})();
