# Setup Survey Existing - Sistem Manajemen Survei

## Overview

Komponen Survey Existing telah dibuat untuk menangani form input survey existing dengan penyimpanan ke Firebase database dan konversi foto ke format WebP. Komponen ini mengatasi masalah CORS yang terjadi pada Firebase Storage.

## Fitur Utama

### ✅ Form Input Lengkap
- **Informasi Dasar**: Nama Jalan, Nama Gang
- **Data Tiang**: Kepemilikan Tiang, Jenis Tiang, Jenis Tiang PLN
- **Data Trafo**: Trafo, Jenis Trafo, Tinggi Bawah Trafo, Tinggi Batas R
- **Data Lampu**: Lampu, Jumlah Lampu, Jenis Lampu
- **Lokasi**: Titik Koordinat (otomatis atau manual)
- **Pengukuran**: Lebar Jalan 1 & 2, Lebar Bahu/Trotoar, Tinggi ARM
- **Foto**: Foto Tinggi ARM, Foto Titik Aktual
- **Keterangan**: Catatan tambahan

### ✅ Penyimpanan Data
- **Firebase Firestore**: Data disimpan di collection `surveys`
- **Firebase Storage**: Foto disimpan di folder `survey-existing/`
- **Format WebP**: Foto otomatis dikonversi ke format WebP untuk optimasi

### ✅ Keamanan & Validasi
- **Autentikasi**: Hanya user yang login yang dapat menyimpan data
- **Validasi Input**: Validasi data sebelum penyimpanan
- **Error Handling**: Penanganan error yang komprehensif

## Setup Awal

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Firebase CORS

Untuk mengatasi masalah CORS pada Firebase Storage, jalankan script setup:

```bash
# Pastikan Google Cloud SDK terinstall
# Download dari: https://cloud.google.com/sdk/docs/install

# Login ke Google Cloud
gcloud auth login

# Jalankan script setup CORS
node setup-firebase-cors.js
```

### 3. Konfigurasi Environment Variables

Pastikan file `.env.local` berisi konfigurasi Firebase:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

## Penggunaan

### 1. Import Komponen

```javascript
import SurveyExistingPage from './components/pages/SurveyExistingPage';

// Dalam komponen parent
const [showSurveyExisting, setShowSurveyExisting] = useState(false);

// Render komponen
{showSurveyExisting && (
  <SurveyExistingPage onBack={() => setShowSurveyExisting(false)} />
)}
```

### 2. Navigasi

Komponen dapat diakses melalui:
- Menu utama aplikasi
- Routing: `/survey-existing`
- Modal atau drawer

### 3. Form Input

1. **Isi data dasar** (Nama Jalan/Gang)
2. **Pilih kepemilikan dan jenis tiang**
3. **Isi data trafo** (jika ada)
4. **Isi data lampu**
5. **Dapatkan lokasi** (otomatis atau manual)
6. **Isi pengukuran**
7. **Upload foto** (opsional)
8. **Tambahkan keterangan**
9. **Klik Simpan**

## Struktur Data

### Firebase Firestore Collection: `surveys`

```javascript
{
  // Survey Existing fields
  namaJalan: string,
  namaGang: string,
  kepemilikanTiang: string, // 'PLN', 'Pemko', 'Swadaya'
  jenisTiang: string, // 'Besi', 'Beton', 'Kayu'
  jenisTiangPLN: string, // 'Tiang TR', 'Tiang TM'
  trafo: string, // 'Ada', 'Tidak Ada'
  jenisTrafo: string, // 'Double', 'Single'
  tinggiBawahTrafo: number,
  tinggiBatasR: number,
  lampu: string, // 'Ada', 'Tidak Ada'
  jumlahLampu: number,
  jenisLampu: string, // 'Konvensional', 'LED', 'Swadaya'
  titikKordinat: string,
  lebarJalan1: number,
  lebarJalan2: number,
  lebarBahuBertiang: number,
  lebarTrotoarBertiang: number,
  lainnyaBertiang: string,
  tinggiARM: number,
  fotoTinggiARM: string, // URL Firebase Storage
  fotoTitikAktual: string, // URL Firebase Storage
  keterangan: string,

  // Metadata
  surveyType: 'Survey Existing',
  surveyCategory: 'survey_existing',
  surveyZone: 'existing',
  surveyorName: string,
  surveyorId: string,
  projectTitle: string,
  projectLocation: string,
  projectDate: Timestamp,
  createdAt: Timestamp,
  updatedAt: Timestamp,

  // Status validasi
  validationStatus: 'pending' | 'validated' | 'rejected',
  validatedBy: string | null,
  validatedAt: Timestamp | null,
  validationNotes: string
}
```

### Firebase Storage Structure

```
survey-existing/
├── foto-tinggi-arm-{timestamp}.webp
├── foto-titik-aktual-{timestamp}.webp
└── ...
```

## API Endpoints

### POST `/api/survey-existing`
Menyimpan data survey existing ke Firebase

**Request Body:**
```javascript
{
  namaJalan: string,
  namaGang: string,
  // ... semua field survey existing
  surveyorName: string,
  surveyorId: string
}
```

**Response:**
```javascript
{
  success: true,
  message: 'Survey Existing berhasil disimpan',
  surveyId: string
}
```

### GET `/api/survey-existing`
Mengambil data survey existing

**Query Parameters:**
- `surveyorId`: Filter berdasarkan surveyor
- `limit`: Jumlah data yang diambil (default: 50)

**Response:**
```javascript
{
  success: true,
  data: Array<SurveyData>,
  total: number
}
```

## Troubleshooting

### Masalah CORS
Jika masih mengalami masalah CORS:

1. **Pastikan script CORS sudah dijalankan:**
   ```bash
   node setup-firebase-cors.js
   ```

2. **Cek status CORS:**
   ```bash
   gsutil cors get gs://your-project.appspot.com
   ```

3. **Restart aplikasi** setelah mengatur CORS

### Masalah Upload Foto
Jika foto gagal diupload:

1. **Cek koneksi internet**
2. **Pastikan user sudah login**
3. **Cek ukuran foto** (disarankan < 5MB)
4. **Cek format foto** (akan dikonversi ke WebP)

### Masalah Geolokasi
Jika lokasi tidak dapat didapatkan:

1. **Izinkan akses lokasi** di browser
2. **Cek koneksi GPS** (untuk mobile)
3. **Input manual** koordinat jika diperlukan

## Optimasi

### Performa
- **WebP Conversion**: Foto otomatis dikonversi ke WebP untuk ukuran lebih kecil
- **Lazy Loading**: Komponen dimuat sesuai kebutuhan
- **Error Boundaries**: Penanganan error yang graceful

### Keamanan
- **Input Validation**: Validasi data sebelum penyimpanan
- **Authentication**: Hanya user yang login yang dapat menyimpan
- **File Type Check**: Validasi tipe file untuk upload foto

## Monitoring

### Logs
Komponen menghasilkan logs untuk monitoring:

```javascript
// Success logs
console.log('✅ Survey Existing berhasil disimpan dengan ID:', docRef.id);
console.log('✅ Gambar berhasil diupload ke:', fullPath);

// Error logs
console.error('❌ Error saving survey:', error);
console.error('❌ Error uploading image:', error);
```

### Metrics
- Jumlah survey yang disimpan
- Ukuran foto yang diupload
- Waktu response API
- Error rate

## Update & Maintenance

### Menambah Field Baru
1. Update `formData` state di `SurveyExistingPage.js`
2. Tambahkan field di form render
3. Update API route untuk handle field baru
4. Update dokumentasi

### Mengubah Validasi
1. Update fungsi validasi di `handleSubmit`
2. Update error messages
3. Test dengan berbagai input

### Mengubah UI/UX
1. Update styling di komponen
2. Test responsiveness
3. Update dokumentasi screenshot

## Support

Untuk bantuan teknis atau pertanyaan:
- Cek dokumentasi ini
- Review error logs di console
- Hubungi tim development

---

**Versi**: 1.0.0  
**Terakhir Update**: December 2024  
**Maintainer**: Development Team
