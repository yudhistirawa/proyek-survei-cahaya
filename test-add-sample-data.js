// Simple script to add sample data to survey-reports collection
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, serverTimestamp } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyDGpAHia_wEmrhnmYjrPJdNyRR5WUVSk5k",
  authDomain: "aplikasi-survei-lampu-jalan.firebaseapp.com",
  projectId: "aplikasi-survei-lampu-jalan",
  storageBucket: "aplikasi-survei-lampu-jalan.appspot.com",
  messagingSenderId: "1092319516823",
  appId: "1:1092319516823:web:b1234567890abcdef"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const sampleData = [
  {
    projectTitle: "Survei Penerangan Jalan Raya Utama",
    projectLocation: "Jl. Sudirman, Jakarta Pusat",
    surveyorName: "Ahmad Rizki",
    lampPower: "150W",
    poleHeight: "8 meter",
    initialVoltage: "220V",
    projectDate: new Date('2024-01-15'),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    gridData: JSON.stringify([
      [null, null, null, null, null],
      [null, null, null, null, null],
      [null, null, null, null, null],
      [null, null, null, null, null],
      [null, null, null, null, null]
    ]),
    surveyorName_lowercase: "ahmad rizki"
  },
  {
    projectTitle: "Pemeliharaan Lampu Jalan Arteri",
    projectLocation: "Jl. Thamrin, Jakarta Pusat",
    surveyorName: "Siti Nurhaliza",
    lampPower: "200W",
    poleHeight: "10 meter",
    initialVoltage: "220V",
    projectDate: new Date('2024-01-20'),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    gridData: JSON.stringify([
      [null, null, null, null, null],
      [null, null, null, null, null],
      [null, null, null, null, null],
      [null, null, null, null, null],
      [null, null, null, null, null]
    ]),
    surveyorName_lowercase: "siti nurhaliza"
  },
  {
    projectTitle: "Instalasi Penerangan Baru",
    projectLocation: "Jl. Gatot Subroto, Jakarta Selatan",
    surveyorName: "Budi Santoso",
    lampPower: "100W",
    poleHeight: "6 meter",
    initialVoltage: "220V",
    projectDate: new Date('2024-01-25'),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    gridData: JSON.stringify([
      [null, null, null, null, null],
      [null, null, null, null, null],
      [null, null, null, null, null],
      [null, null, null, null, null],
      [null, null, null, null, null]
    ]),
    surveyorName_lowercase: "budi santoso"
  },
  {
    projectTitle: "Perbaikan Sistem Penerangan",
    projectLocation: "Jl. Hayam Wuruk, Jakarta Barat",
    surveyorName: "Dewi Sartika",
    lampPower: "175W",
    poleHeight: "9 meter",
    initialVoltage: "220V",
    projectDate: new Date('2024-01-30'),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    modifiedAt: serverTimestamp(),
    modifiedBy: "Admin",
    gridData: JSON.stringify([
      [null, null, null, null, null],
      [null, null, null, null, null],
      [null, null, null, null, null],
      [null, null, null, null, null],
      [null, null, null, null, null]
    ]),
    surveyorName_lowercase: "dewi sartika"
  },
  {
    projectTitle: "Survei Kondisi Lampu Jalan",
    projectLocation: "Jl. Asia Afrika, Bandung",
    surveyorName: "Rudi Hermawan",
    lampPower: "125W",
    poleHeight: "7 meter",
    initialVoltage: "220V",
    projectDate: new Date('2024-02-05'),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    gridData: JSON.stringify([
      [null, null, null, null, null],
      [null, null, null, null, null],
      [null, null, null, null, null],
      [null, null, null, null, null],
      [null, null, null, null, null]
    ]),
    surveyorName_lowercase: "rudi hermawan"
  }
];

async function addSampleData() {
  try {
    console.log('Adding sample data to survey-reports collection...');
    
    for (let i = 0; i < sampleData.length; i++) {
      const docRef = await addDoc(collection(db, 'survey-reports'), sampleData[i]);
      console.log(`Document written with ID: ${docRef.id}`);
    }
    
    console.log('Sample data added successfully!');
  } catch (error) {
    console.error('Error adding sample data:', error);
  }
}

// Run the function
addSampleData();
