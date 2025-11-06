# 🔧 Perbaikan Masalah Upload Foto Firebase

## 🚨 Masalah yang Ditemukan

Berdasarkan error log, masalah utama adalah:
1. **Firebase Storage bucket tidak konsisten** - ada perbedaan antara `appspot.com` dan `firebasestorage.app`
2. **Firebase Storage Rules mungkin terlalu ketat**
3. **Error handling yang kurang spesifik**

## ✅ Solusi yang Telah Diterapkan

### 1. Perbaikan Konfigurasi Firebase Storage Bucket
- Mengubah storage bucket dari `aplikasi-survei-lampu-jalan.appspot.com` ke `aplikasi-survei-lampu-jalan.firebasestorage.app`
- Memastikan konfigurasi konsisten di semua file

### 2. Perbaikan API Upload Foto
- File: `app/api/upload-photo/route.js`
- Menambahkan error handling yang lebih spesifik
- Menambahkan logging yang lebih detail
- Memperbaiki konfigurasi storage bucket

### 3. Firebase Storage Rules
- File: `firebase-storage-rules.rules`
- Rules yang mengizinkan upload untuk user yang terautentikasi
- Rules khusus untuk folder survei

### 4. API Test Koneksi
- File: `app/api/test-storage/route.js`
- Endpoint untuk test koneksi Firebase Storage
- Test upload, download, dan delete file

## 🚀 Langkah-langkah Deployment

### 1. Deploy Firebase Storage Rules
```bash
# Install Firebase CLI (jika belum)
npm install -g firebase-tools

# Login ke Firebase
firebase login

# Deploy storage rules
node deploy-firebase-rules.js
```

### 2. Test Koneksi Firebase Storage
```bash
# Test melalui browser
GET /api/test-storage

# Atau test API upload foto
GET /api/upload-photo
```

### 3. Restart Server
```bash
# Restart Next.js server
npm run dev
```

## 🔍 Troubleshooting

### Jika masih ada error "Failed to upload photo to Firebase Storage":

1. **Cek Firebase Console**
   - Buka [Firebase Console](https://console.firebase.google.com)
   - Pilih project `aplikasi-survei-lampu-jalan`
   - Buka Storage > Rules
   - Pastikan rules sudah ter-deploy

2. **Cek Environment Variables**
   - Pastikan file `.env.local` ada dengan konfigurasi yang benar
   - Restart server setelah mengubah environment variables

3. **Cek Firebase Storage Bucket**
   - Pastikan bucket `aplikasi-survei-lampu-jalan.firebasestorage.app` ada
   - Pastikan bucket tidak di-delete atau di-disable

4. **Test Koneksi**
   - Akses `/api/test-storage` untuk memastikan koneksi berfungsi
   - Cek console log untuk error detail

### Error Codes yang Umum:

- `storage/unauthorized`: Rules terlalu ketat
- `storage/quota-exceeded`: Storage penuh
- `storage/network-request-failed`: Masalah koneksi
- `storage/unknown`: Error tidak dikenal, cek konfigurasi

## 📱 Test di Aplikasi

1. Buka aplikasi mobile
2. Coba upload foto "Foto Tinggi ARM" atau "Foto Titik Aktual"
3. Cek console log untuk memastikan tidak ada error
4. Foto seharusnya berhasil diupload ke Firebase Storage

## 🔗 File yang Telah Diperbaiki

- `app/api/upload-photo/route.js` - API upload foto utama
- `app/api/test-storage/route.js` - API test koneksi
- `firebase-storage-rules.rules` - Firebase Storage Rules
- `firebase.json` - Konfigurasi Firebase
- `deploy-firebase-rules.js` - Script deploy rules

## 📞 Support

Jika masih ada masalah, cek:
1. Console log server untuk error detail
2. Firebase Console untuk status project
3. Network tab browser untuk response API
4. Firebase Storage Rules untuk permission
