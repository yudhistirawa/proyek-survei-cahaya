"use client";

import { useEffect, useRef, useState } from 'react';

/**
 * useGeolocationWatch
 * - Watches user's position in real time using navigator.geolocation.watchPosition
 * - Returns { coords, status, error, start, stop, refresh, permission }
 */
export function useGeolocationWatch(options = {}) {
  const watchIdRef = useRef(null);
  const [coords, setCoords] = useState(null); // { lat, lng, accuracy, timestamp }
  const [status, setStatus] = useState('idle'); // 'idle' | 'watching' | 'success' | 'error' | 'denied'
  const [error, setError] = useState(null);
  const [permission, setPermission] = useState('prompt'); // 'granted' | 'denied' | 'prompt'

  const start = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setStatus('error');
      setError(new Error('Geolocation tidak didukung browser ini.'));
      return;
    }
    try {
      setStatus('watching');
      const id = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, accuracy } = pos.coords || {};
          setCoords({ lat: latitude, lng: longitude, accuracy, timestamp: pos.timestamp });
          setStatus('success');
          setError(null);
        },
        (err) => {
          setError(err);
          setStatus(err.code === 1 ? 'denied' : 'error');
        },
        {
          enableHighAccuracy: true,
          maximumAge: 5000,
          timeout: 15000,
          ...(options || {}),
        }
      );
      watchIdRef.current = id;
    } catch (e) {
      setError(e);
      setStatus('error');
    }
  };

  const stop = () => {
    if (typeof navigator !== 'undefined' && navigator.geolocation && watchIdRef.current != null) {
      try { navigator.geolocation.clearWatch(watchIdRef.current); } catch (_) {}
      watchIdRef.current = null;
    }
    setStatus('idle');
  };

  const refresh = () => {
    stop();
    start();
  };

  // Detect permission (where supported)
  useEffect(() => {
    let mounted = true;
    if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((res) => { if (mounted) setPermission(res.state); res.onchange = () => setPermission(res.state); })
        .catch(() => {});
    }
    return () => { mounted = false; };
  }, []);

  // Auto-start watching on mount
  useEffect(() => {
    start();
    return () => stop();
  }, []);

  return { coords, status, error, start, stop, refresh, permission };
}
