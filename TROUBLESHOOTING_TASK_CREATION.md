# Troubleshooting: Masalah Pembuatan Tugas Stuck

## Gejala
- Tombol "Membuat Tugas..." stuck dalam loading state
- File KMZ/KML berhasil dipilih dan diparse
- Preview peta berfungsi normal
- Proses tidak selesai setelah klik tombol

## Penyebab Umum

### 1. Masalah Koneksi Firebase Storage
**Gejala**: Error saat upload file
**Solusi**:
- Periksa koneksi internet
- Verifikasi konfigurasi Firebase Storage
- Periksa permission Firebase Storage

### 2. Masalah API Endpoint
**Gejala**: Request timeout atau error 500
**Solusi**:
- Periksa console browser untuk error
- Verifikasi endpoint `/api/task-assignments` berfungsi
- Periksa log server

### 3. Masalah Data Validation
**Gejala**: Error validasi di server
**Solusi**:
- Periksa semua field required terisi
- Verifikasi format data yang dikirim

## Langkah Troubleshooting

### 1. Periksa Console Browser
```javascript
// Buka Developer Tools (F12)
// Lihat tab Console untuk error messages
// Cari log yang dimulai dengan emoji:
// 🚀 Memulai proses pembuatan tugas...
// ✅ Validasi input berhasil
// ✅ Validasi file berhasil
// 🧪 Testing API connection...
// 📤 Mulai upload file...
// 📡 API Response status:
```

### 2. Test API Connection
```javascript
// Buka browser console dan jalankan:
fetch('/api/test-task-creation', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ test: 'data' })
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

### 3. Test Firebase Storage
```javascript
// Di console browser:
import { storage } from './lib/firebase';
import { ref, uploadBytes } from 'firebase/storage';

const testRef = ref(storage, 'test/test.txt');
const testBlob = new Blob(['test'], { type: 'text/plain' });
uploadBytes(testRef, testBlob)
  .then(() => console.log('Storage OK'))
  .catch(console.error);
```

### 4. Periksa Network Tab
- Buka Developer Tools > Network
- Coba buat tugas
- Lihat request ke `/api/task-assignments`
- Periksa status code dan response

## Solusi yang Sudah Diterapkan

### 1. Enhanced Error Handling
- Logging detail di setiap langkah
- Error handling untuk upload file
- Timeout untuk API request (30 detik)
- Validasi koneksi API sebelum upload

### 2. User Feedback
- Tombol "Batalkan" saat loading
- Pesan error yang lebih informatif
- Progress indicator yang jelas

### 3. Debugging Tools
- Test endpoint `/api/test-task-creation`
- Console logging dengan emoji untuk mudah dibaca
- Validasi data sebelum kirim ke API

## Cara Menggunakan

### 1. Jika Masih Stuck
1. Klik tombol "Batalkan" untuk reset loading state
2. Periksa console browser untuk error
3. Coba lagi dengan file yang lebih kecil
4. Periksa koneksi internet

### 2. Jika Error Upload File
1. Periksa ukuran file (max 10MB)
2. Verifikasi format file (.kmz, .kml, .xlsx, .xls, .csv)
3. Coba file yang berbeda

### 3. Jika Error API
1. Refresh halaman
2. Periksa koneksi internet
3. Coba di browser berbeda
4. Periksa log server

## Log Messages yang Harus Muncul

### Sukses:
```
🚀 Memulai proses pembuatan tugas...
✅ Validasi input berhasil
✅ Validasi file berhasil
🧪 Testing API connection...
✅ API connection test passed
📤 Mulai upload file...
📤 Uploading KMZ file...
📁 Upload ke path: kmz/2024-01-01/existing_2024-01-01T00-00-00-000Z_file.kmz
✅ File berhasil diupload: existing_2024-01-01T00-00-00-000Z_file.kmz
🔗 Download URL: https://...
👤 Surveyor selected: Nama Surveyor
📤 Mengirim data tugas ke API: {...}
📡 API Response status: 200
📡 API Response data: {...}
✅ Tugas berhasil dibuat: {...}
🏁 Proses pembuatan tugas selesai
```

### Error:
```
❌ Error uploading kmz file: Error message
❌ API test failed: Error message
❌ API Error: 500 Error message
❌ Error creating task: Error message
```

## Contact Support

Jika masalah masih berlanjut:
1. Screenshot console browser
2. Screenshot error message
3. Informasi browser dan OS
4. File yang dicoba upload (jika tidak sensitif)
