# 🚨 SOLUSI ERROR UPLOAD FOTO

## 📋 **ANALISIS ERROR:**

Dari console log yang terlihat, masalah utamanya adalah:

```
❌ POST http://localhost:3000/api/upload-photo 500 (Internal Server Error)
🔍 Error code: storage/unknown
🔍 Error message: Firebase Storage: An unknown error occurred
```

## 🔍 **ROOT CAUSE:**

**Firebase Storage Rules belum di-deploy ke Firebase Console!**

- ✅ Rules sudah diperbaiki di file `storage.rules` (lokal)
- ❌ Rules belum di-deploy ke Firebase Console (remote)
- 🔒 Firebase Storage masih menggunakan rules lama yang menolak upload

## 🚀 **SOLUSI UTAMA: Deploy Firebase Storage Rules**

### **Langkah 1: Buka Firebase Console**
1. Buka [Firebase Console](https://console.firebase.google.com)
2. Pilih project: **`aplikasi-survei-lampu-jalan`**
3. Klik **Storage** di sidebar kiri

### **Langkah 2: Update Rules**
1. Klik tab **Rules**
2. **HAPUS SEMUA** rules yang lama
3. **COPY-PASTE** rules baru dari file `storage.rules`:

```javascript
rules_version = '2';

// Firebase Storage Rules untuk aplikasi survei cahaya
service firebase.storage {
  match /b/{bucket}/o {
    // Rules untuk folder kmz dan semua subfolder - mengizinkan upload dan download
    match /kmz/{allPaths=**} {
      // Izinkan read untuk semua user
      allow read: if true;
      
      // Izinkan write untuk admin atau user yang terautentikasi
      allow write: if request.auth != null 
                   || request.auth.token.admin == true
                   || request.auth.token.role == 'admin';
    }
    
    // Rules untuk folder Survey Existing - mengizinkan upload foto survey
    match /Survey Existing/{userId}/{docId}/{fileName} {
      allow read: if true; // Siapa saja bisa lihat foto
      allow write: if request.auth != null 
                   && request.auth.uid == userId; // Hanya user yang bersangkutan yang bisa upload
    }
    
    // Rules untuk folder survey lainnya - mengizinkan upload foto survey
    match /Survey {surveyType}/{userId}/{docId}/{fileName} {
      allow read: if true; // Siapa saja bisa lihat foto
      allow write: if request.auth != null 
                   && request.auth.uid == userId; // Hanya user yang bersangkutan yang bisa upload
    }
    
    // Rules untuk folder test - hanya untuk testing
    match /test/{allPaths=**} {
      allow read, write: if true;
    }
    
    // Rules untuk folder lain - deny by default
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

### **Langkah 3: Deploy Rules**
1. Klik tombol **"Publish"** (biru)
2. Tunggu sampai muncul pesan "Rules published successfully"
3. **RESTART** aplikasi: `npm run dev`

## 🧪 **VERIFIKASI SOLUSI:**

### **Test 1: Cek Rules di Console**
- Rules harus menampilkan folder `Survey Existing` dan `Survey {surveyType}`
- Pastikan tidak ada rules lama yang masih aktif

### **Test 2: Jalankan Test Script**
1. Buka browser console
2. Copy-paste isi file `test-firebase-connection.js`
3. Jalankan untuk memverifikasi koneksi

### **Test 3: Upload Foto**
1. Login dengan user yang valid
2. Buka halaman Survey Existing
3. Coba upload foto
4. Cek console untuk error messages

## 📝 **TROUBLESHOOTING:**

### **Jika Rules Gagal Deploy:**
1. Pastikan syntax JavaScript valid
2. Hapus semua rules lama terlebih dahulu
3. Copy-paste rules baru secara utuh
4. Klik "Publish" dan tunggu konfirmasi

### **Jika Masih Error `storage/unknown`:**
1. Pastikan rules sudah di-deploy (cek timestamp di Firebase Console)
2. Restart aplikasi setelah deploy rules
3. Clear browser cache dan cookies
4. Login ulang dengan user yang valid

### **Jika Error Berubah:**
- **`storage/unauthorized`**: Rules sudah di-deploy tapi ada masalah permission
- **`storage/quota-exceeded`**: Storage quota penuh
- **`storage/network-request-failed`**: Masalah koneksi internet

## 🎯 **EXPECTED RESULT SETELAH DEPLOY:**

✅ **Upload foto berhasil** ke folder "Survey Existing"  
✅ **Error `storage/unknown` hilang**  
✅ **Error 500 Internal Server Error hilang**  
✅ **Permission errors** ditangani dengan proper error messages  
✅ **User hanya bisa upload** ke folder miliknya sendiri  

## ⏰ **WAKTU DEPLOY:**

- **Deploy Rules**: 1-2 menit
- **Restart Aplikasi**: 30 detik
- **Test Upload**: 1-2 menit
- **Total**: ~5 menit

## 🚨 **PENTING:**

**Rules HARUS di-deploy ke Firebase Console, bukan hanya diubah di file lokal!**

File `storage.rules` hanya berisi konfigurasi lokal, sedangkan Firebase Console menggunakan rules yang sudah di-deploy.

## 📁 **FILES YANG SUDAH DIPERBAIKI:**

- ✅ `storage.rules` - Firebase Storage Rules yang benar
- ✅ `app/api/upload-photo/route.js` - API route yang robust
- ✅ `app/lib/photoUpload.js` - Client-side upload logic
- ✅ `deploy-firebase-rules.md` - Panduan deploy rules
- ✅ `test-firebase-connection.js` - Test script untuk verifikasi

## 🔄 **NEXT STEPS:**

1. **Deploy Firebase Storage Rules** (WAJIB!)
2. **Restart aplikasi**
3. **Test upload foto**
4. **Verifikasi error hilang**
5. **Hapus file test yang tidak diperlukan**
