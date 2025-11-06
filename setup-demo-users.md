# Setup Akun Demo

## Cara Membuat Akun Demo

### Opsi 1: Jalankan Script (Rekomendasi)
1. Pastikan Node.js terinstal
2. Install dependencies:
   ```bash
   npm install firebase firebase-admin
   ```
3. Jalankan script:
   ```bash
   node create-demo-users.js
   ```

### Opsi 2: Manual via Firebase Console

#### User 1 - Petugas Pengukuran
- **Email**: user1@demo.com
- **Password**: demo123456
- **Role**: petugas_pengukuran
- **Akses**: Hanya dashboard pengukuran

#### User 2 - Petugas Kemerataan
- **Email**: user2@demo.com
- **Password**: demo123456
- **Role**: petugas_kemerataan
- **Akses**: Hanya dashboard kemerataan sinar

#### Admin - Full Access
- **Email**: admin@demo.com
- **Password**: admin123456
- **Role**: admin
- **Akses**: Langsung masuk ke panel admin

## Cara Login
1. Buka aplikasi
2. Gunakan salah satu email dan password di atas
3. Akses akan otomatis sesuai dengan role:
   - User1 → Dashboard Pengukuran
   - User2 → Dashboard Kemerataan
   - Admin → Panel Admin

## Catatan
- Pastikan Firebase Authentication dan Firestore sudah di-setup
- Role akan disimpan di collection 'users' dengan field 'role'
- Untuk testing, gunakan akun demo ini
