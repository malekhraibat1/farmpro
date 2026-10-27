/**
 * مخزن IndexedDB بسيط (مفتاح/قيمة نصية) لبيانات الصيدلية.
 * يحلّ مشكلة حد 5MB في localStorage. الكتابة مجمَّعة وغير متزامنة،
 * والقراءة تتم مرة واحدة عند بدء التشغيل إلى ذاكرة التطبيق (hydrate).
 */
const DB_NAME = 'pharma_pro_db';
const STORE = 'kv';

let dbPromise: Promise<IDBDatabase | null> | null = null;
let pending = new Map<string, string | null>();
let flushScheduled = false;
let flushChain: Promise<void> = Promise.resolve();
let failed = false;

export function idbSupported(): boolean {
  try {
    return typeof indexedDB !== 'undefined' && indexedDB !== null;
  } catch {
    return false;
  }
}

export function idbHealthy(): boolean {
  return idbSupported() && !failed;
}

function open(): Promise<IDBDatabase | null> {
  if (!idbSupported()) return Promise.resolve(null);
  if (dbPromise) return dbPromise;
  dbPromise = new Promise(resolve => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        failed = true;
        resolve(null);
      };
      req.onblocked = () => resolve(null);
    } catch {
      failed = true;
      resolve(null);
    }
  });
  return dbPromise;
}

/** يقرأ كل المفاتيح (مرة واحدة عند التشغيل) */
export async function idbGetAll(): Promise<Record<string, string> | null> {
  const db = await open();
  if (!db) return null;
  return new Promise(resolve => {
    try {
      const out: Record<string, string> = {};
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).openCursor();
      req.onsuccess = () => {
        const cur = req.result;
        if (cur) {
          if (typeof cur.value === 'string') out[String(cur.key)] = cur.value;
          cur.continue();
        }
      };
      tx.oncomplete = () => resolve(out);
      tx.onerror = () => {
        failed = true;
        resolve(null);
      };
    } catch {
      failed = true;
      resolve(null);
    }
  });
}

async function doFlush(): Promise<boolean> {
  const batch = pending;
  pending = new Map();
  flushScheduled = false;
  if (batch.size === 0) return true;
  const db = await open();
  if (!db) {
    // أعد القيم لقائمة الانتظار حتى لا تضيع
    for (const [k, v] of batch) if (!pending.has(k)) pending.set(k, v);
    return false;
  }
  return new Promise(resolve => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      for (const [k, v] of batch) {
        if (v === null) store.delete(k);
        else store.put(v, k);
      }
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => {
        failed = true;
        resolve(false);
      };
      tx.onabort = () => {
        failed = true;
        resolve(false);
      };
    } catch {
      failed = true;
      resolve(false);
    }
  });
}

export function idbQueueSet(key: string, value: string | null): void {
  pending.set(key, value);
  if (!flushScheduled) {
    flushScheduled = true;
    flushChain = flushChain.then(() => doFlush()).then(ok => {
      if (!ok && typeof window !== 'undefined') {
        try {
          window.dispatchEvent(new CustomEvent('pharma:storage-error'));
        } catch {}
      }
    });
  }
}

/** ينتظر انتهاء كل الكتابات المعلّقة */
export async function idbFlush(): Promise<void> {
  if (pending.size > 0 && !flushScheduled) {
    flushScheduled = true;
    flushChain = flushChain.then(() => doFlush()).then(() => undefined);
  }
  await flushChain;
}

export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
      return await navigator.storage.persist();
    }
  } catch {}
  return false;
}

export async function storageEstimate(): Promise<{ usage: number; quota: number } | null> {
  try {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
      const e = await navigator.storage.estimate();
      return { usage: e.usage || 0, quota: e.quota || 0 };
    }
  } catch {}
  return null;
}

if (typeof window !== 'undefined') {
  const flushNow = () => {
    void idbFlush();
  };
  window.addEventListener('pagehide', flushNow);
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushNow();
  });
}
