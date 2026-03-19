// ─────────────────────────────────────────────────────────
// IndexedDB Storage Adapter for Zustand persist
// Handles large data (parsed PDF text) that exceeds
// localStorage's ~5MB limit
// ─────────────────────────────────────────────────────────

const DB_NAME = 'dm-assistant-navigator';
const STORE_NAME = 'navigator-state';
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export const indexedDbStorage = {
    getItem: async (name: string): Promise<string | null> => {
        try {
            const db = await openDb();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readonly');
                const store = tx.objectStore(STORE_NAME);
                const request = store.get(name);
                request.onsuccess = () => {
                    const result = request.result;
                    resolve(result !== undefined ? result : null);
                };
                request.onerror = () => reject(request.error);
            });
        } catch (err) {
            console.warn('[IndexedDB] getItem failed, returning null:', err);
            return null;
        }
    },

    setItem: async (name: string, value: string): Promise<void> => {
        try {
            const db = await openDb();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                const request = store.put(value, name);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        } catch (err) {
            console.warn('[IndexedDB] setItem failed:', err);
        }
    },

    removeItem: async (name: string): Promise<void> => {
        try {
            const db = await openDb();
            return new Promise((resolve, reject) => {
                const tx = db.transaction(STORE_NAME, 'readwrite');
                const store = tx.objectStore(STORE_NAME);
                const request = store.delete(name);
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        } catch (err) {
            console.warn('[IndexedDB] removeItem failed:', err);
        }
    },
};
