'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { KMZParser } from '../lib/kmzParser';

// Leaflet Map component
const LeafletMapComponent = ({
  center, 
  zoom, 
  kmzData, 
  geoJsonData, 
  polylinePositions, 
  currentPosition,
  onMapLoad 
}) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const polygonsRef = useRef([]);
  const polylinesRef = useRef([]);

  // Clear all map overlays
  const clearMapOverlays = useCallback(() => {
    // Clear markers
    markersRef.current.forEach(marker => {
      if (marker.remove) marker.remove();
    });
    markersRef.current = [];

    // Clear polygons
    polygonsRef.current.forEach(polygon => {
      if (polygon.remove) polygon.remove();
    });
    polygonsRef.current = [];

    // Clear polylines
    polylinesRef.current.forEach(polyline => {
      if (polyline.remove) polyline.remove();
    });
    polylinesRef.current = [];
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapRef.current) return;

    // Load Leaflet directly
    const loadLeafletMap = async () => {
      try {
        console.log('Initializing Leaflet Map');
        
        // Load Leaflet if not already loaded
        if (!window.L) {
          await loadLeafletAndInitialize();
        } else {
          initializeLeafletMap();
        }
      } catch (error) {
        console.error('Error loading Leaflet:', error);
      }
    };

    const loadLeafletAndInitialize = () => {
      return new Promise((resolve, reject) => {
        // Load Leaflet CSS
        if (!document.querySelector('link[href*="leaflet.css"]')) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(link);
        }

        // Load Leaflet JS
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.onload = () => {
          // Fix for default markers in leaflet
          const L = window.L;
          delete L.Icon.Default.prototype._getIconUrl;
          L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
            iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
          });
          
          initializeLeafletMap();
          resolve();
        };
        script.onerror = () => {
          console.error('Failed to load Leaflet');
          reject(new Error('Failed to load Leaflet'));
        };
        document.head.appendChild(script);
      });
    };

    const initializeLeafletMap = () => {
      const L = window.L;
      if (!L) return;

      // Clear existing map
      if (mapInstanceRef.current && mapInstanceRef.current.remove) {
        mapInstanceRef.current.remove();
      }

      const map = L.map(mapRef.current).setView(center, zoom);
      mapInstanceRef.current = map;

      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);

      if (onMapLoad) {
        onMapLoad(map);
      }

      renderKMZData(map, kmzData);
    };

    const renderKMZData = (map, kmzData) => {
      const L = window.L;
      if (!L) return;

      clearMapOverlays();

      // Render KMZ data
      if (kmzData) {
        const bounds = L.latLngBounds();
        let hasBounds = false;

        // Add individual coordinates as markers
        if (kmzData.coordinates && kmzData.coordinates.length > 0) {
          kmzData.coordinates.forEach((coord, index) => {
            const marker = L.marker([coord.lat, coord.lng])
              .bindPopup(`
                <div>
                  <h3>Koordinat ${index + 1}</h3>
                  <p>Lat: ${coord.lat.toFixed(6)}</p>
                  <p>Lng: ${coord.lng.toFixed(6)}</p>
                  <p>Alt: ${coord.alt || 0}m</p>
                </div>
              `)
              .addTo(map);
            
            markersRef.current.push(marker);
            bounds.extend([coord.lat, coord.lng]);
            hasBounds = true;
          });
        }

        // Add polygons
        if (kmzData.polygons && kmzData.polygons.length > 0) {
          kmzData.polygons.forEach((polygon, index) => {
            if (polygon.coordinates && polygon.coordinates.length > 0) {
              const latLngs = polygon.coordinates.map(coord => [coord.lat, coord.lng]);
              const leafletPolygon = L.polygon(latLngs, {
                color: '#3388ff',
                weight: 2,
                opacity: 0.8,
                fillColor: '#3388ff',
                fillOpacity: 0.2
              })
              .bindPopup(`
                <div>
                  <h3>${polygon.name || `Polygon ${index + 1}`}</h3>
                  <p>${polygon.description || 'Tidak ada deskripsi'}</p>
                  <p><small>${polygon.coordinates.length} koordinat</small></p>
                </div>
              `)
              .addTo(map);

              polygonsRef.current.push(leafletPolygon);

              polygon.coordinates.forEach(coord => {
                bounds.extend([coord.lat, coord.lng]);
                hasBounds = true;
              });
            }
          });
        }

        // Add lines
        if (kmzData.lines && kmzData.lines.length > 0) {
          kmzData.lines.forEach((line, index) => {
            if (line.coordinates && line.coordinates.length > 0) {
              const latLngs = line.coordinates.map(coord => [coord.lat, coord.lng]);
              const leafletPolyline = L.polyline(latLngs, {
                color: '#FF0000',
                weight: 3,
                opacity: 0.8
              })
              .bindPopup(`
                <div>
                  <h3>${line.name || `Line ${index + 1}`}</h3>
                  <p>${line.description || 'Tidak ada deskripsi'}</p>
                  <p><small>${line.coordinates.length} koordinat</small></p>
                </div>
              `)
              .addTo(map);

              polylinesRef.current.push(leafletPolyline);

              line.coordinates.forEach(coord => {
                bounds.extend([coord.lat, coord.lng]);
                hasBounds = true;
              });
            }
          });
        }

        // Fit bounds if we have data
        if (hasBounds && bounds.isValid()) {
          map.fitBounds(bounds, { padding: [10, 10] });
        }
      }

      // Render current position
      if (currentPosition) {
        const marker = L.marker(currentPosition)
          .bindPopup('Posisi Anda')
          .addTo(map);
        
        markersRef.current.push(marker);
      }
    };

    loadLeafletMap();

    return () => {
      clearMapOverlays();
      if (mapInstanceRef.current) {
        if (mapInstanceRef.current.remove) {
          mapInstanceRef.current.remove();
        }
        mapInstanceRef.current = null;
      }
    };
  }, [center, zoom, kmzData, geoJsonData, polylinePositions, currentPosition, onMapLoad, clearMapOverlays]);

  return (
    <div 
      ref={mapRef} 
      style={{ 
        height: '100%', 
        width: '100%', 
        minHeight: '400px' 
      }} 
    />
  );
};

const MapDisplay = ({ 
  kmzUrl, 
  geojsonData, 
  onComputedCenter, 
  polylinePositions = [], 
  currentPosition, 
  onError 
}) => {
  const [geoJsonData, setGeoJsonData] = useState(null);
  const [kmzData, setKmzData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [mapCenter, setMapCenter] = useState([-6.2088, 106.8456]); // Default to Jakarta
  const [mapZoom, setMapZoom] = useState(13);

  useEffect(() => {
    if (kmzUrl) {
      loadKMZFile(kmzUrl);
    } else if (geojsonData) {
      setGeoJsonData(geojsonData);
      // Set center based on GeoJSON bounds if available
      if (geojsonData.features && geojsonData.features.length > 0) {
        const coords = geojsonData.features[0].geometry?.coordinates;
        if (
          coords &&
          coords.length >= 2 &&
          typeof coords[0] === 'number' &&
          typeof coords[1] === 'number'
        ) {
          setMapCenter([coords[1], coords[0]]);
          if (onComputedCenter) {
            onComputedCenter([coords[1], coords[0]]);
          }
        }
      }
    }
  }, [kmzUrl, geojsonData]);

  const loadKMZFile = async (url) => {
    setLoading(true);
    setError(null);
    setKmzData(null);
    setGeoJsonData(null);

    try {
      console.log('MapDisplay: Starting to load KMZ from URL:', url);
      
      // Use the KMZParser to parse the KMZ file
      const parsedData = await KMZParser.parseFromUrl(url);
      
      console.log('MapDisplay: KMZ parsed successfully:', parsedData);
      setKmzData(parsedData);

      // Set map center and zoom based on parsed data
      if (parsedData.center) {
        const center = [parsedData.center.lat, parsedData.center.lng];
        setMapCenter(center);
        if (onComputedCenter) {
          onComputedCenter(center);
        }
      }

      // Calculate appropriate zoom level based on bounds
      if (parsedData.bounds) {
        const { minLat, maxLat, minLng, maxLng } = parsedData.bounds;
        const latDiff = maxLat - minLat;
        const lngDiff = maxLng - minLng;
        const maxDiff = Math.max(latDiff, lngDiff);

        let zoom = 13;
        if (maxDiff > 10) zoom = 5;
        else if (maxDiff > 5) zoom = 7;
        else if (maxDiff > 1) zoom = 9;
        else if (maxDiff > 0.1) zoom = 11;
        else if (maxDiff > 0.01) zoom = 13;
        else zoom = 15;

        setMapZoom(zoom);
      }

    } catch (err) {
      console.error('MapDisplay: Error loading KMZ file:', err);
      const errorMessage = err.message || 'Failed to load KMZ file';
      setError(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading KMZ data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
        <div className="text-center">
          <p className="text-red-600 mb-2">Error: {error}</p>
          <button
            onClick={() => kmzUrl && loadKMZFile(kmzUrl)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!geoJsonData && !geojsonData && !kmzData) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg">
        <div className="text-center">
          <p className="text-gray-500">No map data available</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100%', width: '100%', minHeight: '400px' }} className="rounded-lg overflow-hidden">
      <LeafletMapComponent
        center={mapCenter}
        zoom={mapZoom}
        kmzData={kmzData}
        geoJsonData={geoJsonData}
        polylinePositions={polylinePositions}
        currentPosition={currentPosition}
      />
    </div>
  );
};

export default MapDisplay;
