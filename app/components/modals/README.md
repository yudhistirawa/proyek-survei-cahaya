# Universal Survey Modals

Komponen modal universal untuk menampilkan dan mengedit berbagai jenis survey dengan desain yang profesional dan modern.

## Komponen

### 1. UniversalSurveyDetailModal
Modal untuk menampilkan detail survey dengan layout yang mirip dengan gambar referensi.

### 2. UniversalSurveyEditModal
Modal untuk mengedit survey dengan field yang dapat diedit sesuai jenis survey.

## Jenis Survey yang Didukung

- **ARM**: Survey ARM dengan field lengkap
- **APJ Propose**: Survey Tiang APJ Propose
- **APJ New**: Survey Tiang APJ New
- **Trafo**: Survey Data Trafo
- **Fasos Fasum**: Survey Data Fasos Fasum

## Penggunaan

### Import Komponen
```javascript
import UniversalSurveyDetailModal from './modals/UniversalSurveyDetailModal';
import UniversalSurveyEditModal from './modals/UniversalSurveyEditModal';
```

### Contoh Penggunaan Detail Modal
```javascript
const [showDetailModal, setShowDetailModal] = useState(false);
const [selectedSurvey, setSelectedSurvey] = useState(null);

<UniversalSurveyDetailModal
  isOpen={showDetailModal}
  onClose={() => setShowDetailModal(false)}
  surveyId={selectedSurvey?.id}
  surveyType="arm" // arm, apj-propose, apj-new, trafo, fasos-fasum
  onEdit={(survey) => {
    // Handle edit action
    setShowDetailModal(false);
    handleEdit(survey);
  }}
/>
```

### Contoh Penggunaan Edit Modal
```javascript
const [showEditModal, setShowEditModal] = useState(false);

const handleSave = async (surveyId, updatedData) => {
  try {
    const response = await fetch(`/api/survey-${surveyType}/${surveyId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedData),
    });
    
    if (!response.ok) throw new Error('Gagal menyimpan');
    
    // Refresh data atau update state
    await fetchSurveys();
  } catch (error) {
    throw error;
  }
};

<UniversalSurveyEditModal
  isOpen={showEditModal}
  onClose={() => setShowEditModal(false)}
  survey={selectedSurvey}
  surveyType="arm"
  onSave={handleSave}
/>
```

## Props

### UniversalSurveyDetailModal
- `isOpen` (boolean): Status modal terbuka/tertutup
- `onClose` (function): Callback saat modal ditutup
- `surveyId` (string): ID survey yang akan ditampilkan
- `surveyType` (string): Jenis survey (arm, apj-propose, apj-new, trafo, fasos-fasum)
- `onEdit` (function, optional): Callback saat tombol edit diklik

### UniversalSurveyEditModal
- `isOpen` (boolean): Status modal terbuka/tertutup
- `onClose` (function): Callback saat modal ditutup
- `survey` (object): Data survey yang akan diedit
- `surveyType` (string): Jenis survey
- `onSave` (function): Callback untuk menyimpan perubahan

## Field yang Didukung

### ARM
- Data Kepemilikan Tiang, Jenis Tiang, Trafo, Jenis Trafo
- Lampu, Jumlah Lampu, Jenis Lampu
- Titik Koordinat, Lebar Jalan 1 & 2
- Lebar Bahu Tiang, Lebar Trotoar, Lainnya Bertiang
- Tinggi ARM, Foto Tinggi ARM, Foto Titik Aktual
- **Titik Koordinat Baru Dari Admin** (field khusus untuk admin)
- Keterangan

### APJ Propose
- ID Tiang, Trafo, Jenis, Daya
- Nama Jalan, Jumlah Lampu Tiang
- Titik Koordinat, Lebar Jalan 1 & 2
- Lebar Bahu Tiang, Lebar Trotoar
- **Titik Koordinat Baru Dari Admin**
- Keterangan

### APJ New
- Nama Jalan, Jenis Jalan Tiang
- Titik Koordinat, Lebar Jalan 1 & 2
- Lebar Bahu Tiang, Lebar Trotoar, Lainnya Bertiang
- Foto Titik Aktual
- **Titik Koordinat Baru Dari Admin**
- Keterangan

### Trafo
- Data Kepemilikan Tiang, Jenis Tiang
- Titik Koordinat, Foto Titik Aktual
- **Titik Koordinat Baru Dari Admin**
- Keterangan

### Fasos Fasum
- Data Kepemilikan Tiang, Nama Tempat, Alamat
- Jumlah Lampu, Jenis Lampu
- Titik Koordinat, Foto Titik Aktual
- **Titik Koordinat Baru Dari Admin**
- Keterangan

## Fitur Khusus

1. **Field Titik Koordinat Baru Dari Admin**: Field khusus yang hanya muncul saat editing untuk admin
2. **Upload Gambar**: Mendukung upload dan preview gambar
3. **Responsive Design**: Tampilan yang responsif untuk berbagai ukuran layar
4. **Loading States**: Indikator loading saat menyimpan data
5. **Error Handling**: Penanganan error yang user-friendly

## Styling

Modal menggunakan Tailwind CSS dengan desain yang profesional:
- Background blur untuk overlay
- Rounded corners dan shadow
- Color scheme yang konsisten
- Hover effects dan transitions
- Responsive grid layout
