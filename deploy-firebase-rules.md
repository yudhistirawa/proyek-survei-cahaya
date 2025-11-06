# 🚀 Deploy Firebase Storage Rules

## ⚠️ **MASALAH UTAMA:**
Firebase Storage Rules belum di-deploy ke Firebase Console, sehingga upload foto masih ditolak dengan error `storage/unknown`.

## 🔧 **SOLUSI: Deploy Rules ke Firebase Console**

### **Langkah 1: Buka Firebase Console**
1. Buka [Firebase Console](https://console.firebase.google.com)
2. Pilih project: **`aplikasi-survei-lampu-jalan`**
3. Klik **Storage** di sidebar kiri

### **Langkah 2: Update Rules**
1. Klik tab **Rules**
2. **HAPUS** semua rules yang lama
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

## 🔍 **Verifikasi Rules Sudah Deploy:**

### **Test 1: Cek Rules di Console**
- Rules harus menampilkan folder `Survey Existing` dan `Survey {surveyType}`
- Pastikan tidak ada rules lama yang masih aktif

### **Test 2: Cek API Response**
Setelah deploy rules, API harus mengembalikan error yang lebih spesifik, bukan `storage/unknown`.

## 📝 **Troubleshooting:**

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

## 🎯 **Expected Result Setelah Deploy:**

✅ **Upload foto berhasil** ke folder "Survey Existing"  
✅ **Error `storage/unknown` hilang**  
✅ **Permission errors** ditangani dengan proper error messages  
✅ **User hanya bisa upload** ke folder miliknya sendiri  

## ⏰ **Waktu Deploy:**
- **Deploy Rules**: 1-2 menit
- **Restart Aplikasi**: 30 detik
- **Test Upload**: 1-2 menit
- **Total**: ~5 menit

## 🚨 **PENTING:**
**Rules HARUS di-deploy ke Firebase Console, bukan hanya diubah di file lokal!**
