(() => {
  "use strict";
  const DB_NAME="ironquest_unified_final";
  const DB_VERSION=2;
  const STORES={
    entries:{ keyPath:"id", autoIncrement:true },
    health:{ keyPath:"id", autoIncrement:true },
    system:{ keyPath:"id", autoIncrement:true },
    runs:{ keyPath:"id", autoIncrement:true }
  };
  let _db=null;

  function open(){
    return new Promise((resolve,reject)=>{
      const req=indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded=()=>{
        const db=req.result;
        for(const [name,cfg] of Object.entries(STORES)){
          if(!db.objectStoreNames.contains(name)) db.createObjectStore(name, cfg);
        }
      };
      req.onsuccess=()=>{ _db=req.result; resolve(_db); };
      req.onerror=()=>reject(req.error);
    });
  }
  async function init(){ if(_db) return _db; return await open(); }
  async function store(name, mode="readonly"){
    const db=await init();
    if(!db.objectStoreNames.contains(name)) throw new Error("Store fehlt: "+name);
    return db.transaction(name, mode).objectStore(name);
  }
  async function getAll(name){
    const s=await store(name,"readonly");
    return await new Promise((res,rej)=>{ const r=s.getAll(); r.onsuccess=()=>res(r.result||[]); r.onerror=()=>rej(r.error); });
  }
  async function add(name, val){
    const s=await store(name,"readwrite");
    return await new Promise((res,rej)=>{ const r=s.add(val); r.onsuccess=()=>res(r.result); r.onerror=()=>rej(r.error); });
  }
  async function clear(name){
    const s=await store(name,"readwrite");
    return await new Promise((res,rej)=>{ const r=s.clear(); r.onsuccess=()=>res(true); r.onerror=()=>rej(r.error); });
  }

  window.DB={ init, getAll, add, clear };

  // Convenience
  window.IronDB={
    init,
    getAllEntries: ()=>getAll("entries"),
    addEntry: (e)=>add("entries", e),
    clearAllEntries: ()=>clear("entries"),
    addHealth: (h)=>add("health", h),
    getAllHealth: ()=>getAll("health"),
    addSystem: (m)=>add("system", m),
    getAllSystem: ()=>getAll("system"),
    clearSystem: ()=>clear("system"),
    addRun: (r)=>add("runs", r),
    getAllRuns: ()=>getAll("runs"),
    clearRuns: ()=>clear("runs")
  };
})();
