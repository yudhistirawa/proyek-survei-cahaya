"use client";

import React, { useEffect, useRef, useState } from 'react';
import { addDraft } from "../lib/db";
import { syncDraft } from "../lib/sync";
import { useAutoDraft } from "../lib/autoDraft";
import ConnectionBanner from "./ConnectionBanner";
import { capturePhotoAsWebP } from "../lib/camera";
import { Capacitor } from "@capacitor/core";
import { useGeolocationWatch } from "../lib/useGeolocationWatch";

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
  const [copied, setCopied] = useState(false);

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

  const fileInputRef = useRef(null);
  const { coords, status, error, refresh } = useGeolocationWatch({
    enableHighAccuracy: true,
    maximumAge: 0, // Always get fresh location
    timeout: 10000,
  });

  // Persist koordinat ke form setiap update (real-time tracking)
  useEffect(() => {
    if (coords?.lat && coords?.lng) {
      setForm((prev) => ({
        ...prev,
        koordinat: `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`,
        latitude: coords.lat,
        longitude: coords.lng,
        akurasi: coords.accuracy,
        lastUpdated: new Date().toISOString(),
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
      
      {/* Titik Koordinat dengan Real-time Tracking */}
      <div>
        <label className="block text-sm font-medium mb-2">
          <span className="flex items-center gap-2">
            📍 Titik Koordinat
            {status === 'success' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                Live Tracking
              </span>
            )}
            {status === 'watching' && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></span>
                Mencari GPS...
              </span>
            )}
          </span>
        </label>
        <div className="mt-1 flex items-center gap-2">
          <div className="relative flex-1">
            <input
              readOnly
              value={form.koordinat || ''}
              placeholder={status === 'watching' ? 'Mencari lokasi GPS…' : (status === 'denied' ? 'Izin lokasi ditolak' : 'Koordinat belum tersedia')}
              className={`border p-2.5 rounded-lg w-full font-mono text-sm transition-all ${
                status === 'success' 
                  ? 'bg-green-50 border-green-300 text-green-900 shadow-sm' 
                  : status === 'watching'
                  ? 'bg-blue-50 border-blue-300 text-blue-700 animate-pulse'
                  : status === 'denied'
                  ? 'bg-red-50 border-red-300 text-red-700'
                  : 'bg-gray-50 border-gray-300'
              }`}
            />
            {coords?.accuracy && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-600 bg-white px-2 py-1 rounded border shadow-sm">
                ±{Math.round(coords.accuracy)}m
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={refresh}
            disabled={status === 'watching'}
            className={`p-2.5 rounded-lg border transition-all ${
              status === 'watching' 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-white hover:bg-blue-50 hover:border-blue-400 text-blue-600'
            }`}
            title="Refresh lokasi"
          >
            <svg className={`w-5 h-5 ${status === 'watching' ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
          <button
            type="button"
            disabled={!form.koordinat}
            onClick={async () => {
              try { 
                await navigator.clipboard.writeText(form.koordinat || ''); 
                setCopied(true); 
                setTimeout(()=>setCopied(false),1500); 
              } catch(_) {}
            }}
            className="p-2.5 rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            title="Salin koordinat"
          >
            {copied ? (
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>
        </div>
        <div className="mt-2 space-y-1">
          <p className={`text-xs font-medium ${status === 'success' ? 'text-green-700' : status === 'denied' ? 'text-red-600' : status === 'watching' ? 'text-blue-600' : 'text-gray-500'}`}>
            {status === 'success' && '✓ Lokasi berhasil didapatkan dan sedang di-tracking secara real-time'}
            {status === 'watching' && '⏳ Sedang mencari sinyal GPS...'}
            {status === 'denied' && '✗ Izin lokasi ditolak. Buka pengaturan browser/aplikasi untuk mengaktifkan GPS.'}
            {status === 'error' && (error?.message || '✗ Gagal mendapatkan lokasi')}
            {copied && ' • ✓ Koordinat berhasil disalin'}
          </p>
          {status === 'success' && coords && (
            <div className="flex items-center gap-3 text-xs text-gray-600">
              <span className="flex items-center gap-1">
                🎯 Akurasi: <strong>±{Math.round(coords.accuracy)}m</strong>
              </span>
              <span className="flex items-center gap-1">
                🕐 Update: <strong>{new Date(coords.timestamp).toLocaleTimeString('id-ID')}</strong>
              </span>
            </div>
          )}
        </div>
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
