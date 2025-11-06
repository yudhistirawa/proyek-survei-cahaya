# Troubleshooting Notifikasi

## Masalah: "Gagal memuat notifikasi real-time"

### Penyebab Umum:
1. **Firebase Firestore tidak tersedia**
2. **Permission/security rules**
3. **Koneksi internet bermasalah**
4. **User ID tidak valid**

### Solusi yang Telah Diterapkan:

#### 1. **Fallback System**
- Jika real-time notifications gagal, sistem otomatis fallback ke API-based notifications
- User tetap bisa melihat notifikasi meskipun real-time tidak berfungsi

#### 2. **Manual Refresh**
- Tombol refresh di header notifikasi
- Tombol "Coba Lagi" di error state
- Refresh otomatis setiap 30 detik jika real-time gagal

#### 3. **Enhanced Error Handling**
- Logging detail di console browser
- Error messages yang informatif
- Graceful degradation

### Langkah Troubleshooting:

#### 1. **Periksa Console Browser**
```javascript
// Buka Developer Tools (F12) > Console
// Cari log yang dimulai dengan:
🔔 Setting up realtime notifications for user: [user_id]
📨 Received notifications update: [count] notifications
❌ Realtime notifications error: [error]
🔄 Falling back to API-based notifications...
```

#### 2. **Test API Notifications**
```javascript
// Di console browser:
fetch('/api/notifications?userId=YOUR_USER_ID')
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

#### 3. **Test Create Notification**
```javascript
// Di console browser:
fetch('/api/notifications', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'YOUR_USER_ID',
    type: 'tugas',
    title: 'Test',
    message: 'Test notification'
  })
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

#### 4. **Periksa Firebase Console**
- Buka [Firebase Console](https://console.firebase.google.com)
- Pilih project Anda
- Buka Firestore Database
- Periksa collection `notifications`
- Pastikan ada data untuk user ID Anda

### Debugging Steps:

#### Step 1: Verifikasi User ID
```javascript
// Di console browser:
console.log('User ID:', 'YOUR_USER_ID');
```

#### Step 2: Test Firebase Connection
```javascript
// Di console browser:
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { firebaseApp } from './lib/firebase';

const db = getFirestore(firebaseApp);
const notifsRef = collection(db, 'notifications');
getDocs(notifsRef)
  .then(snapshot => {
    console.log('Firebase connection OK');
    console.log('Total notifications:', snapshot.docs.length);
  })
  .catch(err => {
    console.error('Firebase connection failed:', err);
  });
```

#### Step 3: Check Network Tab
- Buka Developer Tools > Network
- Refresh halaman notifikasi
- Cari request ke `/api/notifications`
- Periksa status code dan response

### Common Issues & Solutions:

#### 1. **"Permission denied"**
**Penyebab**: Firebase security rules
**Solusi**: 
- Periksa Firebase security rules
- Pastikan user authenticated
- Verifikasi user ID valid

#### 2. **"Network error"**
**Penyebab**: Koneksi internet
**Solusi**:
- Periksa koneksi internet
- Refresh halaman
- Coba browser berbeda

#### 3. **"User ID not found"**
**Penyebab**: User tidak terdaftar
**Solusi**:
- Login ulang
- Periksa user ID di database
- Verifikasi authentication

#### 4. **"Collection not found"**
**Penyebab**: Collection `notifications` tidak ada
**Solusi**:
- Buat collection `notifications` di Firebase
- Atau buat notifikasi pertama melalui API

### Testing Tools:

#### 1. **Test Notification Button**
- Hanya muncul di development mode
- Tombol hijau di pojok kanan bawah
- Klik untuk membuat notifikasi test

#### 2. **Console Commands**
```javascript
// Refresh notifications
window.refreshNotifications();

// Create test notification
window.createTestNotification();

// Check notification count
window.checkNotificationCount();
```

#### 3. **API Testing**
```bash
# Test GET notifications
curl "http://localhost:3000/api/notifications?userId=YOUR_USER_ID"

# Test POST notification
curl -X POST "http://localhost:3000/api/notifications" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "YOUR_USER_ID",
    "type": "tugas",
    "title": "Test",
    "message": "Test message"
  }'
```

### Expected Behavior:

#### ✅ **Sukses**:
```
🔔 Setting up realtime notifications for user: [user_id]
📨 Received notifications update: 5 notifications
📊 Notifications stats: { total: 5, tugas: 3, survey: 2, unread: 2 }
```

#### ❌ **Error dengan Fallback**:
```
❌ Realtime notifications error: Permission denied
🔄 Falling back to API-based notifications...
📥 GET /api/notifications?userId=[user_id]
✅ API notifications loaded: 5 notifications
```

#### ❌ **Error Total**:
```
❌ Realtime notifications error: Network error
🔄 Falling back to API-based notifications...
❌ API fallback also failed: Network error
```

### Prevention:

#### 1. **Regular Monitoring**
- Monitor console logs
- Check Firebase usage
- Verify API endpoints

#### 2. **Error Tracking**
- Log errors to external service
- Monitor user reports
- Track notification delivery

#### 3. **Performance Optimization**
- Limit notification queries
- Implement caching
- Use pagination for large datasets

### Contact Support:

Jika masalah masih berlanjut:
1. Screenshot console browser
2. Screenshot error message
3. User ID yang bermasalah
4. Browser dan OS version
5. Network tab screenshot
