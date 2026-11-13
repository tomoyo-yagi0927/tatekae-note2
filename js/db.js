const DATABASE_NAME = "tatekae-note-db";
const DATABASE_VERSION = 1;
const STORE_NAME = "receipts";

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      const store = database.createObjectStore(STORE_NAME, { keyPath: "id" });
      store.createIndex("status", "status", { unique: false });
      store.createIndex("usedDate", "usedDate", { unique: false });
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function runTransaction(mode, callback) {
  const database = await openDatabase();

  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, mode);
    const store = transaction.objectStore(STORE_NAME);
    let result;

    try {
      result = callback(store);
    } catch (error) {
      reject(error);
      return;
    }

    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error);
  });
}

export function getAllReceipts() {
  return runTransaction("readonly", (store) => new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result.sort((a, b) => b.registeredAt - a.registeredAt));
    request.onerror = () => reject(request.error);
  }));
}

export function getReceipt(id) {
  return runTransaction("readonly", (store) => new Promise((resolve, reject) => {
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }));
}

export function saveReceipt(receipt) {
  return runTransaction("readwrite", (store) => store.put(receipt));
}

export function deleteReceipt(id) {
  return runTransaction("readwrite", (store) => store.delete(id));
}

