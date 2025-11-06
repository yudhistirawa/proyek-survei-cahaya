"use client";

// IndexedDB via Dexie for offline drafts
// Tables:
// - drafts: { id, type: 'apj_propose' | 'existing', data: object, photos: [{name, blob, fieldKey}], createdAt, updatedAt }

let dexieInstance = null;

const initDexie = async () => {
  if (dexieInstance) return dexieInstance;
  if (typeof window === 'undefined') return null;
  const { default: Dexie } = await import('dexie');
  const db = new Dexie('survey_offline_db');
  db.version(1).stores({
    drafts: '++id, type, createdAt',
  });
  dexieInstance = db;
  return dexieInstance;
};

export const getDB = async () => {
  return await initDexie();
};

export const addDraft = async (draft) => {
  const db = await getDB();
  if (!db) throw new Error('IndexedDB tidak tersedia');
  const now = new Date().toISOString();
  return db.drafts.add({
    ...draft,
    createdAt: now,
    updatedAt: now,
  });
};

export const getDrafts = async () => {
  const db = await getDB();
  if (!db) return [];
  return db.drafts.orderBy('createdAt').reverse().toArray();
};

export const deleteDraft = async (id) => {
  const db = await getDB();
  if (!db) return;
  return db.drafts.delete(id);
};

export const updateDraft = async (id, patch) => {
  const db = await getDB();
  if (!db) return;
  patch.updatedAt = new Date().toISOString();
  return db.drafts.update(id, patch);
};
