# Fitur Pengambilan Foto Mobile dengan Watermark

## 📸 Overview

Fitur ini memungkinkan pengguna untuk mengambil foto langsung dari aplikasi kamera mobile dengan watermark otomatis yang berisi:
- Nama petugas
- Tanggal dan jam pengambilan
- Koordinat GPS
- Nama jalan (jika tersedia)

## 🚀 Fitur Utama

### 1. Pengambilan Foto Langsung
- **Kamera Native**: Menggunakan aplikasi kamera bawaan perangkat
- **Galeri**: Pilihan untuk memilih foto dari galeri
- **Fallback Web**: Jika Capacitor tidak tersedia, menggunakan file input browser

### 2. Watermark Otomatis
- **Informasi Petugas**: Nama petugas yang melakukan survei
- **Timestamp**: Tanggal dan jam pengambilan foto
- **GPS Coordinates**: Koordinat lokasi dengan presisi tinggi
- **Street Name**: Nama jalan (diambil dari OpenStreetMap API)

### 3. Optimasi Gambar
- **Resize Otomatis**: Gambar di-resize ke maksimal 1920x1080
- **Format WebP**: Konversi ke format WebP untuk ukuran file yang lebih kecil
- **Kualitas Tinggi**: Kualitas 90% untuk hasil yang optimal

## 🛠️ Implementasi Teknis

### Komponen Utama
- `MobileCameraCapture.js`: Komponen utama untuk pengambilan foto
- `SurveyARMPage.js`: Halaman survey ARM yang menggunakan fitur ini
- `SurveyExistingPage.js`: Halaman survey existing yang menggunakan fitur ini

### Dependencies
```json
{
  "@capacitor/camera": "^7.0.0",
  "@capacitor/core": "^7.4.0",
  "@capacitor/android": "^7.4.0"
}
```

### Permissions Android
```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
```

## 📱 Cara Penggunaan

### 1. Buka Halaman Survey
- Survey ARM: `/survey-arm`
- Survey Existing: `/survey-existing`

### 2. Ambil Foto
- Tap tombol "Tap untuk ambil foto" pada field foto yang diinginkan
- Modal kamera akan muncul dengan opsi:
  - **Ambil Foto dengan Kamera**: Buka aplikasi kamera
  - **Pilih dari Galeri**: Pilih foto dari galeri

### 3. Proses Otomatis
- Foto akan otomatis ditambahkan watermark
- Koordinat GPS akan diambil secara otomatis
- Nama jalan akan dicari dari OpenStreetMap

### 4. Preview dan Simpan
- Preview foto dengan watermark
- Opsi untuk ambil ulang atau simpan
- Foto akan disimpan ke form survey

## 🎨 Watermark Design

### Posisi
- **Lokasi**: Bottom-right corner
- **Padding**: 20px dari tepi
- **Background**: Semi-transparent black (70% opacity)

### Style
- **Font**: Arial Bold
- **Size**: Responsive (3% dari ukuran gambar minimum)
- **Color**: White text dengan black stroke
- **Line Height**: 1.3x font size

### Informasi yang Ditampilkan
```
Petugas: [Nama Petugas]
[DD/MM/YYYY] [HH:MM:SS]
GPS: [Latitude], [Longitude]
[Nama Jalan, Kota]
```

## 🔧 Konfigurasi

### Capacitor Config
```json
{
  "plugins": {
    "Camera": {
      "permissions": ["camera", "photos"]
    },
    "Geolocation": {
      "permissions": ["location"]
    }
  }
}
```

### Environment Variables
- Tidak diperlukan environment variables khusus
- Menggunakan OpenStreetMap API untuk reverse geocoding

## 🐛 Troubleshooting

### Masalah Umum

#### 1. Kamera Tidak Buka
- **Penyebab**: Permission kamera belum diberikan
- **Solusi**: Pastikan aplikasi memiliki izin kamera di pengaturan

#### 2. GPS Tidak Berfungsi
- **Penyebab**: GPS tidak aktif atau permission lokasi belum diberikan
- **Solusi**: Aktifkan GPS dan berikan izin lokasi

#### 3. Watermark Tidak Muncul
- **Penyebab**: Error dalam proses canvas
- **Solusi**: Refresh halaman dan coba lagi

#### 4. Foto Terlalu Besar
- **Penyebab**: Gambar asli sangat besar
- **Solusi**: Foto akan otomatis di-resize ke ukuran optimal

### Debug Mode
```javascript
// Tambahkan di console untuk debug
console.log('Camera Plugin:', window.Capacitor?.Plugins?.Camera);
console.log('Location:', navigator.geolocation);
```

## 📊 Performance

### Optimasi
- **Image Resizing**: Otomatis resize untuk performa upload
- **WebP Format**: Ukuran file 30-50% lebih kecil dari JPEG
- **Lazy Loading**: Watermark hanya diproses saat diperlukan

### Metrics
- **Upload Time**: ~2-5 detik per foto
- **File Size**: 100KB - 500KB (tergantung resolusi)
- **Watermark Processing**: ~1-2 detik

## 🔮 Future Enhancements

### Planned Features
1. **Multiple Photo Upload**: Upload beberapa foto sekaligus
2. **Photo Editing**: Crop dan filter foto sebelum watermark
3. **Offline Mode**: Simpan foto lokal jika tidak ada internet
4. **Custom Watermark**: Template watermark yang dapat dikustomisasi
5. **Batch Processing**: Proses watermark untuk multiple foto

### Performance Improvements
1. **Web Workers**: Proses watermark di background thread
2. **Image Compression**: Kompresi lebih agresif untuk upload cepat
3. **Caching**: Cache hasil reverse geocoding
4. **Progressive Loading**: Load watermark secara bertahap

## 📞 Support

Untuk masalah atau pertanyaan terkait fitur ini:
1. Check console untuk error messages
2. Verify permissions di pengaturan aplikasi
3. Test pada device fisik (bukan emulator)
4. Report bugs dengan device specifications

---

**Status**: ✅ **Production Ready**  
**Last Updated**: December 2024  
**Version**: 1.0.0
