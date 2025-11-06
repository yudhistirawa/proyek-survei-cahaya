# 🔌 **Survey APJ Propose - Dokumentasi Lengkap**

## 🎯 **Overview**

Survey APJ Propose adalah halaman survey untuk mengumpulkan data infrastruktur APJ (Alat Pembatas Jalan) yang diusulkan. Halaman ini dirancang dengan style yang profesional dan mobile-friendly, menggunakan format yang sama seperti Survey Existing.

## 🏗️ **Struktur Data**

### **Field yang Tersedia:**

#### **1. Basic Information**
- `namaJalan` - Nama jalan lokasi survey
- `namaPetugas` - Nama petugas yang melakukan survey

#### **2. APJ Specific Fields**
- `idTitik` - ID Titik APJ
- `dataDaya` - Data Daya (dropdown dengan pilihan VA)
- `dataTiang` - Data Tiang (dropdown dengan pilihan tipe tiang)
- `dataRuas` - Data Ruas (dropdown dengan pilihan ruas)
- `jarakAntarTiang` - Jarak antar tiang dalam meter

#### **3. Location & Road Data**
- `titikKordinat` - Koordinat GPS lokasi (otomatis)
- `lebarJalan1` - Lebar jalan 1 dalam meter
- `lebarJalan2` - Lebar jalan 2 dalam meter
- `lebarBahuBertiang` - Lebar bahu bertiang dalam meter
- `lebarTrotoarBertiang` - Lebar trotoar bertiang dalam meter
- `lainnyaBertiang` - Data lainnya terkait tiang

#### **4. Media & Documentation**
- `fotoTitikAktual` - Foto titik aktual lokasi (format WebP)
- `keterangan` - Catatan tambahan survey

## 📱 **UI/UX Features**

### **1. Mobile-First Design**
- Responsive layout yang optimal untuk mobile
- Touch-friendly input fields
- Smooth animations dan transitions
- Professional color scheme (grayscale dengan aksen biru)

### **2. Interactive Elements**
- **Dropdown Fields**: Dengan animasi dan hover effects
- **Location Field**: GPS integration dengan status indicators
- **Image Upload**: Drag & drop dengan preview
- **Map Modal**: Interactive map dengan OpenStreetMap
- **Floating Submit Button**: Fixed position untuk kemudahan akses

### **3. Visual Feedback**
- Loading states untuk semua operasi
- Success/error indicators
- Progress animations
- Hover effects pada semua interactive elements

## 🔧 **Technical Implementation**

### **1. State Management**
```javascript
const [formData, setFormData] = useState({
    namaJalan: '',
    namaPetugas: '',
    idTitik: '',
    dataDaya: '',
    dataTiang: '',
    dataRuas: '',
    jarakAntarTiang: '',
    titikKordinat: '',
    lebarJalan1: '',
    lebarJalan2: '',
    lebarBahuBertiang: '',
    lebarTrotoarBertiang: '',
    lainnyaBertiang: '',
    fotoTitikAktual: null,
    keterangan: ''
});
```

### **2. Dropdown Options**
```javascript
const dropdownOptions = {
    dataDaya: ['450 VA', '900 VA', '1300 VA', '2200 VA', '3500 VA', '4400 VA', '5500 VA', '6600 VA', '7700 VA', '8800 VA', '11000 VA', '13200 VA', '16500 VA', '22000 VA', '33000 VA', '44000 VA', '55000 VA', '66000 VA', '77000 VA', '88000 VA', '110000 VA', '132000 VA', '165000 VA', '220000 VA', '330000 VA', '440000 VA', '550000 VA', '660000 VA', '770000 VA', '880000 VA', '1100000 VA'],
    dataTiang: ['Tiang TR', 'Tiang TM', 'Tiang Beton', 'Tiang Besi', 'Tiang Kayu', 'Tiang Lainnya'],
    dataRuas: ['Ruas 1', 'Ruas 2', 'Ruas 3', 'Ruas 4', 'Ruas 5', 'Ruas 6', 'Ruas 7', 'Ruas 8', 'Ruas 9', 'Ruas 10']
};
```

### **3. Image Processing**
- **Format Conversion**: Otomatis konversi ke WebP
- **Resize**: Auto-resize untuk gambar besar (max 1920x1080)
- **Quality**: WebP quality 0.8 (80%) untuk optimal file size
- **Validation**: File size limit 10MB

## 🗄️ **Database & Storage**

### **1. Firestore Collection**
- **Collection Name**: `APJ_Propose`
- **Document Structure**: Sesuai dengan formData + metadata

### **2. Firebase Storage**
- **Folder**: `Survey_APJ_Propose`
- **Path Structure**: `Survey_APJ_Propose/{userId}/{docId}/{filename}`
- **File Format**: WebP dengan naming convention yang informatif

### **3. File Naming Convention**
```
foto_titik_aktual_{namajalan}_{namapetugas}.webp
```
**Contoh:**
- `foto_titik_aktual_Jl_Sudirman_John_Doe.webp`
- `foto_titik_aktual_Gang_Mawar_Jane_Smith.webp`

## 📍 **Location & Mapping**

### **1. GPS Integration**
- **High Accuracy**: `enableHighAccuracy: true`
- **Timeout**: 10 detik
- **Maximum Age**: 5 menit untuk cached location

### **2. Interactive Map**
- **Provider**: OpenStreetMap (gratis)
- **Features**: 
  - Real-time coordinate display
  - Google Maps integration
  - Copy coordinates functionality
  - Zoom dan pan controls

### **3. Error Handling**
- Network error detection
- GPS permission handling
- Fallback location methods
- User-friendly error messages

## 🎨 **Styling & CSS**

### **1. Color Scheme**
- **Primary**: Blue gradient (`from-blue-500 to-indigo-600`)
- **Success**: Green gradient (`from-green-500 to-green-600`)
- **Background**: Light slate (`bg-slate-100`)
- **Cards**: White dengan transparency (`bg-white/90`)

### **2. Typography**
- **Font**: Inter (Google Fonts)
- **Weights**: Medium (500), Semibold (600), Bold (700)
- **Sizes**: Responsive dari mobile ke desktop

### **3. Spacing & Layout**
- **Container**: `max-w-md mx-auto` untuk mobile optimization
- **Padding**: `px-6 py-6` untuk breathing room
- **Margins**: `mb-4` untuk field separation
- **Border Radius**: `rounded-2xl` untuk modern look

## 🔄 **Form Flow**

### **1. Initialization**
1. Component mount
2. Get current location (GPS)
3. Set user authentication state
4. Initialize form data

### **2. User Input**
1. Fill basic information
2. Select APJ specific data
3. Upload photo (optional)
4. Add notes/description

### **3. Validation & Submission**
1. Client-side validation
2. Create Firestore document
3. Upload photo to Storage
4. Update document with photo URL
5. Reset form & show success message

## 🚀 **Performance Features**

### **1. Image Optimization**
- **Lazy Loading**: Images load only when needed
- **WebP Format**: Modern image format dengan compression
- **Auto-resize**: Prevents oversized uploads
- **Quality Control**: Consistent file sizes

### **2. State Management**
- **Efficient Updates**: Only update changed fields
- **Memory Management**: Cleanup on unmount
- **Optimistic UI**: Immediate feedback for user actions

### **3. Network Optimization**
- **Retry Mechanism**: 3 attempts for failed uploads
- **Timeout Handling**: 30 detik untuk API calls
- **Error Recovery**: Graceful fallbacks

## 🧪 **Testing & Validation**

### **1. Form Validation**
- Required field checking
- Data type validation
- File size limits
- Image format validation

### **2. Error Handling**
- Network error recovery
- GPS failure fallbacks
- Upload retry logic
- User-friendly error messages

### **3. Edge Cases**
- Offline mode handling
- Large file uploads
- Invalid GPS data
- Storage quota exceeded

## 📱 **Mobile Optimization**

### **1. Touch Interface**
- **Button Sizes**: Minimum 44px untuk touch targets
- **Spacing**: Adequate spacing between interactive elements
- **Gestures**: Support untuk swipe dan tap

### **2. Responsive Design**
- **Breakpoints**: Mobile-first approach
- **Layout**: Single column untuk mobile
- **Navigation**: Easy back button access

### **3. Performance**
- **Loading States**: Visual feedback untuk semua operations
- **Smooth Scrolling**: Optimized untuk mobile devices
- **Memory Usage**: Efficient untuk low-end devices

## 🔗 **Integration Points**

### **1. Firebase Services**
- **Authentication**: User login state
- **Firestore**: Data storage
- **Storage**: Photo uploads
- **Functions**: Server-side processing

### **2. External APIs**
- **OpenStreetMap**: Interactive mapping
- **Google Maps**: External map links
- **Geolocation API**: GPS coordinates

### **3. Internal Components**
- **MiniMapsComponent**: Task integration
- **usePageTitle**: Dynamic page titles
- **Error Boundaries**: Error handling

## 📊 **Data Export & Reporting**

### **1. Survey Data Structure**
```javascript
{
    // Basic Information
    namaJalan: string,
    namaPetugas: string,
    
    // APJ Data
    idTitik: string,
    dataDaya: string,
    dataTiang: string,
    dataRuas: string,
    jarakAntarTiang: number,
    
    // Location & Road
    titikKordinat: string,
    lebarJalan1: number,
    lebarJalan2: number,
    lebarBahuBertiang: number,
    lebarTrotoarBertiang: number,
    lainnyaBertiang: string,
    
    // Media
    fotoTitikAktual: string, // URL
    
    // Metadata
    surveyType: 'Survey APJ Propose',
    surveyCategory: 'survey_apj_propose',
    projectTitle: string,
    projectLocation: string,
    projectDate: string,
    surveyorName: string,
    surveyorEmail: string,
    userId: string,
    status: 'pending',
    isValidated: false,
    createdAt: Timestamp,
    modifiedAt: Timestamp
}
```

### **2. Export Formats**
- **CSV**: Untuk spreadsheet analysis
- **JSON**: Untuk API integration
- **PDF**: Untuk official reports
- **Excel**: Untuk detailed analysis

## 🎯 **Use Cases**

### **1. Field Survey**
- Petugas melakukan survey di lokasi APJ
- Mengumpulkan data infrastruktur
- Dokumentasi foto lokasi
- GPS coordinates untuk mapping

### **2. Data Collection**
- Input data daya dan tiang
- Pengukuran dimensi jalan
- Catatan kondisi lokasi
- Metadata surveyor

### **3. Planning & Analysis**
- Data untuk perencanaan APJ
- Analisis kebutuhan infrastruktur
- Budget planning
- Resource allocation

## 🔒 **Security & Privacy**

### **1. Authentication**
- Firebase Auth integration
- User-specific data access
- Token-based API calls
- Session management

### **2. Data Validation**
- Input sanitization
- File type validation
- Size limits enforcement
- SQL injection prevention

### **3. Access Control**
- User-based permissions
- Collection-level security
- Storage bucket rules
- API endpoint protection

## 🚀 **Future Enhancements**

### **1. Advanced Features**
- **Offline Mode**: Work without internet
- **Batch Upload**: Multiple photos at once
- **Auto-save**: Draft saving functionality
- **Sync**: Background data synchronization

### **2. Analytics & Reporting**
- **Survey Statistics**: Completion rates
- **Performance Metrics**: Upload success rates
- **User Analytics**: Usage patterns
- **Export Options**: Multiple format support

### **3. Integration**
- **GIS Systems**: Advanced mapping
- **ERP Systems**: Business process integration
- **Mobile Apps**: Native app development
- **API Access**: Third-party integrations

## 📋 **Deployment Checklist**

### **1. Pre-deployment**
- [ ] Firebase project setup
- [ ] Storage rules configuration
- [ ] Firestore indexes
- [ ] Environment variables

### **2. Testing**
- [ ] Form validation
- [ ] Photo upload functionality
- [ ] GPS integration
- [ ] Error handling
- [ ] Mobile responsiveness

### **3. Production**
- [ ] Performance optimization
- [ ] Error monitoring
- [ ] User analytics
- [ ] Backup procedures

## 🎉 **Conclusion**

Survey APJ Propose adalah halaman survey yang lengkap dan profesional, dirancang khusus untuk mobile dengan fitur-fitur modern:

- ✅ **Mobile-First Design** dengan UI/UX yang optimal
- ✅ **Complete Form Fields** untuk data APJ yang lengkap
- ✅ **Photo Upload** dengan format WebP dan naming convention yang informatif
- ✅ **GPS Integration** dengan interactive mapping
- ✅ **Firebase Integration** untuk data storage dan photo management
- ✅ **Professional Styling** dengan color scheme yang modern
- ✅ **Error Handling** yang robust dan user-friendly
- ✅ **Performance Optimization** untuk mobile devices

**Halaman ini siap untuk production dan dapat digunakan untuk survey APJ yang efisien dan profesional!** 🚀
