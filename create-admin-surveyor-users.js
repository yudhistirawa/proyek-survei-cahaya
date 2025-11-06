// Script untuk membuat akun admin dan surveyor demo
// Jalankan dengan: node create-admin-surveyor-users.js

const { initializeApp } = require('firebase/app');
const { getAuth, createUserWithEmailAndPassword, updateProfile } = require('firebase/auth');
const { getFirestore, doc, setDoc, collection, query, where, getDocs } = require('firebase/firestore');

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
const auth = getAuth(app);
const db = getFirestore(app);

// Data akun demo dengan role yang sesuai untuk admin panel
const demoUsers = [
  {
    username: "admin_survey",
    email: "admin.survey@test.com",
    password: "admin12345",
    displayName: "Admin Survey",
    role: "admin_survey"
  },
  {
    username: "surveyor1",
    email: "surveyor1@test.com",
    password: "surveyor123",
    displayName: "Petugas Surveyor 1",
    role: "petugas_surveyor"
  },
  {
    username: "surveyor2",
    email: "surveyor2@test.com",
    password: "surveyor123",
    displayName: "Petugas Surveyor 2",
    role: "petugas_surveyor"
  },
  {
    username: "surveyor3",
    email: "surveyor3@test.com",
    password: "surveyor123",
    displayName: "Petugas Surveyor 3",
    role: "petugas_surveyor"
  }
];

// Fungsi untuk mengecek apakah username sudah ada
async function checkUsernameExists(username) {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '==', username));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Error checking username:', error);
    return false;
  }
}

async function createDemoUsers() {
  console.log('Membuat akun admin dan surveyor demo...');
  
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
        isDemo: true,
        phone: userData.role === 'admin_survey' ? '+62 812-3456-7890' : '+62 813-4567-8901',
        status: 'active'
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
  
  console.log('\n📋 Ringkasan akun demo admin dan surveyor:');
  console.log('--------------------------------------------');
  demoUsers.forEach(user => {
    console.log(`${user.displayName} (${user.role}):`);
    console.log(`  Username: ${user.username}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Password: ${user.password}`);
    console.log('');
  });
  
  console.log('💡 Cara login:');
  console.log('- Gunakan USERNAME (bukan email) untuk login');
  console.log('- Admin: username "admin_survey" dengan password "admin12345"');
  console.log('- Surveyor: username "surveyor1" dengan password "surveyor123"');
  console.log('\n🎯 Role yang dibuat:');
  console.log('- admin_survey: Dapat mengakses panel admin');
  console.log('- petugas_surveyor: Dapat melakukan survey lapangan');
}

// Jalankan script
createDemoUsers()
  .then(() => {
    console.log('✨ Proses pembuatan akun admin dan surveyor demo selesai!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
