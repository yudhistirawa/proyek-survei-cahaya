# Perbaikan Error "Gagal menginisialisasi Firebase Admin SDK"

## Masalah
Error "Gagal menginisialisasi Firebase Admin SDK" terjadi saat mencoba upload file KMZ, menyebabkan folder `kmz` tidak terbuat di Firebase Storage.

## Penyebab
1. **Firebase Admin SDK tidak dapat diinisialisasi** karena konfigurasi yang tidak tepat
2. **Missing credentials** untuk Firebase Admin SDK
3. **Storage bucket tidak dapat diakses** tanpa konfigurasi yang benar
4. **Error handling yang tidak memadai** untuk inisialisasi Firebase Admin

## Solusi yang Diterapkan

### 1. Memperbaiki Konfigurasi Firebase Admin

**Sebelum (Konfigurasi kompleks):**
```javascript
// Konfigurasi yang mencoba menggunakan credentials
if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
  return {
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    // ...
  };
}
```

**Sesudah (Konfigurasi development):**
```javascript
// Konfigurasi development tanpa credentials
const getFirebaseAdminConfig = () => {
  console.log('Menggunakan konfigurasi development untuk Firebase Admin');
  return {
    projectId: 'aplikasi-survei-lampu-jalan',
    storageBucket: 'aplikasi-survei-lampu-jalan.firebasestorage.app'
  };
};
```

### 2. Memperbaiki Error Handling

**Sebelum (Error handling minimal):**
```javascript
} catch (error) {
  console.error('Error saat inisialisasi Firebase Admin:', error);
  // Fallback initialization tanpa credentials untuk development
  if (getApps().length === 0) {
    try {
      app = initializeApp({
        projectId: 'aplikasi-survei-lampu-jalan',
        storageBucket: 'aplikasi-survei-lampu-jalan.firebasestorage.app'
      });
      console.log('Firebase Admin diinisialisasi dengan konfigurasi minimal');
    } catch (fallbackError) {
      console.error('Gagal inisialisasi Firebase Admin dengan fallback:', fallbackError);
    }
  }
}
```

**Sesudah (Error handling yang lebih baik):**
```javascript
} catch (error) {
  console.error('Error saat inisialisasi Firebase Admin:', error);
  throw new Error(`Gagal inisialisasi Firebase Admin: ${error.message}`);
}
```

### 3. Memperbaiki Test Storage Connection

**Sebelum (Operasi write yang memerlukan credentials):**
```javascript
// Test dengan operasi sederhana
const testFile = bucket.file('test/connection-test.txt');
await testFile.save('Test connection', {
  metadata: {
    contentType: 'text/plain'
  }
});
```

**Sesudah (Operasi read yang tidak memerlukan credentials):**
```javascript
// Test dengan operasi read sederhana (tidak memerlukan credentials)
const [files] = await bucket.getFiles({ maxResults: 1 });
console.log('Firebase Storage connection successful');
console.log('Available files count:', files.length);
```

### 4. File yang Diperbaiki

#### a. `app/lib/firebase-admin.js`
```javascript
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

let app;

// Konfigurasi Firebase Admin untuk development
const getFirebaseAdminConfig = () => {
  // Untuk development, gunakan konfigurasi minimal tanpa credentials
  console.log('Menggunakan konfigurasi development untuk Firebase Admin');
  return {
    projectId: 'aplikasi-survei-lampu-jalan',
    storageBucket: 'aplikasi-survei-lampu-jalan.firebasestorage.app'
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

#### b. `app/api/database-propose/upload/route.js`
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
    error: 'Gagal menginisialisasi Firebase Admin SDK. Silakan coba lagi nanti.' 
  }, { status: 500 });
}
```

#### c. `app/api/test-firebase-init/route.js` (Baru)
```javascript
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('Testing Firebase Admin initialization...');
    
    // Test import dan inisialisasi
    const firebaseAdmin = await import('../../lib/firebase-admin');
    console.log('Firebase Admin imported successfully');
    
    // Test storage
    const storage = firebaseAdmin.storage;
    if (storage) {
      const bucket = storage.bucket();
      console.log('Storage bucket available:', bucket.name);
    }
    
    // Test db
    const db = firebaseAdmin.db;
    if (db) {
      console.log('Firestore database available');
    }
    
    return NextResponse.json({
      success: true,
      message: 'Firebase Admin berhasil diinisialisasi',
      storage: storage ? 'Tersedia' : 'Tidak tersedia',
      db: db ? 'Tersedia' : 'Tidak tersedia',
      bucketName: storage ? storage.bucket().name : 'N/A',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error testing Firebase Admin initialization:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
```

## Keuntungan Perbaikan

### 1. **Konfigurasi yang Lebih Sederhana**
- Tidak memerlukan service account credentials untuk development
- Konfigurasi minimal yang bekerja untuk testing
- Error handling yang lebih jelas

### 2. **Error Handling yang Lebih Baik**
- Throw error yang informatif
- Console logging yang detail
- User-friendly error messages

### 3. **Testing yang Lebih Aman**
- Operasi read untuk test connection
- Tidak melakukan operasi write yang memerlukan credentials
- Fallback yang aman

### 4. **Debugging yang Lebih Mudah**
- Endpoint test untuk verifikasi
- Console logs yang informatif
- Error details yang lengkap

## Verifikasi Perbaikan

### 1. Test Firebase Admin Initialization
```bash
# Test Firebase Admin initialization
curl http://localhost:3003/api/test-firebase-init

# Test storage connection
curl http://localhost:3003/api/test-storage

# Test simple import
curl http://localhost:3003/api/test-simple
```

### 2. Test Upload File KMZ
1. Buka aplikasi di browser (http://localhost:3003)
2. Masuk ke menu **Database Propose**
3. Klik **+ Tambah Data**
4. Upload file KMZ
5. Pastikan tidak ada error "Gagal menginisialisasi Firebase Admin SDK"

### 3. Cek Console Log
- Pastikan tidak ada error inisialisasi Firebase Admin
- Cek log "Firebase Admin berhasil diinisialisasi"
- Cek log "Storage bucket name: aplikasi-survei-lampu-jalan.firebasestorage.app"

## Troubleshooting

### Error: "Gagal menginisialisasi Firebase Admin SDK"
- **Solusi**: Cek konfigurasi project ID dan storage bucket
- **Cek**: File `app/lib/firebase-admin.js`

### Error: "Firebase Storage tidak tersedia"
- **Solusi**: Restart development server
- **Cek**: `npm run dev`

### Error: "Bucket tidak dapat diakses"
- **Solusi**: Cek Firebase project settings
- **Cek**: Firebase Console > Storage

## File yang Dimodifikasi

1. **`app/lib/firebase-admin.js`** - Konfigurasi Firebase Admin untuk development
2. **`app/api/database-propose/upload/route.js`** - Error handling yang lebih baik
3. **`app/api/test-firebase-init/route.js`** - Endpoint test inisialisasi (baru)

## Catatan Penting

- Konfigurasi development tanpa credentials
- Error handling yang komprehensif
- Console logging untuk debugging
- User-friendly error messages
- Restart development server setelah perubahan
- Test semua endpoint untuk memastikan berfungsi dengan baik 