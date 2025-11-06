// Firebase Storage Connection Test and Fix Utility
const { initializeApp, getApps } = require('firebase/app');
const { getStorage, ref, uploadBytes, getDownloadURL } = require('firebase/storage');

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBHk6Zg35hLFRbuLW_dwHSpJ3-EQ2kGhQ8",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "aplikasi-survei-lampu-jalan.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "aplikasi-survei-lampu-jalan",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "aplikasi-survei-lampu-jalan.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "231759165437",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:231759165437:web:8dafd8ffff8294c97f4b94"
};

async function testFirebaseStorageConnection() {
  console.log('🔍 Testing Firebase Storage Connection...');
  console.log('📋 Firebase Config:', {
    projectId: firebaseConfig.projectId,
    storageBucket: firebaseConfig.storageBucket,
    authDomain: firebaseConfig.authDomain
  });

  try {
    // Initialize Firebase
    const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
    console.log('✅ Firebase App initialized successfully');

    // Initialize Storage
    const storage = getStorage(app);
    console.log('✅ Firebase Storage initialized successfully');

    // Test storage reference creation
    const testRef = ref(storage, 'test/connection-test.txt');
    console.log('✅ Storage reference created successfully');

    // Test upload
    const testData = 'Firebase Storage connection test - ' + new Date().toISOString();
    const testBlob = new Blob([testData], { type: 'text/plain' });
    
    console.log('📤 Testing upload...');
    const uploadResult = await uploadBytes(testRef, testBlob);
    console.log('✅ Upload successful:', uploadResult.ref.fullPath);

    // Test download URL
    console.log('🔗 Testing download URL...');
    const downloadURL = await getDownloadURL(uploadResult.ref);
    console.log('✅ Download URL obtained:', downloadURL);

    console.log('🎉 Firebase Storage connection test PASSED');
    return true;

  } catch (error) {
    console.error('❌ Firebase Storage connection test FAILED');
    console.error('❌ Error details:', {
      code: error.code,
      message: error.message,
      name: error.name,
      stack: error.stack
    });

    // Provide specific error guidance
    if (error.code === 'storage/unknown') {
      console.log('💡 SOLUTION for storage/unknown error:');
      console.log('   1. Check if Firebase Storage is enabled in Firebase Console');
      console.log('   2. Verify storage bucket name is correct');
      console.log('   3. Check Firebase Storage rules');
      console.log('   4. Ensure proper authentication');
    } else if (error.code === 'storage/unauthorized') {
      console.log('💡 SOLUTION for unauthorized error:');
      console.log('   1. Check Firebase Storage rules');
      console.log('   2. Ensure user is properly authenticated');
    } else if (error.code === 'storage/network-request-failed') {
      console.log('💡 SOLUTION for network error:');
      console.log('   1. Check internet connection');
      console.log('   2. Verify Firebase project configuration');
    }

    return false;
  }
}

// Run the test
if (require.main === module) {
  testFirebaseStorageConnection()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Unexpected error:', error);
      process.exit(1);
    });
}

module.exports = { testFirebaseStorageConnection };
