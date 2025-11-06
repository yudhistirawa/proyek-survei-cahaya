// Script untuk mengupdate akun admin yang sudah ada dengan username
// Jalankan dengan: node update-admin-username.js

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc, collection, query, where, getDocs } = require('firebase/firestore');

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

async function updateAdminUsername() {
  try {
    console.log('Mencari akun admin...');
    
    // Cari akun admin berdasarkan email
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', 'admin@wahana.com'));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      console.log('❌ Akun admin tidak ditemukan');
      return;
    }
    
    const adminDoc = querySnapshot.docs[0];
    const adminData = adminDoc.data();
    
    console.log('📋 Data admin saat ini:', {
      email: adminData.email,
      username: adminData.username || 'TIDAK ADA',
      displayName: adminData.displayName,
      role: adminData.role
    });
    
    // Update dengan username jika belum ada
    if (!adminData.username) {
      await updateDoc(doc(db, 'users', adminDoc.id), {
        username: 'admin',
        password: 'admin12345' // Tambahkan password untuk demo
      });
      
      console.log('✅ Username "admin" berhasil ditambahkan ke akun admin');
    } else {
      console.log('ℹ️  Username sudah ada:', adminData.username);
    }
    
    // Tampilkan data final
    const updatedDoc = await getDocs(query(usersRef, where('email', '==', 'admin@wahana.com')));
    const updatedData = updatedDoc.docs[0].data();
    
    console.log('\n📋 Data admin setelah update:');
    console.log('Username:', updatedData.username);
    console.log('Email:', updatedData.email);
    console.log('Password:', updatedData.password);
    console.log('Role:', updatedData.role);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Jalankan script
updateAdminUsername()
  .then(() => {
    console.log('\n✨ Proses update selesai!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
