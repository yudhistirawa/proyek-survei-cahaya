/**
 * Contoh penggunaan KMZ Utils untuk parsing dan menampilkan Polygon di Leaflet
 * File ini menunjukkan cara menggunakan utility yang sudah dibuat
 */

import React, { useEffect, useRef, useState } from 'react';
import { parseKMZForLeaflet, convertToLeafletFormat } from '../../../utils/kmzUtils';

const KMZExample = ({ kmzFile }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [polygons, setPolygons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (kmzFile) {
      loadKMZFile(kmzFile);
    }
  }, [kmzFile]);

  const loadKMZFile = async (file) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('KMZExample: Loading KMZ file:', file.name);
      
      // Parse KMZ file untuk mendapatkan data Polygon yang siap untuk Leaflet
      const leafletPolygons = await parseKMZForLeaflet(file);
      
      console.log('KMZExample: Parsed polygons:', leafletPolygons);
      setPolygons(leafletPolygons);
      
      // Initialize map jika belum ada
      if (!mapInstanceRef.current) {
        initializeMap();
      } else {
        // Update existing map
        updateMapWithPolygons(leafletPolygons);
      }
      
    } catch (error) {
      console.error('KMZExample: Error loading KMZ file:', error);
      setError('Gagal memuat file KMZ: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const initializeMap = () => {
    if (!window.L || !mapRef.current) return;

    const L = window.L;
    
    // Calculate center from polygons
    let center = [-6.2088, 106.8456]; // Default to Jakarta
    let zoom = 10;
    
    if (polygons.length > 0) {
      // Calculate center from all polygon coordinates
      const allCoords = [];
      polygons.forEach(polygon => {
        allCoords.push(...polygon.coordinates);
      });
      
      if (allCoords.length > 0) {
        const avgLat = allCoords.reduce((sum, coord) => sum + coord[0], 0) / allCoords.length;
        const avgLng = allCoords.reduce((sum, coord) => sum + coord[1], 0) / allCoords.length;
        center = [avgLat, avgLng];
        zoom = 13;
      }
    }

    // Initialize Leaflet Map
    const map = L.map(mapRef.current, {
      center: center,
      zoom: zoom,
      zoomControl: true,
      attributionControl: true
    });
    
    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    mapInstanceRef.current = map;
    
    // Add polygons to map
    updateMapWithPolygons(polygons);
  };

  const updateMapWithPolygons = (polygonData) => {
    if (!mapInstanceRef.current || !polygonData.length) return;

    const L = window.L;
    const map = mapInstanceRef.current;
    
    // Clear existing polygons
    map.eachLayer((layer) => {
      if (layer instanceof L.Polygon) {
        map.removeLayer(layer);
      }
    });
    
    // Create bounds for fitting view
    const bounds = L.latLngBounds();
    let hasBounds = false;
    
    // Add each polygon to the map
    polygonData.forEach((polygonConfig, index) => {
      console.log(`KMZExample: Adding polygon ${index + 1}:`, polygonConfig.name);
      
      const poly = L.polygon(polygonConfig.coordinates, polygonConfig.options).addTo(map);
      
      // Add popup
      const popupContent = `
        <div>
          <h3>${polygonConfig.name || `Polygon ${index + 1}`}</h3>
          <p>${polygonConfig.description || 'Tidak ada deskripsi'}</p>
          <p><small>${polygonConfig.coordinates.length} koordinat</small></p>
        </div>
      `;
      
      poly.bindPopup(popupContent);
      
      // Add to bounds
      polygonConfig.coordinates.forEach(coord => {
        bounds.extend(coord);
        hasBounds = true;
      });
    });
    
    // Fit map to show all polygons
    if (hasBounds && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [10, 10] });
    }
  };

  // Load Leaflet if not already loaded
  useEffect(() => {
    if (!window.L) {
      loadLeafletAndInitialize();
    } else {
      initializeMap();
    }
  }, [polygons]);

  const loadLeafletAndInitialize = () => {
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
      // Fix for default markers in react-leaflet
      const L = window.L;
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
      });
      
      initializeMap();
    };
    script.onerror = () => {
      console.error('Failed to load Leaflet');
      setError('Gagal memuat Leaflet');
    };
    document.head.appendChild(script);
  };

  return (
    <div className="w-full h-full relative">
      {/* Map Container */}
      <div 
        ref={mapRef} 
        className="w-full h-full rounded-xl overflow-hidden"
        style={{ 
          minHeight: '400px',
          width: '100%',
          height: '400px',
          position: 'relative',
          display: 'block',
          backgroundColor: '#f0f0f0'
        }}
      />
      
      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center rounded-xl">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-gray-900 text-sm font-medium">Memuat file KMZ...</p>
          </div>
        </div>
      )}
      
      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-0 bg-red-50 flex items-center justify-center rounded-xl">
          <div className="text-center p-4">
            <div className="text-red-500 text-lg mb-2">⚠️</div>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}
      
      {/* Info Overlay */}
      {!loading && !error && polygons.length > 0 && (
        <div className="absolute top-2 left-2 bg-white bg-opacity-90 rounded-lg p-2 text-xs z-10">
          <div className="font-medium text-gray-800">Data Polygon</div>
          <div className="text-gray-600">
            <div>🔷 {polygons.length} polygon</div>
            <div>📍 {polygons.reduce((total, poly) => total + poly.coordinates.length, 0)} koordinat</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KMZExample;
