"use client";

import { db as firestore, storage as fbStorage } from "../lib/firebase";
import { getDB, getDrafts, deleteDraft, updateDraft } from "./db";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// Upload a single blob to Firebase Storage and return URL
async function uploadBlob(folder, userId, draftId, photo) {
  const path = `${folder}/${userId || 'anonymous'}/${draftId}/${photo.name || Date.now()}`;
  const storageRef = ref(fbStorage, path);
  const snapshot = await uploadBytes(storageRef, photo.blob);
  const url = await getDownloadURL(snapshot.ref);
  return { url, path };
}

// Compose Firestore payload based on draft type
function buildPayload(draft, uploadedPhotos) {
  const base = {
    ...draft.data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  if (uploadedPhotos?.length) {
    // Map back by fieldKey if provided, else push to photos array
    const byField = {};
    uploadedPhotos.forEach((p) => {
      if (p.fieldKey) {
        byField[p.fieldKey] = p.url;
      }
    });
    base.photoUrls = uploadedPhotos.map(p => p.url);
    base.photoMap = byField;
  }
  return base;
}

export async function syncDraft(draft) {
  if (!draft) return { success: false, error: 'Empty draft' };
  const userId = draft.data?.userId || draft.data?.surveyorId || 'anonymous';
  const folder = draft.type === 'apj_propose' ? 'survey-apj-propose' : 'survey-existing';

  // 1) Upload photos
  const uploaded = [];
  if (Array.isArray(draft.photos)) {
    for (const photo of draft.photos) {
      try {
        const up = await uploadBlob(folder, userId, draft.id || Date.now(), photo);
        uploaded.push({ ...up, name: photo.name, fieldKey: photo.fieldKey });
      } catch (e) {
        return { success: false, error: `Gagal upload foto ${photo.name}: ${e.message}` };
      }
    }
  }

  // 2) Write to Firestore collection
  const colName = draft.type === 'apj_propose' ? 'APJ_Propose_Tiang' : 'Survey_Existing_Report';
  try {
    const payload = buildPayload(draft, uploaded);
    const colRef = collection(firestore, colName);
    const docRef = await addDoc(colRef, payload);

    return { success: true, docId: docRef.id };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export async function syncAllDrafts(onProgress) {
  const drafts = await getDrafts();
  let successCount = 0;
  for (let i = 0; i < drafts.length; i++) {
    const d = drafts[i];
    onProgress?.({ index: i, total: drafts.length, draft: d });
    const res = await syncDraft(d);
    if (res.success) {
      await deleteDraft(d.id);
      successCount++;
    } else {
      // mark lastError
      await updateDraft(d.id, { lastError: res.error });
    }
  }
  return { total: drafts.length, success: successCount };
}

export function registerSyncOnReconnect(callback) {
  if (typeof window === 'undefined') return () => {};
  const handler = async () => {
    try {
      const result = await syncAllDrafts();
      callback?.(result);
    } catch (e) {
      // ignore
    }
  };
  window.addEventListener('online', handler);
  return () => window.removeEventListener('online', handler);
}

// Optional React hook
export function useOfflineSync() {
  const [syncing, setSyncing] = require('react').useState(false);
  const [lastResult, setLastResult] = require('react').useState(null);

  require('react').useEffect(() => {
    const unsub = registerSyncOnReconnect((res) => setLastResult(res));
    return unsub;
  }, []);

  const runNow = async () => {
    setSyncing(true);
    try {
      const res = await syncAllDrafts();
      setLastResult(res);
      return res;
    } finally {
      setSyncing(false);
    }
  };

  return { syncing, lastResult, runNow };
}
