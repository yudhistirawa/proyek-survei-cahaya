// Script untuk menambahkan data test Survey ARM ke collection surveys
const admin = require('firebase-admin');

// Initialize Firebase Admin (sesuaikan dengan konfigurasi Anda)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'aplikasi-survei-lampu-jalan'
  });
}

const db = admin.firestore();

async function addTestSurveyARMData() {
  try {
    console.log('Menambahkan data test Survey ARM...');

    const testData = [
      {
        // Data Survey ARM
        kepemilikanTiang: 'PLN',
        jenisTiang: 'Beton',
        trafo: 'Ada',
        jenisTrafo: 'Single',
        lampu: 'Ada',
        jumlahLampu: '2',
        jenisLampu: 'LED',
        titikKordinat: '-8.673690, 115.159859',
        lebarJalan1: '6',
        lebarJalan2: '6',
        lebarBahuBertiang: '1.5',
        lebarTrotoarBertiang: '2',
        lainnyaBertiang: '',
        tinggiARM: '14',
        fotoTinggiARM: null,
        fotoTitikAktual: null,
        keterangan: 'Survey ARM test data 1',

        // Metadata survey
        surveyType: 'Survey ARM',
        surveyCategory: 'arm',
        surveyZone: 'existing',
        surveyorName: 'Petugas Survey ARM',
        projectTitle: 'Survey ARM - Test Location 1',
        projectLocation: '-8.673690, 115.159859',
        projectDate: admin.firestore.Timestamp.now(),

        // Status validasi
        validationStatus: 'pending',
        validatedBy: null,
        validatedAt: null,
        validationNotes: '',

        // Timestamp
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
        
        // Untuk kompatibilitas dengan sistem yang ada
        lampPower: 'N/A',
        poleHeight: '14m',
        initialVoltage: 'N/A',
        
        // Flag untuk menandai ini adalah data Survey ARM
        isARMSurvey: true,
      },
      {
        // Data Survey ARM kedua
        kepemilikanTiang: 'Pemko',
        jenisTiang: 'Besi',
        trafo: 'Tidak Ada',
        jenisTrafo: '',
        lampu: 'Ada',
        jumlahLampu: '1',
        jenisLampu: 'Konvesional',
        titikKordinat: '-8.675000, 115.160000',
        lebarJalan1: '8',
        lebarJalan2: '8',
        lebarBahuBertiang: '2',
        lebarTrotoarBertiang: '1.5',
        lainnyaBertiang: 'Median jalan',
        tinggiARM: '12',
        fotoTinggiARM: null,
        fotoTitikAktual: null,
        keterangan: 'Survey ARM test data 2',

        // Metadata survey
        surveyType: 'Survey ARM',
        surveyCategory: 'arm',
        surveyZone: 'existing',
        surveyorName: 'Petugas Survey ARM',
        projectTitle: 'Survey ARM - Test Location 2',
        projectLocation: '-8.675000, 115.160000',
        projectDate: admin.firestore.Timestamp.now(),

        // Status validasi
        validationStatus: 'pending',
        validatedBy: null,
        validatedAt: null,
        validationNotes: '',

        // Timestamp
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
        
        // Untuk kompatibilitas dengan sistem yang ada
        lampPower: 'N/A',
        poleHeight: '12m',
        initialVoltage: 'N/A',
        
        // Flag untuk menandai ini adalah data Survey ARM
        isARMSurvey: true,
      }
    ];

    const surveysCollection = db.collection('surveys');
    
    for (let i = 0; i < testData.length; i++) {
      const docRef = await surveysCollection.add(testData[i]);
      console.log(`Data test ${i + 1} berhasil ditambahkan dengan ID: ${docRef.id}`);
    }

    console.log('Semua data test Survey ARM berhasil ditambahkan!');
    console.log('Silakan cek panel admin untuk melihat data.');

  } catch (error) {
    console.error('Error menambahkan data test:', error);
  }
}

// Jalankan script
addTestSurveyARMData().then(() => {
  console.log('Script selesai');
  process.exit(0);
}).catch((error) => {
  console.error('Script error:', error);
  process.exit(1);
});
