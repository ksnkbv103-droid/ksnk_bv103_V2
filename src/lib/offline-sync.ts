"use client";

export type OfflineTaskType = "SCAN_QR" | "REPORT_INCIDENT" | "OTHER";

export interface OfflineTask {
  id: string;
  type: OfflineTaskType;
  payload: any;
  createdAt: number;
}

const DB_NAME = "ksnk_offline_db";
const STORE_NAME = "action_queue";

let dbPromise: Promise<IDBDatabase> | null = null;

function invalidateDB(): void {
  dbPromise = null;
}

function isClosingError(error: unknown): boolean {
  if (error instanceof DOMException && error.name === "InvalidStateError") return true;
  if (error instanceof Error && error.message.includes("closing")) return true;
  return false;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, 1);

    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => {
      const db = request.result;
      db.onclose = () => invalidateDB();
      db.onversionchange = () => {
        db.close();
        invalidateDB();
      };
      resolve(db);
    };
  });
}

function getDB(): Promise<IDBDatabase> {
  if (typeof window === "undefined") return Promise.reject(new Error("Not in browser"));
  if (!window.indexedDB) return Promise.reject(new Error("IndexedDB not supported"));

  if (!dbPromise) {
    dbPromise = openDB().catch((error) => {
      invalidateDB();
      throw error;
    });
  }
  return dbPromise;
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => Promise<T>,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const db = await getDB();
      return await new Promise<T>((resolve, reject) => {
        let tx: IDBTransaction;
        try {
          tx = db.transaction(STORE_NAME, mode);
        } catch (error) {
          reject(error);
          return;
        }

        const store = tx.objectStore(STORE_NAME);
        run(store).then(resolve).catch(reject);
        tx.onerror = () => reject(tx.error ?? new Error("IndexedDB transaction failed"));
        tx.onabort = () => reject(tx.error ?? new Error("IndexedDB transaction aborted"));
      });
    } catch (error) {
      lastError = error;
      if (attempt === 0 && isClosingError(error)) {
        invalidateDB();
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

export async function pushOfflineTask(type: OfflineTaskType, payload: any): Promise<void> {
  try {
    const task: OfflineTask = {
      id: crypto.randomUUID(),
      type,
      payload,
      createdAt: Date.now(),
    };
    await withStore("readwrite", async (store) => {
      await new Promise<void>((resolve, reject) => {
        const request = store.put(task);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
  } catch (e) {
    console.warn("Lỗi lưu IndexedDB:", e);
  }
}

export async function getOfflineTasks(): Promise<OfflineTask[]> {
  try {
    return await withStore("readonly", async (store) => {
      const tasks = await new Promise<OfflineTask[]>((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve((request.result as OfflineTask[]) || []);
        request.onerror = () => reject(request.error);
      });
      return tasks.sort((a, b) => a.createdAt - b.createdAt);
    });
  } catch {
    return [];
  }
}

export async function removeOfflineTask(id: string): Promise<void> {
  try {
    await withStore("readwrite", async (store) => {
      await new Promise<void>((resolve, reject) => {
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    });
  } catch {
    /* queue item may already be gone */
  }
}

export function isNetworkError(error: unknown): boolean {
  if (error instanceof Error) {
    if (error.message.includes("Failed to fetch") || error.message.includes("Network request failed")) {
      return true;
    }
  }
  if (typeof error === "string" && error.includes("fetch")) return true;
  return !navigator.onLine;
}
