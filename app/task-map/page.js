"use client";

import React, { Suspense, useState, useMemo, useRef, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams, useRouter } from 'next/navigation';
import { db } from '../lib/firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';

const MapDisplay = dynamic(() => import('../components/MapDisplay'), { ssr: false });

function TaskMapInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [center, setCenter] = useState(null); // [lat, lng]
  const [surveyorName, setSurveyorName] = useState("");
  const [taskId, setTaskId] = useState("");
  const [status, setStatus] = useState("idle"); // idle | tracking | completed
  const [routePoints, setRoutePoints] = useState([]); // {lat,lng,timestamp}
  const [totalDistance, setTotalDistance] = useState(0);
  const watchIdRef = useRef(null);
  const docRefRef = useRef(null);

  const kmzUrl = useMemo(() => {
    const v = searchParams.get('kmz');
    try {
      // Param bisa sudah di-encode dua kali; decode aman
      let rawUrl = v ? decodeURIComponent(v) : '';

      // Normalisasi variasi URL Firebase Storage yang salah/berbeda
      const normalizeKmzUrl = (rawUrl) => {
        if (!rawUrl) return rawUrl;
        let u = rawUrl;
        // gs://bucket/path → https://storage.googleapis.com/bucket/path
        if (u.startsWith('gs://')) {
          const without = u.replace('gs://', '');
          const firstSlash = without.indexOf('/');
          const bucket = firstSlash === -1 ? without : without.slice(0, firstSlash);
          const path = firstSlash === -1 ? '' : without.slice(firstSlash + 1);
          u = `https://storage.googleapis.com/${bucket}/${path}`;
        }
        return u;
      };

      rawUrl = normalizeKmzUrl(rawUrl);

      return rawUrl;
    } catch {
      return v || '';
    }
  }, [searchParams]);

  // Compute distance between two lat/lng in km
  const haversineKm = (a, b) => {
    const toRad = (d) => (d * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(b.lat - a.lat);
    const dLng = toRad(b.lng - a.lng);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const h =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  };

  const startTracking = async () => {
    if (status === 'tracking') return;
    if (!surveyorName || !taskId) {
      alert('Isi Surveyor Name dan Task ID terlebih dahulu.');
      return;
    }
    try {
      // Create doc
      const ref = await addDoc(collection(db, 'Maps_Surveyor'), {
        surveyorName,
        taskId,
        status: 'in_progress',
        startTime: serverTimestamp(),
        createdAt: serverTimestamp(),
        routePoints: [],
        totalDistance: 0,
        // Optional context from page
        kmzUrl,
      });
      docRefRef.current = ref;
      setStatus('tracking');
      setRoutePoints([]);
      setTotalDistance(0);

      // Start watchPosition
      if (!('geolocation' in navigator)) {
        alert('Geolocation tidak tersedia di perangkat ini.');
        return;
      }
      const watchId = navigator.geolocation.watchPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          const point = { lat: latitude, lng: longitude, timestamp: Date.now() };
          setRoutePoints((prev) => {
            const next = [...prev, point];
            // distance
            if (prev.length > 0) {
              const d = haversineKm(prev[prev.length - 1], point);
              setTotalDistance((td) => td + d);
            }
            // Persist (throttled by React batching; ok for MVP)
            if (docRefRef.current) {
              updateDoc(doc(db, 'Maps_Surveyor', docRefRef.current.id), {
                routePoints: next,
                totalDistance: next.length > 1 ? (next.reduce((acc, p, i) => {
                  if (i === 0) return 0;
                  return acc + haversineKm(next[i - 1], p);
                }, 0)) : 0,
                lastUpdated: serverTimestamp(),
              }).catch(() => {});
            }
            return next;
          });
        },
        (err) => {
          console.error('watchPosition error', err);
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
      );
      watchIdRef.current = watchId;
    } catch (e) {
      console.error(e);
      alert('Gagal memulai tracking.');
    }
  };

  const finishTracking = async () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    try {
      if (docRefRef.current) {
        await updateDoc(doc(db, 'Maps_Surveyor', docRefRef.current.id), {
          status: 'completed',
          endTime: serverTimestamp(),
          routePoints,
          totalDistance,
          lastUpdated: serverTimestamp(),
        });
      }
      setStatus('completed');
      alert('Tracking selesai dan tersimpan.');
    } catch (e) {
      console.error(e);
      alert('Gagal menyimpan akhir tracking.');
    }
  };

  // Ensure cleanup if leaving page while tracking
  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (status === 'tracking') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [status]);

  

  // Prefill from query params
  useEffect(() => {
    const qName = searchParams.get('surveyorName') || '';
    const qTask = searchParams.get('taskId') || '';
    if (qName) setSurveyorName(qName);
    if (qTask) setTaskId(qTask);
  }, [searchParams]);

  const destParam = searchParams.get('dest');

  const destination = useMemo(() => {
    if (center && Array.isArray(center)) return center;
    if (destParam && /-?\d+\.?\d*,\s*-?\d+\.?\d*/.test(destParam)) {
      const [latStr, lngStr] = destParam.split(',');
      const lat = parseFloat(latStr.trim());
      const lng = parseFloat(lngStr.trim());
      if (!Number.isNaN(lat) && !Number.isNaN(lng)) return [lat, lng];
    }
    return null;
  }, [center, destParam]);

  const openNavigation = () => {
    if (destination) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${destination[0]},${destination[1]}&travelmode=driving`;
      window.open(url, '_blank');
      return;
    }
    alert('Lokasi tujuan belum siap. Tunggu peta selesai dimuat.');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <div className="p-3 border-b bg-white flex items-center gap-2">
        <button onClick={() => router.back()} className="px-3 py-2 rounded-lg border">Kembali</button>
        <h1 className="font-semibold ml-2">Peta Tugas</h1>
      </div>

      <div className="flex-1">
        {kmzUrl ? (
          <MapDisplay kmzUrl={kmzUrl} onComputedCenter={setCenter} />
        ) : (
          <div className="p-6 text-center">Tidak ada KMZ URL</div>
        )}
      </div>

      <div className="p-3 border-t bg-white flex flex-col gap-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            className="px-3 py-2 rounded-lg border"
            placeholder="Surveyor Name"
            value={surveyorName}
            onChange={(e) => setSurveyorName(e.target.value)}
          />
          <input
            className="px-3 py-2 rounded-lg border"
            placeholder="Task ID"
            value={taskId}
            onChange={(e) => setTaskId(e.target.value)}
          />
          <div className="flex items-center gap-2 text-sm">
            <span className="px-2 py-1 rounded-full border bg-gray-50">Status: {status}</span>
            <span className="px-2 py-1 rounded-full border bg-gray-50">Jarak: {totalDistance.toFixed(2)} km</span>
            <span className="px-2 py-1 rounded-full border bg-gray-50">Titik: {routePoints.length}</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={openNavigation}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-3"
          >
            Navigasi Google Maps
          </button>
          {destination && (
            <a
              className="px-4 py-3 rounded-xl border"
              target="_blank"
              href={`https://www.google.com/maps?q=${destination[0]},${destination[1]}`}
              rel="noreferrer"
            >
              Buka Titik
            </a>
          )}
        </div>

        <div className="flex gap-3">
          <button
            disabled={status === 'tracking'}
            onClick={startTracking}
            className="flex-1 bg-green-600 disabled:bg-green-300 hover:bg-green-700 text-white rounded-xl py-3"
          >
            Mulai Tracking
          </button>
          <button
            disabled={status !== 'tracking'}
            onClick={finishTracking}
            className="flex-1 bg-orange-600 disabled:bg-orange-300 hover:bg-orange-700 text-white rounded-xl py-3"
          >
            Selesai & Simpan
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TaskMapPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center">Memuat peta...</div>}>
      <TaskMapInner />
    </Suspense>
  );
}
