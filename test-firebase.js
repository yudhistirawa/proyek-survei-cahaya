const { initializeApp } = require('firebase/app');
const { getStorage, ref, uploadString, getDownloadURL, deleteObject } = require('firebase/storage');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBHk6Zg35hLFRbuLW_dwHSpJ3-EQ2kGhQ8",
  authDomain: "aplikasi-survei-lampu-jalan.firebaseapp.com",
  projectId: "aplikasi-survei-lampu-jalan",
  storageBucket: "aplikasi-survei-lampu-jalan.firebasestorage.app",
  messagingSenderId: "231759165437",
  appId: "1:231759165437:web:8dafd8ffff8294c97f4b94"
};

async function testFirebaseConnection() {
  try {
    console.log('Testing Firebase Storage connection...');
    console.log('Storage Bucket:', firebaseConfig.storageBucket);
    
    // Initialize Firebase
    console.log('Initializing Firebase...');
    const app = initializeApp(firebaseConfig);
    const storage = getStorage(app);
    console.log('Firebase initialized successfully');
    
    // Test 1: Create storage reference
    console.log('Testing storage reference creation...');
    const testRef = ref(storage, 'test/connection-test.txt');
    console.log('Storage reference created successfully');
    
    // Test 2: Upload test file
    console.log('Testing file upload...');
    const testData = `Test connection at ${new Date().toISOString()}`;
    const uploadResult = await uploadString(testRef, testData, 'raw', {
      contentType: 'text/plain'
    });
    console.log('File upload successful:', uploadResult);
    
    // Test 3: Get download URL
    console.log('Testing download URL retrieval...');
    const downloadURL = await getDownloadURL(testRef);
    console.log('Download URL retrieved successfully:', downloadURL);
    
    // Test 4: Delete test file
    console.log('Testing file deletion...');
    await deleteObject(testRef);
    console.log('Test file deleted successfully');
    
    console.log('All Firebase Storage tests passed!');
    console.log('Firebase Storage connection is working properly!');
    
  } catch (error) {
    console.error('Firebase Storage test failed:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    if (error.code === 'storage/unauthorized') {
      console.error('Solution: Check Firebase Storage Rules');
    } else if (error.code === 'storage/bucket-not-found') {
      console.error('Solution: Check storage bucket name');
    } else if (error.code === 'storage/network-request-failed') {
      console.error('Solution: Check internet connection');
    }
    
    process.exit(1);
  }
}

// Run the test
testFirebaseConnection();
