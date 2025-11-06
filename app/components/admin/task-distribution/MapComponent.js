import React, { useEffect, useRef, useState, useCallback } from 'react';
import SimpleMapComponent from './SimpleMapComponent';
import { GOOGLE_MAPS_API_KEY, USE_LEAFLET_ONLY } from '../../../../env-config';

const MapComponent = ({ mapData }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const polygonsRef = useRef([]);
  const linesRef = useRef([]);
  const [showTextFallback, setShowTextFallback] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Clear all map overlays
  const clearMapOverlays = useCallback(() => {
    // Clear markers
    markersRef.current.forEach(marker => {
      if (marker.setMap) marker.setMap(null);
    });
    markersRef.current = [];

    // Clear polygons
    polygonsRef.current.forEach(polygon => {
      if (polygon.setMap) polygon.setMap(null);
    });
    polygonsRef.current = [];

    // Clear polylines
    linesRef.current.forEach(polyline => {
      if (polyline.setMap) polyline.setMap(null);
    });
    linesRef.current = [];
  }, []);

  useEffect(() => {
    if (!mapData || !mapRef.current) {
      console.log('MapComponent: Missing data or ref', { 
        hasMapData: !!mapData, 
        hasMapRef: !!mapRef.current,
        mapDataKeys: mapData ? Object.keys(mapData) : null
      });
      return;
    }
    
    console.log('MapComponent: mapData received:', mapData);
    console.log('MapComponent: coordinates count:', mapData.coordinates?.length || 0);
    console.log('MapComponent: polygons count:', mapData.polygons?.length || 0);
    console.log('MapComponent: lines count:', mapData.lines?.length || 0);
    console.log('MapComponent: coordinates sample:', mapData.coordinates?.slice(0, 3));
    console.log('MapComponent: polygons sample:', mapData.polygons?.slice(0, 1));
    console.log('MapComponent: lines sample:', mapData.lines?.slice(0, 1));
    
    // Check if browser supports maps
    if (typeof window === 'undefined') {
      console.log('Window not available (SSR), showing fallback');
      setShowTextFallback(true);
      return;
    }

    const initMap = async () => {
      try {
        console.log('🗺️ Initializing map...');
        
        // Try Google Maps first
        await loadGoogleMaps();
        
      } catch (error) {
        console.error('Error initializing Google Maps:', error);
        console.log('📄 Falling back to OpenStreetMap');
        
        try {
          await loadOpenStreetMap();
        } catch (fallbackError) {
          console.error('Error initializing OpenStreetMap:', fallbackError);
          console.log('📄 Falling back to text view');
          setShowTextFallback(true);
        }
      }
    };

    const loadGoogleMaps = async () => {
      // If feature flag is set, skip Google Maps entirely
      if (USE_LEAFLET_ONLY) {
        console.warn('USE_LEAFLET_ONLY is true, using OpenStreetMap instead of Google Maps');
        await loadOpenStreetMap();
        return;
      }
      // Check if Google Maps is already loaded
      if (window.google && window.google.maps) {
        initializeGoogleMap();
        return;
      }

      // Get API key
      const apiKey = GOOGLE_MAPS_API_KEY;
      
      if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
        console.warn('Google Maps API key not configured, using OpenStreetMap fallback');
        throw new Error('API key not configured');
      }

      // Load Google Maps API script
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry,drawing`;
      script.async = true;
      script.defer = true;

      await new Promise((resolve, reject) => {
        script.onload = () => {
          console.log('Google Maps API loaded successfully');
          resolve();
        };
        script.onerror = () => {
          console.error('Failed to load Google Maps API');
          reject(new Error('Failed to load Google Maps API'));
        };
        document.head.appendChild(script);
      });

      initializeGoogleMap();
    };

    const loadOpenStreetMap = async () => {
      // Load Leaflet CSS
      if (!document.querySelector('link[href*="leaflet.css"]')) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
      
      // Load Leaflet JS
      if (!window.L) {
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.async = true;
        
        await new Promise((resolve, reject) => {
          script.onload = () => {
            // Fix for default markers in react-leaflet
            const L = window.L;
            delete L.Icon.Default.prototype._getIconUrl;
            L.Icon.Default.mergeOptions({
              iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
              iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
              shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
            });
            resolve();
          };
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      initializeLeafletMap();
    };

    const initializeGoogleMap = () => {
      try {
        if (!window.google || !window.google.maps) {
          throw new Error('Google Maps not available');
        }

        console.log('🗺️ Creating Google Maps...');

        // Initialize map
        if (mapInstanceRef.current && mapInstanceRef.current.setMap) {
          clearMapOverlays();
        }

        const map = new window.google.maps.Map(mapRef.current, {
          center: { lat: 0, lng: 0 },
          zoom: 2,
          mapTypeId: 'hybrid',
          streetViewControl: false,
          fullscreenControl: true,
          mapTypeControl: true,
          zoomControl: true,
        });

        mapInstanceRef.current = map;

        // Create bounds for fitting view
        const bounds = new window.google.maps.LatLngBounds();
        let hasBounds = false;

        // Add coordinates as markers
        if (mapData.coordinates && mapData.coordinates.length > 0) {
          console.log('Adding coordinates as markers:', mapData.coordinates.length);
          
          mapData.coordinates.forEach((coord, index) => {
            console.log(`Adding marker ${index + 1}:`, coord);
            const marker = new window.google.maps.Marker({
              position: { lat: coord.lat, lng: coord.lng },
              map: map,
              title: `Koordinat ${index + 1}`,
              icon: {
                url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
                scaledSize: new window.google.maps.Size(32, 32)
              }
            });

            const infoWindow = new window.google.maps.InfoWindow({
              content: `
                <div style="padding: 8px;">
                  <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold;">Koordinat ${index + 1}</h3>
                  <p style="margin: 2px 0; font-size: 12px;">Lat: ${coord.lat.toFixed(6)}</p>
                  <p style="margin: 2px 0; font-size: 12px;">Lng: ${coord.lng.toFixed(6)}</p>
                  <p style="margin: 2px 0; font-size: 12px;">Alt: ${coord.alt || 0}m</p>
                </div>
              `
            });

            marker.addListener('click', () => {
              infoWindow.open(map, marker);
            });

            markersRef.current.push(marker);
            bounds.extend({ lat: coord.lat, lng: coord.lng });
            hasBounds = true;
          });
        } else {
          console.log('No coordinates found in mapData');
        }

        // Add polygons
        if (mapData.polygons && mapData.polygons.length > 0) {
          console.log('Adding polygons:', mapData.polygons.length);
          mapData.polygons.forEach((polygon, index) => {
            console.log(`Processing polygon ${index + 1}:`, polygon.name, 'with', polygon.coordinates?.length, 'coordinates');
            if (polygon.coordinates && polygon.coordinates.length > 0) {
              const path = polygon.coordinates.map(coord => ({
                lat: coord.lat,
                lng: coord.lng
              }));

              console.log(`Polygon ${index + 1} path:`, path.slice(0, 3));

              const googlePolygon = new window.google.maps.Polygon({
                paths: path,
                strokeColor: '#3388ff',
                strokeOpacity: 0.8,
                strokeWeight: 2,
                fillColor: '#3388ff',
                fillOpacity: 0.2,
                map: map
              });

              const infoWindow = new window.google.maps.InfoWindow({
                content: `
                  <div style="padding: 8px;">
                    <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold;">${polygon.name || `Polygon ${index + 1}`}</h3>
                    <p style="margin: 2px 0; font-size: 12px;">${polygon.description || 'Tidak ada deskripsi'}</p>
                  </div>
                `
              });

              googlePolygon.addListener('click', (event) => {
                infoWindow.setPosition(event.latLng);
                infoWindow.open(map);
              });

              polygonsRef.current.push(googlePolygon);
              
              // Add polygon bounds
              polygon.coordinates.forEach(coord => {
                bounds.extend({ lat: coord.lat, lng: coord.lng });
                hasBounds = true;
              });
            }
          });
        } else {
          console.log('No polygons found in mapData');
        }

        // Add lines
        if (mapData.lines && mapData.lines.length > 0) {
          console.log('Adding lines:', mapData.lines.length);
          mapData.lines.forEach((line, index) => {
            console.log(`Processing line ${index + 1}:`, line.name, 'with', line.coordinates?.length, 'coordinates');
            if (line.coordinates && line.coordinates.length > 0) {
              const path = line.coordinates.map(coord => ({
                lat: coord.lat,
                lng: coord.lng
              }));

              console.log(`Line ${index + 1} path:`, path.slice(0, 3));

              const polyline = new window.google.maps.Polyline({
                path: path,
                geodesic: true,
                strokeColor: '#FF0000',
                strokeOpacity: 0.8,
                strokeWeight: 3,
                map: map
              });

              const infoWindow = new window.google.maps.InfoWindow({
                content: `
                  <div style=\"padding: 8px;\">\n                    <h3 style=\"margin: 0 0 8px 0; font-size: 14px; font-weight: bold;\">${line.name || `Line ${index + 1}`}</h3>\n                    <p style=\"margin: 2px 0; font-size: 12px;\">${line.description || 'Tidak ada deskripsi'}</p>\n                  </div>\n                `
              });

              polyline.addListener('click', (event) => {
                infoWindow.setPosition(event.latLng);
                infoWindow.open(map);
              });

              linesRef.current.push(polyline);
              
              // Add line bounds
              line.coordinates.forEach(coord => {
                bounds.extend({ lat: coord.lat, lng: coord.lng });
                hasBounds = true;
              });
            }
          });
        } else {
          console.log('No lines found in mapData');
        }

        // Fit map to show all data
        if (hasBounds) {
          console.log('Fitting bounds to show all data');
          try {
            map.fitBounds(bounds, { padding: 20 });
          } catch (e) {
            console.warn('Error fitting bounds, using default view:', e);
            map.setCenter({ lat: 0, lng: 0 });
            map.setZoom(2);
          }
        } else {
          console.log('No bounds to fit, using default center');
          map.setCenter({ lat: 0, lng: 0 });
          map.setZoom(2);
        }

        setMapLoaded(true);
        console.log('✅ Google Maps initialized successfully');
      } catch (err) {
        console.error('Google Maps init failed, fallback to Leaflet:', err);
        // Fall back to Leaflet gracefully
        loadOpenStreetMap().catch(e => console.error('Leaflet fallback failed:', e));
      }
    };

    const initializeLeafletMap = () => {
      const L = window.L;
      if (!L) {
        throw new Error('Leaflet failed to load');
      }

      console.log('🗺️ Creating Leaflet map...');

      // Initialize map
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
      }

      const map = L.map(mapRef.current).setView([0, 0], 2);
      mapInstanceRef.current = map;

      // Add OpenStreetMap tiles
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
      }).addTo(map);

      // Add coordinates as markers
      if (mapData.coordinates && mapData.coordinates.length > 0) {
        console.log('Adding coordinates as markers:', mapData.coordinates.length);
        const bounds = L.latLngBounds();
        
        mapData.coordinates.forEach((coord, index) => {
          console.log(`Adding marker ${index + 1}:`, coord);
          const marker = L.marker([coord.lat, coord.lng])
            .bindPopup(`Koordinat ${index + 1}<br>Lat: ${coord.lat.toFixed(6)}<br>Lng: ${coord.lng.toFixed(6)}<br>Alt: ${coord.alt}m`)
            .addTo(map);
          markersRef.current.push(marker);
          bounds.extend([coord.lat, coord.lng]);
        });

        // Fit map to show all markers
        if (bounds.isValid()) {
          console.log('Fitting bounds:', bounds);
          map.fitBounds(bounds, { padding: [20, 20] });
        }
      } else {
        console.log('No coordinates found in mapData');
      }

      // Add polygons
      if (mapData.polygons && mapData.polygons.length > 0) {
        console.log('Adding polygons:', mapData.polygons.length);
        mapData.polygons.forEach((polygon, index) => {
          console.log(`Processing polygon ${index + 1}:`, polygon.name, 'with', polygon.coordinates?.length, 'coordinates');
          if (polygon.coordinates && polygon.coordinates.length > 0) {
            const latLngs = polygon.coordinates.map(coord => [coord.lat, coord.lng]);
            console.log(`Polygon ${index + 1} latLngs:`, latLngs.slice(0, 3));
            const poly = L.polygon(latLngs, {
              color: 'blue',
              fillColor: '#3388ff',
              fillOpacity: 0.2,
              weight: 2
            })
            .bindPopup(`<b>${polygon.name}</b><br>${polygon.description}`)
            .addTo(map);
            polygonsRef.current.push(poly);
          }
        });
      } else {
        console.log('No polygons found in mapData');
      }

      // Add lines
      if (mapData.lines && mapData.lines.length > 0) {
        console.log('Adding lines:', mapData.lines.length);
        mapData.lines.forEach((line, index) => {
          console.log(`Processing line ${index + 1}:`, line.name, 'with', line.coordinates?.length, 'coordinates');
          if (line.coordinates && line.coordinates.length > 0) {
            const latLngs = line.coordinates.map(coord => [coord.lat, coord.lng]);
            console.log(`Line ${index + 1} latLngs:`, latLngs.slice(0, 3));
            const polyline = L.polyline(latLngs, {
              color: 'red',
              weight: 3,
              opacity: 0.8
            })
            .bindPopup(`<b>${line.name}</b><br>${line.description}`)
            .addTo(map);
            linesRef.current.push(polyline);
          }
        });
      } else {
        console.log('No lines found in mapData');
      }

      setMapLoaded(true);
      console.log('✅ Leaflet map initialized successfully');
    };

    initMap();

    // Cleanup function
    return () => {
      try {
        clearMapOverlays();
        
        // Remove map instance
        if (mapInstanceRef.current) {
          if (mapInstanceRef.current.remove) {
            mapInstanceRef.current.remove();
          }
          mapInstanceRef.current = null;
        }
      } catch (error) {
        console.warn('Error during cleanup:', error);
      }
    };
  }, [mapData, clearMapOverlays]);

  // Fallback component untuk menampilkan koordinat sebagai text
  if (showTextFallback) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-blue-50 to-purple-50 p-4 overflow-y-auto">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 4m0 13V4m-6 3l6-3" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Preview Data Koordinat</h3>
          <p className="text-gray-600 text-sm">Maps tidak tersedia, menampilkan data sebagai teks</p>
        </div>
        
        {mapData ? (
          <div className="space-y-6">
            {mapData.coordinates && mapData.coordinates.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h4 className="font-semibold text-gray-800">Koordinat ({mapData.coordinates.length})</h4>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 max-h-48 overflow-y-auto">
                  <div className="grid grid-cols-1 gap-2">
                    {mapData.coordinates.map((coord, index) => (
                      <div key={index} className="bg-white rounded-md p-2 border border-gray-200">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">#{index + 1}</span>
                          <span className="text-xs text-gray-500">Alt: {coord.alt}m</span>
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          <div>Lat: {coord.lat.toFixed(6)}</div>
                          <div>Lng: {coord.lng.toFixed(6)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            
            {mapData.polygons && mapData.polygons.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                  </div>
                  <h4 className="font-semibold text-gray-800">Polygon ({mapData.polygons.length})</h4>
                </div>
                {mapData.polygons.map((polygon, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-3 mb-3">
                    <h5 className="font-medium text-gray-700 mb-1">{polygon.name}</h5>
                    <p className="text-sm text-gray-600 mb-2">{polygon.description}</p>
                    <div className="text-xs text-gray-500 bg-white rounded px-2 py-1 inline-block">
                      {polygon.coordinates.length} koordinat
                    </div>
                  </div>
                ))}
              </div>
            )}

            {mapData.lines && mapData.lines.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                    </svg>
                  </div>
                  <h4 className="font-semibold text-gray-800">Garis ({mapData.lines.length})</h4>
                </div>
                {mapData.lines.map((line, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-3 mb-3">
                    <h5 className="font-medium text-gray-700 mb-1">{line.name}</h5>
                    <p className="text-sm text-gray-600 mb-2">{line.description}</p>
                    <div className="text-xs text-gray-500 bg-white rounded px-2 py-1 inline-block">
                      {line.coordinates.length} koordinat
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-gray-500">
            <p>Tidak ada data koordinat untuk ditampilkan</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      {showTextFallback ? (
        <SimpleMapComponent mapData={mapData} />
      ) : (
        <>
          <div 
            ref={mapRef} 
            className="w-full h-full rounded-xl overflow-hidden"
            style={{ minHeight: '256px' }}
          />
          {!mapLoaded && (
            <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-gray-900 text-sm">Memuat peta...</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MapComponent;
