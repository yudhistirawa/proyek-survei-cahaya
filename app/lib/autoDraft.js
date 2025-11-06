"use client";

import { useEffect, useRef, useState } from "react";
import { addDraft, updateDraft, deleteDraft } from "./db";
import { syncDraft } from "./sync";

// Reusable hook to auto-save a form as draft when offline and auto-sync when online
// Usage: const { draftId, saving, saveNow, trySyncNow } = useAutoDraft({ type, form, photos });
export function useAutoDraft({ type, form, photos, onDraftCreated }) {
  const [draftId, setDraftId] = useState(null);
  const [saving, setSaving] = useState(false);
  const timerRef = useRef(null);

  // Debounced save on form/photos changes
  useEffect(() => {
    // Avoid running on SSR
    if (typeof window === "undefined") return;

    // Debounce 600ms
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        setSaving(true);
        // Always save as draft while typing; syncing is handled on submit or when online event fires
        if (draftId) {
          await updateDraft(draftId, { type, data: form, photos });
        } else {
          const id = await addDraft({ type, data: form, photos });
          setDraftId(id);
          try {
            if (typeof navigator !== "undefined" && !navigator.onLine && typeof onDraftCreated === "function") {
              onDraftCreated(id);
            }
          } catch (_) {}
        }
      } catch (e) {
        // swallow; keep UX smooth
      } finally {
        setSaving(false);
      }
    }, 600);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [JSON.stringify(form), JSON.stringify((photos || []).map(p => ({ name: p?.name, fieldKey: p?.fieldKey }))) , type, draftId]);

  // Try to sync now (e.g., on submit or on online)
  const trySyncNow = async () => {
    if (!navigator.onLine) return { success: false, error: "offline" };
    const draft = { id: draftId || Date.now(), type, data: form, photos };
    const res = await syncDraft(draft);
    if (res.success) {
      if (draftId) await deleteDraft(draftId);
      setDraftId(null);
    }
    return res;
  };

  // Manual save (force save as draft)
  const saveNow = async () => {
    try {
      setSaving(true);
      if (draftId) {
        await updateDraft(draftId, { type, data: form, photos });
        return draftId;
      } else {
        const id = await addDraft({ type, data: form, photos });
        setDraftId(id);
        try {
          if (typeof navigator !== "undefined" && !navigator.onLine && typeof onDraftCreated === "function") {
            onDraftCreated(id);
          }
        } catch (_) {}
        return id;
      }
    } finally {
      setSaving(false);
    }
  };

  // Auto-sync when the browser comes back online
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onOnline = async () => {
      try {
        await trySyncNow();
      } catch (_) {}
    };
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [draftId, JSON.stringify(form), JSON.stringify((photos || []).map(p => ({ name: p?.name, fieldKey: p?.fieldKey })))]);

  return { draftId, saving, saveNow, trySyncNow };
}
