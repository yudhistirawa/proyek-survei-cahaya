# Perbaikan Error ChunkLoadError pada MapComponent

## Masalah
Error `ChunkLoadError: Loading chunk _app-pages-browser_node_modules_leaflet_dist_leaflet-src_js failed` terjadi saat mencoba load Leaflet secara dynamic import. Error ini disebabkan oleh masalah webpack chunk loading di Next.js.

## Solusi yang Diterapkan

### 1. ✅ **Menggunakan CDN Leaflet**
- **Load Leaflet dari CDN** alih-alih npm package
- **Menghindari webpack chunk loading** yang bermasalah
- **Fallback ke SimpleMapComponent** jika CDN gagal

### 2. ✅ **SimpleMapComponent sebagai Fallback**
- **Canvas-based map** tanpa library eksternal
- **Visualisasi koordinat** dengan dots dan lines
- **Grid background** untuk referensi
- **Info box** dengan detail koordinat

## Implementasi

### **File yang Dimodifikasi: `MapComponent.js`**

#### **CDN Loading Strategy**
```javascript
// Load Leaflet from CDN
if (typeof window !== 'undefined' && !window.L) {
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
  script.async = true;
  
  await new Promise((resolve, reject) => {
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

const L = window.L;
if (!L) {
  throw new Error('Leaflet failed to load');
}
```

#### **Fallback Component**
```javascript
return (
  <div className="w-full h-full relative">
    {showTextFallback ? (
      <SimpleMapComponent mapData={mapData} />
    ) : (
      // Leaflet map component
    )}
  </div>
);
```

### **File Baru: `SimpleMapComponent.js`**

#### **Canvas-based Map**
```javascript
const SimpleMapComponent = ({ mapData }) => {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Calculate bounds
    const bounds = {
      minLat: Math.min(...mapData.coordinates.map(c => c.lat)),
      maxLat: Math.max(...mapData.coordinates.map(c => c.lat)),
      minLng: Math.min(...mapData.coordinates.map(c => c.lng)),
      maxLng: Math.max(...mapData.coordinates.map(c => c.lng))
    };
    
    // Convert coordinates to canvas points
    const points = mapData.coordinates.map(coord => ({
      x: ((coord.lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * canvas.width,
      y: ((bounds.maxLat - coord.lat) / (bounds.maxLat - bounds.minLat)) * canvas.height,
      coord: coord
    }));
    
    // Draw coordinates as dots
    points.forEach((point, index) => {
      ctx.fillStyle = '#3b82f6';
      ctx.beginPath();
      ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI);
      ctx.fill();
    });
  }, [mapData]);
  
  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-full rounded-xl border border-gray-200"
      style={{ minHeight: '256px' }}
    />
  );
};
```

## Cara Test

### 1. **Test CDN Loading**
1. Buka aplikasi dan navigasi ke create task
2. Upload file KMZ/KML
3. Pastikan Leaflet berhasil dimuat dari CDN
4. Cek console untuk success message

### 2. **Test Fallback**
1. Simulasi error CDN loading
2. Pastikan SimpleMapComponent muncul
3. Verifikasi koordinat ditampilkan sebagai dots

### 3. **Test Canvas Map**
1. Pastikan koordinat ditampilkan sebagai dots biru
2. Cek grid background
3. Verifikasi info box dengan detail

## Expected Behavior

### ✅ **CDN Success**
```javascript
// Console log
🗺️ Initializing Leaflet map...
✅ Leaflet map initialized successfully
```

### ✅ **Fallback Success**
```javascript
// Console log
Error initializing Leaflet map: Leaflet failed to load
📄 Falling back to text view
✅ Simple map initialized successfully
```

### ✅ **Visual Features**
- **CDN Leaflet**: Full interactive map dengan markers, polygons, lines
- **Canvas Fallback**: Dots untuk koordinat, grid background, info box
- **Loading State**: Spinner saat memuat map

## Troubleshooting

### Jika CDN gagal load:

1. **Cek Network**
   - Pastikan koneksi internet stabil
   - Cek apakah unpkg.com dapat diakses
   - Cek firewall/blocking

2. **Cek Console**
   - Pastikan tidak ada CORS error
   - Cek apakah script berhasil dimuat
   - Verifikasi window.L tersedia

### Jika Canvas tidak muncul:

1. **Cek Canvas Element**
   - Pastikan canvas element ada di DOM
   - Cek canvas dimensions
   - Verifikasi context 2D tersedia

2. **Cek Data**
   - Pastikan mapData valid
   - Cek koordinat dalam range yang benar
   - Verifikasi bounds calculation

## Best Practices

### 1. **CDN Loading**
```javascript
// ✅ Good - Promise-based loading
await new Promise((resolve, reject) => {
  script.onload = resolve;
  script.onerror = reject;
  document.head.appendChild(script);
});
```

### 2. **Fallback Strategy**
```javascript
// ✅ Good - Graceful degradation
if (showTextFallback) {
  return <SimpleMapComponent mapData={mapData} />;
}
```

### 3. **Error Handling**
```javascript
// ✅ Good - Comprehensive error handling
try {
  // CDN loading
} catch (error) {
  console.error('Error initializing Leaflet map:', error);
  console.log('📄 Falling back to text view');
  setShowTextFallback(true);
}
```

## Status: ✅ SELESAI

Error ChunkLoadError sudah diperbaiki dengan:
- ✅ CDN loading untuk menghindari webpack issues
- ✅ SimpleMapComponent sebagai fallback reliable
- ✅ Canvas-based visualization tanpa dependencies
- ✅ Graceful degradation strategy
- ✅ Comprehensive error handling

Aplikasi sekarang dapat menampilkan preview file KMZ dengan reliable, baik menggunakan Leaflet CDN maupun canvas fallback!
