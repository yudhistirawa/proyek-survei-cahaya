# Panduan Testing API Endpoints

## Masalah yang Ditemui
Error 404 saat mengakses `/api/database-propose/upload` karena struktur file yang salah.

## Perbaikan yang Dilakukan
1. ✅ Memindahkan `upload.js` ke folder `upload/route.js`
2. ✅ Menghapus file `upload.js` yang lama
3. ✅ Memperbaiki struktur API routes

## Testing API Endpoints

### 1. Test Basic Server
```bash
# Buka browser dan akses:
http://localhost:3000/api/test
```
**Expected Response:**
```json
{
  "success": true,
  "message": "Server berjalan dengan baik",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### 2. Test Firebase Storage
```bash
# Buka browser dan akses:
http://localhost:3000/api/test-firebase
```
**Expected Response:**
```json
{
  "success": true,
  "message": "Firebase Storage berfungsi dengan baik",
  "testFile": "test/1234567890_test.txt",
  "downloadURL": "https://firebasestorage.googleapis.com/...",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### 3. Test Upload Endpoint
```bash
# Buka browser dan akses:
http://localhost:3000/api/test-upload
```
**Expected Response:**
```json
{
  "success": true,
  "message": "Upload API endpoint test berhasil",
  "endpoint": "/api/database-propose/upload",
  "method": "POST",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### 4. Test Database Propose API
```bash
# Buka browser dan akses:
http://localhost:3000/api/database-propose
```
**Expected Response:**
```json
[
  {
    "id": "doc_id",
    "namaJalan": "Jalan Contoh",
    "idTitik": "T001",
    "daya": "100W",
    "tiang": "Tiang 1",
    "ruas": "arteri",
    "titikKordinat": "-6.123,106.456",
    "kmzFileUrl": "https://firebasestorage.googleapis.com/...",
    "createdAt": "2024-01-01T12:00:00.000Z"
  }
]
```

## Struktur File API yang Benar

```
app/api/
├── database-propose/
│   ├── route.js                    # GET, POST, PUT, DELETE
│   └── upload/
│       └── route.js               # POST upload KMZ
├── test/
│   └── route.js                   # Test basic server
├── test-firebase/
│   └── route.js                   # Test Firebase Storage
└── test-upload/
    └── route.js                   # Test upload endpoint
```

## Testing Upload KMZ

### Step 1: Test API Endpoints
1. **Test Basic Server:**
   ```
   http://localhost:3000/api/test
   ```

2. **Test Firebase Storage:**
   ```
   http://localhost:3000/api/test-firebase
   ```

3. **Test Upload Endpoint:**
   ```
   http://localhost:3000/api/test-upload
   ```

### Step 2: Test Upload KMZ di Aplikasi
1. Buka aplikasi: `http://localhost:3000`
2. Navigasi ke Database Propose
3. Klik "Tambah Data"
4. Upload file KMZ
5. Cek console log untuk debugging

### Step 3: Debugging
Jika masih error:

1. **Cek Server Logs:**
   ```bash
   npm run dev
   ```

2. **Cek Browser Console:**
   - Buka Developer Tools (F12)
   - Klik tab Console
   - Upload file KMZ
   - Lihat error messages

3. **Cek Network Tab:**
   - Buka Developer Tools (F12)
   - Klik tab Network
   - Upload file KMZ
   - Cari request ke `/api/database-propose/upload`
   - Klik request tersebut
   - Lihat Response tab

## Expected Responses

### Success Upload Response:
```json
{
  "success": true,
  "url": "https://firebasestorage.googleapis.com/...",
  "fileName": "test.kmz",
  "size": 12345,
  "message": "File KMZ berhasil diupload"
}
```

### Error Response:
```json
{
  "error": "Pesan error dalam bahasa Indonesia"
}
```

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| 404 Error | Pastikan file bernama `route.js` |
| Import Error | Cek path import Firebase |
| Storage Error | Update Firebase Storage Rules |
| File Size Error | Pastikan file < 50MB |

## Firebase Storage Rules

Update di Firebase Console:
```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /kmz/{allPaths=**} {
      allow read, write: if true; // Untuk testing
    }
    match /test/{allPaths=**} {
      allow read, write: if true; // Untuk testing
    }
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

## Final Checklist

- [ ] Server berjalan (`npm run dev`)
- [ ] API test berhasil (`/api/test`)
- [ ] Firebase Storage test berhasil (`/api/test-firebase`)
- [ ] Upload endpoint test berhasil (`/api/test-upload`)
- [ ] Database propose API berhasil (`/api/database-propose`)
- [ ] Firebase Storage Rules sudah diupdate
- [ ] File KMZ < 50MB
- [ ] Browser console tidak ada error
- [ ] Network tab menunjukkan request berhasil

## Support

Jika masih error:
1. Restart server: `npm run dev`
2. Clear browser cache
3. Test dengan file KMZ yang berbeda
4. Cek Firebase Console logs
5. Cek server logs di terminal 