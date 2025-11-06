# 📸 **Update Format Penamaan Foto - Survey ARM**

## 🎯 **Perubahan yang Diterapkan**

Format penamaan foto telah diupdate dari format sederhana menjadi format yang lebih informatif:

### **Sebelum (Format Lama):**
- `foto_tinggi_arm.webp`
- `foto_titik_aktual.webp`

### **Sesudah (Format Baru):**
- `foto_tinggi_arm_namajalan_namapetugas.webp`
- `foto_titik_aktual_namajalan_namapetugas.webp`

## 🔧 **Implementasi di SurveyARMPage.js**

### **1. Field Baru yang Ditambahkan**
```javascript
const [formData, setFormData] = useState({
    namaJalan: '',           // ✅ Field baru
    namaPetugas: '',         // ✅ Field baru
    kepemilikanTiang: '',
    jenisTiang: '',
    // ... field lainnya
});
```

### **2. Form Input Fields**
```javascript
{/* Basic Information Fields */}
{renderInputField('namaJalan', 'Nama Jalan', 'Masukkan nama jalan')}
{renderInputField('namaPetugas', 'Nama Petugas', 'Masukkan nama petugas')}

{/* Dropdown Fields sesuai urutan gambar */}
{renderDropdownField('kepemilikanTiang', 'Kepemilikan Tiang')}
// ... field lainnya
```

### **3. Format Penamaan Foto yang Baru**
```javascript
// Foto Tinggi ARM
const namaJalan = formData.namaJalan || 'jalan_tidak_diketahui';
const namaPetugas = formData.namaPetugas || user.displayName || user.email || 'petugas_tidak_diketahui';
const filename = `foto_tinggi_arm_${namaJalan.replace(/[^a-zA-Z0-9]/g, '_')}_${namaPetugas.replace(/[^a-zA-Z0-9]/g, '_')}.webp`;

// Foto Titik Aktual
const filename = `foto_titik_aktual_${namaJalan.replace(/[^a-zA-Z0-9]/g, '_')}_${namaPetugas.replace(/[^a-zA-Z0-9]/g, '_')}.webp`;
```

### **4. Update Survey Data**
```javascript
const surveyData = {
    // Basic Information
    namaJalan: formData.namaJalan,
    namaPetugas: formData.namaPetugas,
    
    // Data form lainnya...
    
    // Metadata dengan nama jalan
    projectTitle: `Survey ARM - ${formData.namaJalan || 'Jalan Tidak Diketahui'} - ${formData.kepemilikanTiang} - ${formData.jenisTiang}`,
    // ... metadata lainnya
};
```

## 📋 **Contoh Format Penamaan**

### **Contoh 1: Data Lengkap**
- **Nama Jalan**: "Jl. Sudirman"
- **Nama Petugas**: "John Doe"
- **Foto Tinggi ARM**: `foto_tinggi_arm_Jl_Sudirman_John_Doe.webp`
- **Foto Titik Aktual**: `foto_titik_aktual_Jl_Sudirman_John_Doe.webp`

### **Contoh 2: Data dengan Karakter Khusus**
- **Nama Jalan**: "Gang Mawar No. 123-A"
- **Nama Petugas**: "Jane Smith"
- **Foto Tinggi ARM**: `foto_tinggi_arm_Gang_Mawar_No_123_A_Jane_Smith.webp`
- **Foto Titik Aktual**: `foto_titik_aktual_Gang_Mawar_No_123_A_Jane_Smith.webp`

### **Contoh 3: Data Kosong (Fallback)**
- **Nama Jalan**: "" (kosong)
- **Nama Petugas**: "" (kosong)
- **Foto Tinggi ARM**: `foto_tinggi_arm_jalan_tidak_diketahui_petugas_tidak_diketahui.webp`
- **Foto Titik Aktual**: `foto_titik_aktual_jalan_tidak_diketahui_petugas_tidak_diketahui.webp`

## 🛡️ **Karakter Khusus Handling**

### **Karakter yang Diganti dengan Underscore (_)**
- Spasi → `_`
- Titik (.) → `_`
- Koma (,) → `_`
- Tanda hubung (-) → `_`
- Tanda kurung () → `_`
- Ampersand (&) → `_`
- Slash (/) → `_`
- Karakter khusus lainnya → `_`

### **Karakter yang Dipertahankan**
- Huruf (A-Z, a-z)
- Angka (0-9)
- Underscore (_)

## 🧪 **Testing Format Penamaan**

### **1. Test Script**
File: `test-photo-naming.js`

**Fitur:**
- Test berbagai kombinasi nama jalan dan petugas
- Verifikasi format penamaan yang benar
- Test handling karakter khusus
- Validation hasil penamaan

### **2. Cara Test**
```bash
# Jalankan test script
node test-photo-naming.js

# Output akan menampilkan:
# - Format penamaan yang dihasilkan
# - Validation hasil
# - Handling karakter khusus
```

## 📱 **User Experience**

### **1. Form Input**
- Field "Nama Jalan" di bagian atas form
- Field "Nama Petugas" di bagian atas form
- Validasi input yang user-friendly
- Placeholder text yang informatif

### **2. Preview Nama File**
- User dapat melihat format nama file sebelum upload
- Transparansi dalam penamaan file
- Mudah diidentifikasi dan dikelola

### **3. Fallback Values**
- Jika nama jalan kosong → "jalan_tidak_diketahui"
- Jika nama petugas kosong → nama user dari Firebase Auth
- Jika semua kosong → "petugas_tidak_diketahui"

## 🔄 **Migration & Backward Compatibility**

### **1. Existing Data**
- Data lama tetap tersimpan dengan format lama
- Tidak ada perubahan pada file yang sudah ada
- Hanya file baru yang menggunakan format baru

### **2. Database Schema**
- Field baru `namaJalan` dan `namaPetugas` ditambahkan
- Field lama tetap ada dan berfungsi
- Tidak ada breaking changes

### **3. File Storage**
- File lama tetap di folder yang sama
- File baru menggunakan format penamaan yang baru
- Struktur folder tidak berubah

## 🎉 **Keuntungan Format Baru**

### **1. Identifikasi File**
- Mudah mengidentifikasi lokasi survey
- Mudah mengidentifikasi petugas yang melakukan survey
- Nama file yang deskriptif dan informatif

### **2. Organisasi Data**
- File dapat dikelompokkan berdasarkan lokasi
- File dapat dikelompokkan berdasarkan petugas
- Sorting dan filtering yang lebih mudah

### **3. Audit Trail**
- Tracking siapa yang melakukan survey di lokasi tertentu
- History survey per petugas
- Accountability yang lebih baik

### **4. Maintenance**
- Mudah menemukan file untuk maintenance
- Backup dan restore yang lebih terorganisir
- Troubleshooting yang lebih mudah

## 🔗 **File yang Telah Diupdate**

- ✅ `app/components/pages/SurveyARMPage.js` - Main component dengan format baru
- ✅ `test-photo-naming.js` - Test script untuk validasi
- ✅ `PHOTO_NAMING_UPDATE.md` - Dokumentasi lengkap

## 🚀 **Cara Implementasi di Halaman Lain**

Jika ingin mengimplementasikan format yang sama di halaman survey lainnya:

### **1. Tambahkan Field Baru**
```javascript
const [formData, setFormData] = useState({
    namaJalan: '',
    namaPetugas: '',
    // ... field lainnya
});
```

### **2. Update Upload Logic**
```javascript
const filename = `foto_${photoType}_${namaJalan.replace(/[^a-zA-Z0-9]/g, '_')}_${namaPetugas.replace(/[^a-zA-Z0-9]/g, '_')}.webp`;
```

### **3. Update Survey Data**
```javascript
const surveyData = {
    namaJalan: formData.namaJalan,
    namaPetugas: formData.namaPetugas,
    // ... data lainnya
};
```

## 🎯 **Kesimpulan**

**Format penamaan foto sudah berhasil diupdate!** 🎉

- ✅ **Format baru**: `foto_tinggi_arm_namajalan_namapetugas.webp`
- ✅ **Field baru**: Nama Jalan dan Nama Petugas
- ✅ **Karakter khusus**: Handling yang robust
- ✅ **Fallback values**: Untuk data yang kosong
- ✅ **Backward compatibility**: Tidak ada breaking changes
- ✅ **User experience**: Form yang lebih informatif

**Sekarang foto survey ARM memiliki nama file yang lebih deskriptif dan mudah diidentifikasi!** 📸

Silakan test form survey ARM dan verifikasi format penamaan foto yang baru!
