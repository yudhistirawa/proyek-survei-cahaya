# Perbaikan Error Upload File KMZ

## Masalah
Error "Tidak memiliki izin untuk upload file. Periksa Firebase Storage Rules" terjadi saat mencoba upload file KMZ di menu Database Propose.

## Penyebab
1. Firebase Storage Rules tidak dikonfigurasi dengan benar
2. Menggunakan Firebase Client SDK yang terbatas oleh rules
3. Tidak ada error handling yang memadai

## Solusi yang Telah Diterapkan

### 1. Menggunakan Firebase Admin SDK
- **File**: `app/api/database-propose/upload/route.js`
- **Perubahan**: Menggunakan Firebase Admin SDK untuk bypass client-side rules
- **Keuntungan**: Admin SDK memiliki permission penuh untuk upload file

### 2. Memperbaiki Error Handling
- **File**: `app/components/admin/database-propose/DatabasePropose.js`
- **Perubahan**: Menambahkan error handling yang lebih informatif
- **Fitur**: Test koneksi storage sebelum upload

### 3. Firebase Storage Rules
- **File**: `storage.rules`
- **Isi**: Rules yang mengizinkan upload file KMZ ke folder `kmz/`
- **Keamanan**: Hanya mengizinkan file KMZ dan membatasi ukuran

### 4. Test Endpoint
- **File**: `app/api/test-storage/route.js`
- **Fungsi**: Test koneksi Firebase Storage Admin
- **URL**: `/api/test-storage`

## Langkah Deployment

### Opsi 1: Menggunakan Script Otomatis
```bash
npm run deploy:firebase
```

### Opsi 2: Manual Deployment
```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login ke Firebase
firebase login

# Deploy storage rules
firebase deploy --only storage
```

### Opsi 3: Via Firebase Console
1. Buka [Firebase Console](https://console.firebase.google.com)
2. Pilih project `aplikasi-survei-lampu-jalan`
3. Buka menu **Storage** → **Rules**
4. Copy isi file `storage.rules`
5. Klik **Publish**

## Verifikasi Perbaikan

### 1. Test Storage Connection
```bash
curl http://localhost:3000/api/test-storage
```

### 2. Test Upload File KMZ
1. Buka aplikasi di browser
2. Masuk ke menu **Database Propose**
3. Klik **+ Tambah Data**
4. Upload file KMZ
5. Pastikan tidak ada error permission

### 3. Cek Firebase Console
1. Buka Firebase Console
2. Buka menu **Storage**
3. Pastikan file KMZ terupload di folder `kmz/`

## Troubleshooting

### Error: "Firebase Storage tidak dapat diakses"
- **Solusi**: Pastikan Firebase Admin SDK dikonfigurasi dengan benar
- **Cek**: File `app/lib/firebase-admin.js`

### Error: "Tidak memiliki izin"
- **Solusi**: Deploy Firebase Storage Rules
- **Cek**: File `storage.rules` dan `firebase.json`

### Error: "Kapasitas penyimpanan penuh"
- **Solusi**: Cek kapasitas Firebase Storage di console
- **Alternatif**: Hapus file lama yang tidak diperlukan

### Error: "Gagal terhubung ke server"
- **Solusi**: Cek koneksi internet
- **Cek**: Akses `/api/test-storage` untuk verifikasi

## File yang Dimodifikasi

1. **`app/api/database-propose/upload/route.js`**
   - Menggunakan Firebase Admin SDK
   - Menambahkan signed URL untuk akses publik
   - Error handling yang lebih baik

2. **`app/lib/firebase-admin.js`**
   - Konfigurasi Firebase Admin yang lebih robust
   - Test connection function
   - Error handling yang komprehensif

3. **`app/components/admin/database-propose/DatabasePropose.js`**
   - Test storage connection sebelum upload
   - Error messages yang lebih informatif
   - Better user feedback

4. **`storage.rules`** (Baru)
   - Rules untuk mengizinkan upload file KMZ
   - Keamanan yang tepat untuk folder `kmz/`

5. **`firebase.json`**
   - Menambahkan konfigurasi storage rules

6. **`deploy-firebase-rules.js`** (Baru)
   - Script otomatis untuk deploy rules

## Environment Variables

Pastikan environment variables berikut sudah dikonfigurasi:

```env
# Firebase Client SDK
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECT_ID=aplikasi-survei-lampu-jalan
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=aplikasi-survei-lampu-jalan.firebasestorage.app

# Firebase Admin SDK (Opsional)
FIREBASE_PROJECT_ID=aplikasi-survei-lampu-jalan
FIREBASE_CLIENT_EMAIL=your_service_account_email
FIREBASE_PRIVATE_KEY=your_private_key
FIREBASE_STORAGE_BUCKET=aplikasi-survei-lampu-jalan.firebasestorage.app
```

## Catatan Penting

- Firebase Admin SDK bypass client-side rules
- Signed URLs digunakan untuk akses publik ke file
- File KMZ disimpan dengan timestamp untuk menghindari konflik
- Maksimal ukuran file: 50MB
- Hanya file dengan ekstensi `.kmz` yang diperbolehkan
- Error handling yang komprehensif untuk user experience yang lebih baik 