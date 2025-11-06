# TODO: Update Export Format untuk Valid Survey Data

## Progress Tracking

### ✅ Completed
- [x] Analisis struktur data existing
- [x] Identifikasi file yang perlu diubah
- [x] Buat rencana implementasi
- [x] Update `/api/export/route.js` dengan format baru

### 🔄 In Progress
- [ ] Test export functionality
- [ ] Verifikasi format Excel sesuai requirement

### 📋 Requirements
Format kolom Excel yang diminta:
- Nama Jalan, Nama Jalan Baru, Gang, Lebar Jalan 1, Lebar Jalan 2
- Kepemilikan Tiang, Jenis Tiang, Trafo, Lampu
- Titik Koordinat, Titik Koordinat Baru
- Lebar Bahu Bertiang (m), Lebar Trotoar Bertiang (m), Lainnya Bertiang
- Tinggi ARM (m), Keterangan
- Foto ARM, Foto Titik Aktual (hyperlink - jangan diubah)

### 📁 Files Modified
- ✅ `app/api/export/route.js` - Updated dengan format survey existing

### 🎯 Implementation Details
- ✅ Menggunakan helper functions dari export-existing-excel (`mapBuild`, `getVal`, `getCoords`)
- ✅ Mempertahankan format foto hyperlink
- ✅ Mapping semua field data ke kolom yang sesuai
- ✅ Support untuk ID filtering (export selected items)
- ✅ Worksheet name: "Rekap_Survey_Valid"
- ✅ File name: "Survey_Valid_Report.xlsx"

### 🔧 Changes Made
1. **Added Helper Functions:**
   - `mapBuild()` - untuk mapping nested data structures
   - `getVal()` - untuk flexible field extraction
   - `getCoords()` - untuk koordinat extraction

2. **Updated Column Structure:**
   - 18 kolom sesuai format survey existing
   - Header dalam Bahasa Indonesia
   - Foto columns dengan hyperlink support

3. **Enhanced Data Mapping:**
   - Flexible field mapping dengan multiple fallback options
   - Support untuk nested data dan gridData
   - Proper coordinate handling

4. **Improved Functionality:**
   - Support untuk selective export (by IDs)
   - Better error handling
   - Consistent logging
