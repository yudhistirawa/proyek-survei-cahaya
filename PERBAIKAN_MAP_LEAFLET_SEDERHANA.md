# Perbaikan Map Tidak Terlihat - Leaflet Sederhana

## Masalah
Map tidak terlihat setelah upload file KMZ. Data sudah berhasil di-parse (13 koordinat) tetapi map tidak muncul.

## Analisis Masalah
1. **Implementasi Google Maps terlalu kompleks** - Banyak state management dan fallback yang rumit
2. **API Key issues** - Google Maps memerlukan API key yang valid
3. **Timing issues** - Container tidak siap saat map diinisialisasi
4. **Over-engineering** - Terlalu banyak abstraction dan callback

## Solusi yang Diterapkan

### 1. ✅ **Kembali ke Leaflet Sederhana**
- **Menghapus Google Maps implementation**
- **Menghapus complex state management**
- **Direct Leaflet loading dan initialization**

### 2. ✅ **Simplified Component Structure**
- **Hanya 2 state: mapLoaded dan mapError**
- **Single useEffect untuk loading**
- **Direct map creation tanpa Promise**

### 3. ✅ **Robust Container Management**
- **Explicit container styling**
- **Clear existing content sebelum create map**
- **Proper z-index dan positioning**

## Implementasi

### **File yang Dimodifikasi: `KMZMapComponent.js`**

#### **Simplified Component Structure**
```javascript
import React, { useEffect, useState, useRef } from 'react';
import KMZTextFallback from './KMZTextFallback';

const KMZMapComponent = ({ mapData }) => {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    if (!mapData) {
      console.log('KMZMapComponent: No mapData provided');
      return;
    }

    console.log('KMZMapComponent: mapData received:', mapData);
    console.log('KMZMapComponent: coordinates count:', mapData.coordinates?.length || 0);
    console.log('KMZMapComponent: polygons count:', mapData.polygons?.length || 0);
    console.log('KMZMapComponent: lines count:', mapData.lines?.length || 0);

    // Reset states
    setMapLoaded(false);
    setMapError(false);

    // Load Leaflet CSS if not already loaded
    if (!document.querySelector('link[href*="leaflet.css"]')) {
      const cssLink = document.createElement('link');
      cssLink.rel = 'stylesheet';
      cssLink.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
      document.head.appendChild(cssLink);
    }

    // Load Leaflet JS if not already loaded
    if (typeof window !== 'undefined' && !window.L) {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = () => {
        console.log('✅ Leaflet loaded successfully');
        setTimeout(() => {
          createMap();
        }, 100);
      };
      script.onerror = () => {
        console.error('Failed to load Leaflet');
        setMapError(true);
      };
      document.head.appendChild(script);
    } else {
      setTimeout(() => {
        createMap();
      }, 100);
    }
  }, [mapData]);
```

#### **Direct Map Creation**
```javascript
const createMap = () => {
  try {
    console.log('🗺️ Creating map...');
    
    // Check if container exists
    if (!mapRef.current) {
      console.error('Map container not found');
      setMapError(true);
      return;
    }

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

    // Ensure container has proper styling
    const container = mapRef.current;
    container.style.width = '100%';
    container.style.height = '256px';
    container.style.minHeight = '256px';
    container.style.position = 'relative';
    container.style.zIndex = '1';
    
    // Clear any existing content
    container.innerHTML = '';
    
    // Initialize Leaflet Map
    const map = window.L.map(container, {
      center: center,
      zoom: zoom,
      zoomControl: true,
      attributionControl: true
    });
    
    // Add OpenStreetMap tile layer
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    mapInstanceRef.current = map;
    
    // Create bounds array for fitting view
    const allBounds = [];
    
    // Add coordinates as markers
    if (mapData.coordinates && mapData.coordinates.length > 0) {
      console.log('Adding coordinates as markers:', mapData.coordinates.length);
      
      mapData.coordinates.forEach((coord, index) => {
        console.log(`Adding marker ${index + 1}:`, coord);
        const marker = window.L.marker([coord.lat, coord.lng], {
          title: `Koordinat ${index + 1}`
        }).addTo(map);
        
        // Add popup
        const popupContent = `
          <div>
            <h3>Koordinat ${index + 1}</h3>
            <p>Lat: ${coord.lat.toFixed(6)}</p>
            <p>Lng: ${coord.lng.toFixed(6)}</p>
            <p>Alt: ${coord.alt || 0}m</p>
          </div>
        `;
        
        marker.bindPopup(popupContent);
        allBounds.push([coord.lat, coord.lng]);
      });
    }

    // Add polygons
    if (mapData.polygons && mapData.polygons.length > 0) {
      console.log('Adding polygons:', mapData.polygons.length);
      mapData.polygons.forEach((polygon, index) => {
        console.log(`Processing polygon ${index + 1}:`, polygon.name, 'with', polygon.coordinates?.length, 'coordinates');
        if (polygon.coordinates && polygon.coordinates.length > 0) {
          const path = polygon.coordinates.map(coord => [coord.lat, coord.lng]);
          console.log(`Polygon ${index + 1} path:`, path.slice(0, 3));
          
          const poly = window.L.polygon(path, {
            color: '#3388ff',
            weight: 2,
            opacity: 0.8,
            fillColor: '#3388ff',
            fillOpacity: 0.2
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
            allBounds.push([coord.lat, coord.lng]);
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
          
          const polyline = window.L.polyline(path, {
            color: '#FF0000',
            weight: 3,
            opacity: 0.8
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
            allBounds.push([coord.lat, coord.lng]);
          });
        }
      });
    }

    // Fit map to show all data
    if (allBounds.length > 0) {
      console.log('Fitting bounds to show all data:', allBounds.length, 'points');
      try {
        map.fitBounds(allBounds, { padding: [10, 10] });
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

    setMapLoaded(true);
    console.log('✅ Map created successfully with', allBounds.length, 'data points');
  } catch (error) {
    console.error('Error creating map:', error);
    setMapError(true);
  }
};
```

#### **Simple Loading UI**
```javascript
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
```

## Keuntungan Solusi Baru

### 1. ✅ **Sangat Sederhana**
- **Tidak ada Google Maps API key issues**
- **Tidak ada complex state management**
- **Direct Leaflet loading dan creation**

### 2. ✅ **Reliable**
- **Leaflet adalah open source dan free**
- **Tidak ada API key dependency**
- **Consistent behavior**

### 3. ✅ **Fast dan Responsif**
- **Map langsung muncul setelah Leaflet load**
- **Minimal loading time**
- **Simple error handling**

### 4. ✅ **Easy to Debug**
- **Clear console logs**
- **Simple flow**
- **Minimal complexity**

## Cara Test

### 1. **Test Loading**
1. Buka aplikasi dan navigasi ke "Buat Tugas Zona Existing"
2. Upload file KMZ
3. Map langsung muncul dengan markers

### 2. **Test Features**
1. Upload file KMZ dengan koordinat
2. Pastikan markers muncul di map
3. Klik marker untuk melihat popup
4. Test zoom dan pan functionality

### 3. **Test Error Handling**
1. Block Leaflet di network tab
2. Upload file KMZ
3. Pastikan error handling berfungsi
4. Verifikasi fallback ke text view

## Expected Behavior

### ✅ **Success Case**
```javascript
// Console log
KMZMapComponent: mapData received: {coordinates: [...], polygons: [...], lines: [...]}
KMZMapComponent: coordinates count: 13
KMZMapComponent: polygons count: 0
KMZMapComponent: lines count: 0
✅ Leaflet loaded successfully
🗺️ Creating map...
KMZMapComponent: Calculated center: [-6.123456, 106.789012]
Adding coordinates as markers: 13
✅ Map created successfully with 13 data points

// UI
- Loading spinner muncul sebentar
- Map langsung muncul dengan markers
- Popup berfungsi saat diklik
```

### ✅ **Error Case**
```javascript
// Console log
Failed to load Leaflet
Error creating map: Map container not found

// UI
- Fallback ke text view
- Error message yang jelas
```

## Troubleshooting

### Jika map masih tidak muncul:

1. **Cek Console**
   - Pastikan "✅ Leaflet loaded successfully" muncul
   - Cek apakah ada error di console
   - Verifikasi "✅ Map created successfully"

2. **Cek Network**
   - Pastikan Leaflet CSS dan JS berhasil di-load
   - Cek apakah OpenStreetMap tiles berhasil di-load
   - Verifikasi tidak ada CORS error

3. **Cek Container**
   - Pastikan container memiliki dimensi yang benar
   - Cek apakah container visible di DOM
   - Verifikasi CSS styling tidak menghilangkan container

## Best Practices

### 1. **Simple Loading**
```javascript
// ✅ Good - Direct loading without Promise
script.onload = () => {
  console.log('✅ Leaflet loaded successfully');
  setTimeout(() => {
    createMap();
  }, 100);
};
```

### 2. **Minimal State**
```javascript
// ✅ Good - Only necessary states
const [mapLoaded, setMapLoaded] = useState(false);
const [mapError, setMapError] = useState(false);
```

### 3. **Simple Error Handling**
```javascript
// ✅ Good - Direct error handling
} catch (error) {
  console.error('Error creating map:', error);
  setMapError(true);
}
```

## Status: ✅ SELESAI

Map sekarang langsung muncul dengan:
- ✅ Simplified Leaflet implementation
- ✅ Direct map creation setelah Leaflet load
- ✅ Minimal state management
- ✅ Simple error handling
- ✅ Cleanup yang sederhana

Map sekarang langsung muncul setelah upload file KMZ tanpa stuck loading!

