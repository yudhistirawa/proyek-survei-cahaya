# Perbaikan Sistem Pembuatan Tugas

## Ringkasan Perubahan

Sistem pembuatan tugas telah diperbaiki agar dapat mengirim tugas ke surveyor yang dipilih dengan notifikasi otomatis dan data yang lengkap.

## Fitur yang Ditambahkan

### 1. Notifikasi Otomatis untuk Surveyor
- **File**: `app/api/task-assignments/route.js`
- **Fungsi**: `createTaskNotification()`
- **Deskripsi**: Ketika admin membuat tugas baru, sistem akan otomatis mengirim notifikasi ke surveyor yang dipilih
- **Data Notifikasi**:
  - Tipe: 'tugas'
  - Judul: 'Tugas Baru Diterima'
  - Pesan: Menampilkan judul tugas dan tipe (Zona Existing/Propose)
  - Metadata: Informasi lengkap tugas (deadline, priority, dll)

### 2. Perbaikan CreateTaskModal
- **File**: `app/components/admin/task-distribution/CreateTaskModal.js`
- **Perubahan**:
  - Menambahkan logging untuk debugging
  - Pesan sukses yang informatif dengan nama surveyor
  - Error handling yang lebih baik
  - Validasi data yang lebih lengkap

### 3. Perbaikan DaftarTugasPage
- **File**: `app/components/pages/DaftarTugasPage.js`
- **Perubahan**:
  - Memperbaiki nama koleksi dari 'task-assignments' ke 'task_assignments'
  - Transformasi data yang lebih baik untuk menangani struktur data baru
  - Status badge yang sesuai dengan status 'pending'
  - Logging untuk debugging

### 4. Perbaikan DetailTugasPage
- **File**: `app/components/pages/DetailTugasPage.js`
- **Perubahan**:
  - Menambahkan dukungan untuk file KMZ/KML yang diupload
  - Menampilkan informasi file (KMZ/KML, Excel/CSV)
  - Menampilkan deadline dan priority
  - Integrasi dengan KMZMapComponent untuk preview peta
  - Informasi tugas yang lebih lengkap

### 5. Perbaikan API Task Assignments
- **File**: `app/api/task-assignments/route.js`
- **Perubahan**:
  - Mendukung query berdasarkan surveyorId
  - Notifikasi otomatis saat tugas dibuat
  - Error handling yang lebih baik

## Alur Kerja Sistem

### 1. Admin Membuat Tugas
1. Admin membuka modal "Buat Tugas"
2. Mengisi form (judul, deskripsi, surveyor, deadline)
3. Upload file KMZ/KML (wajib untuk existing) atau Excel/CSV (opsional untuk propose)
4. Preview peta KMZ/KML
5. Klik "Buat Tugas"

### 2. Sistem Memproses Tugas
1. Validasi data input
2. Upload file ke Firebase Storage
3. Parse file KMZ/KML untuk data peta
4. Simpan tugas ke database (collection: task_assignments)
5. Kirim notifikasi ke surveyor yang dipilih

### 3. Surveyor Menerima Tugas
1. Surveyor login ke aplikasi
2. Sistem menampilkan notifikasi tugas baru
3. Tugas muncul di halaman "Daftar Tugas"
4. Surveyor dapat melihat detail tugas lengkap

## Struktur Data Tugas

```javascript
{
  id: "task_id",
  title: "Judul Tugas",
  description: "Deskripsi tugas",
  surveyorId: "surveyor_uid",
  surveyorName: "Nama Surveyor",
  surveyorEmail: "email@surveyor.com",
  taskType: "existing" | "propose",
  status: "pending" | "in_progress" | "completed" | "cancelled",
  priority: "low" | "medium" | "high",
  deadline: "2024-01-01T00:00:00.000Z",
  kmzFile: {
    fileName: "file.kmz",
    downloadURL: "https://...",
    folderPath: "kmz/2024-01-01"
  },
  excelFile: {
    fileName: "file.xlsx",
    downloadURL: "https://...",
    folderPath: "excel/2024-01-01"
  },
  mapData: {
    coordinates: [...],
    polygons: [...],
    lines: [...],
    center: {lat, lng}
  },
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
  createdBy: "admin",
  assignedAt: "2024-01-01T00:00:00.000Z"
}
```

## Struktur Data Notifikasi

```javascript
{
  id: "notification_id",
  userId: "surveyor_uid",
  type: "tugas",
  title: "Tugas Baru Diterima",
  message: "Anda mendapat tugas baru: [Judul Tugas]. Tipe: [Zona Existing/Propose]",
  relatedId: "task_id",
  status: "pending",
  metadata: {
    taskType: "existing" | "propose",
    taskTitle: "Judul Tugas",
    deadline: "2024-01-01T00:00:00.000Z",
    priority: "medium",
    createdBy: "admin"
  },
  isRead: false,
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z"
}
```

## Testing

### 1. Test Pembuatan Tugas
1. Login sebagai admin
2. Buka halaman Task Distribution
3. Klik "Buat Tugas"
4. Pilih tipe tugas (Existing/Propose)
5. Isi form dan upload file
6. Verifikasi tugas berhasil dibuat

### 2. Test Notifikasi Surveyor
1. Login sebagai surveyor
2. Periksa notifikasi di dashboard
3. Verifikasi notifikasi tugas baru muncul
4. Klik notifikasi untuk melihat detail

### 3. Test Daftar Tugas
1. Login sebagai surveyor
2. Buka halaman "Daftar Tugas"
3. Verifikasi tugas baru muncul di daftar
4. Klik "Detail Tugas" untuk melihat informasi lengkap

## Troubleshooting

### 1. Tugas Tidak Muncul di Daftar Surveyor
- Periksa console browser untuk error
- Verifikasi surveyorId di database
- Periksa nama koleksi (harus 'task_assignments')

### 2. Notifikasi Tidak Terkirim
- Periksa console server untuk error
- Verifikasi struktur data notifikasi
- Periksa koneksi Firebase

### 3. File Tidak Terupload
- Periksa permission Firebase Storage
- Verifikasi format file yang didukung
- Periksa ukuran file (max 10MB)

## Catatan Penting

1. **Nama Koleksi**: Gunakan 'task_assignments' (dengan underscore), bukan 'task-assignments'
2. **Status Default**: Tugas baru memiliki status 'pending'
3. **File Upload**: KMZ/KML wajib untuk tugas existing, minimal satu file untuk propose
4. **Notifikasi**: Otomatis terkirim ke surveyor yang dipilih
5. **Realtime Updates**: Daftar tugas surveyor update secara realtime menggunakan Firestore onSnapshot
