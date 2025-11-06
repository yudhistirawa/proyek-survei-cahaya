// components/admin/MapsSurveyorPanel.js
import React, { useRef, useEffect, useState } from 'react';
import { useAdminMapsurveyor } from '../../hooks/useMapssurveyor.js';

const MapsSurveyorPanel = () => {
  const mapRef = useRef(null);
  const [map, setMap] = useState(null);
  const [routeLayers, setRouteLayers] = useState([]);
  
  const {
    routes,
    loading,
    error,
    isRealtime,
    statistics,
    selectedRoute,
    filterSurveyor,
    setFilterSurveyor,
    selectRoute,
    clearSelection,
    toggleRealtime,
    refreshRoutes
  } = useAdminMapsurveyor();

  // Initialize Leaflet map
  useEffect(() => {
    const initMap = async () => {
      if (typeof window === 'undefined' || map) return;

      try {
        // Dynamic import Leaflet
        const L = (await import('leaflet')).default;
        
        // Initialize map
        const leafletMap = L.map(mapRef.current).setView([-6.2088, 106.8456], 10);
        
        // Add tile layer
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap contributors'
        }).addTo(leafletMap);

        setMap(leafletMap);
        console.log('✅ Leaflet map initialized');

      } catch (error) {
        console.error('❌ Error initializing map:', error);
      }
    };

    initMap();

    // Cleanup
    return () => {
      if (map) {
        map.remove();
      }
    };
  }, []);

  // Update map with routes
  useEffect(() => {
    if (!map || !routes.length) return;

    const updateMapRoutes = async () => {
      try {
        const L = (await import('leaflet')).default;

        // Clear existing route layers
        routeLayers.forEach(layer => {
          map.removeLayer(layer);
        });

        const newLayers = [];
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];

        routes.forEach((route, index) => {
          if (!route.leafletData) return;

          const color = colors[index % colors.length];

          // Add polyline for route
          const polyline = L.polyline(route.leafletData.polyline, {
            color: color,
            weight: 4,
            opacity: 0.8
          }).addTo(map);

          // Add start marker
          const startIcon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8]
          });

          const startMarker = L.marker(
            [route.leafletData.startMarker.lat, route.leafletData.startMarker.lng],
            { icon: startIcon }
          ).addTo(map);

          startMarker.bindPopup(`
            <div style="font-size: 12px;">
              <strong>🚀 Start Point</strong><br/>
              Surveyor: ${route.surveyorId}<br/>
              Task: ${route.taskId}<br/>
              Distance: ${route.statistics?.distance || 0} km
            </div>
          `);

          // Add end marker
          const endIcon = L.divIcon({
            className: 'custom-div-icon',
            html: `<div style="background-color: ${color}; width: 12px; height: 12px; border-radius: 0%; border: 2px solid white;"></div>`,
            iconSize: [16, 16],
            iconAnchor: [8, 8]
          });

          const endMarker = L.marker(
            [route.leafletData.endMarker.lat, route.leafletData.endMarker.lng],
            { icon: endIcon }
          ).addTo(map);

          endMarker.bindPopup(`
            <div style="font-size: 12px;">
              <strong>🏁 End Point</strong><br/>
              Task: ${route.taskId}<br/>
              Duration: ${route.statistics?.duration || 'N/A'}<br/>
              Points: ${route.statistics?.totalPoints || 0}
            </div>
          `);

          // Add click event to polyline
          polyline.on('click', () => {
            selectRoute(route.id);
          });

          newLayers.push(polyline, startMarker, endMarker);
        });

        setRouteLayers(newLayers);

        // Fit map to show all routes
        if (routes.length > 0) {
          const group = new L.featureGroup(newLayers);
          map.fitBounds(group.getBounds().pad(0.1));
        }

        console.log(`✅ Updated map with ${routes.length} routes`);

      } catch (error) {
        console.error('❌ Error updating map routes:', error);
      }
    };

    updateMapRoutes();
  }, [map, routes, selectRoute]);

  // Highlight selected route
  useEffect(() => {
    if (!map || !selectedRoute) return;

    const highlightRoute = async () => {
      try {
        const L = (await import('leaflet')).default;

        // Find the selected route's polyline and highlight it
        routeLayers.forEach(layer => {
          if (layer instanceof L.Polyline) {
            // Reset all polylines
            layer.setStyle({ weight: 4, opacity: 0.8 });
          }
        });

        // Highlight selected route (this is a simplified approach)
        // In a real implementation, you'd want to track which layer belongs to which route
        console.log('🎯 Selected route:', selectedRoute.id);

      } catch (error) {
        console.error('❌ Error highlighting route:', error);
      }
    };

    highlightRoute();
  }, [map, selectedRoute, routeLayers]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Memuat data surveyor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
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
            <button
              onClick={refreshRoutes}
              className="mt-2 bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-sm"
            >
              Coba Lagi
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Maps Surveyor</h2>
            <p className="text-sm text-gray-600">
              {isRealtime ? '🔄 Real-time' : '📊 Static'} - {routes.length} rute aktif
            </p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={toggleRealtime}
              className={`px-3 py-1 rounded text-sm ${
                isRealtime 
                  ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                  : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
              }`}
            >
              {isRealtime ? '🔄 Real-time' : '📊 Manual'}
            </button>
            <button
              onClick={refreshRoutes}
              className="px-3 py-1 bg-blue-100 text-blue-800 hover:bg-blue-200 rounded text-sm"
            >
              🔄 Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="p-6 border-b border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{statistics.totalRoutes}</div>
            <div className="text-sm text-blue-800">Total Rute</div>
          </div>
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-green-600">{statistics.totalSurveyors}</div>
            <div className="text-sm text-green-800">Surveyor Aktif</div>
          </div>
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">
              {statistics.totalDistance.toFixed(1)} km
            </div>
            <div className="text-sm text-purple-800">Total Jarak</div>
          </div>
          <div className="bg-orange-50 p-4 rounded-lg">
            <div className="text-2xl font-bold text-orange-600">
              {statistics.averageDistance.toFixed(1)} km
            </div>
            <div className="text-sm text-orange-800">Rata-rata Jarak</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Filter by Surveyor ID..."
              value={filterSurveyor}
              onChange={(e) => setFilterSurveyor(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {selectedRoute && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">
                Selected: {selectedRoute.surveyorId}
              </span>
              <button
                onClick={clearSelection}
                className="text-red-600 hover:text-red-800"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Map */}
      <div className="relative">
        <div
          ref={mapRef}
          className="w-full h-96"
          style={{ minHeight: '400px' }}
        />
        
        {routes.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-75">
            <div className="text-center">
              <div className="text-4xl mb-2">🗺️</div>
              <p className="text-gray-600">Belum ada data rute surveyor</p>
            </div>
          </div>
        )}
      </div>

      {/* Route List */}
      {routes.length > 0 && (
        <div className="p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Daftar Rute</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {routes.map((route, index) => (
              <div
                key={route.id}
                onClick={() => selectRoute(route.id)}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  selectedRoute?.id === route.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-gray-900">
                      {route.surveyorId}
                    </div>
                    <div className="text-sm text-gray-600">
                      Task: {route.taskId}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-gray-900">
                      {route.statistics?.distance || 0} km
                    </div>
                    <div className="text-xs text-gray-600">
                      {route.statistics?.duration || 'N/A'}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MapsSurveyorPanel;
