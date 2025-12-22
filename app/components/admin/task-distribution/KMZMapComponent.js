import React, { useEffect, useState, useRef, useCallback } from 'react';
import KMZTextFallback from './KMZTextFallback';
 

// Simple Google Maps component for KMZ data
const GoogleKMZMap = ({ mapData, taskType }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const polygonsRef = useRef([]);
  const polylinesRef = useRef([]);

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
    polylinesRef.current.forEach(polyline => {
      if (polyline.setMap) polyline.setMap(null);
    });
    polylinesRef.current = [];
  }, []);

  useEffect(() => {
    if (!mapData || !mapRef.current) {
      console.log('KMZMapComponent: Missing data or ref', { 
        hasMapData: !!mapData, 
        hasMapRef: !!mapRef.current,
        mapDataKeys: mapData ? Object.keys(mapData) : null
      });
      return;
    }

    console.log('KMZMapComponent: mapData received for task type:', taskType);
    console.log('KMZMapComponent: coordinates count:', mapData.coordinates?.length || 0);
    console.log('KMZMapComponent: polygons count:', mapData.polygons?.length || 0);
    console.log('KMZMapComponent: lines count:', mapData.lines?.length || 0);

    // Add delay to ensure DOM is ready
    const timer = setTimeout(() => {
      if (mapRef.current) {
        // Always use Leaflet (OpenStreetMap). We intentionally skip Google Maps entirely.
        loadGoogleMaps();
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      clearMapOverlays();
      if (mapInstanceRef.current) {
        if (mapInstanceRef.current.setMap) {
          mapInstanceRef.current.setMap(null);
        }
        mapInstanceRef.current = null;
      }
    };
  }, [mapData, clearMapOverlays]);

  const loadGoogleMaps = async () => {
    // Force Leaflet (OpenStreetMap) and skip any Google Maps loading entirely
    try {
      console.warn('Forcing Leaflet (OpenStreetMap). Skipping Google Maps entirely.');
      initializeOpenStreetMap();
    } catch (error) {
      console.error('Error initializing Leaflet:', error);
      initializeOpenStreetMap();
    }
  };

  const initializeGoogleMap = () => {
    try {
      if (!window.google || !window.google.maps || !mapRef.current) {
        throw new Error('Google Maps not available or container not found');
      }

      console.log('🗺️ Creating Google Maps with KMZ data...');

    // Calculate center and zoom based on data
    let allCoordinates = [];
    
    // Add individual coordinates
    if (mapData.coordinates && mapData.coordinates.length > 0) {
      allCoordinates.push(...mapData.coordinates);
    }
    
    // Add polygon coordinates
    if (mapData.polygons && mapData.polygons.length > 0) {
      mapData.polygons.forEach(polygon => {
        if (polygon.coordinates && polygon.coordinates.length > 0) {
          allCoordinates.push(...polygon.coordinates);
        }
      });
    }
    
    // Add line coordinates
    if (mapData.lines && mapData.lines.length > 0) {
      mapData.lines.forEach(line => {
        if (line.coordinates && line.coordinates.length > 0) {
          allCoordinates.push(...line.coordinates);
        }
      });
    }

    let center = { lat: -6.2088, lng: 106.8456 }; // Default to Jakarta
    let zoom = 10;
    
    if (allCoordinates.length > 0) {
      const avgLat = allCoordinates.reduce((sum, coord) => sum + coord.lat, 0) / allCoordinates.length;
      const avgLng = allCoordinates.reduce((sum, coord) => sum + coord.lng, 0) / allCoordinates.length;
      center = { lat: avgLat, lng: avgLng };
      zoom = 13;
      
      console.log('KMZMapComponent: Calculated center:', center);
      console.log('KMZMapComponent: Total coordinates:', allCoordinates.length);
    }

    // Initialize Google Map
    const map = new window.google.maps.Map(mapRef.current, {
      center: center,
      zoom: zoom,
      mapTypeId: 'hybrid',
      streetViewControl: false,
      fullscreenControl: true,
      mapTypeControl: true,
      zoomControl: true,
    });

    mapInstanceRef.current = map;

    // Watchdog: fallback to Leaflet if Google Maps doesn't become idle within 3s
    let gotIdle = false;
    try {
      window.google.maps.event.addListenerOnce(map, 'idle', () => {
        gotIdle = true;
      });
    } catch (e) {
      console.warn('Failed to attach idle listener:', e);
    }
    setTimeout(() => {
      if (!gotIdle) {
        console.warn('Google Maps did not become idle in time, falling back to OpenStreetMap');
        try {
          if (map && map.setMap) map.setMap(null);
        } catch (_) {}
        initializeOpenStreetMap();
      }
    }, 3000);

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
                <p style="margin: 2px 0; font-size: 12px;"><small>${polygon.coordinates.length} koordinat</small></p>
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
              <div style="padding: 8px;">
                <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold;">${line.name || `Line ${index + 1}`}</h3>
                <p style="margin: 2px 0; font-size: 12px;">${line.description || 'Tidak ada deskripsi'}</p>
                <p style="margin: 2px 0; font-size: 12px;"><small>${line.coordinates.length} koordinat</small></p>
              </div>
            `
          });

          polyline.addListener('click', (event) => {
            infoWindow.setPosition(event.latLng);
            infoWindow.open(map);
          });

          polylinesRef.current.push(polyline);
          
          // Add line bounds
          line.coordinates.forEach(coord => {
            bounds.extend({ lat: coord.lat, lng: coord.lng });
            hasBounds = true;
          });
        }
      });
    }

    // Fit map to show all data
    if (hasBounds) {
      console.log('Fitting bounds to show all data');
      try {
        map.fitBounds(bounds, { padding: 20 });
      } catch (e) {
        console.warn('Error fitting bounds, using center instead:', e);
        map.setCenter(center);
        map.setZoom(zoom);
      }
    } else {
      console.log('No bounds to fit, using default center');
      map.setCenter(center);
      map.setZoom(zoom);
    }

    console.log('✅ Google Maps created successfully with KMZ data');
    } catch (err) {
      console.error('Failed to initialize Google Maps, falling back to Leaflet:', err);
      initializeOpenStreetMap();
    }
  };

  const initializeOpenStreetMap = () => {
    console.log('🗺️ Initializing OpenStreetMap fallback...');
    
    // Load Leaflet if not already loaded
    if (!window.L) {
      loadLeafletAndInitialize();
    } else {
      initializeLeafletMap();
    }
  };

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
      
      initializeLeafletMap();
    };
    script.onerror = () => {
      console.error('Failed to load Leaflet');
    };
    document.head.appendChild(script);
  };

  const initializeLeafletMap = () => {
    const L = window.L;
    if (!L || !mapRef.current) return;

    console.log('🗺️ Creating Leaflet map with KMZ data...');

    // Calculate center and zoom based on data
    let allCoordinates = [];
    
    // Add individual coordinates
    if (mapData.coordinates && mapData.coordinates.length > 0) {
      allCoordinates.push(...mapData.coordinates);
    }
    
    // Add polygon coordinates
    if (mapData.polygons && mapData.polygons.length > 0) {
      mapData.polygons.forEach(polygon => {
        if (polygon.coordinates && polygon.coordinates.length > 0) {
          allCoordinates.push(...polygon.coordinates);
        }
      });
    }
    
    // Add line coordinates
    if (mapData.lines && mapData.lines.length > 0) {
      mapData.lines.forEach(line => {
        if (line.coordinates && line.coordinates.length > 0) {
          allCoordinates.push(...line.coordinates);
        }
      });
    }

    let center = [-6.2088, 106.8456]; // Default to Jakarta [lat, lng]
    let zoom = 10;
    
    if (allCoordinates.length > 0) {
      const avgLat = allCoordinates.reduce((sum, coord) => sum + coord.lat, 0) / allCoordinates.length;
      const avgLng = allCoordinates.reduce((sum, coord) => sum + coord.lng, 0) / allCoordinates.length;
      center = [avgLat, avgLng];
      zoom = 13;
      
      console.log('KMZMapComponent: Calculated center:', center);
      console.log('KMZMapComponent: Total coordinates:', allCoordinates.length);
    }

    // Clear existing map
    if (mapInstanceRef.current && mapInstanceRef.current.remove) {
      mapInstanceRef.current.remove();
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
    
    // Create bounds array for fitting view
    const bounds = L.latLngBounds();
    let hasBounds = false;
    
    // Add coordinates as markers
    if (mapData.coordinates && mapData.coordinates.length > 0) {
      console.log('Adding coordinates as markers:', mapData.coordinates.length, 'for task type:', taskType);
      
      mapData.coordinates.forEach((coord, index) => {
        console.log(`Adding marker ${index + 1}:`, coord);
        
        // Use different marker style for propose tasks
        const markerOptions = taskType === 'propose' ? {
          title: `Titik Survei ${index + 1}`,
          icon: L.divIcon({
            className: 'custom-marker-propose',
            html: `<div style="background-color: #ff6b35; border: 2px solid #fff; border-radius: 50%; width: 12px; height: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
            iconSize: [12, 12],
            iconAnchor: [6, 6]
          })
        } : {
          title: `Koordinat ${index + 1}`
        };
        
        const marker = L.marker([coord.lat, coord.lng], markerOptions).addTo(map);
        
        // Add popup with different content for propose tasks
        const popupContent = taskType === 'propose' ? `
          <div>
            <h3 style="color: #ff6b35; margin: 0 0 8px 0;">Titik Survei ${index + 1}</h3>
            <p style="margin: 2px 0; font-size: 12px;"><strong>Latitude:</strong> ${coord.lat.toFixed(6)}</p>
            <p style="margin: 2px 0; font-size: 12px;"><strong>Longitude:</strong> ${coord.lng.toFixed(6)}</p>
            <p style="margin: 2px 0; font-size: 12px;"><strong>Altitude:</strong> ${coord.alt || 0}m</p>
            <p style="margin: 8px 0 0 0; font-size: 11px; color: #666;">Tugas Propose - Titik Koordinat</p>
          </div>
        ` : `
          <div>
            <h3>Koordinat ${index + 1}</h3>
            <p>Lat: ${coord.lat.toFixed(6)}</p>
            <p>Lng: ${coord.lng.toFixed(6)}</p>
            <p>Alt: ${coord.alt || 0}m</p>
          </div>
        `;
        
        marker.bindPopup(popupContent);
        bounds.extend([coord.lat, coord.lng]);
        hasBounds = true;
      });
    }

    // Add polygons
    if (mapData.polygons && mapData.polygons.length > 0) {
      console.log('Adding polygons:', mapData.polygons.length);
      mapData.polygons.forEach((polygon, index) => {
        console.log(`Processing polygon ${index + 1}:`, polygon.name, 'with', polygon.coordinates?.length, 'coordinates');
        if (polygon.coordinates && polygon.coordinates.length > 0) {
          // Convert coordinates to Leaflet format [lat, lng]
          const path = polygon.coordinates.map(coord => [coord.lat, coord.lng]);
          console.log(`Polygon ${index + 1} path:`, path.slice(0, 3));
          
          // Ensure polygon is closed (first and last point are the same)
          if (path.length > 0) {
            const firstPoint = path[0];
            const lastPoint = path[path.length - 1];
            
            if (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1]) {
              path.push([...firstPoint]);
              console.log('KMZMapComponent: Closed polygon by adding first point at the end');
            }
          }
          
          // Use style from KMZ if available, otherwise use defaults
          const style = polygon.style || {};
          const fillColor = style.fillColor || '#3388ff';
          const strokeColor = style.strokeColor || '#2E7D32';
          const fillOpacity = style.fillOpacity !== undefined ? style.fillOpacity : 0.2;
          const strokeOpacity = style.strokeOpacity !== undefined ? style.strokeOpacity : 0.8;
          const weight = style.strokeWidth || 2;
          
          const poly = L.polygon(path, {
            color: strokeColor,
            weight: weight,
            opacity: strokeOpacity,
            fillColor: fillColor,
            fillOpacity: fillOpacity
          }).addTo(map);
          
          // Add popup for polygon
          const popupContent = `
            <div>
              <h3>${polygon.name || `Polygon ${index + 1}`}</h3>
              <p>${polygon.description || 'Tidak ada deskripsi'}</p>
              <p><small>${polygon.coordinates.length} koordinat</small></p>
            </div>
          `;
          
          poly.bindPopup(popupContent);
          
          // Add polygon bounds
          polygon.coordinates.forEach(coord => {
            bounds.extend([coord.lat, coord.lng]);
            hasBounds = true;
          });
        }
      });
    }

    // Add lines
    if (mapData.lines && mapData.lines.length > 0) {
      console.log('Adding lines:', mapData.lines.length);
      mapData.lines.forEach((line, index) => {
        console.log(`Processing line ${index + 1}:`, line.name, 'with', line.coordinates?.length, 'coordinates');
        if (line.coordinates && line.coordinates.length > 0) {
          const path = line.coordinates.map(coord => [coord.lat, coord.lng]);
          console.log(`Line ${index + 1} path:`, path.slice(0, 3));
          
          // Use style from KMZ if available
          const style = line.style || {};
          const color = style.strokeColor || '#FF0000';
          const weight = style.strokeWidth || 3;
          const opacity = style.strokeOpacity !== undefined ? style.strokeOpacity : 0.8;
          
          const polyline = L.polyline(path, {
            color: color,
            weight: weight,
            opacity: opacity
          }).addTo(map);
          
          // Add popup for line
          const popupContent = `
            <div>
              <h3>${line.name || `Line ${index + 1}`}</h3>
              <p>${line.description || 'Tidak ada deskripsi'}</p>
              <p><small>${line.coordinates.length} koordinat</small></p>
            </div>
          `;
          
          polyline.bindPopup(popupContent);
          
          // Add line bounds
          line.coordinates.forEach(coord => {
            bounds.extend([coord.lat, coord.lng]);
            hasBounds = true;
          });
        }
      });
    }

    // Fit map to show all data
    if (hasBounds && bounds.isValid()) {
      console.log('Fitting bounds to show all data:', bounds);
      try {
        map.fitBounds(bounds, { padding: [10, 10] });
      } catch (e) {
        console.warn('Error fitting bounds, using center instead:', e);
        map.setView(center, zoom);
      }
    } else {
      console.log('No bounds to fit, using default center');
      map.setView(center, zoom);
    }

    // Force map to invalidate size after a short delay
    setTimeout(() => {
      if (map && map.invalidateSize) {
        map.invalidateSize();
        console.log('Map size invalidated');
      }
    }, 200);

    console.log('✅ Leaflet map created successfully with KMZ data');
  };

  return (
    <div 
      ref={mapRef} 
      className="w-full h-full rounded-xl overflow-hidden"
      style={{ 
        minHeight: '256px',
        width: '100%',
        height: '256px',
        position: 'relative',
        display: 'block',
        backgroundColor: '#f0f0f0'
      }}
    />
  );
};

const KMZMapComponent = ({ mapData, taskType = 'existing' }) => {
  const [mapError, setMapError] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  useEffect(() => {
    if (!mapData) {
      console.log('KMZMapComponent: No mapData provided');
      return;
    }

    console.log('KMZMapComponent: mapData received:', mapData);
    setMapError(false);
    setMapLoaded(true);
  }, [mapData]);

  if (!mapData) {
    return <KMZTextFallback mapData={null} />;
  }

  if (mapError) {
    return <KMZTextFallback mapData={mapData} />;
  }

  if (!mapLoaded) {
    return (
      <div className="w-full h-full bg-gray-100 flex items-center justify-center rounded-xl">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-gray-900 text-sm font-medium">Memuat peta...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <GoogleKMZMap mapData={mapData} taskType={taskType} />
      
      {/* Info overlay */}
      <div className="absolute top-2 left-2 bg-white bg-opacity-90 rounded-lg p-2 text-xs z-10">
        <div className="font-medium text-gray-800">Data KMZ</div>
        <div className="text-gray-600">
          {mapData?.coordinates?.length > 0 && (
            <div>📍 {mapData.coordinates.length} koordinat</div>
          )}
          {mapData?.polygons?.length > 0 && (
            <div>🔷 {mapData.polygons.length} polygon</div>
          )}
          {mapData?.lines?.length > 0 && (
            <div>📏 {mapData.lines.length} garis</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KMZMapComponent;
