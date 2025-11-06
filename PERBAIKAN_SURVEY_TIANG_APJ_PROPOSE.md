# Perbaikan Halaman SurveyTiangAPJProposePage

## Masalah yang Ditemukan

Halaman `SurveyTiangAPJProposePage` tidak bisa dibuka di localhost karena beberapa masalah:

### 1. Error Geolocation (Baris 84)
**Masalah:** Penggunaan `error.PERMISSION_DENIED` yang tidak valid
```javascript
// SEBELUM (SALAH)
switch (error.code) {
  case error.PERMISSION_DENIED:
    msg = 'Akses lokasi ditolak oleh pengguna';
    break;
  // ...
}

// SESUDAH (BENAR)
switch (error.code) {
  case 1: // PERMISSION_DENIED
    msg = 'Akses lokasi ditolak oleh pengguna';
    break;
  case 2: // POSITION_UNAVAILABLE
    msg = 'Informasi lokasi tidak tersedia';
    break;
  case 3: // TIMEOUT
    msg = 'Permintaan lokasi timeout';
    break;
  default:
    msg = 'Terjadi kesalahan yang tidak diketahui';
}
```

### 2. Firebase Initialization Error
**Masalah:** Firebase App tidak diinisialisasi dengan benar di server-side
```javascript
// SEBELUM (SALAH)
if (typeof window !== 'undefined') {
  // Firebase hanya diinisialisasi di client-side
}

// SESUDAH (BENAR)
try {
  firebaseApp = initializeApp(firebaseConfig);
  // Firebase diinisialisasi di client dan server
} catch (error) {
  console.error('Error inisialisasi Firebase App:', error);
}
```

### 3. Client-Side Rendering Issues
**Masalah:** Komponen mencoba mengakses browser APIs sebelum hydration selesai
```javascript
// SEBELUM (SALAH)
const getCurrentLocation = () => {
  if (!isClient || typeof navigator === 'undefined' || !navigator.geolocation) {
    // ...
  }
};

// SESUDAH (BENAR)
const getCurrentLocation = () => {
  if (!isClient) {
    setLocationError('Menunggu inisialisasi client...');
    setLocationStatus('loading');
    return;
  }

  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    setLocationError('Geolocation tidak didukung oleh browser ini');
    setLocationStatus('error');
    return;
  }
  // ...
};
```

### 4. Image Upload Error Handling
**Masalah:** Tidak ada error handling yang proper untuk image upload
```javascript
// SEBELUM (SALAH)
const handleImageUpload = (field, event) => {
  const file = event.target.files[0];
  if (!file) return;
  const canvas = document.createElement('canvas');
  // ...
};

// SESUDAH (BENAR)
const handleImageUpload = (field, event) => {
  const file = event.target.files[0];
  if (!file) return;
  
  // Check if we're on client side
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    console.warn('Image upload skipped: not on client side');
    return;
  }
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const img = new Image();
  
  img.onload = () => {
    try {
      // Image processing logic
    } catch (error) {
      console.error('Error processing image:', error);
      alert('Gagal memproses gambar. Silakan coba lagi.');
    }
  };
  
  img.onerror = () => {
    console.error('Error loading image');
    alert('Gagal memuat gambar. Silakan coba lagi.');
  };
  
  const reader = new FileReader();
  reader.onload = (e) => (img.src = e.target.result);
  reader.onerror = () => {
    console.error('Error reading file');
    alert('Gagal membaca file. Silakan coba lagi.');
  };
  reader.readAsDataURL(file);
};
```

## Perbaikan yang Dilakukan

### 1. Fixed Geolocation Error Codes
- Menggunakan kode numerik yang benar untuk error geolocation
- Menambahkan komentar untuk menjelaskan kode error

### 2. Improved Firebase Configuration
- Firebase App sekarang diinisialisasi di client dan server side
- Menghapus pengecekan `typeof window !== 'undefined'` yang tidak perlu
- Memperbaiki fungsi helper untuk Firestore

### 3. Enhanced Client-Side Rendering
- Menambahkan loading state yang proper
- Delay untuk memastikan komponen ter-render dengan baik
- Pengecekan client-side yang lebih robust

### 4. Better Error Handling
- Menambahkan try-catch untuk image processing
- Error handling untuk file reading
- User-friendly error messages

### 5. Loading State
- Menambahkan loading spinner saat client belum siap
- Feedback visual untuk user

## Cara Menggunakan

1. **Jalankan development server:**
   ```bash
   npm run dev
   ```

2. **Akses halaman:**
   - Login sebagai surveyor
   - Pilih "Survey APJ Propose" dari menu survey
   - Halaman akan menampilkan loading state terlebih dahulu
   - Setelah client ready, halaman akan berfungsi normal

## Testing

- ✅ Build berhasil tanpa error
- ✅ Firebase initialization berhasil
- ✅ Geolocation error handling fixed
- ✅ Image upload error handling improved
- ✅ Client-side rendering issues resolved

## Catatan

- Pastikan browser mendukung geolocation
- Pastikan user memberikan izin lokasi
- Jika masih ada masalah, cek console browser untuk error details
