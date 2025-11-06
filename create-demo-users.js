// Script untuk membuat akun demo dengan role yang berbeda
// Jalankan dengan: node create-demo-users.js
// Pastikan untuk mengisi konfigurasi Firebase dengan benar

const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, doc, setDoc } = require('firebase/firestore');

// Firebase config yang diberikan oleh user
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
const auth = getAuth(app);
const db = getFirestore(app);

// Data akun demo
const demoUsers = [
  {
    email: 'user1@demo.com',
    password: 'demo123456',
    displayName: 'Petugas Pengukuran',
    role: 'petugas_pengukuran'
  },
  {
    email: 'user2@demo.com',
    password: 'demo123456',
    displayName: 'Petugas Kemerataan',
    role: 'petugas_kemerataan'
  },
  {
    email: 'admin@demo.com',
    password: 'admin123456',
    displayName: 'Administrator',
    role: 'admin'
  }
];

async function createDemoUsers() {
  console.log('Membuat akun demo...');
  
  for (const userData of demoUsers) {
    try {
      // Buat akun di Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        userData.email,
        userData.password
      );
      
      const user = userCredential.user;
      
      // Simpan data user ke Firestore
      await setDoc(doc(db, 'users', user.uid), {
        email: userData.email,
        displayName: userData.displayName,
        role: userData.role,
        password: userData.password, // Simpan password untuk demo
        createdAt: new Date().toISOString(),
        createdBy: 'System Demo',
        isDemo: true
      });
      
      console.log(`✅ Akun ${userData.email} berhasil dibuat dengan role: ${userData.role}`);
      
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        console.log(`⚠️  Akun ${userData.email} sudah ada`);
      } else {
        console.error(`❌ Error membuat akun ${userData.email}:`, error.message);
      }
    }
  }
  
  console.log('\n📋 Ringkasan akun demo:');
  console.log('------------------------');
  demoUsers.forEach(user => {
    console.log(`${user.displayName} (${user.role}):`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Password: ${user.password}`);
    console.log('');
  });
}

// Jalankan script
createDemoUsers()
  .then(() => {
    console.log('✨ Proses pembuatan akun demo selesai!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
