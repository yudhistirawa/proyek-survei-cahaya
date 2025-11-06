# Fitur Upload KMZ/KML di Tugas Propose

## Ringkasan Fitur

Fitur upload file KMZ/KML telah ditambahkan ke modal "Buat Tugas Propose" untuk mendukung upload file dengan titik koordinat. Sekarang kedua jenis tugas (Existing dan Propose) dapat menerima file KMZ/KML maupun Excel/CSV.

## Perubahan yang Dilakukan

### 1. **Modal CreateTaskModal.js**
- **Validasi File**: Sekarang mendukung upload KMZ/KML untuk kedua jenis tugas
- **Preview Peta**: Menampilkan preview peta untuk file KMZ/KML
- **Informasi File**: Menampilkan informasi berbeda untuk file KMZ/KML dan Excel/CSV
- **Storage**: File disimpan di folder yang berbeda berdasarkan jenisnya

### 2. **Fitur yang Ditambahkan**

#### A. Upload File Fleksibel
```javascript
// Sekarang mendukung semua format
const allowedTypes = ['.kmz', '.kml', '.xlsx', '.xls', '.csv'];
```

#### B. Preview Peta Otomatis
- File KMZ/KML akan otomatis ditampilkan preview peta
- Menampilkan koordinat, polygon, dan garis yang ditemukan
- Loading state saat parsing file

#### C. Informasi File yang Jelas
- **KMZ/KML**: Menampilkan preview peta dan jumlah data
- **Excel/CSV**: Menampilkan pesan bahwa file siap diproses

#### D. Storage Terorganisir
```javascript
// Folder berdasarkan jenis file
const folderPath = isKMZFile 
  ? `kmz/${date}`  // File KMZ/KML
  : `excel/${date}`; // File Excel/CSV
```

## Cara Penggunaan

### 1. **Upload File KMZ/KML**
1. Buka modal "Buat Tugas Propose"
2. Isi form yang diperlukan (judul, surveyor, deskripsi)
3. Upload file KMZ/KML
4. Preview peta akan otomatis muncul
5. Klik "Buat Tugas" untuk menyimpan

### 2. **Upload File Excel/CSV**
1. Buka modal "Buat Tugas Propose"
2. Isi form yang diperlukan
3. Upload file Excel/CSV
4. Pesan konfirmasi akan muncul
5. Klik "Buat Tugas" untuk menyimpan

## Struktur Data yang Disimpan

### Task Data
```javascript
{
  surveyorId: "string",
  surveyorName: "string",
  surveyorEmail: "string",
  taskType: "existing" | "propose",
  description: "string",
  title: "string",
  deadline: "string",
  priority: "medium",
  fileData: {
    fileName: "string",
    downloadURL: "string",
    folderPath: "string",
    fileType: "kmz" | "excel"
  },
  mapData: {
    coordinates: [...],
    polygons: [...],
    lines: [...],
    center: {lat, lng},
    bounds: {minLat, maxLat, minLng, maxLng}
  } | null,
  createdBy: "admin",
  createdByName: "Admin"
}
```

## Preview Peta

### Untuk File KMZ/KML
- **Loading State**: Menampilkan spinner saat parsing file
- **Map Preview**: Menampilkan peta dengan data yang ditemukan
- **Data Summary**: Menampilkan jumlah koordinat, polygon, dan garis
- **Error Handling**: Menampilkan pesan error jika parsing gagal

### Untuk File Excel/CSV
- **Info Box**: Menampilkan pesan bahwa file siap diproses
- **No Preview**: Tidak ada preview peta karena bukan file geospatial

## Validasi File

### Format yang Didukung
- **KMZ**: File ZIP yang berisi KML
- **KML**: File XML dengan data geospatial
- **Excel**: .xlsx, .xls
- **CSV**: File teks dengan data terpisah koma

### Validasi yang Dilakukan
1. **Ekstensi File**: Memastikan ekstensi file valid
2. **Parsing KMZ/KML**: Memastikan file dapat di-parse
3. **Data Geospatial**: Memvalidasi koordinat yang ditemukan
4. **File Size**: Tidak ada batasan ukuran file (tergantung browser)

## Error Handling

### Error yang Ditangani
1. **Format File Tidak Valid**
   ```
   Error: File harus berformat KMZ/KML atau Excel/CSV
   ```

2. **Parsing KMZ/KML Gagal**
   ```
   Error: Gagal membaca file KMZ/KML. Pastikan file valid.
   ```

3. **File Kosong**
   ```
   Error: File harus diupload
   ```

4. **Form Tidak Lengkap**
   ```
   Error: Judul, deskripsi, dan surveyor wajib diisi
   ```

## Storage Structure

### Firebase Storage
```
storage/
├── kmz/
│   └── YYYY-MM-DD/
│       ├── existing_timestamp_filename.kmz
│       └── propose_timestamp_filename.kml
└── excel/
    └── YYYY-MM-DD/
        ├── existing_timestamp_filename.xlsx
        └── propose_timestamp_filename.csv
```

## Testing

### Test Cases
1. **Upload KMZ File**
   - File valid dengan polygon
   - File valid dengan koordinat titik
   - File tidak valid

2. **Upload KML File**
   - File valid dengan struktur XML benar
   - File dengan format tidak standar

3. **Upload Excel/CSV**
   - File Excel dengan data valid
   - File CSV dengan format benar

4. **Form Validation**
   - Semua field required
   - Surveyor selection
   - Deadline format

## Troubleshooting

### Masalah Umum

#### 1. Preview Peta Tidak Muncul
- **Penyebab**: File KMZ/KML tidak valid
- **Solusi**: Periksa format file dan struktur XML

#### 2. Parsing Error
- **Penyebab**: File corrupt atau format tidak standar
- **Solusi**: Gunakan file KMZ/KML yang valid dari Google Earth

#### 3. File Tidak Terupload
- **Penyebab**: Koneksi internet atau Firebase error
- **Solusi**: Periksa koneksi dan coba lagi

#### 4. Preview Loading Terus
- **Penyebab**: Error dalam parsing yang tidak tertangkap
- **Solusi**: Refresh halaman dan coba file lain

## Keuntungan Fitur Ini

1. **Fleksibilitas**: Mendukung berbagai format file
2. **Preview Real-time**: Dapat melihat data sebelum menyimpan
3. **Validasi Otomatis**: Memastikan file valid sebelum upload
4. **Organisasi**: File tersimpan di folder yang terorganisir
5. **User Experience**: Interface yang intuitif dan informatif

## Pengembangan Selanjutnya

1. **Batch Upload**: Upload multiple file sekaligus
2. **Drag & Drop**: Interface drag and drop untuk upload
3. **File Compression**: Kompresi file otomatis
4. **Advanced Validation**: Validasi lebih detail untuk setiap format
5. **Preview Enhancement**: Preview yang lebih interaktif
