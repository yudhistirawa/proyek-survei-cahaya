# Panduan Menyiapkan Firebase Admin SDK untuk Upload File KMZ

Untuk mengatasi error "Gagal menginisialisasi Firebase Admin SDK" dan memastikan file KMZ dapat diupload ke Firebase Storage, Anda perlu menyiapkan kredensial service account Firebase dengan benar.

## Langkah 1: Buat Service Account di Firebase Console

1. Buka [Firebase Console](https://console.firebase.google.com/)
2. Pilih project Anda (misal: aplikasi-survei-lampu-jalan)
3. Klik ikon roda gigi (Settings) di sebelah kiri atas, lalu pilih **Project settings**
4. Pilih tab **Service accounts**
5. Klik tombol **Generate new private key**
6. Simpan file JSON yang diunduh, misal `serviceAccountKey.json`

## Langkah 2: Tempatkan File Service Account

- Letakkan file `serviceAccountKey.json` di root folder project Anda (sejajar dengan `package.json`)

## Langkah 3: Atur Environment Variable (Opsional)

Jika Anda tidak ingin meletakkan file di root project, Anda bisa mengatur environment variable:

- `FIREBASE_SERVICE_ACCOUNT_PATH` : path lengkap ke file `serviceAccountKey.json`
  Contoh (Linux/macOS):
  ```bash
  export FIREBASE_SERVICE_ACCOUNT_PATH="/path/to/serviceAccountKey.json"
  ```
  Contoh (Windows CMD):
  ```cmd
  set FIREBASE_SERVICE_ACCOUNT_PATH=C:\path\to\serviceAccountKey.json
  ```

- Atau, Anda bisa mengatur isi JSON service account langsung ke environment variable:
  - `FIREBASE_SERVICE_ACCOUNT_JSON` : isi JSON service account sebagai string (harus di-escape dengan benar)

## Langkah 4: Restart Server

Setelah menyiapkan file atau environment variable, restart server Next.js Anda agar konfigurasi baru terbaca.

## Langkah 5: Coba Upload File KMZ

Coba upload file KMZ kembali melalui aplikasi. Jika masih ada error, periksa log server untuk melihat pesan error detail.

---

Jika Anda menggunakan layanan hosting (Vercel, Firebase Functions, dsb), pastikan environment variable sudah diatur di dashboard hosting tersebut.

---

Panduan ini akan membantu Anda mengatasi error inisialisasi Firebase Admin SDK dan memastikan upload file KMZ berjalan lancar.

Jika Anda butuh bantuan lebih lanjut, silakan beri tahu saya.
