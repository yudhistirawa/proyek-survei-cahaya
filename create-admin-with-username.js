// Script untuk membuat akun admin dengan username
// Jalankan dengan: node create-admin-with-username.js

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

// Data admin
const adminData = {
  username: "admin",
  email: "admin@wahana.com",
  password: "admin12345",
  displayName: "Admin",
  role: "admin"
};

async function createAdminAccount() {
  try {
    console.log('Membuat akun admin dengan username...');
    
    // Cek apakah username sudah ada
    const usersRef = collection(db, 'users');
    const usernameQuery = query(usersRef, where('username', '==', adminData.username));
    const usernameSnapshot = await getDocs(usernameQuery);
    
    if (!usernameSnapshot.empty) {
      console.log(`⚠️  Username "${adminData.username}" sudah digunakan`);
      return;
    }
    
    // Buat akun di Firebase Auth
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      adminData.email,
      adminData.password
    );
    
    const user = userCredential.user;
    
    // Update profile dengan displayName
    await updateProfile(user, {
      displayName: adminData.displayName
    });
    
    // Simpan data user ke Firestore dengan username
    await setDoc(doc(db, 'users', user.uid), {
      username: adminData.username,
      email: adminData.email,
      displayName: adminData.displayName,
      role: adminData.role,
      password: adminData.password, // Simpan password untuk demo
      createdAt: new Date().toISOString(),
      createdBy: 'System',
      isDemo: true
    });
    
    console.log(`✅ Akun admin berhasil dibuat!`);
    console.log('📋 Detail akun:');
    console.log(`  Username: ${adminData.username}`);
    console.log(`  Email: ${adminData.email}`);
    console.log(`  Password: ${adminData.password}`);
    console.log(`  Role: ${adminData.role}`);
    
    console.log('\n💡 Cara login:');
    console.log('- Buka aplikasi');
    console.log('- Masukkan username: admin');
    console.log('- Masukkan password: admin12345');
    console.log('- Klik Login');
    
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      console.log(`⚠️  Email ${adminData.email} sudah digunakan`);
      console.log('Mencoba mengupdate data yang ada...');
      
      // Cari user berdasarkan email dan update dengan username
      try {
        const emailQuery = query(usersRef, where('email', '==', adminData.email));
        const emailSnapshot = await getDocs(emailQuery);
        
        if (!emailSnapshot.empty) {
          const userDoc = emailSnapshot.docs[0];
          await updateDoc(doc(db, 'users', userDoc.id), {
            username: adminData.username,
            password: adminData.password
          });
          console.log('✅ Data admin berhasil diupdate dengan username');
        }
      } catch (updateError) {
        console.error('❌ Error mengupdate data:', updateError.message);
      }
    } else {
      console.error(`❌ Error membuat akun admin:`, error.message);
    }
  }
}

// Jalankan script
createAdminAccount()
  .then(() => {
    console.log('\n✨ Proses selesai!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
