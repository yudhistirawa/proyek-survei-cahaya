# 🔑 Akun Demo Baru - Sistem Login Username

Sistem login telah diubah dari email ke username. Berikut adalah akun demo yang baru dibuat untuk testing:

## 📋 Daftar Akun Demo

### 1. Admin Baru
- **Username**: `admin_baru`
- **Password**: `admin123`
- **Role**: admin
- **Akses**: Panel admin, registrasi user baru, view/edit semua laporan

### 2. Petugas Pengukuran
- **Username**: `petugas1`
- **Password**: `petugas123`
- **Role**: petugas_pengukuran
- **Akses**: Dashboard pengukuran saja

### 3. Petugas Kemerataan
- **Username**: `petugas2`
- **Password**: `petugas123`
- **Role**: petugas_kemerataan
- **Akses**: Dashboard kemerataan sinar saja

### 4. Surveyor Demo
- **Username**: `surveyor`
- **Password**: `surveyor123`
- **Role**: petugas_pengukuran
- **Akses**: Dashboard pengukuran saja

## 🚀 Cara Menggunakan

1. **Buka aplikasi survei** di browser
2. **Masukkan username** dari daftar di atas
3. **Masukkan password** yang sesuai
4. **Klik Login**
5. **Aplikasi akan mengarahkan** sesuai role user:
   - Admin → Panel Admin (dapat mendaftarkan user baru dan tetap di panel admin)
   - Petugas → Selection Page dengan dashboard sesuai role

## ✅ Perbaikan yang Telah Dilakukan

- **Fixed Registration Flow**: Setelah admin mendaftarkan user baru, sistem akan tetap berada di panel admin (tidak redirect ke dashboard pengukuran)
- **Username Integration**: Sistem registrasi sekarang menggunakan field `username` yang benar
- **Stay on Admin Page**: Admin tidak akan ter-redirect ke halaman lain setelah registrasi berhasil

## 🔧 Fitur Login Username

- ✅ Login menggunakan username (bukan email)
- ✅ Validasi username dan password
- ✅ Error handling untuk username tidak ditemukan
- ✅ Error handling untuk password salah
- ✅ Role-based access control
- ✅ Session management

## 📝 Registrasi User Baru

Admin dapat mendaftarkan user baru dengan:
- **Username**: Minimal 3 karakter, hanya huruf, angka, dan underscore
- **Email**: Untuk Firebase Auth backend
- **Password**: Minimal 6 karakter
- **Role**: Pilih antara admin, petugas_pengukuran, atau petugas_kemerataan

## 🔍 Testing

Untuk testing sistem login:

1. **Test Login Berhasil**:
   ```
   Username: admin_baru
   Password: admin123
   Expected: Masuk ke panel admin
   ```

2. **Test Login Petugas**:
   ```
   Username: petugas1
   Password: petugas123
   Expected: Masuk ke selection page dengan dashboard pengukuran
   ```

3. **Test Error Username**:
   ```
   Username: user_tidak_ada
   Password: apapun
   Expected: Error "Username tidak ditemukan"
   ```

4. **Test Error Password**:
   ```
   Username: admin_baru
   Password: password_salah
   Expected: Error "Password salah"
   ```

## 📚 Dokumentasi Teknis

- **File Auth**: `app/lib/auth.js` - Fungsi `loginWithUsername()`
- **Login Page**: `app/components/pages/LoginPage.js`
- **Register Page**: `app/components/pages/RegisterPage.js`
- **Database**: Firestore collection `users` dengan field `username`

---

**Dibuat pada**: ${new Date().toLocaleDateString('id-ID')}
**Status**: ✅ Siap digunakan
