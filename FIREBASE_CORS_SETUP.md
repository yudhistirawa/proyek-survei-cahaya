# Firebase Storage CORS Configuration

## 🔧 Setup CORS untuk Firebase Storage

Dokumen ini menjelaskan cara mengatasi error CORS saat upload file ke Firebase Storage.

### 📋 Prerequisites

1. **Google Cloud SDK** - Pastikan `gsutil` sudah terinstall
2. **Firebase Project** - Sudah setup dan memiliki Storage bucket
3. **Bucket Name** - Nama bucket Firebase Storage Anda

### 🚀 Langkah-langkah Setup

#### 1. **Install Google Cloud SDK (jika belum)**

```bash
# Download dan install Google Cloud SDK
# https://cloud.google.com/sdk/docs/install

# Atau menggunakan package manager
# macOS
brew install google-cloud-sdk

# Windows (dengan Chocolatey)
choco install gcloudsdk

# Linux
curl https://sdk.cloud.google.com | bash
exec -l $SHELL
```

#### 2. **Login ke Google Cloud**

```bash
# Login ke akun Google Cloud
gcloud auth login

# Set project Firebase Anda
gcloud config set project YOUR_FIREBASE_PROJECT_ID
```

#### 3. **Dapatkan Nama Bucket**

```bash
# List semua bucket yang tersedia
gsutil ls

# Output akan seperti: gs://your-project-id.appspot.com
```

#### 4. **Upload Konfigurasi CORS**

```bash
# Ganti YOUR_BUCKET_NAME dengan nama bucket Anda
gsutil cors set cors.json gs://YOUR_BUCKET_NAME

# Contoh:
gsutil cors set cors.json gs://my-project-12345.appspot.com
```

#### 5. **Verifikasi Konfigurasi CORS**

```bash
# Cek konfigurasi CORS yang sudah diterapkan
gsutil cors get gs://YOUR_BUCKET_NAME

# Contoh:
gsutil cors get gs://my-project-12345.appspot.com
```

### 📁 File Konfigurasi CORS

File `cors.json` sudah dibuat dengan konfigurasi yang sesuai:

```json
[
  {
    "origin": [
      "http://localhost:3000",
      "http://localhost:3001", 
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3001",
      "https://mydomain.com",
      "https://www.mydomain.com"
    ],
    "method": [
      "GET",
      "POST", 
      "PUT",
      "DELETE",
      "HEAD",
      "OPTIONS"
    ],
    "responseHeader": [
      "Content-Type",
      "Access-Control-Allow-Origin",
      "Access-Control-Allow-Methods",
      "Access-Control-Allow-Headers",
      "Access-Control-Max-Age",
      "x-goog-meta-*",
      "x-goog-resumable",
      "x-goog-*"
    ],
    "maxAgeSeconds": 3600
  }
]
```

### 🌐 Menambahkan Origin Production

Setelah deploy ke production, Anda perlu menambahkan domain production ke konfigurasi CORS:

#### 1. **Update cors.json**

```json
[
  {
    "origin": [
      "http://localhost:3000",
      "http://localhost:3001", 
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3001",
      "https://mydomain.com",
      "https://www.mydomain.com",
      "https://your-production-domain.com",
      "https://www.your-production-domain.com"
    ],
    "method": [
      "GET",
      "POST", 
      "PUT",
      "DELETE",
      "HEAD",
      "OPTIONS"
    ],
    "responseHeader": [
      "Content-Type",
      "Access-Control-Allow-Origin",
      "Access-Control-Allow-Methods",
      "Access-Control-Allow-Headers",
      "Access-Control-Max-Age",
      "x-goog-meta-*",
      "x-goog-resumable",
      "x-goog-*"
    ],
    "maxAgeSeconds": 3600
  }
]
```

#### 2. **Upload Konfigurasi Baru**

```bash
# Upload konfigurasi CORS yang sudah diupdate
gsutil cors set cors.json gs://YOUR_BUCKET_NAME
```

### 🔍 Troubleshooting

#### Error: "gsutil command not found"
```bash
# Pastikan Google Cloud SDK sudah terinstall
gcloud --version

# Jika belum, install sesuai OS Anda
```

#### Error: "Access denied"
```bash
# Pastikan sudah login dengan akun yang benar
gcloud auth list

# Login ulang jika perlu
gcloud auth login
```

#### Error: "Bucket not found"
```bash
# Cek nama bucket yang benar
gsutil ls

# Pastikan menggunakan nama bucket yang tepat
```

#### Error: "CORS configuration is invalid"
```bash
# Validasi format JSON
cat cors.json | jq .

# Atau gunakan online JSON validator
```

### 📝 Perintah Lengkap (Copy-Paste)

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

### ⚡ Quick Setup Script

Buat file `setup-cors.sh`:

```bash
#!/bin/bash

# Setup CORS untuk Firebase Storage
echo "🔧 Setting up Firebase Storage CORS..."

# Input project ID
read -p "Enter your Firebase Project ID: " PROJECT_ID
read -p "Enter your Firebase Storage Bucket name: " BUCKET_NAME

# Set project
gcloud config set project $PROJECT_ID

# Upload CORS configuration
echo "📤 Uploading CORS configuration..."
gsutil cors set cors.json gs://$BUCKET_NAME

# Verify configuration
echo "✅ Verifying CORS configuration..."
gsutil cors get gs://$BUCKET_NAME

echo "🎉 CORS setup completed!"
```

### 🔒 Security Best Practices

1. **Jangan gunakan wildcard (*) untuk origin** - Selalu spesifik domain
2. **Hapus localhost dari production** - Hanya gunakan domain production
3. **Gunakan HTTPS** - Selalu gunakan HTTPS untuk production
4. **Monitor access logs** - Pantau akses ke bucket secara berkala

### 📚 Referensi

- [Firebase Storage CORS Documentation](https://firebase.google.com/docs/storage/web/download-files#cors_configuration)
- [Google Cloud Storage CORS](https://cloud.google.com/storage/docs/cross-origin)
- [gsutil cors command](https://cloud.google.com/storage/docs/gsutil/commands/cors)

---

**Note**: Setelah mengupload konfigurasi CORS, mungkin perlu waktu beberapa menit untuk perubahan diterapkan. Jika masih error, coba refresh browser atau tunggu beberapa menit.
