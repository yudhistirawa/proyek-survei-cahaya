This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

# Sistem Manajemen Survey Cahaya

## 🔧 Setup CORS Firebase Storage

### Error CORS yang Sering Terjadi

Jika Anda mengalami error CORS saat upload file:
```
Access to XMLHttpRequest ... from origin 'http://localhost:3000' has been blocked by CORS policy
```

### Solusi Cepat

1. **Jalankan script setup otomatis:**

```bash
# Linux/Mac
chmod +x setup-cors.sh
./setup-cors.sh

# Windows PowerShell
.\setup-cors.ps1
```

2. **Atau jalankan perintah manual:**

```bash
# 1. Login ke Google Cloud
gcloud auth login

# 2. Set project Firebase
gcloud config set project YOUR_FIREBASE_PROJECT_ID

# 3. List bucket untuk mendapatkan nama bucket
gsutil ls

# 4. Upload konfigurasi CORS
gsutil cors set cors.json gs://YOUR_BUCKET_NAME

# 5. Verifikasi konfigurasi
gsutil cors get gs://YOUR_BUCKET_NAME
```

### File Konfigurasi

- `cors.json` - Konfigurasi CORS untuk development dan production
- `setup-cors.sh` - Script otomatis untuk Linux/Mac
- `setup-cors.ps1` - Script otomatis untuk Windows
- `FIREBASE_CORS_SETUP.md` - Dokumentasi lengkap setup CORS

### Menambahkan Domain Production

Setelah deploy, update `cors.json` dengan domain production Anda:

```json
{
  "origin": [
    "http://localhost:3000",
    "https://your-domain.com",
    "https://www.your-domain.com"
  ]
}
```

Kemudian jalankan:
```bash
gsutil cors set cors.json gs://YOUR_BUCKET_NAME
```

---

## Sistem Upload Foto Baru

### Alur Upload Foto yang Diperbaiki

Sistem upload foto telah diperbaiki untuk mengatasi error "Invalid image data URL format" dan memberikan pengalaman yang lebih baik:

#### 1. **Input File Langsung**
- Menggunakan `<input type="file">` langsung
- Tidak lagi menggunakan data URL yang menyebabkan error
- Validasi file dilakukan di client-side

#### 2. **Konversi WebP Otomatis**
- File gambar dikonversi ke format WebP menggunakan Canvas API
- Kualitas dapat diatur (default: 0.8)
- Resize otomatis jika gambar terlalu besar (max: 1920x1080)

#### 3. **Upload Langsung ke Firebase Storage**
- Upload langsung ke Firebase Storage tanpa melalui API route
- Path: `Survey_Existing/{timestamp}_{randomId}.webp`
- Nama file unik dengan timestamp dan random ID

#### 4. **Fungsi Utama**

```javascript
// Upload single photo dengan WebP conversion
const result = await uploadPhotoWithWebPConversion(file, folder, quality);

// Upload multiple photos
const result = await uploadMultiplePhotosWithWebP(files, folder, quality);

// Convert file ke WebP
const webpBlob = await convertFileToWebP(file, quality, maxWidth, maxHeight);

// Upload WebP blob ke storage
const result = await uploadWebPToStorage(webpBlob, folder);
```

#### 5. **Validasi File**
- Tipe file harus image/* (JPG, PNG, dll)
- Ukuran maksimal 10MB
- Error handling yang user-friendly

#### 6. **Error Handling**
- Pesan error dalam bahasa Indonesia
- Logging detail untuk debugging
- Fallback handling untuk berbagai error

#### 7. **Penggunaan di Component**

```javascript
// Handle file upload
const handleImageUpload = (field, event) => {
    const file = event.target.files[0];
    if (file) {
        // Validasi file
        if (!file.type.startsWith('image/')) {
            alert('File harus berupa gambar (JPG, PNG, dll)');
            return;
        }
        
        // Simpan file ke formData
        setFormData(prev => ({
            ...prev,
            [field]: file
        }));
    }
};

// Preview gambar
<img 
    src={formData[field] instanceof File ? URL.createObjectURL(formData[field]) : formData[field]} 
    alt={label}
    className="w-full h-32 object-cover rounded-xl"
/>

// Upload saat submit
const result = await uploadPhotoWithWebPConversion(
    formData.fotoTinggiARM,
    'Survey_Existing',
    0.8
);
```

#### 8. **Keuntungan Sistem Baru**
- ✅ Tidak ada error "Invalid image data URL format"
- ✅ Upload lebih cepat dan efisien
- ✅ File size lebih kecil dengan WebP
- ✅ Preview gambar real-time
- ✅ Error handling yang lebih baik
- ✅ Backward compatibility dengan sistem lama

#### 9. **File yang Diperbarui**
- `app/lib/photoUpload.js` - Fungsi upload baru
- `app/components/pages/SurveyExistingPage.js` - Implementasi di halaman survey
- Semua modal detail survey - Tampilan foto yang diperbaiki

#### 10. **Backward Compatibility**
- Fungsi lama tetap tersedia untuk komponen yang belum diupdate
- Tidak ada breaking changes
- Migrasi bertahap dapat dilakukan
