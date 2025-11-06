"use client";

import React, { useEffect, useRef, useState } from 'react';
import { addDraft } from "../lib/db";
import { syncDraft } from "../lib/sync";
import { useAutoDraft } from "../lib/autoDraft";
import ConnectionBanner from "./ConnectionBanner";
import { capturePhotoAsWebP } from "../lib/camera";
import { Capacitor } from "@capacitor/core";
import { useGeolocationWatch } from "../lib/useGeolocationWatch";

export default function FormSurveyExisting() {
  const [form, setForm] = useState({
    taskType: 'existing',
    zona: '',
    ruas: '',
    lokasi: '',
    surveyorId: '',
  });
  const [photos, setPhotos] = useState([]); // [{name, blob, fieldKey}]
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);

  // Auto-draft as user types; auto-sync when online
  const { draftId, saving, saveNow, trySyncNow } = useAutoDraft({
    type: 'existing',
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

  const fileInputRef = useRef(null);
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
    const blobs = await Promise.all(files.map(async (f) => ({ name: f.name, blob: f, fieldKey: 'fotoTitik' })));
    setPhotos((prev) => [...prev, ...blobs]);
  };

  const handleCapturePhoto = async () => {
    try {
      if (Capacitor?.isNativePlatform?.()) {
        const entry = await capturePhotoAsWebP('fotoTitik');
        setPhotos((prev) => [...prev, entry]);
      } else {
        // Desktop/web: open file picker (no web camera UI)
        fileInputRef.current?.click();
      }
    } catch (e) {
      // Do not fallback to browser camera per requirement
      alert(e?.message || 'Gagal membuka kamera native. Pastikan aplikasi berjalan sebagai aplikasi mobile.');
    }
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
      <h2 className="text-lg font-semibold">Form Survey Existing</h2>
      <div>
        <label className="block text-sm font-medium">Zona</label>
        <input name="zona" value={form.zona} onChange={handleChange} className="border p-2 rounded w-full"/>
      </div>
      <div>
        <label className="block text-sm font-medium">Ruas</label>
        <input name="ruas" value={form.ruas} onChange={handleChange} className="border p-2 rounded w-full"/>
      </div>
      <div>
        <label className="block text-sm font-medium">Lokasi</label>
        <input name="lokasi" value={form.lokasi} onChange={handleChange} className="border p-2 rounded w-full"/>
      </div>
      <div>
        <label className="block text-sm font-medium">Surveyor ID</label>
        <input name="surveyorId" value={form.surveyorId} onChange={handleChange} className="border p-2 rounded w-full"/>
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
        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
      </div>

      {/* Bagian Upload Progress Tracking */}
      <div className="pt-4 border-t">
        <h3 className="text-md font-semibold">Upload Progress Tracking</h3>
        <p className="text-sm text-gray-500 mb-2">Upload foto dari galeri untuk melacak progress.</p>
        <label className="w-full flex items-center justify-center px-4 py-6 bg-gray-50 text-blue-700 rounded-lg shadow-sm tracking-wide uppercase border border-blue-200 cursor-pointer hover:bg-blue-100 hover:text-blue-800">
            <svg className="w-8 h-8" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M16.88 9.1A4 4 0 0 1 16 17H5a5 5 0 0 1-1-9.9V7a3 3 0 0 1 4.52-2.59A4.98 4.98 0 0 1 17 8c0 .38-.04.74-.12 1.1zM11 11h3l-4 4-4-4h3v-3h2v3z" />
            </svg>
            <span className="ml-2 text-base leading-normal">Pilih foto dari galeri</span>
            <input type='file' className="hidden" accept="image/*" onChange={handleFiles} />
        </label>
      </div>

      {message && <p className="text-sm text-green-700">{message}</p>}
    </form>
  );
}
