# 🔧 Panduan Lengkap Setup CORS Firebase Storage

## 📋 **Error yang Dialami**
```
Access to XMLHttpRequest at ... from origin 'http://localhost:3000' has been blocked by CORS policy: Response to preflight request doesn't pass access control check
```

## 🚀 **Langkah-langkah Perbaikan**

### **1. ✅ File `cors.json` Sudah Dibuat**

File `cors.json` sudah dibuat dengan konfigurasi lengkap:

```json
[
  {
    "origin": [
      "http://localhost:3000",
      "http://localhost:3001", 
      "http://127.0.0.1:3000",
      "http://127.0.0.1:3001",
      "https://my-production-domain.com",
      "https://www.my-production-domain.com"
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
      "Content-Length",
      "Content-Range",
      "Access-Control-Allow-Origin",
      "Access-Control-Allow-Methods",
      "Access-Control-Allow-Headers",
      "Access-Control-Expose-Headers",
      "Access-Control-Max-Age",
      "Access-Control-Allow-Credentials",
      "Authorization",
      "x-goog-meta-*",
      "x-goog-resumable",
      "x-goog-*",
      "x-requested-with",
      "cache-control",
      "pragma",
      "origin",
      "accept",
      "accept-encoding",
      "accept-language",
      "user-agent"
    ],
    "maxAgeSeconds": 3600
  }
]
```

### **2. 🚀 Apply CORS ke Bucket**

#### **Metode A: Script Otomatis (Recommended)**

Jalankan file `apply-cors-final.bat`:
```bash
# Double click file ini atau jalankan di Command Prompt
apply-cors-final.bat
```

#### **Metode B: Perintah Manual**

```bash
# 1. Login ke Google Cloud (jika belum)
gcloud auth login

# 2. Set project Firebase
gcloud config set project aplikasi-survei-lampu-jalan

# 3. Clear existing CORS
gsutil cors set [] gs://aplikasi-survei-lampu-jalan.appspot.com

# 4. Wait 5 seconds
timeout /t 5

# 5. Apply new CORS configuration
gsutil cors set cors.json gs://aplikasi-survei-lampu-jalan.appspot.com

# 6. Verify configuration
gsutil cors get gs://aplikasi-survei-lampu-jalan.appspot.com
```

### **3. 🧪 Testing CORS**

#### **Metode A: File HTML Test**

1. Buka file `test-cors-simple.html` di browser
2. Jalankan test CORS preflight
3. Test upload file
4. Periksa hasil summary

#### **Metode B: Browser Developer Tools**

1. Buka aplikasi Anda di `http://localhost:3000`
2. Buka Developer Tools (F12)
3. Pilih tab **Network**
4. Coba upload file
5. Periksa apakah ada error CORS di console

#### **Metode C: Command Line Test**

```bash
# Test CORS preflight request
curl -X OPTIONS \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type, Authorization" \
  https://firebasestorage.googleapis.com/v0/b/aplikasi-survei-lampu-jalan.appspot.com/o?name=test.txt
```

### **4. ⏰ Timeline Perubahan**

- **Immediate**: Konfigurasi CORS diterapkan
- **1-5 minutes**: Perubahan mulai aktif
- **10-15 minutes**: Perubahan sepenuhnya aktif
- **Jika masih error**: Refresh browser atau tunggu lebih lama

### **5. 🔄 Kapan Restart Next.js Dev Server**

**RESTART Next.js dev server setelah apply CORS:**

```bash
# 1. Stop server (Ctrl+C)
# 2. Restart server
npm run dev
# atau
yarn dev
```

**Alasan restart diperlukan:**
- Next.js menyimpan cache CORS di memory
- Browser cache juga perlu di-clear
- Firebase SDK perlu reload konfigurasi

### **6. 🔍 Verifikasi Berhasil**

Setelah apply CORS, Anda akan melihat:

#### **Di Browser Console:**
```
✅ Upload successful
✅ No CORS errors
```

#### **Di Network Tab:**
```
✅ OPTIONS request: 200 OK
✅ POST/PUT request: 200 OK
✅ CORS headers present
```

#### **Di Firebase Console:**
```
✅ Files uploaded successfully
✅ Download URLs accessible
```

### **7. 🌐 Production Setup**

Setelah deploy ke production:

1. **Update cors.json** dengan domain production:
```json
{
  "origin": [
    "http://localhost:3000",
    "https://my-production-domain.com",
    "https://www.my-production-domain.com"
  ]
}
```

2. **Apply ulang CORS**:
```bash
gsutil cors set cors.json gs://aplikasi-survei-lampu-jalan.appspot.com
```

### **8. 🔍 Troubleshooting**

#### **Error: "gsutil command not found"**
```bash
# Install Google Cloud SDK
# https://cloud.google.com/sdk/docs/install

# Windows dengan Chocolatey
choco install gcloudsdk

# macOS dengan Homebrew
brew install google-cloud-sdk
```

#### **Error: "Access denied"**
```bash
# Login ulang
gcloud auth login

# Cek akun yang aktif
gcloud auth list
```

#### **Error: "Bucket not found"**
```bash
# Cek nama bucket yang benar
gsutil ls

# Pastikan menggunakan nama yang tepat
gsutil cors set cors.json gs://aplikasi-survei-lampu-jalan.appspot.com
```

#### **Error: "CORS configuration is invalid"**
```bash
# Validasi JSON
cat cors.json | jq .

# Atau gunakan online JSON validator
```

#### **Error: "Still getting CORS error after setup"**

1. **Clear browser cache** (Ctrl+Shift+Delete)
2. **Restart Next.js dev server**
3. **Wait 15 minutes** untuk propagation
4. **Check Firebase rules** di Firebase Console
5. **Verify bucket permissions** di Google Cloud Console

### **9. 📊 Monitoring**

#### **Cek CORS Status:**
```bash
gsutil cors get gs://aplikasi-survei-lampu-jalan.appspot.com
```

#### **Cek Bucket Permissions:**
```bash
gsutil iam get gs://aplikasi-survei-lampu-jalan.appspot.com
```

#### **Cek Upload Logs:**
- Firebase Console → Storage → Usage
- Google Cloud Console → Logging

### **10. 🚨 Emergency Fix**

Jika masih error setelah semua langkah:

1. **Clear browser cache**
2. **Restart development server**
3. **Check Firebase rules**
4. **Verify bucket permissions**
5. **Wait 30 minutes** untuk propagation

---

## 🎯 **Quick Checklist**

- [ ] File `cors.json` sudah dibuat ✅
- [ ] Google Cloud SDK terinstall ✅
- [ ] Login ke Google Cloud ✅
- [ ] Apply CORS ke bucket ✅
- [ ] Verify CORS configuration ✅
- [ ] Test dengan `test-cors-simple.html` ✅
- [ ] Restart Next.js dev server ✅
- [ ] Clear browser cache ✅
- [ ] Test di aplikasi utama ✅
- [ ] Update domain production (jika perlu) ✅

**Status**: ✅ Siap untuk testing!

---

## 📞 **Support**

Jika masih mengalami masalah:

1. **Cek error logs** di browser console
2. **Cek Firebase console** untuk error details
3. **Cek Google Cloud logs** untuk server-side errors
4. **Restart dari awal** dengan langkah-langkah di atas
