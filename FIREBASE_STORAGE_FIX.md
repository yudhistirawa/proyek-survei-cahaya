# 🔧 Panduan Perbaikan Firebase Storage Error

## 🚨 **Masalah yang Ditemui:**
```
Error: "Tidak memiliki izin untuk upload file. Periksa Firebase Storage Rules."
```

## 🔍 **Diagnosis Masalah:**

### 1. **Firebase Storage Rules Belum Diupdate**
- Anda sudah mengupdate **Firestore Database Rules** ✅
- Tetapi **Firebase Storage Rules** belum diupdate ❌

### 2. **Konfigurasi Environment Variables**
- File `.env.local` berisi Firebase Admin SDK credentials
- Aplikasi membutuhkan Firebase Client SDK credentials

## 🛠️ **Langkah-langkah Perbaikan:**

### **Step 1: Update Firebase Storage Rules**

1. **Buka Firebase Console:**
   ```
   https://console.firebase.google.com
   ```

2. **Pilih Project:**
   ```
   aplikasi-survei-lampu-jalan
   ```

3. **Klik Storage:**
   - Di sidebar kiri, klik **"Storage"**
   - Jika belum ada bucket, klik **"Get started"**

4. **Update Rules:**
   - Klik tab **"Rules"**
   - Ganti dengan rules berikut:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Izinkan upload file KMZ ke folder kmz
    match /kmz/{allPaths=**} {
      allow read, write: if true; // Untuk testing - izinkan semua akses
    }
    
    // Izinkan test files
    match /test/{allPaths=**} {
      allow read, write: if true; // Untuk testing
    }
    
    // Default rule - deny all
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

5. **Klik "Publish"** untuk menyimpan perubahan

### **Step 2: Update Environment Variables**

**Tambahkan ke file `.env.local`:**

```bash
# Firebase Client SDK (untuk client-side)
NEXT_PUBLIC_FIREBASE_API_KEY="AIzaSyBHk6Zg35hLFRbuLW_dwHSpJ3-EQ2kGhQ8"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="aplikasi-survei-lampu-jalan.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="aplikasi-survei-lampu-jalan"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="aplikasi-survei-lampu-jalan.firebasestorage.app"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="231759165437"
NEXT_PUBLIC_FIREBASE_APP_ID="1:231759165437:web:8dafd8ffff8294c97f4b94"
```

### **Step 3: Restart Server**

```bash
# Stop server (Ctrl+C)
# Kemudian jalankan lagi:
npm run dev
```

### **Step 4: Test API Endpoints**

1. **Test Basic Server:**
   ```
   http://localhost:3002/api/test
   ```

2. **Test Firebase Storage:**
   ```
   http://localhost:3002/api/test-firebase
   ```

3. **Test Upload Endpoint:**
   ```
   http://localhost:3002/api/test-upload
   ```

## 🔍 **Debugging Steps:**

### **Jika Masih Error:**

1. **Cek Firebase Console:**
   - Buka Storage → Rules
   - Pastikan rules sudah di-publish
   - Cek apakah ada error di console

2. **Cek Server Logs:**
   ```bash
   npm run dev
   ```
   Lihat console log untuk error messages

3. **Cek Browser Console:**
   - Buka Developer Tools (F12)
   - Upload file KMZ
   - Lihat error messages

4. **Test Manual:**
   ```bash
   curl http://localhost:3002/api/test-firebase
   ```

## 📋 **Checklist Perbaikan:**

- [ ] Firebase Storage Rules sudah diupdate
- [ ] Rules sudah di-publish
- [ ] Environment variables sudah ditambahkan
- [ ] Server sudah di-restart
- [ ] API test berhasil
- [ ] Upload KMZ berhasil

## 🚨 **Common Issues:**

| Issue | Solution |
|-------|----------|
| `storage/unauthorized` | Update Firebase Storage Rules |
| `storage/unauthenticated` | Periksa Firebase config |
| `storage/quota-exceeded` | File terlalu besar |
| `storage/network-request-failed` | Cek koneksi internet |

## 🔐 **Keamanan (Untuk Production):**

Setelah testing berhasil, update rules untuk production:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /kmz/{allPaths=**} {
      allow read, write: if request.auth != null; // Hanya user yang login
    }
  }
}
```

## 📞 **Support:**

Jika masih error:
1. Cek Firebase Console logs
2. Cek server logs di terminal
3. Cek browser console logs
4. Test dengan file KMZ yang berbeda
5. Restart server dan browser

---

**Setelah mengikuti panduan ini, upload KMZ seharusnya berhasil!** 🎉 