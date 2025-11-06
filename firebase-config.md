# Konfigurasi Firebase untuk Upload File KMZ

## Langkah 1: Buat Service Account di Firebase Console

1. Buka [Firebase Console](https://console.firebase.google.com/)
2. Pilih project `aplikasi-survei-lampu-jalan`
3. Klik **Project Settings** (ikon roda gigi)
4. Pilih tab **Service accounts**
5. Klik **Generate new private key**
6. Download file JSON service account

## Langkah 2: Buat File .env.local

Buat file `.env.local` di root project (sejajar dengan `package.json`) dengan isi:

```env
# Firebase Admin SDK Configuration
FIREBASE_PROJECT_ID=aplikasi-survei-lampu-jalan
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@aplikasi-survei-lampu-jalan.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----\n"
FIREBASE_STORAGE_BUCKET=aplikasi-survei-lampu-jalan.appspot.com

# Next.js Configuration
NEXT_PUBLIC_FIREBASE_PROJECT_ID=aplikasi-survei-lampu-jalan
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=aplikasi-survei-lampu-jalan.appspot.com
```

**Catatan:** 
- Ganti `firebase-adminsdk-xxxxx@aplikasi-survei-lampu-jalan.iam.gserviceaccount.com` dengan `client_email` dari file JSON
- Ganti `YOUR_PRIVATE_KEY_HERE` dengan `private_key` dari file JSON
- Pastikan `private_key` menggunakan format yang benar dengan `\n`

## Langkah 3: Deploy Firebase Storage Rules

Jalankan perintah berikut untuk deploy storage rules:

```bash
npm run firebase:rules
```

Atau:

```bash
firebase deploy --only storage
```

## Langkah 4: Restart Development Server

```bash
npm run dev
```

## Langkah 5: Test Upload

1. Buka aplikasi di browser
2. Masuk ke menu **Database Propose**
3. Upload file KMZ
4. File akan tersimpan di folder `kmz/YYYY/MM/DD/` di Firebase Storage

## Troubleshooting

### Error: "Firebase Storage tidak dapat diakses"
- Pastikan service account memiliki permission untuk Firebase Storage
- Cek environment variables sudah benar
- Restart development server

### Error: "Permission denied"
- Deploy Firebase Storage Rules
- Pastikan rules mengizinkan write ke folder `kmz`

### Error: "Bucket tidak ditemukan"
- Cek `FIREBASE_STORAGE_BUCKET` sudah benar
- Pastikan Firebase Storage sudah diaktifkan di project 