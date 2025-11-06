// components/surveyor/SurveyorTrackingPanel.js
import React, { useState, useEffect, useRef } from 'react';
import { selesaikanTugas } from '../../lib/maps-surveyor-service.js';

const SurveyorTrackingPanel = ({ taskId, surveyorId }) => {
  const [isTracking, setIsTracking] = useState(false);
  const [trackingData, setTrackingData] = useState([]);
  const [currentPosition, setCurrentPosition] = useState(null);
  const [error, setError] = useState(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const watchIdRef = useRef(null);
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);

  // Initialize map
  useEffect(() => {
    const initMap = async () => {
      if (typeof window === 'undefined' || map) return;

      try {
        const L = (await import('leaflet')).default;
        
        const leafletMap = L.map(mapRef.current).setView([-6.2088, 106.8456], 15);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(leafletMap);

        setMap(leafletMap);
        console.log('✅ Surveyor map initialized');

      } catch (error) {
        console.error('❌ Error initializing surveyor map:', error);
      }
    };

    initMap();

    return () => {
      if (map) {
        map.remove();
      }
    };
  }, []);

  // Update map with tracking data
  useEffect(() => {
    if (!map || trackingData.length === 0) return;

    const updateMap = async () => {
      try {
        const L = (await import('leaflet')).default;

        // Clear existing layers
        map.eachLayer((layer) => {
          if (layer instanceof L.Polyline || layer instanceof L.Marker) {
            map.removeLayer(layer);
          }
        });

        // Add tracking polyline
        if (trackingData.length > 1) {
          const polylinePoints = trackingData.map(point => [point.lat, point.lng]);
          const polyline = L.polyline(polylinePoints, {
            color: '#3B82F6',
            weight: 4,
            opacity: 0.8
          }).addTo(map);

          map.fitBounds(polyline.getBounds().pad(0.1));
        }

        // Add current position marker
        if (currentPosition) {
          const currentIcon = L.divIcon({
            className: 'custom-div-icon',
            html: '<div style="background-color: #EF4444; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white; animation: pulse 2s infinite;"></div>',
            iconSize: [16, 16],
            iconAnchor: [8, 8]
          });

          L.marker([currentPosition.lat, currentPosition.lng], { 
            icon: currentIcon 
          }).addTo(map).bindPopup('Posisi Saat Ini');
        }

        // Add start marker
        if (trackingData.length > 0) {
          const startIcon = L.divIcon({
            className: 'custom-div-icon',
            html: '<div style="background-color: #10B981; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>',
            iconSize: [16, 16],
            iconAnchor: [8, 8]
          });

          L.marker([trackingData[0].lat, trackingData[0].lng], { 
            icon: startIcon 
          }).addTo(map).bindPopup('Titik Mulai');
        }

      } catch (error) {
        console.error('❌ Error updating surveyor map:', error);
      }
    };

    updateMap();
  }, [map, trackingData, currentPosition]);

  // Start tracking
  const startTracking = () => {
    if (!navigator.geolocation) {
      setError('Geolocation tidak didukung oleh browser ini');
      return;
    }

    setIsTracking(true);
    setError(null);
    setTrackingData([]);

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0
    };

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const newPoint = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          timestamp: new Date(),
          accuracy: position.coords.accuracy
        };

        setCurrentPosition(newPoint);
        setTrackingData(prev => [...prev, newPoint]);
        
        console.log('📍 New tracking point:', newPoint);
      },
      (error) => {
        console.error('❌ Geolocation error:', error);
        setError(`Error GPS: ${error.message}`);
      },
      options
    );

    console.log('🚀 GPS tracking started');
  };

  // Stop tracking
  const stopTracking = () => {
    if (watchIdRef.current) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    
    setIsTracking(false);
    console.log('⏹️ GPS tracking stopped');
  };

  // Complete task
  const completeTask = async () => {
    if (trackingData.length === 0) {
      setError('Tidak ada data tracking untuk disimpan');
      return;
    }

    setIsCompleting(true);
    setError(null);

    try {
      console.log('🏁 Completing task...', { taskId, surveyorId, points: trackingData.length });
      
      const result = await selesaikanTugas(taskId, surveyorId, trackingData);
      
      console.log('✅ Task completed successfully:', result);
      
      // Stop tracking
      stopTracking();
      
      // Clear data
      setTrackingData([]);
      setCurrentPosition(null);
      
      alert(`Tugas berhasil diselesaikan!\nTask ID: ${result}\nTotal titik: ${trackingData.length}`);
      
    } catch (error) {
      console.error('❌ Error completing task:', error);
      setError(error.message);
    } finally {
      setIsCompleting(false);
    }
  };

  // Calculate statistics
  const statistics = {
    totalPoints: trackingData.length,
    duration: trackingData.length > 0 ? 
      Math.floor((new Date() - new Date(trackingData[0].timestamp)) / (1000 * 60)) : 0,
    distance: calculateDistance(trackingData)
  };

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">GPS Tracking</h2>
            <p className="text-sm text-gray-600">
              Task: {taskId} | Surveyor: {surveyorId}
            </p>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            isTracking 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            {isTracking ? '🔴 Recording' : '⚫ Stopped'}
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="p-6 border-b border-gray-200">
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{statistics.totalPoints}</div>
            <div className="text-sm text-gray-600">Titik GPS</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{statistics.duration}</div>
            <div className="text-sm text-gray-600">Menit</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {statistics.distance.toFixed(2)}
            </div>
            <div className="text-sm text-gray-600">KM</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex space-x-4">
          {!isTracking ? (
            <button
              onClick={startTracking}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium"
            >
              🚀 Mulai Tracking
            </button>
          ) : (
            <button
              onClick={stopTracking}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium"
            >
              ⏹️ Stop Tracking
            </button>
          )}
          
          <button
            onClick={completeTask}
            disabled={trackingData.length === 0 || isCompleting}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium"
          >
            {isCompleting ? '⏳ Menyimpan...' : '🏁 Selesaikan Tugas'}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-6 border-b border-gray-200">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error</h3>
                <p className="mt-1 text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Map */}
      <div className="relative">
        <div
          ref={mapRef}
          className="w-full h-80"
        />
        
        {trackingData.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-75">
            <div className="text-center">
              <div className="text-4xl mb-2">📍</div>
              <p className="text-gray-600">Mulai tracking untuk melihat rute</p>
            </div>
          </div>
        )}
      </div>

      {/* Current Position Info */}
      {currentPosition && (
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Posisi Saat Ini</h3>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Latitude:</span> {currentPosition.lat.toFixed(6)}
              </div>
              <div>
                <span className="font-medium">Longitude:</span> {currentPosition.lng.toFixed(6)}
              </div>
              <div>
                <span className="font-medium">Akurasi:</span> {currentPosition.accuracy?.toFixed(0)}m
              </div>
              <div>
                <span className="font-medium">Waktu:</span> {new Date(currentPosition.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to calculate distance
const calculateDistance = (points) => {
  if (points.length < 2) return 0;

  let totalDistance = 0;
  
  for (let i = 1; i < points.length; i++) {
    const distance = calculateDistanceBetweenPoints(points[i - 1], points[i]);
    totalDistance += distance;
  }

  return totalDistance;
};

const calculateDistanceBetweenPoints = (point1, point2) => {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(point2.lat - point1.lat);
  const dLng = toRadians(point2.lng - point1.lng);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(point1.lat)) * Math.cos(toRadians(point2.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRadians = (degrees) => {
  return degrees * (Math.PI / 180);
};

export default SurveyorTrackingPanel;
