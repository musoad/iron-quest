(() => {
  "use strict";

  function open(){
    const msg = [];
    msg.push("IRON QUEST Diagnostics");
    msg.push("Build: v10.1");
    msg.push("URL: " + location.href);
    msg.push("UserAgent: " + navigator.userAgent);

    msg.push("");
    msg.push("Storage:");
    msg.push("  LocalStorage: " + (function(){ try{ localStorage.setItem("_t","1"); localStorage.removeItem("_t"); return "ok"; }catch(e){ return "blocked"; } })());
    msg.push("  IndexedDB: " + (window.indexedDB ? "available" : "missing"));

    msg.push("");
    msg.push("DB:");
    msg.push("  IronDB: " + ((window.IronDB && window.IronDB.getAllEntries) ? "present" : "missing"));

    msg.push("");
    msg.push("Service Worker:");
    msg.push("  supported: " + ("serviceWorker" in navigator));
    msg.push("  controller: " + ((navigator.serviceWorker && navigator.serviceWorker.controller) ? "active" : "none"));

    msg.push("");
    msg.push("Modules:");
    msg.push("  XP: " + (!!window.IronQuestXP));
    msg.push("  Loot: " + (!!window.IronQuestLoot));
    msg.push("  Equip: " + (!!window.IronQuestEquipment));
    msg.push("  Gates: " + (!!window.IronQuestGates));
    msg.push("  Boss: " + (!!window.IronQuestBossArena));
    msg.push("  Coach: " + (!!window.IronQuestCoach));

    const fx = window.IronQuestUIFX;
    if(fx && fx.showSystem) fx.showSystem(msg.join("\n"));
    else alert(msg.join("\n"));
  }

  window.IronQuestDiagnostics = { open: open };
})();
