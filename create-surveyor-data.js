// Script untuk membuat data surveyor yang sesuai dengan yang ditampilkan di gambar
// Jalankan dengan: node create-surveyor-data.js

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

// Data surveyor yang sesuai dengan yang ditampilkan di gambar
const surveyorUsers = [
  {
    username: "sinar",
    email: "sinar@gmail.com",
    password: "sinar123",
    displayName: "Sinar",
    role: "petugas_surveyor"
  },
  {
    username: "hendi",
    email: "hendi@gmail.com",
    password: "hendi123",
    displayName: "Hendi",
    role: "petugas_surveyor"
  },
  {
    username: "riko",
    email: "rikosimanjuntak@gmail.com",
    password: "riko123",
    displayName: "Riko",
    role: "petugas_surveyor"
  },
  {
    username: "kadek",
    email: "kadek@gmail.com",
    password: "kadek123",
    displayName: "Kadek",
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

async function createSurveyorUsers() {
  console.log('Membuat data surveyor (sinar, hendi, riko, kadek)...');
  
  for (const userData of surveyorUsers) {
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
        name: userData.displayName, // Tambahkan field name untuk kompatibilitas
        role: userData.role,
        password: userData.password, // Simpan password untuk demo
        createdAt: new Date().toISOString(),
        createdBy: 'System Demo',
        isDemo: true,
        phone: '+62 813-4567-8901',
        status: 'active'
      });
      
      console.log(`✅ Surveyor ${userData.username} (${userData.email}) berhasil dibuat`);
      
    } catch (error) {
      if (error.code === 'auth/email-already-in-use') {
        console.log(`⚠️  Email ${userData.email} sudah digunakan`);
      } else {
        console.error(`❌ Error membuat surveyor ${userData.username}:`, error.message);
      }
    }
  }
  
  console.log('\n📋 Ringkasan data surveyor yang dibuat:');
  console.log('----------------------------------------');
  surveyorUsers.forEach(user => {
    console.log(`${user.displayName}:`);
    console.log(`  Username: ${user.username}`);
    console.log(`  Email: ${user.email}`);
    console.log(`  Password: ${user.password}`);
    console.log('');
  });
  
  console.log('💡 Cara login surveyor:');
  console.log('- Gunakan USERNAME untuk login');
  console.log('- Contoh: username "sinar" dengan password "sinar123"');
  console.log('\n🎯 Role: petugas_surveyor (dapat melakukan survey lapangan)');
}

// Jalankan script
createSurveyorUsers()
  .then(() => {
    console.log('✨ Proses pembuatan data surveyor selesai!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
