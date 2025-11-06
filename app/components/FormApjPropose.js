"use client";

import React, { useState } from 'react';
import { addDraft } from "../lib/db";
import { syncDraft } from "../lib/sync";
import { useAutoDraft } from "../lib/autoDraft";
import ConnectionBanner from "./ConnectionBanner";

export default function FormApjPropose() {
  const [form, setForm] = useState({
    taskType: 'apj_propose',
    ruas: '',
    lokasi: '',
    lebarTrotoarBertiang: '',
    surveyorId: '',
  });
  const [photos, setPhotos] = useState([]); // [{name, blob, fieldKey}]
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  // Auto-draft as user types; auto-sync when online
  const { draftId, saving, saveNow, trySyncNow } = useAutoDraft({
    type: 'apj_propose',
    form,
    photos,
    onDraftCreated: (id) => {
      try {
        if (typeof window !== 'undefined' && !navigator.onLine) {
          alert(`Draft offline tersimpan (ID: ${id})`);
        }
      } catch (_) {}
    }
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    const blobs = await Promise.all(files.map(async (f) => ({ name: f.name, blob: f, fieldKey: 'fotoTitik' })));
    setPhotos(blobs);
  };

  const saveAsDraft = async () => {
    const id = await addDraft({
      type: 'apj_propose',
      data: form,
      photos,
    });
    setMessage(`Draft disimpan (ID: ${id})`);
  };

  const submitOnline = async () => {
    // Try direct sync via shared syncDraft API
    const draft = { id: Date.now(), type: 'apj_propose', data: form, photos };
    const res = await syncDraft(draft);
    if (!res.success) throw new Error(res.error);
    setMessage('Data berhasil terkirim');
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage('');
    try {
      if (typeof navigator !== 'undefined' && navigator.onLine) {
        const res = await trySyncNow();
        if (res?.success) {
          setMessage('Data berhasil terkirim');
        } else {
          await saveNow();
          setMessage('Offline: draft otomatis disimpan');
        }
      } else {
        await saveNow();
        setMessage('Offline: draft otomatis disimpan');
      }
    } catch (err) {
      await saveNow();
      setMessage('Terjadi kesalahan. Draft disimpan.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <ConnectionBanner />
      <h2 className="text-lg font-semibold">Form Survey APJ Propose (Offline-capable)</h2>
      <div>
        <label className="block text-sm font-medium">Ruas</label>
        <input name="ruas" value={form.ruas} onChange={handleChange} className="border p-2 rounded w-full"/>
      </div>
      <div>
        <label className="block text-sm font-medium">Lokasi</label>
        <input name="lokasi" value={form.lokasi} onChange={handleChange} className="border p-2 rounded w-full"/>
      </div>
      <div>
        <label className="block text-sm font-medium">Lebar Trotoar Bertiang</label>
        <input name="lebarTrotoarBertiang" value={form.lebarTrotoarBertiang} onChange={handleChange} className="border p-2 rounded w-full"/>
      </div>
      <div>
        <label className="block text-sm font-medium">Surveyor ID</label>
        <input name="surveyorId" value={form.surveyorId} onChange={handleChange} className="border p-2 rounded w-full"/>
      </div>
      <div>
        <label className="block text-sm font-medium">Foto</label>
        <input type="file" accept="image/*" multiple onChange={handleFiles} />
      </div>
      <div className="flex gap-2 items-center">
        <button disabled={submitting} type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">
          {submitting ? 'Menyimpan...' : (typeof navigator !== 'undefined' && navigator.onLine ? 'Submit' : 'Simpan Draft')}
        </button>
        <button
          disabled={submitting}
          type="button"
          onClick={async () => {
            const id = await saveNow();
            setMessage(`Draft disimpan (ID: ${id})`);
            try { alert(`Draft offline tersimpan (ID: ${id})`); } catch(_) {}
          }}
          className="px-4 py-2 bg-gray-200 rounded"
        >
          Simpan Draft Manual
        </button>
        <span className="text-xs text-gray-500">{saving ? 'Menyimpan otomatis…' : (draftId ? `Draft #${draftId} tersimpan` : '')}</span>
      </div>
      {message && <p className="text-sm text-green-700">{message}</p>}
    </form>
  );
}
