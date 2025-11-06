// Script untuk memeriksa data surveyor yang ada di database
// Jalankan dengan: node check-surveyor-data.js

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs } = require('firebase/firestore');

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBHk6Zg35hLFRbuLW_dwHSpJ3-EQ2kGhQ8",
  authDomain: "aplikasi-survei-lampu-jalan.firebaseapp.com",
  projectId: "aplikasi-survei-lampu-jalan",
  storageBucket: "aplikasi-survei-lampu-jalan.firebasestorage.app",
  messagingSenderId: "231759165437",
  appId: "1:231759165437:web:8dafd8ffff8294c97f4b94"
};

// Inisialisasi Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function checkSurveyorData() {
  try {
    console.log('🔍 Memeriksa data surveyor di database...');
    
    // Cek semua user dengan role petugas_surveyor
    const usersRef = collection(db, 'users');
    const surveyorQuery = query(usersRef, where('role', '==', 'petugas_surveyor'));
    const surveyorSnapshot = await getDocs(surveyorQuery);
    
    console.log(`📊 Total surveyor dengan role 'petugas_surveyor': ${surveyorSnapshot.size}`);
    
    if (surveyorSnapshot.empty) {
      console.log('❌ Tidak ada surveyor dengan role petugas_surveyor');
    } else {
      console.log('\n👥 Daftar Surveyor:');
      console.log('==================');
      
      surveyorSnapshot.forEach((doc, index) => {
        const data = doc.data();
        console.log(`${index + 1}. ID: ${doc.id}`);
        console.log(`   Username: ${data.username || 'N/A'}`);
        console.log(`   Name: ${data.name || data.displayName || 'N/A'}`);
        console.log(`   Email: ${data.email || 'N/A'}`);
        console.log(`   Role: ${data.role || 'N/A'}`);
        console.log(`   Created: ${data.createdAt || 'N/A'}`);
        console.log('');
      });
    }
    
    // Cek semua user untuk melihat struktur data
    console.log('🔍 Memeriksa semua user di database...');
    const allUsersSnapshot = await getDocs(usersRef);
    
    console.log(`📊 Total semua user: ${allUsersSnapshot.size}`);
    
    const roleCounts = {};
    allUsersSnapshot.forEach((doc) => {
      const data = doc.data();
      const role = data.role || 'unknown';
      roleCounts[role] = (roleCounts[role] || 0) + 1;
    });
    
    console.log('\n📈 Distribusi Role:');
    console.log('==================');
    Object.entries(roleCounts).forEach(([role, count]) => {
      console.log(`${role}: ${count} user(s)`);
    });
    
    // Cek user dengan username yang spesifik
    const targetUsernames = ['sinar', 'hendi', 'riko', 'kadek'];
    console.log('\n🎯 Mencari user dengan username spesifik...');
    
    for (const username of targetUsernames) {
      const usernameQuery = query(usersRef, where('username', '==', username));
      const usernameSnapshot = await getDocs(usernameQuery);
      
      if (usernameSnapshot.empty) {
        console.log(`❌ Username '${username}' tidak ditemukan`);
      } else {
        const userData = usernameSnapshot.docs[0].data();
        console.log(`✅ Username '${username}' ditemukan:`);
        console.log(`   ID: ${usernameSnapshot.docs[0].id}`);
        console.log(`   Name: ${userData.name || userData.displayName || 'N/A'}`);
        console.log(`   Email: ${userData.email || 'N/A'}`);
        console.log(`   Role: ${userData.role || 'N/A'}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking surveyor data:', error);
  }
}

// Jalankan script
checkSurveyorData()
  .then(() => {
    console.log('\n✨ Pemeriksaan data surveyor selesai!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
