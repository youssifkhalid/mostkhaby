/**
 * swBridge — sync client state to service worker
 * ──────────────────────────────────────────────
 * Two channels:
 * 1. postMessage to active SW (instant, in-memory)
 * 2. IndexedDB ("mostkhaby-sw" / "state" / key="active")
 *    — survives SW restarts; SW push handler reads from here.
 */

const DB_NAME = "mostkhaby-sw";
const STORE = "state";
const KEY = "active";

export interface ActiveState {
  activeChatId: string | null;
  isAppActive: boolean;
  updatedAt: number;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("no-idb"));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function writeState(state: ActiveState) {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(state, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    /* ignore */
  }
}

export async function syncActiveStateToSW(partial: { activeChatId: string | null; isAppActive: boolean }) {
  const state: ActiveState = { ...partial, updatedAt: Date.now() };

  // 1. Write IndexedDB (persistent — SW reads on push)
  void writeState(state);

  // 2. postMessage to active controller (instant)
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    const target = reg?.active || navigator.serviceWorker?.controller;
    target?.postMessage({ type: "ACTIVE_STATE", state });
  } catch {
    /* ignore */
  }
}

/**
 * Listen for navigation requests posted by the SW (e.g. when a user
 * clicks a notification while a tab is already open).
 */
export function attachSWNavigationBridge(navigate: (url: string) => void) {
  if (typeof navigator === "undefined" || !navigator.serviceWorker) return () => {};
  const handler = (evt: MessageEvent) => {
    const data = evt.data;
    if (data?.type === "NAVIGATE" && typeof data.url === "string") {
      navigate(data.url);
    }
  };
  navigator.serviceWorker.addEventListener("message", handler);
  return () => navigator.serviceWorker.removeEventListener("message", handler);
}
