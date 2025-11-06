// Script untuk melihat semua user di database
// Jalankan dengan: node check-users.js

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

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

async function checkAllUsers() {
  try {
    console.log('📋 Mengecek semua user di database...\n');
    
    const usersRef = collection(db, 'users');
    const querySnapshot = await getDocs(usersRef);
    
    if (querySnapshot.empty) {
      console.log('❌ Tidak ada user di database');
      return;
    }
    
    console.log(`✅ Ditemukan ${querySnapshot.size} user:\n`);
    
    querySnapshot.forEach((doc, index) => {
      const userData = doc.data();
      console.log(`${index + 1}. ${userData.displayName || 'Tanpa Nama'}`);
      console.log(`   Username: ${userData.username || 'TIDAK ADA'}`);
      console.log(`   Email: ${userData.email}`);
      console.log(`   Password: ${userData.password || 'TIDAK ADA'}`);
      console.log(`   Role: ${userData.role}`);
      console.log(`   UID: ${doc.id}`);
      console.log('');
    });
    
    // Cek khusus untuk admin
    const adminUsers = [];
    querySnapshot.forEach((doc) => {
      const userData = doc.data();
      if (userData.role === 'admin') {
        adminUsers.push(userData);
      }
    });
    
    console.log('🔑 Akun Admin yang tersedia:');
    if (adminUsers.length === 0) {
      console.log('❌ Tidak ada akun admin');
    } else {
      adminUsers.forEach((admin, index) => {
        console.log(`${index + 1}. Username: ${admin.username || 'TIDAK ADA'}`);
        console.log(`   Email: ${admin.email}`);
        console.log(`   Password: ${admin.password || 'TIDAK ADA'}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Jalankan script
checkAllUsers()
  .then(() => {
    console.log('✨ Pengecekan selesai!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
