(function(){
  const DB_NAME = "ironquest_db_v4";
  const DB_VERSION = 1;

  const STORES = {
    entries: "entries",
    health: "health"
  };

  function openDB(){
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;

        if (!db.objectStoreNames.contains(STORES.entries)) {
          const s = db.createObjectStore(STORES.entries, { keyPath:"id", autoIncrement:true });
          s.createIndex("date", "date", { unique:false });
          s.createIndex("week", "week", { unique:false });
        }
        if (!db.objectStoreNames.contains(STORES.health)) {
          const s2 = db.createObjectStore(STORES.health, { keyPath:"id", autoIncrement:true });
          s2.createIndex("date", "date", { unique:false });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function getAll(store){
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, "readonly");
      const req = tx.objectStore(store).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async function add(store, obj){
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, "readwrite");
      tx.objectStore(store).add(obj);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }

  async function put(store, obj){
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, "readwrite");
      tx.objectStore(store).put(obj);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }

  async function del(store, id){
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, "readwrite");
      tx.objectStore(store).delete(id);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }

  async function clear(store){
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(store, "readwrite");
      tx.objectStore(store).clear();
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  }

  // export/import full DB payload (simple)
  async function exportAll(){
    const entries = await getAll(STORES.entries);
    const health = await getAll(STORES.health);
    return { version: "v4", exportedAt: new Date().toISOString(), entries, health };
  }

  async function importAll(payload){
    if (!payload || typeof payload !== "object") throw new Error("Invalid payload");
    const entries = Array.isArray(payload.entries) ? payload.entries : [];
    const health = Array.isArray(payload.health) ? payload.health : [];

    // NOTE: we keep IDs if present to preserve edit references; IndexedDB put will use them.
    for (const e of entries) await put(STORES.entries, e);
    for (const h of health) await put(STORES.health, h);
    return true;
  }

  window.IronQuestDB = {
    STORES,
    getAll, add, put, del, clear,
    exportAll, importAll
  };
})();
