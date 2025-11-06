# Fitur Upload Dual File - Excel/CSV dan KMZ/KML

## Ringkasan Fitur

Modal "Buat Tugas Propose" telah diperbarui dengan fitur upload dual file yang memisahkan upload file Excel/CSV dan KMZ/KML. Setiap jenis file memiliki field upload terpisah dengan validasi dan preview yang sesuai.

## Perubahan Utama

### 1. **Dual Upload Fields**
- **Field Excel/CSV**: Khusus untuk file Excel (.xlsx, .xls) dan CSV
- **Field KMZ/KML**: Khusus untuk file geospatial (.kmz, .kml)
- **Preview Peta**: Otomatis muncul ketika file KMZ/KML diupload

### 2. **Validasi Terpisah**
- Validasi format file yang spesifik untuk setiap field
- Error message yang jelas untuk setiap jenis file
- Minimal satu file harus diupload

## Struktur Form Baru

### A. Field Upload Excel/CSV
```javascript
// Validasi Excel/CSV
const allowedTypes = ['.xlsx', '.xls', '.csv'];
```

**Fitur:**
- Icon dokumen Excel
- Validasi format .xlsx, .xls, .csv
- Pesan konfirmasi hijau ketika file terpilih
- Info box bahwa file siap diproses

### B. Field Upload KMZ/KML
```javascript
// Validasi KMZ/KML
const allowedTypes = ['.kmz', '.kml'];
```

**Fitur:**
- Icon peta untuk file geospatial
- Validasi format .kmz, .kml
- Preview peta otomatis
- Parsing dan validasi koordinat
- Info box dengan jumlah data geospatial

### C. Preview Peta
- **Loading State**: Spinner saat parsing file KMZ/KML
- **Map Display**: Peta interaktif dengan data yang ditemukan
- **Data Summary**: Jumlah koordinat, polygon, dan garis
- **Error Handling**: Pesan error jika parsing gagal

## State Management

### State Variables
```javascript
const [excelFile, setExcelFile] = useState(null);
const [kmzFile, setKmzFile] = useState(null);
const [mapData, setMapData] = useState(null);
const [parsingFile, setParsingFile] = useState(false);
```

### File Input Refs
```javascript
const excelFileInputRef = useRef(null);
const kmzFileInputRef = useRef(null);
```

## Event Handlers

### 1. Excel File Handler
```javascript
const handleExcelFileChange = (e) => {
  const selectedFile = e.target.files[0];
  if (selectedFile) {
    const allowedTypes = ['.xlsx', '.xls', '.csv'];
    const fileExtension = selectedFile.name.toLowerCase().substring(selectedFile.name.lastIndexOf('.'));
    
    if (!allowedTypes.includes(fileExtension)) {
      setError('File Excel harus berformat .xlsx, .xls, atau .csv');
      setExcelFile(null);
      return;
    }
    
    setExcelFile(selectedFile);
    setError('');
  }
};
```

### 2. KMZ File Handler
```javascript
const handleKMZFileChange = async (e) => {
  const selectedFile = e.target.files[0];
  if (selectedFile) {
    const allowedTypes = ['.kmz', '.kml'];
    const fileExtension = selectedFile.name.toLowerCase().substring(selectedFile.name.lastIndexOf('.'));
    
    if (!allowedTypes.includes(fileExtension)) {
      setError('File KMZ/KML harus berformat .kmz atau .kml');
      setKmzFile(null);
      setMapData(null);
      return;
    }
    
    setKmzFile(selectedFile);
    setError('');
    
    // Parse KMZ/KML file untuk preview map
    await parseKMZFile(selectedFile);
  }
};
```

## Storage Structure

### Firebase Storage Organization
```
storage/
├── excel/
│   └── YYYY-MM-DD/
│       ├── existing_timestamp_filename.xlsx
│       └── propose_timestamp_filename.csv
└── kmz/
    └── YYYY-MM-DD/
        ├── existing_timestamp_filename.kmz
        └── propose_timestamp_filename.kml
```

### Upload Function
```javascript
const uploadFileToStorage = async (file, fileType) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const fileName = `${taskType}_${timestamp}_${file.name}`;
  
  const folderPath = fileType === 'kmz'
    ? `kmz/${new Date().toISOString().split('T')[0]}`
    : `excel/${new Date().toISOString().split('T')[0]}`;
  
  const storageRef = ref(storage, `${folderPath}/${fileName}`);
  const snapshot = await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(snapshot.ref);
  
  return {
    fileName,
    downloadURL,
    folderPath,
    fileType: fileType
  };
};
```

## Task Data Structure

### Updated Task Object
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
    excelFile: {
      fileName: "string",
      downloadURL: "string",
      folderPath: "string",
      fileType: "excel"
    } | null,
    kmzFile: {
      fileName: "string",
      downloadURL: "string",
      folderPath: "string",
      fileType: "kmz"
    } | null
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

## UI Components

### 1. Excel Upload Field
- **Icon**: Dokumen Excel
- **Accept**: .xlsx, .xls, .csv
- **Color**: Green theme
- **Status**: File terpilih dengan nama file

### 2. KMZ Upload Field
- **Icon**: Peta/globe
- **Accept**: .kmz, .kml
- **Color**: Blue theme
- **Status**: File terpilih dengan nama file

### 3. Preview Map
- **Condition**: Hanya muncul jika KMZ file diupload
- **Size**: 256px height
- **Features**: Interactive map dengan data geospatial

### 4. Info Boxes
- **Excel**: Green box dengan pesan "File Excel/CSV siap untuk diproses"
- **KMZ**: Blue box dengan jumlah data geospatial
- **Requirement**: Amber box jika tidak ada file yang diupload

## Validation Rules

### 1. File Format Validation
- **Excel**: .xlsx, .xls, .csv
- **KMZ**: .kmz, .kml
- **Error**: Pesan error spesifik untuk setiap format

### 2. Upload Requirement
- **Minimum**: Minimal satu file harus diupload
- **Maximum**: Tidak ada batasan (bisa upload keduanya)
- **Error**: "Minimal satu file harus diupload (Excel/CSV atau KMZ/KML)"

### 3. Form Validation
- **Required**: Judul, deskripsi, surveyor
- **Optional**: Deadline
- **Files**: Minimal satu file

## Error Handling

### 1. File Format Errors
```
Excel: "File Excel harus berformat .xlsx, .xls, atau .csv"
KMZ: "File KMZ/KML harus berformat .kmz atau .kml"
```

### 2. Upload Requirement Errors
```
"Minimal satu file harus diupload (Excel/CSV atau KMZ/KML)"
```

### 3. Parsing Errors
```
"Gagal membaca file KMZ/KML. Pastikan file valid."
```

### 4. Form Validation Errors
```
"Judul, deskripsi, dan surveyor wajib diisi"
```

## User Experience

### 1. **Step-by-Step Process**
1. Buka modal "Buat Tugas Propose"
2. Isi form (judul, surveyor, deskripsi, deadline)
3. Upload file Excel/CSV (opsional)
4. Upload file KMZ/KML (opsional)
5. Review preview peta (jika KMZ diupload)
6. Klik "Buat Tugas"

### 2. **Visual Feedback**
- **Loading**: Spinner saat parsing KMZ/KML
- **Success**: Green/blue boxes untuk file terpilih
- **Error**: Red boxes untuk error
- **Warning**: Amber box untuk requirement

### 3. **Interactive Elements**
- **File Drop Zones**: Drag & drop visual
- **Map Preview**: Interactive Leaflet map
- **Data Summary**: Real-time data count

## Benefits

### 1. **User Clarity**
- Pemisahan yang jelas antara file Excel dan KMZ
- Validasi yang spesifik untuk setiap jenis file
- Preview yang relevan untuk setiap file type

### 2. **Flexibility**
- Bisa upload Excel saja
- Bisa upload KMZ saja
- Bisa upload keduanya
- Tidak ada batasan kombinasi

### 3. **Data Integrity**
- Validasi format file yang ketat
- Parsing dan validasi koordinat untuk KMZ
- Storage yang terorganisir

### 4. **User Experience**
- Preview peta real-time
- Feedback visual yang jelas
- Error handling yang informatif

## Testing Scenarios

### 1. **Excel Only Upload**
- Upload file .xlsx
- Verifikasi tidak ada preview peta
- Verifikasi info box Excel muncul

### 2. **KMZ Only Upload**
- Upload file .kmz
- Verifikasi preview peta muncul
- Verifikasi data geospatial ter-parse

### 3. **Both Files Upload**
- Upload Excel dan KMZ
- Verifikasi kedua info box muncul
- Verifikasi preview peta muncul

### 4. **No Files Upload**
- Coba submit tanpa file
- Verifikasi error message muncul

### 5. **Invalid File Formats**
- Upload file dengan format salah
- Verifikasi error message spesifik

## Future Enhancements

### 1. **Drag & Drop**
- Implementasi drag & drop untuk kedua field
- Visual feedback saat drag

### 2. **File Preview**
- Preview isi file Excel/CSV
- Thumbnail untuk file KMZ/KML

### 3. **Batch Upload**
- Upload multiple Excel files
- Upload multiple KMZ files

### 4. **Advanced Validation**
- Validasi isi file Excel
- Validasi struktur KMZ/KML
- File size validation

### 5. **Progress Indicators**
- Upload progress bar
- Parsing progress indicator
