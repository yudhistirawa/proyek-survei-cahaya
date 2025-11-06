# Fitur Dropdown Id Titik

## Deskripsi
Fitur dropdown untuk field "Id Titik" memungkinkan pengguna untuk memilih apakah ada Id Titik atau tidak. Jika "Ada" dipilih, pengguna dapat memasukkan Id Titik secara manual. Jika "Tidak Ada" dipilih, maka outputnya akan otomatis menjadi "Tidak Ada".

## Fitur Utama

### 1. **Dropdown Opsi**
- **Ada**: Menampilkan input manual untuk Id Titik
- **Tidak Ada**: Tidak menampilkan input tambahan, output otomatis "Tidak Ada"
- **Pilih opsi...**: Default state

### 2. **Input Manual Kondisional**
- Muncul otomatis ketika "Ada" dipilih
- Hilang otomatis ketika "Tidak Ada" dipilih
- Reset otomatis ketika opsi berubah

### 3. **Output Otomatis**
- Jika "Ada" dipilih: Output = nilai yang diinput manual
- Jika "Tidak Ada" dipilih: Output = "Tidak Ada"

## Cara Penggunaan

### **Alur Penggunaan:**

1. **Pilih Opsi**:
   - Tap dropdown field "Ada Id Titik"
   - Pilih "Ada" atau "Tidak Ada"

2. **Input Manual (jika "Ada" dipilih)**:
   - Field input manual muncul otomatis
   - Masukkan Id Titik sesuai kebutuhan

3. **Output Otomatis**:
   - Jika "Ada": Output = Id Titik yang diinput
   - Jika "Tidak Ada": Output = "Tidak Ada"

## Implementasi Teknis

### **Komponen Utama:**
- `renderDropdownField()` - Fungsi untuk render dropdown
- `handleInputChange()` - Handler untuk perubahan input
- State management untuk field dropdown

### **Struktur Data:**
```javascript
// Form Data
{
  adaIdTitik: 'ada',           // 'ada' | 'tidak_ada' | ''
  idTitik: 'TITIK-001',        // String (jika adaIdTitik === 'ada')
}

// Output Data
{
  adaIdTitik: 'ada',
  idTitik: 'TITIK-001'         // Nilai yang diinput manual
}

// Atau jika "Tidak Ada"
{
  adaIdTitik: 'tidak_ada',
  idTitik: 'Tidak Ada'         // Output otomatis
}
```

## Validasi

### **Validasi Otomatis:**
- Field `adaIdTitik` harus dipilih (tidak boleh kosong)
- Jika "Ada" dipilih, field `idTitik` harus diisi
- Jika "Tidak Ada" dipilih, tidak perlu input manual

### **Pesan Error:**
- "Mohon pilih opsi untuk Ada Id Titik!" - jika dropdown belum dipilih
- "Mohon isi Id Titik jika memilih 'Ada'!" - jika "Ada" dipilih tapi input kosong

## UI/UX Features

### **Visual Design:**
- **Dropdown**: Rounded border dengan hover effect
- **Input Manual**: Muncul dengan animasi smooth
- **Label**: "Ada Id Titik" untuk dropdown
- **Placeholder**: "Masukkan Id Titik" untuk input manual

### **User Experience:**
- **Responsive**: Optimal untuk mobile dan desktop
- **Accessible**: Support keyboard navigation
- **Intuitive**: Behavior yang mudah dipahami
- **Consistent**: Design yang konsisten dengan form lainnya

## Contoh Penggunaan

### **Scenario 1: Ada Id Titik**
```
Ada Id Titik: [Ada ▼]
Id Titik: [TITIK-001]

Output: {
  adaIdTitik: 'ada',
  idTitik: 'TITIK-001'
}
```

### **Scenario 2: Tidak Ada Id Titik**
```
Ada Id Titik: [Tidak Ada ▼]
// Input manual tidak muncul

Output: {
  adaIdTitik: 'tidak_ada',
  idTitik: 'Tidak Ada'
}
```

### **Scenario 3: Perubahan Opsi**
```
// Dari "Ada" ke "Tidak Ada"
Ada Id Titik: [Tidak Ada ▼]
// Input "Id Titik" hilang dan direset
// Output otomatis menjadi "Tidak Ada"
```

## Keunggulan

### **1. User Experience**
- **Sederhana**: Interface yang mudah dipahami
- **Efisien**: Tidak perlu input jika tidak ada
- **Konsisten**: Behavior yang seragam

### **2. Data Quality**
- **Struktur**: Data yang terstruktur dengan baik
- **Konsisten**: Format yang seragam
- **Lengkap**: Informasi yang komprehensif

### **3. Maintenance**
- **Modular**: Mudah ditambah field baru
- **Reusable**: Komponen yang dapat digunakan ulang
- **Scalable**: Mendukung pertumbuhan aplikasi

## Integrasi dengan Form

### **Data Storage:**
- Semua data tersimpan di Firebase
- Format data yang konsisten
- Support untuk query dan filtering

### **Project Title:**
- Otomatis menggunakan Id Titik dalam project title
- Jika "Tidak Ada": "Survey APJ Propose - Tidak Ada Id Titik"
- Jika "Ada": "Survey APJ Propose - [Id Titik]"

## Pengembangan Selanjutnya

### **Fitur yang Direncanakan:**
- Auto-generate Id Titik
- Validation format Id Titik
- Search dan filter berdasarkan Id Titik
- Export data dengan format yang berbeda

### **Optimisasi:**
- Auto-complete untuk Id Titik
- Validation rules yang lebih kompleks
- Performance optimization untuk form besar
