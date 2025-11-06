# Perbaikan Error "Firebase Storage tidak dapat diakses"

## Masalah
Error "Firebase Storage tidak dapat diakses" terjadi saat mencoba upload file KMZ, menyebabkan file tidak tersimpan di Firebase Storage dengan folder `kmz`.

## Penyebab
1. **Firebase Admin SDK tidak dikonfigurasi dengan benar** - Missing service account credentials
2. **Environment variables tidak diset** - FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
3. **Firebase Storage Rules belum di-deploy** - Tidak ada izin untuk write ke folder `kmz`
4. **Storage bucket tidak dapat diakses** - Konfigurasi bucket yang salah

## Solusi Lengkap

### 1. Buat Service Account di Firebase Console

1. Buka [Firebase Console](https://console.firebase.google.com/)
2. Pilih project `aplikasi-survei-lampu-jalan`
3. Klik **Project Settings** (ikon roda gigi di samping "Project Overview")
4. Pilih tab **Service accounts**
5. Klik **Generate new private key**
6. Download file JSON service account
7. Buka file JSON dan catat nilai-nilai berikut:
   - `project_id`
   - `client_email`
   - `private_key`
   - `storage_bucket`

### 2. Buat File .env.local

Buat file `.env.local` di root project (sejajar dengan `package.json`) dengan isi:

```env
# Firebase Admin SDK Configuration
FIREBASE_PROJECT_ID=aplikasi-survei-lampu-jalan
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@aplikasi-survei-lampu-jalan.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=aplikasi-survei-lampu-jalan.appspot.com

# Next.js Configuration
NEXT_PUBLIC_FIREBASE_PROJECT_ID=aplikasi-survei-lampu-jalan
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=aplikasi-survei-lampu-jalan.appspot.com
```

**Catatan Penting:**
- Ganti `firebase-adminsdk-xxxxx@aplikasi-survei-lampu-jalan.iam.gserviceaccount.com` dengan `client_email` dari file JSON
- Ganti `YOUR_PRIVATE_KEY_HERE` dengan `private_key` dari file JSON
- Pastikan `private_key` menggunakan format yang benar dengan `\n`
- Ganti `aplikasi-survei-lampu-jalan.appspot.com` dengan `storage_bucket` dari file JSON

### 3. Deploy Firebase Storage Rules

Jalankan perintah berikut untuk deploy storage rules:

```bash
npm run firebase:rules
```

Atau:

```bash
firebase deploy --only storage
```

### 4. Restart Development Server

```bash
npm run dev
```

### 5. Test Konfigurasi Firebase

Jalankan endpoint test untuk memverifikasi konfigurasi:

```bash
curl http://localhost:3003/api/test-firebase-config
```

Atau buka di browser:
```
http://localhost:3003/api/test-firebase-config
```

### 6. Test Upload File KMZ

1. Buka aplikasi di browser (http://localhost:3003)
2. Masuk ke menu **Database Propose**
3. Klik **+ Tambah Data**
4. Upload file KMZ
5. File akan tersimpan di folder `kmz/YYYY/MM/DD/` di Firebase Storage

## File yang Diperbaiki

### 1. `app/lib/firebase-admin.js`
```javascript
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

let app;

// Konfigurasi Firebase Admin dengan service account
const getFirebaseAdminConfig = () => {
  // Coba gunakan environment variables terlebih dahulu
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    console.log('Menggunakan environment variables untuk Firebase Admin');
    return {
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${process.env.FIREBASE_PROJECT_ID}.appspot.com`
    };
  }
  
  // Fallback ke konfigurasi hardcoded untuk development
  console.warn('Environment variables tidak ditemukan, menggunakan konfigurasi development');
  return {
    projectId: 'aplikasi-survei-lampu-jalan',
    storageBucket: 'aplikasi-survei-lampu-jalan.appspot.com'
  };
};

// Inisialisasi Firebase Admin SDK
try {
  if (getApps().length === 0) {
    const config = getFirebaseAdminConfig();
    app = initializeApp(config);
    console.log('Firebase Admin berhasil diinisialisasi dengan config:', {
      projectId: config.projectId,
      storageBucket: config.storageBucket
    });
  } else {
    app = getApps()[0];
    console.log('Menggunakan Firebase Admin instance yang sudah ada');
  }
} catch (error) {
  console.error('Error saat inisialisasi Firebase Admin:', error);
  throw new Error(`Gagal inisialisasi Firebase Admin: ${error.message}`);
}

// Inisialisasi Firestore
let db;
try {
  db = getFirestore(app);
  console.log('Firestore Admin berhasil dikonfigurasi');
} catch (error) {
  console.error('Error saat inisialisasi Firestore Admin:', error);
  throw new Error(`Gagal inisialisasi Firestore Admin: ${error.message}`);
}

// Inisialisasi Storage
let storage;
try {
  storage = getStorage(app);
  console.log('Firebase Storage Admin berhasil dikonfigurasi');
  
  // Test storage bucket
  if (storage) {
    const bucket = storage.bucket();
    console.log('Storage bucket name:', bucket.name);
  }
} catch (error) {
  console.error('Error saat inisialisasi Storage Admin:', error);
  throw new Error(`Gagal inisialisasi Storage Admin: ${error.message}`);
}
```

### 2. `app/api/database-propose/upload/route.js`
```javascript
// Dynamic import dengan error handling yang lebih baik
let storage;
try {
  const firebaseAdmin = await import('../../lib/firebase-admin');
  storage = firebaseAdmin.storage;
  console.log('Firebase Admin imported successfully');
  
  if (!storage) {
    throw new Error('Firebase Storage tidak tersedia');
  }
} catch (importError) {
  console.error('Error importing firebase-admin:', importError);
  return NextResponse.json({ 
    error: 'Firebase Storage tidak dapat diakses. Silakan coba lagi nanti.' 
  }, { status: 500 });
}
```

### 3. `app/api/test-firebase-config/route.js` (Baru)
```javascript
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('Testing Firebase configuration...');
    
    // Test environment variables
    const envVars = {
      FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID ? 'Set' : 'Not set',
      FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL ? 'Set' : 'Not set',
      FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY ? 'Set' : 'Not set',
      FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET ? 'Set' : 'Not set'
    };
    
    console.log('Environment variables status:', envVars);
    
    // Test Firebase Admin import
    const firebaseAdmin = await import('../../lib/firebase-admin');
    console.log('Firebase Admin imported successfully');
    
    // Test storage
    const storage = firebaseAdmin.storage;
    if (storage) {
      const bucket = storage.bucket();
      console.log('Storage bucket available:', bucket.name);
      
      // Test storage connection
      try {
        const [files] = await bucket.getFiles({ maxResults: 1 });
        console.log('Storage connection successful, files count:', files.length);
      } catch (storageError) {
        console.error('Storage connection failed:', storageError);
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Firebase configuration test completed',
      environment: envVars,
      storage: storage ? 'Available' : 'Not available',
      bucketName: storage ? storage.bucket().name : 'N/A',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error testing Firebase configuration:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
```

## Verifikasi Perbaikan

### 1. Test Environment Variables
```bash
curl http://localhost:3003/api/test-firebase-config
```

### 2. Test Storage Connection
```bash
curl http://localhost:3003/api/test-storage
```

### 3. Test Upload File KMZ
1. Buka aplikasi di browser (http://localhost:3003)
2. Masuk ke menu **Database Propose**
3. Upload file KMZ
4. Pastikan tidak ada error "Firebase Storage tidak dapat diakses"

### 4. Cek Firebase Storage
1. Buka [Firebase Console](https://console.firebase.google.com/)
2. Pilih project `aplikasi-survei-lampu-jalan`
3. Klik **Storage** di sidebar kiri
4. Cek apakah folder `kmz` dan subfolder `YYYY/MM/DD` terbuat
5. Cek apakah file KMZ tersimpan dengan benar

## Troubleshooting

### Error: "Firebase Storage tidak dapat diakses"
- **Solusi**: Pastikan environment variables sudah diset dengan benar
- **Cek**: File `.env.local` dan restart development server

### Error: "Tidak memiliki izin untuk mengupload"
- **Solusi**: Deploy Firebase Storage Rules
- **Cek**: `npm run firebase:rules`

### Error: "Bucket tidak ditemukan"
- **Solusi**: Cek `FIREBASE_STORAGE_BUCKET` sudah benar
- **Cek**: Firebase Console > Storage

### Error: "Environment variables tidak ditemukan"
- **Solusi**: Buat file `.env.local` dengan konfigurasi yang benar
- **Cek**: Restart development server setelah membuat file

## Catatan Penting

- File `.env.local` tidak boleh di-commit ke git (sudah ada di .gitignore)
- Service account credentials harus dijaga kerahasiaannya
- Firebase Storage Rules harus di-deploy untuk mengizinkan upload
- Restart development server setelah mengubah environment variables
- Test semua endpoint untuk memastikan berfungsi dengan baik 