'use client';

import { auth } from '../lib/firebase';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { X, Navigation, MapPin } from 'lucide-react';

const MapDisplay = dynamic(() => import('./MapDisplay'), { ssr: false });

// Modal yang menampilkan peta KMZ dengan styling modern
const FloatingMapModal = ({ isOpen, onClose }) => {
  const [kmzUrl, setKmzUrl] = useState(null);
  const [center, setCenter] = useState(null); // [lat,lng]
  const [recording, setRecording] = useState(false);
  const [positions, setPositions] = useState([]); // polyline points
  const [currentPos, setCurrentPos] = useState(null);
  const geoWatchRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      try {
        const stored = sessionStorage.getItem('currentTaskKmz') || '';
        setKmzUrl(stored);
      } catch (_) {
        setKmzUrl('');
      }

      // Mulai tracking lokasi perangkat
      if (navigator.geolocation && !geoWatchRef.current) {
        geoWatchRef.current = navigator.geolocation.watchPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            const latLng = [latitude, longitude];
            setCurrentPos(latLng);
            if (!center) setCenter(latLng);
            if (recording) {
              setPositions((prev) => [...prev, latLng]);
            }
          },
          (err) => console.error('Geolocation error:', err),
          { enableHighAccuracy: true, maximumAge: 1000, timeout: 10000 }
        );
      }
    }

    return () => {
      if (geoWatchRef.current !== null) {
        navigator.geolocation.clearWatch(geoWatchRef.current);
        geoWatchRef.current = null;
      }
    };
  }, [isOpen, recording, center]);

  const openNavigation = useCallback(() => {
    let dest = center;
    if (!dest) {
      try {
        const s = sessionStorage.getItem('currentTaskDest');
        if (s) dest = JSON.parse(s);
      } catch {}
    }
    if (dest && Array.isArray(dest)) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${dest[0]},${dest[1]}&travelmode=driving`;
      window.open(url, '_blank');
    }
  }, [center]);

  const startRecording = () => {
    if (!navigator.geolocation) {
      alert('Geolocation tidak didukung browser ini');
      return;
    }
    if (recording) return;
    // Reset data lama
    setPositions([]);
    setRecording(true);
  };

  const stopRecording = async (skipSend = false) => {
    setRecording(false);

    try {
      // Kirim ke server
      const res = await fetch('/api/route-recordings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points: positions, taskId: sessionStorage.getItem('currentTaskId') || null, userId: auth.currentUser?.uid || null }),
      });
      if (!res.ok) throw new Error('Gagal mengirim data');
      alert('Data rute berhasil dikirim');
      setPositions([]);
    } catch (e) {
      console.error(e);
      alert('Gagal mengirim data');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-sm bg-black/40">
      <div className="relative w-full max-w-3xl h-[80vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <MapPin size={20} /> Peta Tugas
          </h3>
          <button onClick={() => { stopRecording(true); onClose(); }} aria-label="Tutup" className="text-gray-500 hover:text-gray-700"> <X size={22} /> </button>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          {kmzUrl ? (
            <MapDisplay kmzUrl={kmzUrl} onComputedCenter={setCenter} polylinePositions={positions} currentPosition={currentPos} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-500">KMZ tidak tersedia.</div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex flex-col sm:flex-row gap-3">
          {!recording ? (
            <button
              onClick={startRecording}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-xl"
            >
              Mulai Rekam
            </button>
          ) : (
            <button
              onClick={stopRecording}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-xl"
            >
              Selesai
            </button>
          )}
          <button
            onClick={openNavigation}
            disabled={!center}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white py-2 rounded-xl flex items-center justify-center gap-2"
          >
            <Navigation size={18} /> Navigasi Google Maps
          </button>
          <button
            onClick={() => { stopRecording(true); onClose(); }}
            className="px-4 py-2 rounded-xl border text-gray-700 hover:bg-gray-50"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

export default FloatingMapModal;

