# Maps Surveyor GPS Tracking Integration

## Overview
Sistem untuk menyimpan data tracking GPS surveyor ke Firestore agar dapat ditampilkan di panel admin Maps Surveyor.

## File yang Dibuat

### 1. `app/lib/maps-surveyor.js`
File utama yang berisi fungsi untuk menyimpan data tracking GPS ke Firestore.

### 2. `test-maps-surveyor.js`
File test untuk memverifikasi fungsi bekerja dengan benar.

## Fungsi Utama

### `saveSurveyorRoute(taskId, surveyorName, trackingData, summaryInfo)`

**Parameter:**
- `taskId` (string): ID unik untuk tugas surveyor
- `surveyorName` (string): Nama surveyor
- `trackingData` (Array): Array koordinat GPS dengan format:
  ```javascript
  [
    { lat: -6.2088, lng: 106.8456, timestamp: Date | number | Timestamp },
    { lat: -6.2089, lng: 106.8457, timestamp: Date | number | Timestamp },
    // ...
  ]
  ```
- `summaryInfo` (Object, opsional): Info ringkasan
  ```javascript
  {
    duration: "20 menit",     // string atau akan dihitung otomatis
    distance: 1.5,            // number (km) atau akan dihitung otomatis
    surveysCount: 3           // number, default 0
  }
  ```

**Return:** Promise<string> - Document ID yang disimpan

## Struktur Data di Firestore

Data disimpan di koleksi `Maps_Surveyor` dengan struktur:

```javascript
Maps_Surveyor/{taskId}: {
  surveyorName: "John Doe",
  date: Timestamp,
  duration: "20 menit",
  distance: 1.5,              // dalam km
  pointsCount: 4,             // jumlah titik tracking
  surveysCount: 3,            // jumlah survey yang dilakukan
  status: "Selesai",
  tracking: [
    { lat: -6.2088, lng: 106.8456, timestamp: Timestamp },
    { lat: -6.2089, lng: 106.8457, timestamp: Timestamp },
    // ...
  ],
  createdAt: Timestamp,
  updatedAt: Timestamp,
  taskId: "task-123"
}
```

## Cara Penggunaan

### 1. Import fungsi
```javascript
import { saveSurveyorRoute } from './app/lib/maps-surveyor.js';
```

### 2. Simpan data tracking
```javascript
// Contoh dengan data yang sudah ada
const trackingData = [
  { lat: -6.2088, lng: 106.8456, timestamp: new Date() },
  { lat: -6.2089, lng: 106.8457, timestamp: new Date() },
  // ... data tracking GPS lainnya
];

const summaryInfo = {
  duration: "30 menit",
  distance: 2.1,
  surveysCount: 5
};

try {
  const documentId = await saveSurveyorRoute(
    'task-123',
    'John Doe',
    trackingData,
    summaryInfo
  );
  console.log('Data berhasil disimpan:', documentId);
} catch (error) {
  console.error('Gagal menyimpan:', error);
}
```

### 3. Auto-calculation (tanpa summaryInfo)
```javascript
// Jarak dan durasi akan dihitung otomatis
const documentId = await saveSurveyorRoute(
  'task-456',
  'Jane Smith',
  trackingData
  // summaryInfo tidak disediakan
);
```

## Fitur Otomatis

### 1. Perhitungan Jarak
- Menggunakan formula Haversine untuk menghitung jarak antar titik GPS
- Hasil dalam kilometer dengan 2 desimal

### 2. Perhitungan Durasi
- Berdasarkan timestamp pertama dan terakhir
- Format: "X menit" atau "X jam Y menit"

### 3. Validasi Data
- Memvalidasi format trackingData
- Memvalidasi parameter yang diperlukan
- Error handling yang komprehensif

## Testing

Jalankan test untuk memverifikasi fungsi:

```bash
node test-maps-surveyor.js
```

Test akan:
1. Test basic functionality
2. Test auto calculation
3. Test built-in test function

## Integration dengan Panel Admin

Data yang disimpan akan otomatis tersedia di panel admin Maps Surveyor karena:
1. Menggunakan struktur data yang sesuai dengan panel admin
2. Disimpan di koleksi `Maps_Surveyor` yang sudah dikonfigurasi
3. Format data kompatibel dengan tampilan peta dan daftar rute

## Error Handling

Fungsi dilengkapi dengan error handling untuk:
- Koneksi Firestore gagal
- Parameter tidak valid
- Format data tracking salah
- Timestamp conversion error

## Dependencies

Menggunakan Firebase v9 modular SDK:
- `firebase/firestore` untuk operasi database
- `firebase/app` untuk inisialisasi (dari file firebase.js yang sudah ada)

## Production Ready

Kode sudah production-ready dengan:
- Async/await pattern
- Comprehensive error handling
- Input validation
- Automatic calculations
- Proper logging
- TypeScript-friendly JSDoc comments
