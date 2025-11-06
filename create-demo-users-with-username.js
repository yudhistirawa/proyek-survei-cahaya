// Script untuk membuat akun demo dengan username
// Jalankan dengan: node create-demo-users-with-username.js
// Pastikan untuk mengisi konfigurasi Firebase dengan benar

const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword, updateProfile } = require('firebase/auth');
const { getFirestore, doc, setDoc, collection, query, where, getDocs } = require('firebase/firestore');

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

// Data akun demo dengan username
const demoUsers = [
  {
    username: "admin",
    email: "admin@test.com",
    password: "admin12345",
    displayName: "Admin",
    role: "admin"
  },
  {
    username: "petugas_ukur",
    email: "user-measurement@example.com",
    password: "User123!",
    displayName: "Petugas Pengukuran",
    role: "petugas_pengukuran"
  },
  {
    username: "petugas_sinar",
    email: "user-uniformity@example.com",
    password: "User123!",
    displayName: "Petugas Kemerataan",
    role: "petugas_kemerataan"
  },
  {
    username: "demo_tester",
    email: "tester@demo.com",
    password: "Test123456",
    displayName: "Demo Tester",
    role: "petugas_pengukuran"
  }
];

// Fungsi untuk mengecek apakah username sudah ada
async function checkUsernameExists(username) {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('username', '==', username));
  const querySnapshot = await getDocs(q);
  return !querySnapshot.empty;
}

async function createDemoUsers() {
  console.log('Membuat akun demo dengan username...');
  
  for (const userData of demoUsers) {
    try {
      // Cek apakah username sudah ada
      const usernameExists = await checkUsernameExists(userData.username);
      if (usernameExists) {
        console.log(`⚠️  Username ${userData.username} sudah ada`);
        continue;
      }

      // Buat akun di Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        userData.email,
        userData.password
      );
      
      const user = userCredential.user;
      
      // Update profile dengan displayName
      await updateProfile(user, {
        displayName: userData.displayName
      });
      
      // Simpan data user ke Firestore dengan username
      await setDoc(doc(db, 'users', user.uid), {
        username: userData.username,
        email: userData.email,
        displayName: userData.displayName,
        role: userData.role,
        password: userData.password, // Simpan password untuk demo
        createdAt: new Date().toISOString(),
        createdBy: 'System Demo',
        isDemo: true
      });
      
      console.log(`✅ Akun ${userData.username} (${userData.email}) berhasil dibuat dengan role: ${userData.role}`);
      
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        console.log(`⚠️  Email ${userData.email} sudah digunakan`);
      } else {
        console.error(`❌ Error membuat akun ${userData.username}:`, error.message);
      }
    }
  }
  
  console.log('\n📋 Ringkasan akun demo dengan username:');
  console.log('----------------------------------------');
  demoUsers.forEach(user => {
    console.log(`${user.displayName} (${user.role}):`);
    console.log(`  Username: ${user.username}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Password: ${user.password}`);
    console.log('');
  });
  
  console.log('💡 Cara login:');
  console.log('- Gunakan USERNAME (bukan email) untuk login');
  console.log('- Contoh: username "admin" dengan password "admin12345"');
}

// Jalankan script
createDemoUsers()
  .then(() => {
    console.log('✨ Proses pembuatan akun demo dengan username selesai!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
