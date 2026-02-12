const DB_NAME = "ironquest_db";         // <- NICHT ändern, sonst wirkt es wie "alle Einträge weg"
const DB_VERSION = 4;                  // nur erhöhen, niemals DB_NAME wechseln

const STORE_ENTRIES = "entries";
const STORE_HEALTH  = "health";
const STORE_META    = "meta";

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = () => {
      const db = req.result;

      if (!db.objectStoreNames.contains(STORE_ENTRIES)) {
        const s = db.createObjectStore(STORE_ENTRIES, { keyPath: "id", autoIncrement: true });
        s.createIndex("date", "date", { unique: false });
        s.createIndex("week", "week", { unique: false });
      } else {
        const s = req.transaction.objectStore(STORE_ENTRIES);
        if (!s.indexNames.contains("date")) s.createIndex("date", "date", { unique: false });
        if (!s.indexNames.contains("week")) s.createIndex("week", "week", { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_HEALTH)) {
        const s = db.createObjectStore(STORE_HEALTH, { keyPath: "id", autoIncrement: true });
        s.createIndex("date", "date", { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: "key" });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx(store, mode) {
  const db = await openDB();
  const t = db.transaction(store, mode);
  return { db, t, s: t.objectStore(store) };
}

/* ---------- ENTRIES ---------- */
export async function entriesGetAll() {
  const { s } = await tx(STORE_ENTRIES, "readonly");
  return new Promise((resolve, reject) => {
    const r = s.getAll();
    r.onsuccess = () => resolve(r.result || []);
    r.onerror = () => reject(r.error);
  });
}

export async function entriesAdd(entry) {
  const { t, s } = await tx(STORE_ENTRIES, "readwrite");
  return new Promise((resolve, reject) => {
    s.add(entry);
    t.oncomplete = () => resolve(true);
    t.onerror = () => reject(t.error);
  });
}

export async function entriesPut(entry) {
  const { t, s } = await tx(STORE_ENTRIES, "readwrite");
  return new Promise((resolve, reject) => {
    s.put(entry);
    t.oncomplete = () => resolve(true);
    t.onerror = () => reject(t.error);
  });
}

export async function entriesDelete(id) {
  const { t, s } = await tx(STORE_ENTRIES, "readwrite");
  return new Promise((resolve, reject) => {
    s.delete(id);
    t.oncomplete = () => resolve(true);
    t.onerror = () => reject(t.error);
  });
}

export async function entriesClear() {
  const { t, s } = await tx(STORE_ENTRIES, "readwrite");
  return new Promise((resolve, reject) => {
    s.clear();
    t.oncomplete = () => resolve(true);
    t.onerror = () => reject(t.error);
  });
}

/* ---------- HEALTH ---------- */
export async function healthGetAll() {
  const { s } = await tx(STORE_HEALTH, "readonly");
  return new Promise((resolve, reject) => {
    const r = s.getAll();
    r.onsuccess = () => resolve(r.result || []);
    r.onerror = () => reject(r.error);
  });
}

export async function healthAdd(row) {
  const { t, s } = await tx(STORE_HEALTH, "readwrite");
  return new Promise((resolve, reject) => {
    s.add(row);
    t.oncomplete = () => resolve(true);
    t.onerror = () => reject(t.error);
  });
}

export async function healthDelete(id) {
  const { t, s } = await tx(STORE_HEALTH, "readwrite");
  return new Promise((resolve, reject) => {
    s.delete(id);
    t.oncomplete = () => resolve(true);
    t.onerror = () => reject(t.error);
  });
}

/* ---------- META (key/value) ---------- */
export async function metaGet(key) {
  const { s } = await tx(STORE_META, "readonly");
  return new Promise((resolve, reject) => {
    const r = s.get(key);
    r.onsuccess = () => resolve(r.result?.value ?? null);
    r.onerror = () => reject(r.error);
  });
}

export async function metaSet(key, value) {
  const { t, s } = await tx(STORE_META, "readwrite");
  return new Promise((resolve, reject) => {
    s.put({ key, value });
    t.oncomplete = () => resolve(true);
    t.onerror = () => reject(t.error);
  });
}
