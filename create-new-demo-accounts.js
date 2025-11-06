// Script untuk membuat akun demo baru dengan username
// Jalankan dengan: node create-new-demo-accounts.js

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

// Data akun demo baru
const newDemoAccounts = [
  {
    username: "admin_baru",
    email: "admin.baru@demo.com",
    password: "admin123",
    displayName: "Admin Baru",
    role: "admin"
  },
  {
    username: "petugas1",
    email: "petugas1@demo.com", 
    password: "petugas123",
    displayName: "Petugas Satu",
    role: "petugas_pengukuran"
  },
  {
    username: "petugas2",
    email: "petugas2@demo.com",
    password: "petugas123", 
    displayName: "Petugas Dua",
    role: "petugas_kemerataan"
  },
  {
    username: "surveyor",
    email: "surveyor@demo.com",
    password: "surveyor123",
    displayName: "Surveyor Demo",
    role: "petugas_pengukuran"
  }
];

async function createNewDemoAccounts() {
  console.log('🚀 Membuat akun demo baru dengan username...\n');
  
  const usersRef = collection(db, 'users');
  const createdAccounts = [];
  const skippedAccounts = [];
  
  for (const accountData of newDemoAccounts) {
    try {
      console.log(`📝 Membuat akun: ${accountData.username}...`);
      
      // Cek apakah username sudah ada
      const usernameQuery = query(usersRef, where('username', '==', accountData.username));
      const usernameSnapshot = await getDocs(usernameQuery);
      
      if (!usernameSnapshot.empty) {
        console.log(`⚠️  Username "${accountData.username}" sudah digunakan - dilewati`);
        skippedAccounts.push(accountData.username);
        continue;
      }
      
      // Cek apakah email sudah ada
      const emailQuery = query(usersRef, where('email', '==', accountData.email));
      const emailSnapshot = await getDocs(emailQuery);
      
      if (!emailSnapshot.empty) {
        console.log(`⚠️  Email "${accountData.email}" sudah digunakan - dilewati`);
        skippedAccounts.push(accountData.username);
        continue;
      }
      
      // Buat akun di Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        accountData.email,
        accountData.password
      );
      
      const user = userCredential.user;
      
      // Update profile dengan displayName
      await updateProfile(user, {
        displayName: accountData.displayName
      });
      
      // Simpan data user ke Firestore dengan username
      await setDoc(doc(db, 'users', user.uid), {
        username: accountData.username,
        email: accountData.email,
        displayName: accountData.displayName,
        role: accountData.role,
        password: accountData.password, // Simpan password untuk demo
        createdAt: new Date().toISOString(),
        createdBy: 'Demo Script',
        isDemo: true
      });
      
      console.log(`✅ Akun "${accountData.username}" berhasil dibuat!`);
      createdAccounts.push(accountData);
      
    } catch (error) {
      console.error(`❌ Error membuat akun "${accountData.username}":`, error.message);
      skippedAccounts.push(accountData.username);
    }
  }
  
  // Tampilkan ringkasan
  console.log('\n📋 RINGKASAN PEMBUATAN AKUN:');
  console.log(`✅ Berhasil dibuat: ${createdAccounts.length} akun`);
  console.log(`⚠️  Dilewati: ${skippedAccounts.length} akun`);
  
  if (createdAccounts.length > 0) {
    console.log('\n🔑 AKUN DEMO BARU YANG BERHASIL DIBUAT:');
    createdAccounts.forEach((account, index) => {
      console.log(`${index + 1}. ${account.displayName}`);
      console.log(`   Username: ${account.username}`);
      console.log(`   Password: ${account.password}`);
      console.log(`   Role: ${account.role}`);
      console.log('');
    });
    
    console.log('💡 CARA MENGGUNAKAN:');
    console.log('1. Buka aplikasi survei');
    console.log('2. Masukkan username dan password dari daftar di atas');
    console.log('3. Klik Login');
    console.log('4. Aplikasi akan mengarahkan sesuai role user');
  }
  
  if (skippedAccounts.length > 0) {
    console.log(`\n⚠️  Akun yang dilewati: ${skippedAccounts.join(', ')}`);
  }
}

// Jalankan script
createNewDemoAccounts()
  .then(() => {
    console.log('\n✨ Proses pembuatan akun demo selesai!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
