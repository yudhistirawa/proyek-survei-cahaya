# Setup Penghapusan File dari Firebase Storage

## Perubahan yang Telah Dibuat

### 1. Firebase Admin Configuration (`app/lib/firebase-admin.js`)
- Menambahkan import `getStorage` dari `firebase-admin/storage`
- Menambahkan konfigurasi `storageBucket` dalam inisialisasi Firebase Admin
- Menambahkan fungsi helper `deleteFileFromStorage` untuk menghapus file dari storage

### 2. Reports API (`app/api/reports/route.js`)
- Menambahkan import `deleteFileFromStorage` dan `logAdminDeleteDetailed`
- Menambahkan fungsi `extractFilePathsFromReport` untuk mengekstrak path file dari data laporan
- Memodifikasi fungsi DELETE untuk:
  - Mengambil data laporan sebelum menghapus
  - Mengekstrak semua path file dari gridData dan field lainnya
  - Menghapus file dari Firebase Storage
  - Mencatat aktivitas penghapusan dengan detail
  - Menghapus dokumen dari Firestore

## Environment Variable yang Diperlukan

Pastikan menambahkan environment variable berikut di file `.env.local`:

```
FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
```

Ganti `your-project-id` dengan ID proyek Firebase Anda.

## Cara Kerja

1. **Ekstraksi File Paths**: Fungsi `extractFilePathsFromReport` mencari URL Firebase Storage dalam:
   - `gridData` (array 2D yang berisi data grid)
   - `photoUrl` (jika ada)
   - `attachments` (jika ada)

2. **Penghapusan File**: Menggunakan `Promise.allSettled` untuk menghapus semua file secara paralel, melanjutkan proses meskipun ada file yang gagal dihapus.

3. **Logging**: Mencatat detail penghapusan termasuk:
   - ID laporan
   - Nama proyek
   - Nama surveyor
   - Jumlah file yang berhasil/gagal dihapus
   - Daftar path file

4. **Response**: Mengembalikan informasi tentang jumlah file yang berhasil dan gagal dihapus.

## Format URL Firebase Storage

Fungsi ini mengenali URL dengan format:
```
https://firebasestorage.googleapis.com/v0/b/bucket/o/path%2Fto%2Ffile?alt=media&token=...
```

Dan mengekstrak path file yang di-encode dari bagian `/o/([^?]+)`.

## Error Handling

- Jika ekstraksi file path gagal, proses tetap dilanjutkan
- Jika penghapusan file gagal, proses tetap dilanjutkan ke penghapusan dokumen
- Menggunakan `Promise.allSettled` untuk memastikan semua file diproses
- Logging error untuk debugging

## Testing

Untuk menguji fitur ini:
1. Buat laporan dengan foto/file
2. Hapus laporan melalui admin interface
3. Periksa Firebase Storage untuk memastikan file terhapus
4. Periksa activity logs untuk melihat detail penghapusan
