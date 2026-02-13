/* =========================
   IRON QUEST – js/db.js
   ✅ IndexedDB Wrapper (Safari iOS friendly)
   ✅ Robust Upgrade: creates missing stores by bumping DB_VERSION
   ✅ Legacy-Migration: versucht alte Daten aus früheren DB-Namen zu importieren
   ========================= */

(() => {
  const DB_NAME = "ironquest_v4_pro";
  const DB_VERSION = 3; // ⬅️ WICHTIG: hochgezählt (fix für „object store not found“)

  const STORES = {
    entries: "entries",   // Trainings-Entries (XP etc.)
    health:  "health",    // Blutdruck/Puls/Recomp etc.
    runs:    "runs",      // Jogging
    settings:"settings"   // App-Settings (Startdatum usw.) optional
  };

  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);

      req.onupgradeneeded = () => {
        const db = req.result;

        // Helper: create store if missing
        const ensureStore = (name, opts, indexes = []) => {
          let store;
          if (!db.objectStoreNames.contains(name)) {
            store = db.createObjectStore(name, opts);
          } else {
            store = req.transaction.objectStore(name);
          }
          indexes.forEach(ix => {
            try {
              if (!store.indexNames.contains(ix.name)) store.createIndex(ix.name, ix.keyPath, ix.options || {});
            } catch (e) {
              // ignore index errors (old Safari quirks)
            }
          });
        };

        ensureStore(STORES.entries, { keyPath: "id", autoIncrement: true }, [
          { name: "date", keyPath: "date", options: { unique: false } },
          { name: "week", keyPath: "week", options: { unique: false } },
          { name: "type", keyPath: "type", options: { unique: false } }
        ]);

        ensureStore(STORES.health, { keyPath: "id", autoIncrement: true }, [
          { name: "date", keyPath: "date", options: { unique: false } }
        ]);

        ensureStore(STORES.runs, { keyPath: "id", autoIncrement: true }, [
          { name: "date", keyPath: "date", options: { unique: false } }
        ]);

        ensureStore(STORES.settings, { keyPath: "key" }, []);
      };

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function txStore(storeName, mode = "readonly") {
    const db = await openDB();

    // Defensive: if store somehow missing (corrupt/old DB), throw a clearer error
    if (!db.objectStoreNames.contains(storeName)) {
      db.close();
      throw new Error(`DB store missing: ${storeName} (DB_VERSION=${DB_VERSION}).`);
    }

    const tx = db.transaction(storeName, mode);
    return tx.objectStore(storeName);
  }

  // ---------- Basic CRUD ----------
  async function getAll(storeName) {
    const store = await txStore(storeName, "readonly");
    return new Promise((resolve, reject) => {
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async function add(storeName, value) {
    const store = await txStore(storeName, "readwrite");
    return new Promise((resolve, reject) => {
      const req = store.add(value);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function put(storeName, value) {
    const store = await txStore(storeName, "readwrite");
    return new Promise((resolve, reject) => {
      const req = store.put(value);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function del(storeName, id) {
    const store = await txStore(storeName, "readwrite");
    return new Promise((resolve, reject) => {
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  async function clear(storeName) {
    const store = await txStore(storeName, "readwrite");
    return new Promise((resolve, reject) => {
      const req = store.clear();
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  // ---------- Settings (key/value) ----------
  async function getSetting(key, fallback = null) {
    const store = await txStore(STORES.settings, "readonly");
    return new Promise((resolve) => {
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ? req.result.value : fallback);
      req.onerror = () => resolve(fallback);
    });
  }

  async function setSetting(key, value) {
    const store = await txStore(STORES.settings, "readwrite");
    return new Promise((resolve, reject) => {
      const req = store.put({ key, value });
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  // ---------- Legacy Migration ----------
  async function tryReadLegacyDB(legacyName, legacyStores = ["entries"]) {
    return new Promise((resolve) => {
      const req = indexedDB.open(legacyName);
      req.onerror = () => resolve(null);
      req.onsuccess = () => {
        const db = req.result;
        try {
          const found = [];
          for (const s of legacyStores) {
            if (db.objectStoreNames.contains(s)) found.push(s);
          }
          if (!found.length) { db.close(); return resolve(null); }

          const tx = db.transaction(found, "readonly");
          const out = {};
          let pending = found.length;

          found.forEach((s) => {
            const r = tx.objectStore(s).getAll();
            r.onsuccess = () => {
              out[s] = r.result || [];
              pending -= 1;
              if (!pending) { db.close(); resolve(out); }
            };
            r.onerror = () => {
              out[s] = [];
              pending -= 1;
              if (!pending) { db.close(); resolve(out); }
            };
          });
        } catch {
          try { db.close(); } catch {}
          resolve(null);
        }
      };
    });
  }

  async function migrateFromLegacyIfEmpty() {
    // only migrate if our current DB looks empty
    const existing = await getAll(STORES.entries).catch(() => []);
    if (existing && existing.length) return { migrated: false, reason: "entries-not-empty" };

    const legacyCandidates = [
      { name: "ironquest_db", stores: ["entries"] },
      { name: "ironquest_db", stores: ["workouts", "entries"] },
      { name: "ironquest_db", stores: ["log", "entries"] },
      { name: "ironquest_db", stores: ["entries", "health", "runs"] },
      { name: "ironquest_db_v3", stores: ["entries"] },
      { name: "ironquest_v3_pro", stores: ["entries"] },
      { name: "ironquest_db_v20", stores: ["entries"] },
    ];

    for (const c of legacyCandidates) {
      const data = await tryReadLegacyDB(c.name, c.stores);
      if (!data) continue;

      const legacyEntries = data.entries || data.workouts || data.log || [];
      if (legacyEntries.length) {
        // normalize
        for (const e of legacyEntries) {
          const clean = {
            date: e.date || e.day || null,
            week: e.week || e.weekNum || null,
            exercise: e.exercise || e.name || e.title || "Legacy Entry",
            type: e.type || e.kind || "Legacy",
            detail: e.detail || e.notes || "",
            xp: typeof e.xp === "number" ? e.xp : (typeof e.points === "number" ? e.points : 0),
          };
          if (!clean.date) continue;
          await add(STORES.entries, clean);
        }
        return { migrated: true, from: c.name, count: legacyEntries.length };
      }
    }
    return { migrated: false, reason: "no-legacy-found" };
  }

  async function init() {
    // open once to ensure upgrade runs
    await openDB();
    // try migration (best effort)
    try {
      return await migrateFromLegacyIfEmpty();
    } catch {
      return { migrated: false, reason: "migration-error" };
    }
  }

  // expose
  window.IronDB = {
    STORES,
    init,
    getAllEntries: () => getAll(STORES.entries),
    addEntry: (e) => add(STORES.entries, e),
    updateEntry: (e) => put(STORES.entries, e),
    deleteEntry: (id) => del(STORES.entries, id),
    clearEntries: () => clear(STORES.entries),

    getAllHealth: () => getAll(STORES.health),
    addHealth: (h) => add(STORES.health, h),
    deleteHealth: (id) => del(STORES.health, id),

    getAllRuns: () => getAll(STORES.runs),
    addRun: (r) => add(STORES.runs, r),
    deleteRun: (id) => del(STORES.runs, id),

    getSetting,
    setSetting,
  };
})();
