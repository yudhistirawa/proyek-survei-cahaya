# Panduan Testing Sistem Pembuatan Tugas

## Langkah Testing

### 1. Test API Connection
Buka browser console (F12) dan jalankan:
```javascript
fetch('/api/test-task-creation', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ test: 'data' })
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

**Expected Result**: `{success: true, message: "Test POST berhasil", ...}`

### 2. Test Task Creation (Tanpa File)
1. Buka modal "Buat Tugas Zona Existing"
2. Isi form:
   - Judul: "Test Task"
   - Surveyor: Pilih surveyor yang tersedia
   - Deskripsi: "Ini adalah tugas test"
3. Klik tombol "Test Tanpa File"
4. Periksa console browser untuk log

**Expected Result**: Alert "✅ Test berhasil! Tugas test berhasil dibuat."

### 3. Test Task Creation (Dengan File)
1. Buka modal "Buat Tugas Zona Existing"
2. Isi form lengkap
3. Upload file KMZ/KML
4. Klik "Buat Tugas"
5. Periksa console browser

## Log Messages yang Harus Muncul

### Di Browser Console:
```
🚀 Memulai proses pembuatan tugas...
✅ Validasi input berhasil
✅ Validasi file berhasil
🧪 Testing API connection...
✅ API connection test passed
🔄 Skip file upload untuk testing...
👤 Surveyor selected: [Nama Surveyor]
📤 Mengirim data tugas ke API (tanpa file): {...}
🚀 Mulai kirim request ke API...
📡 Sending POST request to /api/task-assignments...
📡 API Response status: 200
📡 API Response headers: {...}
📡 Parsing response JSON...
📡 API Response data: {...}
✅ Tugas berhasil dibuat: {...}
🏁 Proses pembuatan tugas selesai
```

### Di Terminal Server:
```
🚀 POST /api/task-assignments dipanggil
📥 Request headers: {...}
📥 Request body: {...}
✅ Validasi data berhasil
👤 Mencari surveyor dengan ID: [surveyor_id]
✅ Surveyor ditemukan: [Nama Surveyor]
💾 Menyimpan tugas ke database...
✅ Tugas berhasil dibuat dengan ID: [task_id]
📢 Mengirim notifikasi ke surveyor...
✅ Notifikasi berhasil dibuat untuk surveyor: [Nama Surveyor]
✅ Notifikasi berhasil dikirim
📤 Mengirim response: {...}
```

## Troubleshooting

### Jika Test API Gagal:
- Periksa koneksi internet
- Restart development server
- Periksa log terminal

### Jika Test Tanpa File Gagal:
- Periksa console browser untuk error
- Periksa log terminal server
- Verifikasi surveyor ID valid

### Jika Test Dengan File Gagal:
- Periksa ukuran file (max 10MB)
- Verifikasi format file (.kmz, .kml)
- Periksa Firebase Storage configuration

## Verifikasi Tugas Terkirim

### 1. Periksa Database
- Buka Firebase Console
- Lihat collection `task_assignments`
- Verifikasi tugas baru muncul

### 2. Periksa Notifikasi
- Login sebagai surveyor
- Periksa notifikasi di dashboard
- Verifikasi notifikasi tugas baru

### 3. Periksa Daftar Tugas
- Login sebagai surveyor
- Buka halaman "Daftar Tugas"
- Verifikasi tugas baru muncul

## Common Issues

### 1. "Surveyor tidak ditemukan"
- Periksa surveyor ID di database
- Pastikan surveyor sudah terdaftar
- Verifikasi role surveyor

### 2. "Firebase Storage tidak tersedia"
- Periksa konfigurasi Firebase
- Verifikasi storage bucket
- Periksa permission

### 3. "Request timeout"
- Periksa koneksi internet
- Restart development server
- Periksa log server

## Success Criteria

✅ API test berhasil  
✅ Test tanpa file berhasil  
✅ Test dengan file berhasil  
✅ Tugas tersimpan di database  
✅ Notifikasi terkirim ke surveyor  
✅ Tugas muncul di daftar surveyor  
✅ Detail tugas dapat dibuka  

Jika semua criteria terpenuhi, sistem pembuatan tugas berfungsi dengan baik! 🎉
