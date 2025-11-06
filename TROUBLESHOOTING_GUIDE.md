# Panduan Troubleshooting Error Upload KMZ

## Error yang Ditemui
```
Error: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

## Penyebab Error
Error ini terjadi karena:
1. API endpoint mengembalikan halaman HTML (error page) alih-alih JSON
2. Import path Firebase yang salah
3. Server error yang tidak tertangani dengan baik

## Langkah-langkah Perbaikan

### 1. Test Server Basic
Buka browser dan akses:
```
http://localhost:3000/api/test
```
Seharusnya menampilkan JSON response.

### 2. Test Firebase Storage
Buka browser dan akses:
```
http://localhost:3000/api/test-firebase
```
Ini akan test koneksi Firebase Storage.

### 3. Test Upload API
Buka browser dan akses:
```
http://localhost:3000/api/database-propose/upload
```
Seharusnya menampilkan error "Method not allowed" (karena ini POST endpoint).

### 4. Debugging Steps

#### Step 1: Cek Server Logs
```bash
npm run dev
```
Lihat console log untuk error messages.

#### Step 2: Cek Browser Console
1. Buka Developer Tools (F12)
2. Klik tab Console
3. Upload file KMZ
4. Lihat error messages

#### Step 3: Cek Network Tab
1. Buka Developer Tools (F12)
2. Klik tab Network
3. Upload file KMZ
4. Cari request ke `/api/database-propose/upload`
5. Klik request tersebut
6. Lihat Response tab

### 5. Common Issues & Solutions

#### Issue 1: Import Path Error
**Error:** `Cannot find module '../../../lib/firebase'`
**Solution:** Import path sudah diperbaiki menjadi `'../../lib/firebase'`

#### Issue 2: Firebase Storage Rules
**Error:** `storage/unauthorized`
**Solution:** Update Firebase Storage Rules di Firebase Console

#### Issue 3: Server Not Running
**Error:** `Failed to fetch`
**Solution:** Pastikan server berjalan dengan `npm run dev`

#### Issue 4: File Too Large
**Error:** `storage/quota-exceeded`
**Solution:** File harus < 50MB

### 6. Firebase Storage Rules Setup

Buka Firebase Console dan update Storage Rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Izinkan upload file KMZ ke folder kmz
    match /kmz/{allPaths=**} {
      allow read, write: if true; // Untuk testing
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

### 7. Testing Sequence

1. **Test Basic Server:**
   ```
   http://localhost:3000/api/test
   ```

2. **Test Firebase Storage:**
   ```
   http://localhost:3000/api/test-firebase
   ```

3. **Test Upload KMZ:**
   - Buka aplikasi
   - Navigasi ke Database Propose
   - Upload file KMZ
   - Cek console log

### 8. Expected Responses

#### Success Response:
```json
{
  "success": true,
  "url": "https://firebasestorage.googleapis.com/...",
  "fileName": "test.kmz",
  "size": 12345,
  "message": "File KMZ berhasil diupload"
}
```

#### Error Response:
```json
{
  "error": "Pesan error dalam bahasa Indonesia"
}
```

### 9. Debug Commands

```bash
# Restart server
npm run dev

# Test API endpoints
curl http://localhost:3000/api/test
curl http://localhost:3000/api/test-firebase

# Check Firebase config
node -e "console.log(require('./app/lib/firebase.js'))"
```

### 10. Environment Variables

Pastikan environment variables sudah benar:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBHk6Zg35hLFRbuLW_dwHSpJ3-EQ2kGhQ8
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=aplikasi-survei-lampu-jalan.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=aplikasi-survei-lampu-jalan
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=aplikasi-survei-lampu-jalan.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=231759165437
NEXT_PUBLIC_FIREBASE_APP_ID=1:231759165437:web:8dafd8ffff8294c97f4b94
```

### 11. Final Checklist

- [ ] Server berjalan (`npm run dev`)
- [ ] API test berhasil (`/api/test`)
- [ ] Firebase Storage test berhasil (`/api/test-firebase`)
- [ ] Firebase Storage Rules sudah diupdate
- [ ] File KMZ < 50MB
- [ ] Browser console tidak ada error
- [ ] Network tab menunjukkan request berhasil

### 12. Support

Jika masih error:
1. Cek server logs di terminal
2. Cek browser console logs
3. Cek Network tab untuk request details
4. Test dengan file KMZ yang berbeda
5. Restart server dan browser 