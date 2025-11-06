# Panduan Setup Firebase Storage untuk Upload KMZ

## Masalah yang Ditemui
Error saat upload file KMZ ke Firebase Storage. Kemungkinan penyebab:
1. Firebase Storage Rules tidak mengizinkan upload
2. Konfigurasi Firebase tidak lengkap
3. Permissions tidak tepat

## Langkah-langkah Perbaikan

### 1. Setup Firebase Storage Rules

Buka Firebase Console (https://console.firebase.google.com) dan ikuti langkah berikut:

1. **Pilih project**: `aplikasi-survei-lampu-jalan`
2. **Klik "Storage"** di sidebar kiri
3. **Klik "Rules"** tab
4. **Ganti rules dengan yang berikut:**

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Izinkan upload file KMZ ke folder kmz
    match /kmz/{allPaths=**} {
      allow read, write: if true; // Untuk testing - izinkan semua akses
    }
    
    // Default rule - deny all
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

5. **Klik "Publish"** untuk menyimpan rules

### 2. Verifikasi Konfigurasi Firebase

Pastikan konfigurasi di `app/lib/firebase.js` sudah benar:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyBHk6Zg35hLFRbuLW_dwHSpJ3-EQ2kGhQ8",
  authDomain: "aplikasi-survei-lampu-jalan.firebaseapp.com",
  projectId: "aplikasi-survei-lampu-jalan",
  storageBucket: "aplikasi-survei-lampu-jalan.firebasestorage.app",
  messagingSenderId: "231759165437",
  appId: "1:231759165437:web:8dafd8ffff8294c97f4b94"
};
```

### 3. Test Koneksi Firebase Storage

1. **Jalankan server development:**
   ```bash
   npm run dev
   ```

2. **Test koneksi storage:**
   Buka browser dan akses: `http://localhost:3000/api/test-storage`

3. **Cek console log** untuk melihat detail error

### 4. Troubleshooting

#### Jika masih error, cek hal berikut:

1. **Firebase Storage sudah diaktifkan?**
   - Buka Firebase Console
   - Klik "Storage"
   - Jika belum ada, klik "Get Started"
   - Pilih location (misal: asia-southeast1)

2. **Cek Network tab di browser:**
   - Buka Developer Tools (F12)
   - Klik tab Network
   - Upload file KMZ
   - Lihat request ke `/api/database-propose/upload`
   - Cek response error

3. **Cek Console log:**
   - Buka Developer Tools (F12)
   - Klik tab Console
   - Upload file KMZ
   - Lihat error messages

### 5. Alternative Solution - Gunakan Public Storage

Jika masih bermasalah, bisa menggunakan Firebase Storage dengan public access:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read, write: if true; // WARNING: Ini tidak aman untuk production
    }
  }
}
```

### 6. Testing Upload KMZ

Setelah setup selesai:

1. **Buka aplikasi:** `http://localhost:3000`
2. **Navigasi ke Database Propose**
3. **Klik "Tambah Data"**
4. **Upload file KMZ** (pastikan file < 50MB)
5. **Isi form data**
6. **Simpan data**

### 7. Debugging Commands

Untuk debugging lebih lanjut, cek log di terminal:

```bash
# Lihat log server
npm run dev

# Test storage connection
curl http://localhost:3000/api/test-storage
```

### 8. Common Errors & Solutions

| Error | Solution |
|-------|----------|
| `storage/unauthorized` | Update Firebase Storage Rules |
| `storage/unauthenticated` | Enable anonymous auth atau login user |
| `storage/quota-exceeded` | Upgrade Firebase plan atau hapus file lama |
| `storage/network-request-failed` | Cek koneksi internet |

### 9. Production Considerations

Untuk production, gunakan rules yang lebih aman:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /kmz/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null 
                   && request.resource.size < 50 * 1024 * 1024
                   && request.resource.contentType.matches('application/vnd.google-earth.kmz');
    }
  }
}
```

## Support

Jika masih mengalami masalah, cek:
1. Firebase Console logs
2. Browser console logs
3. Network tab untuk request details
4. Firebase Storage documentation 