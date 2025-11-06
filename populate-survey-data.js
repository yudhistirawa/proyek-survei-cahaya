// Script untuk menambahkan data survey ke collection surveys
const admin = require('firebase-admin');

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: 'aplikasi-survei-lampu-jalan'
  });
}

const db = admin.firestore();

async function populateSurveyData() {
  try {
    console.log('Menambahkan data survey ke collection survey-reports...');

    const surveyData = [
      // 1. Survey ARM
      {
        surveyType: 'Survey ARM',
        surveyCategory: 'arm',
        surveyZone: 'existing',
        projectTitle: 'Survey ARM - Jalan Raya Denpasar',
        projectLocation: 'Jalan Raya Denpasar, Bali',
        surveyorName: 'Petugas Survey ARM',
        
        // Data spesifik Survey ARM
        kepemilikanTiang: 'PLN',
        jenisTiang: 'Beton',
        trafo: 'Ada',
        jenisTrafo: 'Single',
        lampu: 'Ada',
        jumlahLampu: '2',
        jenisLampu: 'LED',
        titikKordinat: '-8.673690, 115.159859',
        tinggiARM: '14',
        keterangan: 'Survey ARM untuk evaluasi infrastruktur',
        
        validationStatus: 'pending',
        projectDate: admin.firestore.Timestamp.now(),
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
        isARMSurvey: true,
        lampPower: 'N/A',
        poleHeight: '14m'
      },
      
      // 2. Survey Tiang APJ Propose
      {
        surveyType: 'Survey Tiang APJ Propose',
        surveyCategory: 'tiang_apj_propose',
        surveyZone: 'propose',
        projectTitle: 'Survey Tiang APJ Propose - Usulan Jalan Melati',
        projectLocation: 'Jalan Melati, Denpasar',
        surveyorName: 'Petugas Survey Tiang',
        
        validationStatus: 'pending',
        projectDate: admin.firestore.Timestamp.now(),
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
        lampPower: '150W',
        poleHeight: '12m'
      },
      
      // 3. Survey Tiang APJ New
      {
        surveyType: 'Survey Tiang APJ New',
        surveyCategory: 'tiang_apj_new',
        surveyZone: 'existing',
        projectTitle: 'Survey Tiang APJ New - Jalan Gatot Subroto',
        projectLocation: 'Jalan Gatot Subroto, Denpasar',
        surveyorName: 'Petugas Survey Tiang',
        
        validationStatus: 'pending',
        projectDate: admin.firestore.Timestamp.now(),
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
        lampPower: '100W',
        poleHeight: '10m'
      },
      
      // 4. Survey Trafo
      {
        surveyType: 'Survey Trafo',
        surveyCategory: 'trafo',
        surveyZone: 'existing',
        projectTitle: 'Survey Trafo - Transformator Jalan Hayam Wuruk',
        projectLocation: 'Jalan Hayam Wuruk, Denpasar',
        surveyorName: 'Petugas Survey Trafo',
        
        validationStatus: 'pending',
        projectDate: admin.firestore.Timestamp.now(),
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
        lampPower: 'N/A',
        poleHeight: 'N/A'
      },
      
      // 5. Survey Fasos Fasum
      {
        surveyType: 'Survey Fasos Fasum',
        surveyCategory: 'fasos_fasum',
        surveyZone: 'existing',
        projectTitle: 'Survey Fasos Fasum - Taman Kota Denpasar',
        projectLocation: 'Taman Kota, Denpasar',
        surveyorName: 'Petugas Survey Fasos',
        
        validationStatus: 'pending',
        projectDate: admin.firestore.Timestamp.now(),
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now(),
        lampPower: '50W',
        poleHeight: '4m'
      }
    ];

    const surveysCollection = db.collection('survey-reports');
    
    for (let i = 0; i < surveyData.length; i++) {
      const docRef = await surveysCollection.add(surveyData[i]);
      console.log(`✅ ${surveyData[i].surveyType} berhasil ditambahkan dengan ID: ${docRef.id}`);
    }

    console.log('\n🎉 SEMUA DATA SURVEY BERHASIL DITAMBAHKAN!');
    console.log('\nData yang ditambahkan:');
    console.log('1. 🔧 Survey ARM - Jalan Raya Denpasar');
    console.log('2. 📋 Survey Tiang APJ Propose - Usulan Jalan Melati');
    console.log('3. 🏗️ Survey Tiang APJ New - Jalan Gatot Subroto');
    console.log('4. ⚡ Survey Trafo - Transformator Jalan Hayam Wuruk');
    console.log('5. 🏢 Survey Fasos Fasum - Taman Kota Denpasar');
    console.log('\n📱 Silakan refresh panel admin untuk melihat data ter-group dengan baik!');

  } catch (error) {
    console.error('❌ Error menambahkan data survey:', error);
  }
}

// Jalankan script
populateSurveyData().then(() => {
  console.log('✨ Script selesai');
  process.exit(0);
}).catch((error) => {
  console.error('💥 Script error:', error);
  process.exit(1);
});
