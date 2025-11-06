# Panduan Deployment Firebase Storage Rules

## Masalah
Error "Tidak memiliki izin untuk upload file. Periksa Firebase Storage Rules" terjadi karena Firebase Storage Rules tidak dikonfigurasi dengan benar.

## Solusi

### 1. Deploy Firebase Storage Rules

Jalankan perintah berikut di terminal:

```bash
# Install Firebase CLI jika belum
npm install -g firebase-tools

# Login ke Firebase
firebase login

# Deploy storage rules
firebase deploy --only storage
```

### 2. Alternatif: Deploy via Firebase Console

1. Buka [Firebase Console](https://console.firebase.google.com)
2. Pilih project `aplikasi-survei-lampu-jalan`
3. Buka menu **Storage** di sidebar
4. Klik tab **Rules**
5. Copy dan paste isi file `storage.rules`
6. Klik **Publish**

### 3. Verifikasi Rules

Setelah deploy, rules akan terlihat seperti ini:

```javascript
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    // Rules untuk folder kmz - mengizinkan upload dan download
    match /kmz/{allPaths=**} {
      // Izinkan read untuk semua user
      allow read: if true;
      
      // Izinkan write untuk admin atau user yang terautentikasi
      allow write: if request.auth != null 
                   || request.auth.token.admin == true
                   || request.auth.token.role == 'admin';
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

### 4. Test Upload

Setelah deploy rules, test upload file KMZ:

1. Buka aplikasi di browser
2. Masuk ke menu **Database Propose**
3. Klik **+ Tambah Data**
4. Upload file KMZ
5. Pastikan tidak ada error permission

### 5. Troubleshooting

Jika masih ada error:

1. **Cek Firebase Console**: Pastikan rules sudah ter-deploy
2. **Cek Network Tab**: Lihat response dari API upload
3. **Cek Console Log**: Lihat error di browser console
4. **Test Storage Connection**: Akses `/api/test-storage` untuk test koneksi

### 6. Environment Variables

Pastikan environment variables Firebase sudah dikonfigurasi:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=aplikasi-survei-lampu-jalan
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=aplikasi-survei-lampu-jalan.firebasestorage.app
```

## Catatan Penting

- Firebase Admin SDK digunakan untuk bypass client-side rules
- Signed URLs digunakan untuk akses publik ke file
- File KMZ disimpan di folder `kmz/` dengan timestamp
- Maksimal ukuran file: 50MB
- Hanya file dengan ekstensi `.kmz` yang diperbolehkan 