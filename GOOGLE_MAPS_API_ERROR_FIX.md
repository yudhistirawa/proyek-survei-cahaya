# Perbaikan Error Google Maps API

## Masalah
Error yang muncul: "Error: API key not configured" di file `KMZMapComponent.js` pada baris 80.

## Penyebab
1. Google Maps API key tidak dikonfigurasi dengan benar
2. Kode menggunakan fallback value `'YOUR_GOOGLE_MAPS_API_KEY_HERE'` yang menyebabkan error
3. Error handling yang tidak tepat (throw error alih-alih fallback ke OpenStreetMap)

## Solusi yang Diterapkan

### 1. Menggunakan Konfigurasi Terpusat
- Mengimpor `GOOGLE_MAPS_API_KEY` dari `env-config.js`
- File `env-config.js` sudah berisi API key yang valid: `'AIzaSyBHk6Zg35hLFRbuLW_dwHSpJ3-EQ2kGhQ8'`

### 2. Memperbaiki Error Handling
- Mengganti `throw new Error()` dengan fallback ke OpenStreetMap
- Menambahkan pengecekan `!apiKey` untuk memastikan API key tidak kosong

### 3. File yang Diperbaiki
- `app/components/admin/task-distribution/KMZMapComponent.js`
- `app/components/admin/task-distribution/MapComponent.js`
- `app/components/MapDisplay.js`

## Perubahan Kode

### Sebelum:
```javascript
const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || 'YOUR_GOOGLE_MAPS_API_KEY_HERE';

if (apiKey === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
  console.warn('Google Maps API key not configured, using OpenStreetMap fallback');
  throw new Error('API key not configured');
}
```

### Sesudah:
```javascript
import { GOOGLE_MAPS_API_KEY } from '../../../../env-config';

const apiKey = GOOGLE_MAPS_API_KEY;

if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY_HERE') {
  console.warn('Google Maps API key not configured, using OpenStreetMap fallback');
  initializeOpenStreetMap();
  return;
}
```

## Hasil
- Error "API key not configured" sudah teratasi
- Aplikasi akan menggunakan Google Maps jika API key tersedia
- Aplikasi akan fallback ke OpenStreetMap jika Google Maps tidak tersedia
- Tidak ada lagi error yang menghentikan aplikasi

## Catatan
- API key yang digunakan adalah API key Firebase yang juga mendukung Google Maps
- Fallback ke OpenStreetMap memastikan aplikasi tetap berfungsi meskipun Google Maps tidak tersedia
- Semua komponen map sekarang menggunakan konfigurasi yang konsisten
