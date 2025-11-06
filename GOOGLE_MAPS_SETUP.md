# Google Maps Setup Guide

## Overview
Aplikasi ini telah diupgrade untuk menggunakan Google Maps sebagai pengganti Leaflet. Google Maps memberikan pengalaman yang lebih baik dengan fitur hybrid view (satelit + jalan) dan integrasi yang lebih smooth untuk file KMZ.

## Fitur Utama
- ✅ Google Maps dengan hybrid view (satelit + jalan)
- ✅ Fallback otomatis ke OpenStreetMap jika Google Maps tidak tersedia
- ✅ Support penuh untuk file KMZ (koordinat, polygon, polyline)
- ✅ Info windows interaktif untuk setiap elemen peta
- ✅ Auto-fit bounds untuk menampilkan semua data KMZ
- ✅ Responsive design

## Setup Google Maps API Key

### 1. Dapatkan Google Maps API Key

1. Buka [Google Cloud Console](https://console.cloud.google.com/)
2. Buat project baru atau pilih project yang sudah ada
3. Aktifkan Google Maps JavaScript API:
   - Pergi ke "APIs & Services" > "Library"
   - Cari "Maps JavaScript API"
   - Klik "Enable"

4. Buat API Key:
   - Pergi ke "APIs & Services" > "Credentials"
   - Klik "Create Credentials" > "API Key"
   - Copy API key yang dihasilkan

### 2. Konfigurasi API Key (Opsional tapi Direkomendasikan)

Untuk keamanan, batasi penggunaan API key:

1. Di halaman Credentials, klik API key yang baru dibuat
2. Pada bagian "Application restrictions":
   - Pilih "HTTP referrers (web sites)"
   - Tambahkan domain aplikasi Anda, contoh:
     - `http://localhost:3000/*` (untuk development)
     - `https://yourdomain.com/*` (untuk production)

3. Pada bagian "API restrictions":
   - Pilih "Restrict key"
   - Pilih "Maps JavaScript API"

### 3. Setup Environment Variable

Tambahkan API key ke file `.env.local`:

```bash
# Google Maps API Key - Replace with your actual API key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_actual_api_key_here
```

**PENTING:** Ganti `your_actual_api_key_here` dengan API key yang sebenarnya dari Google Cloud Console.

### 4. Restart Development Server

Setelah menambahkan API key, restart development server:

```bash
npm run dev
```

## Fallback System

Jika Google Maps API key tidak dikonfigurasi atau terjadi error, aplikasi akan otomatis menggunakan OpenStreetMap dengan Leaflet sebagai fallback. Ini memastikan peta tetap berfungsi dalam kondisi apapun.

## Komponen yang Diupdate

1. **MapDisplay.js** - Komponen utama untuk menampilkan peta dengan data KMZ
2. **KMZMapComponent.js** - Komponen khusus untuk preview KMZ di admin panel
3. **MapComponent.js** - Komponen map generik untuk task distribution

## Testing

Untuk menguji implementasi:

1. Upload file KMZ melalui admin panel
2. Pastikan peta muncul dengan benar (Google Maps atau OpenStreetMap)
3. Klik pada marker, polygon, atau polyline untuk melihat info window
4. Pastikan peta auto-fit untuk menampilkan semua data KMZ

## Troubleshooting

### Peta Tidak Muncul
- Pastikan API key sudah dikonfigurasi dengan benar di `.env.local`
- Cek console browser untuk error messages
- Pastikan domain sudah ditambahkan ke API key restrictions

### Error "RefererNotAllowedMapError"
- Tambahkan domain aplikasi ke HTTP referrers di Google Cloud Console
- Untuk development, tambahkan `http://localhost:3000/*`

### Fallback ke OpenStreetMap
- Ini normal jika API key belum dikonfigurasi
- OpenStreetMap akan digunakan sebagai backup dan tetap mendukung semua fitur KMZ

## Biaya

Google Maps JavaScript API memiliki free tier yang cukup generous:
- 28,000 map loads per bulan gratis
- Setelah itu, $7 per 1000 map loads

Untuk aplikasi internal atau dengan traffic rendah, kemungkinan besar akan tetap dalam free tier.

## Support

Jika mengalami masalah dengan setup Google Maps, silakan:
1. Cek dokumentasi resmi [Google Maps JavaScript API](https://developers.google.com/maps/documentation/javascript)
2. Pastikan semua langkah setup sudah diikuti dengan benar
3. Cek console browser untuk error messages yang spesifik