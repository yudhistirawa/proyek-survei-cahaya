# Sistem Penyimpanan File KMZ di Firebase Storage

## Struktur Folder

File KMZ akan tersimpan di Firebase Storage dengan struktur folder yang terorganisir:

```
kmz/
├── 2024/
│   ├── 12/
│   │   ├── 17/
│   │   │   ├── 1703123456789_ZONA_SURVEY.kmz
│   │   │   └── 1703123456790_ARTERI_ROAD.kmz
│   │   └── 18/
│   │       └── 1703210000000_WISATA_ROAD.kmz
│   └── 11/
│       └── 15/
│           └── 1700123456789_KOLEKTOR_A.kmz
└── 2025/
    └── 01/
        └── 15/
            └── 1705310000000_PANEL_ROAD.kmz
```

## Fitur Utama

### 1. Struktur Folder Otomatis
- **Tahun**: File dikelompokkan berdasarkan tahun upload
- **Bulan**: Subfolder berdasarkan bulan (01-12)
- **Hari**: Subfolder berdasarkan tanggal (01-31)
- **Timestamp**: Nama file menggunakan timestamp untuk menghindari konflik

### 2. Naming Convention
```
{timestamp}_{original_filename}.kmz
```
Contoh: `1703123456789_ZONA_SURVEY.kmz`

### 3. Metadata File
Setiap file KMZ menyimpan metadata:
- `originalName`: Nama file asli
- `uploadedAt`: Waktu upload
- `contentType`: `application/vnd.google-earth.kmz`
- `size`: Ukuran file dalam bytes

## API Endpoints

### 1. Upload File KMZ
**Endpoint**: `POST /api/database-propose/upload`

**Request**:
```javascript
const formData = new FormData();
formData.append('kmzFile', file);

const response = await fetch('/api/database-propose/upload', {
  method: 'POST',
  body: formData
});
```

**Response**:
```json
{
  "success": true,
  "url": "https://storage.googleapis.com/...",
  "fileName": "ZONA_SURVEY.kmz",
  "size": 1024000,
  "message": "File KMZ berhasil diupload"
}
```

### 2. List File KMZ
**Endpoint**: `GET /api/kmz-files`

**Response**:
```json
{
  "success": true,
  "files": [
    {
      "name": "kmz/2024/12/17/1703123456789_ZONA_SURVEY.kmz",
      "size": 1024000,
      "contentType": "application/vnd.google-earth.kmz",
      "uploadedAt": "2024-12-17T10:30:45.123Z",
      "originalName": "ZONA_SURVEY.kmz",
      "url": "https://storage.googleapis.com/...",
      "path": "kmz/2024/12/17/1703123456789_ZONA_SURVEY.kmz"
    }
  ],
  "totalFiles": 1,
  "message": "Daftar file KMZ berhasil diambil"
}
```

### 3. Delete File KMZ
**Endpoint**: `DELETE /api/delete-kmz-file`

**Request**:
```json
{
  "filePath": "kmz/2024/12/17/1703123456789_ZONA_SURVEY.kmz"
}
```

**Response**:
```json
{
  "success": true,
  "message": "File KMZ berhasil dihapus",
  "filePath": "kmz/2024/12/17/1703123456789_ZONA_SURVEY.kmz"
}
```

## Komponen UI

### 1. KMZ File Manager
**File**: `app/components/admin/kmz-file-manager/KmzFileManager.js`

**Fitur**:
- Tampilkan daftar semua file KMZ
- Download file
- Preview file
- Hapus file
- Refresh list
- Informasi detail file (ukuran, tanggal, folder)

### 2. Database Propose Upload
**File**: `app/components/admin/database-propose/DatabasePropose.js`

**Fitur**:
- Upload file KMZ dengan validasi
- Preview map KMZ
- Integrasi dengan form data

## Firebase Storage Rules

```javascript
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    // Rules untuk folder kmz dan semua subfolder
    match /kmz/{allPaths=**} {
      // Izinkan read untuk semua user
      allow read: if true;
      
      // Izinkan write untuk admin atau user yang terautentikasi
      allow write: if request.auth != null 
                   || request.auth.token.admin == true
                   || request.auth.token.role == 'admin';
    }
    
    // Rules untuk folder test
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

## Validasi File

### 1. File Type
- Hanya file dengan ekstensi `.kmz` yang diperbolehkan
- Content-Type: `application/vnd.google-earth.kmz`

### 2. File Size
- Maksimal ukuran: 50MB
- Validasi sebelum upload

### 3. File Name
- Nama file dibersihkan dari karakter khusus
- Timestamp ditambahkan untuk menghindari konflik

## Keamanan

### 1. Access Control
- Upload hanya untuk user yang terautentikasi
- Download tersedia untuk semua user
- Delete hanya untuk admin

### 2. File Validation
- Validasi tipe file di client dan server
- Validasi ukuran file
- Sanitasi nama file

### 3. Error Handling
- Error handling yang komprehensif
- User-friendly error messages
- Logging untuk debugging

## Monitoring dan Maintenance

### 1. File Management
- List semua file KMZ
- Informasi ukuran total
- Tracking file berdasarkan tanggal

### 2. Cleanup
- Fungsi delete file
- Konfirmasi sebelum hapus
- Update list setelah delete

### 3. Backup
- File tersimpan di Firebase Storage
- Redundancy otomatis
- Version control melalui timestamp

## Cara Penggunaan

### 1. Upload File KMZ
1. Buka menu **Database Propose**
2. Klik **+ Tambah Data**
3. Pilih file KMZ
4. File akan otomatis tersimpan di folder `kmz/YYYY/MM/DD/`

### 2. Kelola File KMZ
1. Buka menu **KMZ File Manager** (jika tersedia)
2. Lihat daftar semua file KMZ
3. Download, preview, atau hapus file

### 3. Deploy Firebase Rules
```bash
npm run deploy:firebase
```

## Troubleshooting

### Error: "File tidak dapat diupload"
- Cek ukuran file (max 50MB)
- Pastikan file berformat .kmz
- Cek koneksi internet

### Error: "Permission denied"
- Deploy Firebase Storage Rules
- Pastikan user terautentikasi
- Cek role user (admin)

### Error: "File tidak ditemukan"
- Cek path file di Firebase Console
- Pastikan file belum dihapus
- Refresh list file

## Catatan Penting

- File KMZ tersimpan dengan struktur folder yang terorganisir
- Timestamp digunakan untuk menghindari konflik nama file
- Metadata lengkap disimpan untuk setiap file
- Access control diterapkan untuk keamanan
- Error handling komprehensif untuk user experience yang baik 