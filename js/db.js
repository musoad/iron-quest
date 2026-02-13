/* =========================
   IRON QUEST – db.js (FULL)
   ✅ IndexedDB: entries + health + runs
   ✅ Export/Import inkl. Runs
   ========================= */

(() => {
  const DB_NAME = "ironquest_v4_pro";
  const DB_VERSION = 2;

  const STORES = {
    entries: "entries",
    health: "health",
    runs: "runs",
  };

  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = (e) => {
        const db = req.result;

        if (!db.objectStoreNames.contains(STORES.entries)) {
          const s1 = db.createObjectStore(STORES.entries, { keyPath: "id", autoIncrement: true });
          s1.createIndex("date", "date", { unique: false });
          s1.createIndex("type", "type", { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.health)) {
          const s2 = db.createObjectStore(STORES.health, { keyPath: "id", autoIncrement: true });
          s2.createIndex("date", "date", { unique: false });
        }

        if (!db.objectStoreNames.contains(STORES.runs)) {
          const s3 = db.createObjectStore(STORES.runs, { keyPath: "id", autoIncrement: true });
          s3.createIndex("date", "date", { unique: false });
        }
      };

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function txStore(storeName, mode = "readonly") {
    const db = await openDB();
    const tx = db.transaction(storeName, mode);
    return { db, tx, store: tx.objectStore(storeName) };
  }

  async function getAll(storeName) {
    const { tx, store } = await txStore(storeName, "readonly");
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
      tx.oncomplete = () => {};
    });
  }

  async function add(storeName, item) {
    const { tx, store } = await txStore(storeName, "readwrite");
    return new Promise((resolve, reject) => {
      const req = store.add(item);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      tx.onerror = () => reject(tx.error);
    });
  }

  async function put(storeName, item) {
    const { tx, store } = await txStore(storeName, "readwrite");
    return new Promise((resolve, reject) => {
      const req = store.put(item);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      tx.onerror = () => reject(tx.error);
    });
  }

  async function del(storeName, id) {
    const { tx, store } = await txStore(storeName, "readwrite");
    return new Promise((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
      tx.onerror = () => reject(tx.error);
    });
  }

  async function clear(storeName) {
    const { tx, store } = await txStore(storeName, "readwrite");
    return new Promise((resolve, reject) => {
      const req = store.clear();
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
      tx.onerror = () => reject(tx.error);
    });
  }

  async function exportAll() {
    const entries = await getAll(STORES.entries);
    const health = await getAll(STORES.health);
    const runs = await getAll(STORES.runs);
    return {
      version: 2,
      exportedAt: new Date().toISOString(),
      entries,
      health,
      runs
    };
  }

  async function importAll(payload, { merge = true } = {}) {
    if (!payload || typeof payload !== "object") return false;

    const entries = Array.isArray(payload.entries) ? payload.entries : [];
    const health = Array.isArray(payload.health) ? payload.health : [];
    const runs = Array.isArray(payload.runs) ? payload.runs : [];

    if (!merge) {
      await clear(STORES.entries);
      await clear(STORES.health);
      await clear(STORES.runs);
    }

    // put() erlaubt id-restore (wenn keyPath "id" existiert)
    for (const e of entries) await put(STORES.entries, e);
    for (const h of health) await put(STORES.health, h);
    for (const r of runs) await put(STORES.runs, r);

    return true;
  }

  window.IronQuestDB = {
    STORES,

    openDB,

    // generic
    getAll,
    add: (entry) => add(STORES.entries, entry),
    putEntry: (entry) => put(STORES.entries, entry),
    deleteEntry: (id) => del(STORES.entries, id),
    clearEntries: () => clear(STORES.entries),

    // health
    addHealth: (h) => add(STORES.health, h),
    getHealth: () => getAll(STORES.health),
    clearHealth: () => clear(STORES.health),

    // runs (jogging)
    addRun: (r) => add(STORES.runs, r),
    getRuns: () => getAll(STORES.runs),
    clearRuns: () => clear(STORES.runs),

    // backup
    exportAll,
    importAll,
  };
})();
