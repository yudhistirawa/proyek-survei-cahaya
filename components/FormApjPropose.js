"use client";

import React, { useEffect, useRef, useState } from 'react';
import { addDraft } from "../app/lib/db";
import { syncDraft } from "../app/lib/sync";
import { capturePhotoAsWebP, pickGalleryAsWebP } from "../app/lib/camera";
import { Capacitor } from "@capacitor/core";
import { useGeolocationWatch } from "../app/lib/useGeolocationWatch";

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
  const [toast, setToast] = useState({ show: false, message: '' });
  const [preview, setPreview] = useState({ url: null, blob: null, fieldKey: null, source: null }); // source: 'camera'|'gallery'|'file'
  const [copied, setCopied] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handlePickGallery = async () => {
    try {
      if (Capacitor?.isNativePlatform?.()) {
        const entry = await pickGalleryAsWebP('fotoKemerataan');
        const url = URL.createObjectURL(entry.blob);
        setPreview({ url, blob: entry.blob, fieldKey: entry.fieldKey, source: 'gallery' });
      } else {
        galleryInputRef.current?.click();
      }
    } catch (e) {
      setToast({ show: true, message: e?.message || 'Gagal membuka galeri.' });
      setTimeout(() => setToast({ show: false, message: '' }), 2200);
    }
  };

  const fileInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const { coords, status, error, refresh } = useGeolocationWatch();

  // Persist koordinat ke form setiap update
  useEffect(() => {
    if (coords?.lat && coords?.lng) {
      setForm((prev) => ({
        ...prev,
        koordinat: `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`,
        akurasi: coords.accuracy,
      }));
    }
  }, [coords]);

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const f = files[0];
    const url = URL.createObjectURL(f);
    setPreview({ url, blob: f, fieldKey: 'fotoTitik', source: 'file' });
  };

  const handleGalleryFiles = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const f = files[0];
    const url = URL.createObjectURL(f);
    setPreview({ url, blob: f, fieldKey: 'fotoKemerataan', source: 'file' });
  };

  const handleCapturePhoto = async () => {
    try {
      if (Capacitor?.isNativePlatform?.()) {
        const entry = await capturePhotoAsWebP('fotoTitik');
        const url = URL.createObjectURL(entry.blob);
        setPreview({ url, blob: entry.blob, fieldKey: entry.fieldKey, source: 'camera' });
      } else {
        // Desktop/web: open file picker
        fileInputRef.current?.click();
      }
    } catch (e) {
      setToast({ show: true, message: e?.message || 'Gagal membuka kamera.' });
      setTimeout(() => setToast({ show: false, message: '' }), 2200);
    }
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
        await submitOnline();
      } else {
        await saveAsDraft();
      }
    } catch (err) {
      // fallback to draft if online path fails
      await saveAsDraft();
    } finally {
      setSubmitting(false);
    }
  };

  const confirmUsePreview = () => {
    if (!preview.blob || !preview.fieldKey) return;
    const nameBase = `${preview.fieldKey}_${Date.now()}`;
    const name = preview.blob.type?.includes('webp') ? `${nameBase}.webp` : (preview.blob.name || `${nameBase}.jpg`);
    const entry = { name, blob: preview.blob, fieldKey: preview.fieldKey };
    setPhotos((prev) => [...prev, entry]);
    if (preview.url) URL.revokeObjectURL(preview.url);
    setPreview({ url: null, blob: null, fieldKey: null, source: null });
    setToast({ show: true, message: 'Foto ditambahkan.' });
    setTimeout(() => setToast({ show: false, message: '' }), 1600);
  };

  const retakeFromPreview = () => {
    const src = preview.source;
    const fk = preview.fieldKey;
    if (preview.url) URL.revokeObjectURL(preview.url);
    setPreview({ url: null, blob: null, fieldKey: null, source: null });
    // Re-open according to source type and platform
    if (src === 'camera') {
      handleCapturePhoto();
    } else if (src === 'gallery') {
      handlePickGallery();
    } else {
      if (fk === 'fotoKemerataan') galleryInputRef.current?.click();
      else fileInputRef.current?.click();
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Toast */}
      {toast.show && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[2147483647]">
          <div className="px-4 py-2 rounded-xl shadow-lg bg-gray-900/90 text-white text-sm border border-gray-700">
            {toast.message}
          </div>
        </div>
      )}
      <h2 className="text-lg font-semibold">Form Survey APJ Propose (Offline-capable)</h2>
      <div>
        <label className="block text-sm font-medium">Ruas</label>
        <input name="ruas" value={form.ruas} onChange={handleChange} className="border p-2 rounded w-full"/>
      </div>
      {/* Foto Kemerataan */}
      <div>
        <label className="block text-sm font-medium">Foto Kemerataan</label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePickGallery}
            className="px-3 py-2 bg-purple-600 text-white rounded"
          >
            Buka Galeri
          </button>
          <span className="text-xs text-gray-600">
            {photos.filter(p => p.fieldKey === 'fotoKemerataan').length} foto kemerataan
          </span>
        </div>
        {/* Hidden file input for desktop/web (kemerataan) */}
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleGalleryFiles}
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Lokasi</label>
        <input name="lokasi" value={form.lokasi} onChange={handleChange} className="border p-2 rounded w-full"/>
      </div>
      <div>
        <label className="block text-sm font-medium">Titik Koordinat</label>
        <div className="mt-1 flex items-center gap-2">
          <input
            readOnly
            value={form.koordinat || ''}
            placeholder={status === 'watching' ? 'Mencari lokasi…' : (status === 'denied' ? 'Izin lokasi ditolak' : 'Koordinat belum tersedia')}
            className={`border p-2 rounded w-full ${status === 'success' ? 'bg-green-50 border-green-200 text-green-800' : ''}`}
          />
          <button
            type="button"
            onClick={refresh}
            className="p-2 rounded border bg-white hover:bg-gray-50"
            title="Refresh lokasi"
          >
            ↻
          </button>
          <button
            type="button"
            disabled={!form.koordinat}
            onClick={async () => {
              try { await navigator.clipboard.writeText(form.koordinat || ''); setCopied(true); setTimeout(()=>setCopied(false),1200); } catch(_) {}
            }}
            className="p-2 rounded border bg-white hover:bg-gray-50 disabled:opacity-50"
            title="Salin koordinat"
          >
            ⧉
          </button>
        </div>
        <p className={`mt-1 text-xs ${status === 'success' ? 'text-green-700' : status === 'denied' ? 'text-red-600' : 'text-gray-500'}`}>
          {status === 'success' && 'Lokasi berhasil didapatkan'}
          {status === 'watching' && 'Mengambil lokasi…'}
          {status === 'denied' && 'Izin lokasi ditolak. Buka pengaturan izin lokasi aplikasi.'}
          {status === 'error' && (error?.message || 'Gagal mendapatkan lokasi')}
          {copied && ' • Disalin'}
          {coords?.accuracy ? ` • Akurasi ±${Math.round(coords.accuracy)}m` : ''}
        </p>
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
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCapturePhoto}
            className="px-3 py-2 bg-green-600 text-white rounded"
          >
            Ambil Foto
          </button>
          <span className="text-xs text-gray-600">{photos.length} foto terpilih</span>
        </div>
        {/* Hidden file input for desktop/web */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFiles}
        />
      </div>
      {/* Preview Modal */}
      {preview.url && (
        <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-3 border-b border-gray-200 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-800">Tinjau Foto</span>
              <button onClick={() => { if (preview.url) URL.revokeObjectURL(preview.url); setPreview({ url: null, blob: null, fieldKey: null, source: null }); }} className="p-2 rounded hover:bg-gray-100">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5 text-gray-500"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-3">
              <div className="rounded-xl overflow-hidden border border-gray-200">
                <img src={preview.url} alt="Preview" className="w-full max-h-[60vh] object-contain bg-black" />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button onClick={retakeFromPreview} className="w-full py-3 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold">
                  Ulangi
                </button>
                <button onClick={confirmUsePreview} className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold">
                  Gunakan Foto
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-3 text-center">Mobile membuka kamera/galeri; PC membuka file picker saat Ulangi.</p>
            </div>
          </div>
        </div>
      )}
      <div className="flex gap-2">
        <button disabled={submitting} type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">
          {submitting ? 'Menyimpan...' : (typeof navigator !== 'undefined' && navigator.onLine ? 'Submit' : 'Simpan Draft')}
        </button>
        <button disabled={submitting} type="button" onClick={saveAsDraft} className="px-4 py-2 bg-gray-200 rounded">
          Simpan Draft Manual
        </button>
      </div>
      {message && <p className="text-sm text-green-700">{message}</p>}
    </form>
  );
}
