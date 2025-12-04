"use client";

import React, { useEffect, useRef, useState } from 'react';
import { addDraft } from "../lib/db";
import { syncDraft } from "../lib/sync";
import { useAutoDraft } from "../lib/autoDraft";
import ConnectionBanner from "./ConnectionBanner";
import { capturePhotoAsWebP } from "../lib/camera";
import { Capacitor } from "@capacitor/core";
import { useGeolocationWatch } from "../lib/useGeolocationWatch";
import { auth } from "../lib/firebase";
import dynamic from 'next/dynamic';

const MiniMapsComponent = dynamic(() => import('./MiniMapsComponentLazy'), {
  ssr: false,
  loading: () => <div className="text-sm text-gray-500">Memuat peta...</div>
});

export default function FormSurveyExisting() {
  const [user, setUser] = useState(null);
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

  // Track user authentication
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

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
    <form onSubmit={onSubmit} className="space-y-3 sm:space-y-4">
      <ConnectionBanner />
      
      {/* Card Container for better mobile UX */}
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <h2 className="text-base sm:text-lg font-semibold text-gray-800 mb-4 sm:mb-6 flex items-center gap-2">
          <span className="text-xl sm:text-2xl">📋</span>
          Form Survey Existing
        </h2>
        
        <div className="space-y-3 sm:space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Zona</label>
            <input 
              name="zona" 
              value={form.zona} 
              onChange={handleChange} 
              className="border border-gray-300 p-2.5 sm:p-3 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm sm:text-base"
              placeholder="Masukkan zona..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Ruas</label>
            <input 
              name="ruas" 
              value={form.ruas} 
              onChange={handleChange} 
              className="border border-gray-300 p-2.5 sm:p-3 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm sm:text-base"
              placeholder="Masukkan ruas..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Lokasi</label>
            <input 
              name="lokasi" 
              value={form.lokasi} 
              onChange={handleChange} 
              className="border border-gray-300 p-2.5 sm:p-3 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm sm:text-base"
              placeholder="Masukkan lokasi..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Surveyor ID</label>
            <input 
              name="surveyorId" 
              value={form.surveyorId} 
              onChange={handleChange} 
              className="border border-gray-300 p-2.5 sm:p-3 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all text-sm sm:text-base"
              placeholder="Masukkan surveyor ID..."
            />
          </div>
        </div>
      </div>
      
      {/* GPS Coordinates Card */}
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
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
      </div>
      
      {/* Photo Upload Card */}
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
          <span className="text-xl">📷</span>
          Foto Survey
        </label>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleCapturePhoto}
            className="px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors shadow-sm text-sm sm:text-base flex items-center gap-2"
          >
            <span>📸</span>
            <span>Ambil Foto</span>
          </button>
          <span className="text-xs sm:text-sm text-gray-600 bg-gray-100 px-3 py-1.5 rounded-full">
            {photos.length} foto terpilih
          </span>
        </div>
        {/* Hidden file input for desktop/web */}
        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
      
        {/* Upload Progress Tracking */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <h3 className="text-sm sm:text-base font-semibold text-gray-800 mb-2 flex items-center gap-2">
            <span>📤</span>
            Upload dari Galeri
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 mb-3">Upload foto dari galeri untuk melacak progress.</p>
          <label className="w-full flex items-center justify-center px-4 py-4 sm:py-6 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-700 rounded-xl shadow-sm border-2 border-dashed border-blue-300 cursor-pointer hover:from-blue-100 hover:to-indigo-100 transition-all">
              <svg className="w-6 h-6 sm:w-8 sm:h-8" fill="currentColor" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                  <path d="M16.88 9.1A4 4 0 0 1 16 17H5a5 5 0 0 1-1-9.9V7a3 3 0 0 1 4.52-2.59A4.98 4.98 0 0 1 17 8c0 .38-.04.74-.12 1.1zM11 11h3l-4 4-4-4h3v-3h2v3z" />
              </svg>
              <span className="ml-2 text-xs sm:text-base leading-normal font-medium">Pilih foto dari galeri</span>
              <input type='file' className="hidden" accept="image/*" onChange={handleFiles} />
          </label>
        </div>
      </div>
      </div>

      {/* Submit Button Card */}
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
        <button
          type="submit"
          disabled={submitting}
          className={`w-full py-3 sm:py-4 px-6 rounded-xl font-bold text-base sm:text-lg shadow-lg transition-all flex items-center justify-center gap-2 ${
            submitting 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white'
          }`}
        >
          <span className="text-xl">{submitting ? '⏳' : '💾'}</span>
          <span>{submitting ? 'Menyimpan...' : 'Simpan Survey'}</span>
        </button>
        {message && (
          <p className="mt-3 text-xs sm:text-sm text-center text-green-700 bg-green-50 py-2 px-3 rounded-lg border border-green-200">
            ✓ {message}
          </p>
        )}
        {saving && (
          <p className="mt-2 text-xs text-center text-blue-600">
            💾 Auto-saving draft...
          </p>
        )}
      </div>
      
      {/* Mini Maps Component - Show saved survey points */}
      {user && (
        <div className="fixed bottom-4 right-4 z-40 w-[280px] sm:w-[320px] md:w-[420px]">
          <MiniMapsComponent 
            userId={user.uid}
            taskId={typeof window !== 'undefined' ? sessionStorage.getItem('currentTaskId') : null}
            previewPoint={coords ? { lat: coords.lat, lng: coords.lng } : null}
          />
        </div>
      )}
    </form>
  );
}
