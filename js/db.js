/* =========================
   IRON QUEST v4 PRO — db.js (FULL)
   ✅ IndexedDB Wrapper
   ✅ Auto-Upgrade: erstellt fehlende Stores auch nachträglich
   ✅ Liefert:
      - window.DB (low level)
      - window.IronDB (compat layer für app.js / boss.js / challenges.js)
========================= */

(() => {
  "use strict";

  const DB_NAME = "ironquest-v4-pro";
  const DB_VERSION = 4; // <-- bei Store-Änderungen erhöhen!

  const STORES = {
    entries: { keyPath: "id", autoIncrement: true },
    health:  { keyPath: "id", autoIncrement: true },
    runs:    { keyPath: "id", autoIncrement: true },
    backup:  { keyPath: "id", autoIncrement: true },
  };

  let _db = null;

  function open() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = () => {
        const db = req.result;

        // Stores sicher anlegen (auch wenn DB schon existiert, aber Store fehlte)
        for (const [name, cfg] of Object.entries(STORES)) {
          if (!db.objectStoreNames.contains(name)) {
            db.createObjectStore(name, cfg);
          }
        }
      };

      req.onsuccess = () => {
        _db = req.result;

        // iOS: wenn eine alte Tab-Instanz blockt
        _db.onversionchange = () => {
          try { _db.close(); } catch {}
          _db = null;
        };

        resolve(_db);
      };

      req.onerror = () => reject(req.error);
      req.onblocked = () => {
        console.warn("[DB] Upgrade blocked (alte Tabs offen?)");
      };
    });
  }

  async function init() {
    if (_db) return _db;
    return await open();
  }

  async function tx(storeName, mode = "readonly") {
    const db = await init();

    // Falls Store trotzdem fehlt (alte DB ohne Upgrade), erzwinge Upgrade durch Version-Bump
    if (!db.objectStoreNames.contains(storeName)) {
      throw new Error(
        `ObjectStore '${storeName}' fehlt in IndexedDB. ` +
        `Bitte DB_VERSION in db.js erhöhen und neu laden.`
      );
    }

    return db.transaction(storeName, mode).objectStore(storeName);
  }

  async function getAll(storeName) {
    const store = await tx(storeName, "readonly");
    return await new Promise((resolve, reject) => {
      const r = store.getAll();
      r.onsuccess = () => resolve(r.result || []);
      r.onerror = () => reject(r.error);
    });
  }

  async function add(storeName, value) {
    const store = await tx(storeName, "readwrite");
    return await new Promise((resolve, reject) => {
      const r = store.add(value);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  }

  async function put(storeName, value) {
    const store = await tx(storeName, "readwrite");
    return await new Promise((resolve, reject) => {
      const r = store.put(value);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  }

  async function del(storeName, key) {
    const store = await tx(storeName, "readwrite");
    return await new Promise((resolve, reject) => {
      const r = store.delete(key);
      r.onsuccess = () => resolve(true);
      r.onerror = () => reject(r.error);
    });
  }

  async function clear(storeName) {
    const store = await tx(storeName, "readwrite");
    return await new Promise((resolve, reject) => {
      const r = store.clear();
      r.onsuccess = () => resolve(true);
      r.onerror = () => reject(r.error);
    });
  }

  // ============ Expose window.DB ============
  window.DB = {
    init,
    open,
    tx,
    getAll,
    add,
    put,
    del,
    clear
  };

  // ============ Compat Layer: window.IronDB ============
  // app.js / boss.js / challenges.js erwarten IronDB.init(), getAllEntries(), addEntry(), clearAllEntries()
  window.IronDB = {
    init: async () => await window.DB.init(),
    getAllEntries: async () => await window.DB.getAll("entries"),
    addEntry: async (entry) => await window.DB.add("entries", entry),
    clearAllEntries: async () => await window.DB.clear("entries"),
  };

  console.log("[DB] ready ✅", { DB_NAME, DB_VERSION });
})();
