// js/db.js
window.DB = (function(){
  const DB_NAME = "ironquest_db";     // ✅ wichtig: alter Name (Entries bleiben)
  const DB_VERSION = 6;              // ✅ hoch, damit Upgrade sicher läuft

  const STORES = {
    entries:   { keyPath:"id", autoIncrement:true, indexes:[{name:"date", key:"date"},{name:"week", key:"week"}] },
    health:    { keyPath:"id", autoIncrement:true, indexes:[{name:"date", key:"date"}] },
    runs:      { keyPath:"id", autoIncrement:true, indexes:[{name:"date", key:"date"}] },
    settings:  { keyPath:"key", autoIncrement:false, indexes:[] },
    prs:       { keyPath:"id", autoIncrement:true, indexes:[{name:"exercise", key:"exercise"}] }
  };

  function open(name){
    return new Promise((resolve, reject)=>{
      const req = indexedDB.open(name, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;

        Object.entries(STORES).forEach(([storeName, cfg])=>{
          let store;
          if (!db.objectStoreNames.contains(storeName)){
            store = db.createObjectStore(storeName, { keyPath: cfg.keyPath, autoIncrement: cfg.autoIncrement });
          } else {
            store = req.transaction.objectStore(storeName);
          }
          (cfg.indexes||[]).forEach(ix=>{
            if (!store.indexNames.contains(ix.name)){
              store.createIndex(ix.name, ix.key, { unique:false });
            }
          });
        });
      };
      req.onsuccess = ()=> resolve(req.result);
      req.onerror = ()=> reject(req.error);
    });
  }

  async function tx(storeName, mode="readonly"){
    const db = await open(DB_NAME);
    if (!db.objectStoreNames.contains(storeName)){
      // force open again (in case an old cached version created partial DB)
      db.close();
      const db2 = await open(DB_NAME);
      if (!db2.objectStoreNames.contains(storeName)){
        throw new Error(`ObjectStore missing: ${storeName}`);
      }
      return db2.transaction(storeName, mode).objectStore(storeName);
    }
    return db.transaction(storeName, mode).objectStore(storeName);
  }

  async function getAll(storeName){
    const store = await tx(storeName, "readonly");
    return new Promise((resolve, reject)=>{
      const r = store.getAll();
      r.onsuccess = ()=> resolve(r.result || []);
      r.onerror = ()=> reject(r.error);
    });
  }

  async function add(storeName, obj){
    const store = await tx(storeName, "readwrite");
    return new Promise((resolve, reject)=>{
      const r = store.add(obj);
      r.onsuccess = ()=> resolve(r.result);
      r.onerror = ()=> reject(r.error);
    });
  }

  async function put(storeName, obj){
    const store = await tx(storeName, "readwrite");
    return new Promise((resolve, reject)=>{
      const r = store.put(obj);
      r.onsuccess = ()=> resolve(r.result);
      r.onerror = ()=> reject(r.error);
    });
  }

  async function del(storeName, key){
    const store = await tx(storeName, "readwrite");
    return new Promise((resolve, reject)=>{
      const r = store.delete(key);
      r.onsuccess = ()=> resolve(true);
      r.onerror = ()=> reject(r.error);
    });
  }

  async function clear(storeName){
    const store = await tx(storeName, "readwrite");
    return new Promise((resolve, reject)=>{
      const r = store.clear();
      r.onsuccess = ()=> resolve(true);
      r.onerror = ()=> reject(r.error);
    });
  }

  // Optional: Migration attempt from older DB names (falls du mal umbenannt hattest)
  async function tryMigrateFrom(dbName){
    if (dbName === DB_NAME) return { migrated:false, count:0 };
    try{
      const old = await open(dbName);
      if (!old.objectStoreNames.contains("entries")) return { migrated:false, count:0 };
      const entries = await new Promise((resolve, reject)=>{
        const t = old.transaction("entries","readonly");
        const r = t.objectStore("entries").getAll();
        r.onsuccess = ()=> resolve(r.result||[]);
        r.onerror = ()=> reject(r.error);
      });
      old.close();
      if (!entries.length) return { migrated:false, count:0 };

      const cur = await getAll("entries");
      const sig = new Set(cur.map(e=>`${e.date}|${e.exercise}|${e.xp}|${e.week}`));

      let added = 0;
      for (const e of entries){
        const k = `${e.date}|${e.exercise}|${e.xp}|${e.week}`;
        if (sig.has(k)) continue;
        const copy = { ...e };
        delete copy.id; // new auto id
        await add("entries", copy);
        added++;
      }
      return { migrated: added>0, count: added };
    } catch {
      return { migrated:false, count:0 };
    }
  }

  return { getAll, add, put, del, clear, tryMigrateFrom };
})();
