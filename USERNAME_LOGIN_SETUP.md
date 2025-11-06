# Setup Login dengan Username

## Daftar Akun Demo dengan Username

Berikut adalah akun demo yang telah dibuat dengan sistem username:

### 1. Admin
- **Username**: `admin`
- **Email**: admin@test.com
- **Password**: `admin12345`
- **Role**: admin
- **Akses**: Semua fitur admin + dashboard

### 2. Petugas Pengukuran
- **Username**: `petugas_ukur`
- **Email**: user-measurement@example.com
- **Password**: `User123!`
- **Role**: petugas_pengukuran
- **Akses**: Dashboard Pengukuran

### 3. Petugas Kemerataan Sinar
- **Username**: `petugas_sinar`
- **Email**: user-uniformity@example.com
- **Password**: `User123!`
- **Role**: petugas_kemerataan
- **Akses**: Dashboard Kemerataan Sinar

### 4. Demo Tester
- **Username**: `demo_tester`
- **Email**: tester@demo.com
- **Password**: `Test123456`
- **Role**: petugas_pengukuran
- **Akses**: Dashboard Pengukuran

## Cara Membuat Akun Demo

1. Jalankan script untuk membuat akun demo:
```bash
node create-demo-users-with-username.js
```

2. Script akan:
   - Membuat akun di Firebase Authentication
   - Menyimpan data user dengan username di Firestore
   - Mengecek duplikasi username
   - Menampilkan ringkasan akun yang dibuat

## Cara Login

1. Buka aplikasi
2. Di halaman login, masukkan **USERNAME** (bukan email)
3. Masukkan password
4. Klik Login

### Contoh Login:
- Username: `admin`
- Password: `admin12345`

## Fitur Username Login

- ✅ Login menggunakan username (bukan email)
- ✅ Validasi username unik saat registrasi
- ✅ Username hanya boleh huruf, angka, dan underscore
- ✅ Username minimal 3 karakter
- ✅ Error handling untuk username tidak ditemukan
- ✅ Error handling untuk password salah

## Struktur Data User di Firestore

```javascript
{
  username: "admin",
  email: "admin@wahana.com",
  displayName: "Admin",
  role: "admin",
  password: "admin12345", // Hanya untuk demo
  createdAt: "2024-01-01T00:00:00.000Z",
  createdBy: "System Demo",
  isDemo: true
}
```

## Troubleshooting

### Username tidak ditemukan
- Pastikan username diketik dengan benar (case sensitive)
- Cek apakah akun demo sudah dibuat dengan script

### Password salah
- Pastikan password diketik dengan benar
- Gunakan password yang tercantum di dokumentasi ini

### Error saat membuat akun demo
- Pastikan Firebase config sudah benar
- Pastikan koneksi internet stabil
- Cek apakah akun dengan email yang sama sudah ada

## Catatan Keamanan

⚠️ **PENTING**: Password disimpan dalam plain text hanya untuk keperluan demo. Dalam production, jangan pernah menyimpan password dalam plain text di database.
