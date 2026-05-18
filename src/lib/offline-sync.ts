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

function getDB(): Promise<IDBDatabase> {
  if (typeof window === "undefined") return Promise.reject("Not in browser");
  if (!window.indexedDB) return Promise.reject("IndexedDB not supported");
  
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = window.indexedDB.open(DB_NAME, 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (e) => {
        const db = (e.target as any).result as IDBDatabase;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: "id" });
        }
      };
    });
  }
  return dbPromise;
}

export async function pushOfflineTask(type: OfflineTaskType, payload: any): Promise<void> {
  try {
    const db = await getDB();
    const task: OfflineTask = {
      id: crypto.randomUUID(),
      type,
      payload,
      createdAt: Date.now(),
    };
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put(task);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    console.warn("Lỗi lưu IndexedDB:", e);
  }
}

export async function getOfflineTasks(): Promise<OfflineTask[]> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const request = tx.objectStore(STORE_NAME).getAll();
      request.onsuccess = () => {
        const tasks = (request.result as OfflineTask[]) || [];
        resolve(tasks.sort((a, b) => a.createdAt - b.createdAt));
      };
      request.onerror = () => reject(request.error);
    });
  } catch {
    return [];
  }
}

export async function removeOfflineTask(id: string): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {}
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
