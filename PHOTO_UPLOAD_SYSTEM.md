# Sistem Upload Foto ke Firebase Storage

## Overview

Sistem upload foto yang baru menggunakan API endpoint `/api/upload-photo` untuk menyimpan foto ke Firebase Storage dengan struktur folder yang terorganisir dan metadata yang lengkap.

## Struktur Folder

Foto akan tersimpan di Firebase Storage dengan struktur folder yang terorganisir:

```
Foto Survey Existing/
├── {userId}/
│   ├── {docId}/
│   │   ├── fotoPetugas_{timestamp}.webp
│   │   ├── fotoPengujian_{timestamp}.webp
│   │   ├── fotoLapangan_{timestamp}.webp
│   │   ├── fotoLampuSebelumNaik_{timestamp}.webp
│   │   ├── fotoTinggiTiang_{timestamp}.webp
│   │   ├── fotoTinggiARM_{timestamp}.webp
│   │   └── fotoTitikAktual_{timestamp}.webp
│   └── {docId2}/
│       ├── fotoPetugas_{timestamp}.webp
│       └── fotoPengujian_{timestamp}.webp
└── {userId2}/
    └── {docId}/
        └── fotoLapangan_{timestamp}.webp
```

## API Endpoint

### POST /api/upload-photo

**Request:**
```javascript
const formData = new FormData();
formData.append('photo', photoFile);
formData.append('surveyType', 'survey-existing'); // Default survey type
formData.append('userId', 'user123');
formData.append('docId', 'doc456');
formData.append('photoType', 'fotoTinggiARM');
formData.append('originalFileName', 'foto_tinggi_arm.webp'); // optional

const response = await fetch('/api/upload-photo', {
  method: 'POST',
  body: formData
});
```

**Response:**
```json
{
  "success": true,
  "downloadURL": "https://storage.googleapis.com/...",
  "path": "Foto Survey Existing/user123/doc456/fotoTinggiARM_1703123456789.webp",
  "fileName": "fotoTinggiARM_1703123456789.webp",
  "size": 1024000,
  "metadata": {
    "surveyType": "survey-existing",
    "userId": "user123",
    "docId": "doc456",
    "photoType": "fotoTinggiARM",
    "uploadedAt": "2024-01-15T10:30:45.123Z"
  }
}
```

## Helper Functions

### uploadPhotoToStorage()

```javascript
import { uploadPhotoToStorage } from '../lib/photoUpload';

const result = await uploadPhotoToStorage(
  photoFile,        // File object
  'survey-arm',     // surveyType
  'user123',        // userId
  'doc456',         // docId
  'fotoTinggiARM',  // photoType
  'foto_tinggi_arm.webp' // originalFileName (optional)
);

if (result.success) {
  console.log('Upload successful:', result.downloadURL);
} else {
  console.error('Upload failed:', result.error);
}
```

### uploadMultiplePhotos()

```javascript
import { uploadMultiplePhotos } from '../lib/photoUpload';

const photos = [
  {
    file: photoFile1,
    photoType: 'fotoPetugas',
    originalFileName: 'foto_petugas.webp'
  },
  {
    file: photoFile2,
    photoType: 'fotoPengujian',
    originalFileName: 'foto_pengujian.webp'
  }
];

const result = await uploadMultiplePhotos(
  photos,
  'survey-existing',
  'user123',
  'doc456'
);

if (result.success) {
  console.log('All uploads successful:', result.results);
} else {
  console.error('Some uploads failed:', result.errors);
}
```

## Validasi File

### validatePhotoFile()

```javascript
import { validatePhotoFile } from '../lib/photoUpload';

const validation = validatePhotoFile(file, 10); // max 10MB

if (validation.isValid) {
  // File valid, bisa diupload
} else {
  console.error('File tidak valid:', validation.error);
}
```

## Fitur Utama

### 1. Struktur Folder Terorganisir
- **Survey Type**: Mengelompokkan foto berdasarkan tipe survey
- **User ID**: Subfolder berdasarkan user yang upload
- **Document ID**: Subfolder berdasarkan dokumen survey
- **Timestamp**: Nama file menggunakan timestamp untuk menghindari konflik

### 2. Metadata Lengkap
Setiap foto menyimpan metadata:
- `originalName`: Nama file asli
- `surveyType`: Tipe survey
- `userId`: ID user yang upload
- `docId`: ID dokumen survey
- `photoType`: Tipe foto
- `uploadedAt`: Waktu upload
- `uploadedVia`: Metode upload (api-route)

### 3. Validasi File
- Tipe file harus berupa gambar
- Ukuran maksimal 10MB (konfigurasi)
- Format yang didukung: JPEG, PNG, WebP, dll

### 4. Error Handling
- Validasi input yang ketat
- Error handling yang komprehensif
- Logging yang detail untuk debugging

## Implementasi di Komponen

### DocumentationModal

```javascript
import { uploadMultiplePhotos, validatePhotoFile } from '../lib/photoUpload';

const handleComplete = async () => {
  const photosToUpload = [];
  
  for (const photoType of Object.keys(photos)) {
    if (photos[photoType] && !uploadedUrls[photoType]) {
      const validation = validatePhotoFile(photos[photoType]);
      if (!validation.isValid) {
        throw new Error(`Foto ${photoType}: ${validation.error}`);
      }
      
      photosToUpload.push({
        file: photos[photoType],
        photoType: photoType,
        originalFileName: `${photoType}_${Date.now()}.webp`
      });
    }
  }
  
  if (photosToUpload.length > 0) {
    const uploadResult = await uploadMultiplePhotos(
      photosToUpload,
      'survey-documentation',
      userId,
      docId
    );
    
    if (uploadResult.success) {
      // Handle success
    } else {
      // Handle errors
    }
  }
};
```

### SurveyARMPage

```javascript
import { uploadPhotoToStorage } from '../lib/photoUpload';

const handleSubmit = async () => {
  // ... create document first
  
  if (formData.fotoTinggiARM) {
    const fotoFile = await dataURLtoFile(formData.fotoTinggiARM, 'foto_tinggi_arm.webp');
    const result = await uploadPhotoToStorage(
      fotoFile,
      'survey-arm',
      user.uid,
      docRef.id,
      'fotoTinggiARM',
      'foto_tinggi_arm.webp'
    );
    
    if (result.success) {
      fotoTinggiARMUrl = result.downloadURL;
    }
  }
  
  // ... update document with photo URLs
};
```

## Keuntungan Sistem Baru

1. **Terorganisir**: Struktur folder yang jelas dan mudah dikelola
2. **Scalable**: Dapat menangani banyak user dan dokumen
3. **Metadata**: Informasi lengkap untuk setiap foto
4. **Error Handling**: Penanganan error yang lebih baik
5. **Reusable**: Helper functions yang bisa digunakan di seluruh aplikasi
6. **Validasi**: Validasi file yang ketat sebelum upload
7. **Performance**: Upload parallel untuk multiple photos

## Testing

### Test API Connection

```javascript
import { testPhotoUploadAPI } from '../lib/photoUpload';

const testResult = await testPhotoUploadAPI();
if (testResult.success) {
  console.log('API ready:', testResult.message);
} else {
  console.error('API error:', testResult.error);
}
```

### Test Upload

```javascript
// Test single photo upload
const testFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
const result = await uploadPhotoToStorage(
  testFile,
  'test-survey',
  'test-user',
  'test-doc',
  'testPhoto',
  'test.jpg'
);

console.log('Test result:', result);
```
