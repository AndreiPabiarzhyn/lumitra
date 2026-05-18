import { LumitraProject } from './types';

const DB_NAME = 'lumitra-autosave';
const STORE_NAME = 'projects';
const AUTOSAVE_KEY = 'latest';

const openDb = (): Promise<IDBDatabase> => (
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  })
);

export const saveAutosave = async (project: LumitraProject) => {
  const db = await openDb();

  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    transaction.objectStore(STORE_NAME).put(project, AUTOSAVE_KEY);
    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
    transaction.onabort = () => {
      db.close();
      reject(transaction.error);
    };
  });
};

export const loadAutosave = async (): Promise<LumitraProject | null> => {
  const db = await openDb();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).get(AUTOSAVE_KEY);

    request.onsuccess = () => {
      db.close();
      resolve((request.result as LumitraProject | undefined) ?? null);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
};
