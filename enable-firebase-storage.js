// Script to enable and configure Firebase Storage
const admin = require('firebase-admin');
const { getStorage } = require('firebase-admin/storage');

// Initialize Firebase Admin SDK
const serviceAccount = {
  // You'll need to add your service account key here
  // Download from Firebase Console > Project Settings > Service Accounts
};

try {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: 'aplikasi-survei-lampu-jalan.appspot.com'
    });
  }

  console.log('✅ Firebase Admin initialized');

  // Test storage access
  const bucket = getStorage().bucket();
  console.log('✅ Storage bucket accessed:', bucket.name);

  // Create test file to verify storage is working
  const testFile = bucket.file('test/storage-enabled-test.txt');
  const testContent = 'Firebase Storage is enabled and working - ' + new Date().toISOString();
  
  testFile.save(testContent, {
    metadata: {
      contentType: 'text/plain'
    }
  }).then(() => {
    console.log('✅ Test file created successfully');
    console.log('🎉 Firebase Storage is properly enabled and configured');
  }).catch((error) => {
    console.error('❌ Failed to create test file:', error);
    console.log('💡 This indicates Firebase Storage is not properly enabled');
  });

} catch (error) {
  console.error('❌ Firebase Admin initialization failed:', error);
  console.log('💡 Please ensure:');
  console.log('   1. Firebase Storage is enabled in Firebase Console');
  console.log('   2. Service account key is properly configured');
  console.log('   3. Storage bucket exists and is accessible');
}
