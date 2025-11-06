// Script untuk memperbarui data user demo yang sudah ada
// Jalankan dengan: node update-demo-users.js

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc, getDocs, collection } = require('firebase/firestore');

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

// Mapping password untuk user demo
const passwordMapping = {
  'user1@demo.com': 'demo123456',
  'user2@demo.com': 'demo123456', 
  'admin@demo.com': 'admin123456'
};

async function updateDemoUsers() {
  console.log('Memperbarui data user demo...');
  
  try {
    // Ambil semua user dari Firestore
    const usersSnapshot = await getDocs(collection(db, 'users'));
    
    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const email = userData.email;
      
      // Cek apakah user ini adalah demo user
      if (passwordMapping[email]) {
        try {
          await updateDoc(doc(db, 'users', userDoc.id), {
            password: passwordMapping[email],
            createdBy: userData.createdBy || 'System Demo',
            isDemo: true
          });
          
          console.log(`✅ User ${email} berhasil diperbarui`);
        } catch (error) {
          console.error(`❌ Error memperbarui user ${email}:`, error.message);
        }
      }
    }
    
    console.log('\n✨ Proses pembaruan data user demo selesai!');
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Jalankan script
updateDemoUsers()
  .then(() => {
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
