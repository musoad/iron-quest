(() => {
  "use strict";

  const DB_NAME = "ironquest-v6";
  const DB_VERSION = 8;

  const STORES = {
    entries: { keyPath:"id", autoIncrement:true },
    health:  { keyPath:"id", autoIncrement:true },
    runs:    { keyPath:"id", autoIncrement:true },
  };

  let _db = null;

  function open(){
    return new Promise((resolve,reject)=>{
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = () => {
        const db = req.result;
        for (const [name,cfg] of Object.entries(STORES)){
          if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, cfg);
        }
      };

      req.onsuccess = () => { _db = req.result; resolve(_db); };
      req.onerror = () => reject(req.error);
    });
  }

  async function init(){
    if (_db) return _db;
    return await open();
  }

  async function tx(storeName, mode="readonly"){
    const db = await init();
    if (!db.objectStoreNames.contains(storeName)) throw new Error(`Store fehlt: ${storeName}`);
    return db.transaction(storeName, mode).objectStore(storeName);
  }

  async function getAll(storeName){
    const store = await tx(storeName, "readonly");
    return await new Promise((resolve,reject)=>{
      const r = store.getAll();
      r.onsuccess = () => resolve(r.result || []);
      r.onerror = () => reject(r.error);
    });
  }

  async function add(storeName, value){
    const store = await tx(storeName, "readwrite");
    return await new Promise((resolve,reject)=>{
      const r = store.add(value);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  }

  async function clear(storeName){
    const store = await tx(storeName, "readwrite");
    return await new Promise((resolve,reject)=>{
      const r = store.clear();
      r.onsuccess = () => resolve(true);
      r.onerror = () => reject(r.error);
    });
  }

  window.DB = { init, getAll, add, clear };

  window.IronDB = {
    init: async()=> await window.DB.init(),
    getAllEntries: async()=> await window.DB.getAll("entries"),
    addEntry: async(entry)=> await window.DB.add("entries", entry),
    clearAllEntries: async()=> await window.DB.clear("entries"),
  };
})();
