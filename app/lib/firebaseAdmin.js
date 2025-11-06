// Lokasi contoh: lib/firebaseAdmin.js atau utils/firebaseAdmin.js
// Sesuaikan path ini jika Anda menggunakan struktur folder yang berbeda.

import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';

// Nama variabel lingkungan yang Anda atur di Vercel.
// Pastikan nama ini sama persis dengan yang Anda gunakan di Vercel Dashboard.
const serviceAccountBase64 = process.env.FIREBASE_ADMIN_CREDENTIALS_BASE64;

// Pastikan variabel lingkungan ada.
// Jika tidak ada, ini berarti konfigurasi di Vercel belum benar atau variabelnya belum dimuat.
if (!serviceAccountBase64) {
  console.error("Kesalahan: Variabel lingkungan 'FIREBASE_ADMIN_CREDENTIALS_BASE64' tidak ditemukan.");
  // Penting: Pada lingkungan produksi, mungkin lebih baik melempar error agar aplikasi tidak berjalan tanpa kredensial.
  // throw new Error("Firebase Admin credentials missing. Please set FIREBASE_ADMIN_CREDENTIALS_BASE64.");
}

let serviceAccount;
try {
  // Decode string Base64 menjadi string JSON, lalu parse menjadi objek JavaScript.
  serviceAccount = JSON.parse(Buffer.from(serviceAccountBase64, 'base64').toString('utf8'));
} catch (e) {
  console.error("Kesalahan: Gagal mengurai kredensial Firebase Admin dari Base64. Pastikan formatnya benar.", e);
  // throw new Error("Invalid Firebase Admin credentials format.");
}

// Periksa apakah aplikasi Firebase sudah diinisialisasi untuk mencegah error "default Firebase app does not exist"
// atau "Firebase app named '[DEFAULT]' already exists".
if (!getApps().length) {
  // Hanya inisialisasi jika belum ada aplikasi yang diinisialisasi.
  initializeApp({
    credential: cert(serviceAccount),
  });
}

// Dapatkan instance aplikasi yang sudah ada atau yang baru diinisialisasi.
const adminApp = getApp();

// Dapatkan instance layanan Firestore dan Auth dari aplikasi Admin.
const db = getFirestore(adminApp);
const auth = getAuth(adminApp);

// Ekspor instance ini agar bisa digunakan di API routes atau server-side lainnya.
export { db, auth, adminApp };
