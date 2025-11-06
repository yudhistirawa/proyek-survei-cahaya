// Test untuk memverifikasi apakah Firebase Storage Rules sudah di-deploy
const testRulesDeployment = async () => {
  try {
    console.log('🧪 Testing Firebase Storage Rules deployment...');
    
    // Test 1: Cek apakah rules sudah di-deploy dengan mencoba upload ke folder yang dilarang
    console.log('📡 Test 1: Testing upload to forbidden folder...');
    
    const testData = {
      dataUrl: 'data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAADsAD+JaQAA3AAAAAA',
      folder: 'forbidden_folder', // Folder yang tidak ada di rules
      userId: 'test-user-123',
      docId: 'test-doc-456',
      filenameBase: 'test-photo',
      authToken: 'test-token-789'
    };
    
    const forbiddenResponse = await fetch('/api/upload-photo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testData)
    });
    
    console.log('📥 Forbidden folder response status:', forbiddenResponse.status);
    
    if (forbiddenResponse.ok) {
      console.log('❌ Rules belum di-deploy! Upload ke folder forbidden berhasil');
    } else {
      const errorData = await forbiddenResponse.json();
      console.log('✅ Rules sudah di-deploy! Upload ke folder forbidden ditolak:', errorData.error);
    }
    
    // Test 2: Cek upload ke folder yang diizinkan
    console.log('\n📡 Test 2: Testing upload to allowed folder...');
    
    const allowedData = {
      dataUrl: 'data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAADsAD+JaQAA3AAAAAA',
      folder: 'Survey_Existing', // Folder yang ada di rules
      userId: 'test-user-123',
      docId: 'test-doc-456',
      filenameBase: 'test-photo',
      authToken: 'test-token-789'
    };
    
    const allowedResponse = await fetch('/api/upload-photo', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(allowedData)
    });
    
    console.log('📥 Allowed folder response status:', allowedResponse.status);
    
    if (allowedResponse.ok) {
      const successData = await allowedResponse.json();
      console.log('✅ Upload berhasil! Rules sudah di-deploy:', successData);
    } else {
      const errorData = await allowedResponse.json();
      console.log('❌ Upload gagal meskipun folder diizinkan:', errorData);
      
      // Analyze error untuk menentukan apakah rules sudah di-deploy
      if (errorData.details && errorData.details.code) {
        if (errorData.details.code === 'storage/unknown') {
          console.log('🚨 MASALAH: Firebase Storage Rules belum di-deploy!');
          console.log('💡 SOLUSI: Deploy rules dari file storage.rules ke Firebase Console');
          console.log('📋 Langkah deploy:');
          console.log('   1. Buka Firebase Console');
          console.log('   2. Pilih project: aplikasi-survei-lampu-jalan');
          console.log('   3. Buka Storage → Rules');
          console.log('   4. Copy-paste rules dari file storage.rules');
          console.log('   5. Klik Publish');
        } else if (errorData.details.code === 'storage/unauthorized') {
          console.log('✅ Rules sudah di-deploy! Error karena permission, bukan rules');
        } else {
          console.log('🔍 Error code:', errorData.details.code);
          console.log('🔍 Error message:', errorData.details.message);
        }
      }
    }
    
    // Test 3: Cek apakah ada masalah dengan Firebase initialization
    console.log('\n📡 Test 3: Checking Firebase initialization...');
    try {
      const { initializeApp } = await import('firebase/app');
      const { getStorage } = await import('firebase/storage');
      
      const firebaseConfig = {
        apiKey: "AIzaSyBHk6Zg35hLFRbuLW_dwHSpJ3-EQ2kGhQ8",
        authDomain: "aplikasi-survei-lampu-jalan.firebaseapp.com",
        projectId: "aplikasi-survei-lampu-jalan",
        storageBucket: "aplikasi-survei-lampu-jalan.appspot.com",
        messagingSenderId: "231759165437",
        appId: "1:231759165437:web:8dafd8ffff8294c97f4b94"
      };
      
      const app = initializeApp(firebaseConfig);
      const storage = getStorage(app);
      console.log('✅ Firebase client-side initialization successful');
      
    } catch (firebaseError) {
      console.error('❌ Firebase client-side initialization failed:', firebaseError);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
};

// Jalankan test jika di browser
if (typeof window !== 'undefined') {
  console.log('🚀 Starting Firebase Storage Rules deployment test...');
  testRulesDeployment();
} else {
  console.log('Test script ready for browser execution');
}

