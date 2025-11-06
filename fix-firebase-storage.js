// Firebase Storage Fix Script
// This script helps diagnose and fix Firebase Storage issues

const { initializeApp } = require('firebase/app');
const { getStorage, ref, uploadBytes, getDownloadURL } = require('firebase/storage');

const firebaseConfig = {
  apiKey: "AIzaSyBHk6Zg35hLFRbuLW_dwHSpJ3-EQ2kGhQ8",
  authDomain: "aplikasi-survei-lampu-jalan.firebaseapp.com",
  projectId: "aplikasi-survei-lampu-jalan",
  storageBucket: "aplikasi-survei-lampu-jalan.appspot.com",
  messagingSenderId: "231759165437",
  appId: "1:231759165437:web:8dafd8ffff8294c97f4b94"
};

async function testFirebaseStorage() {
  console.log('🧪 Testing Firebase Storage Configuration...\n');
  
  try {
    // Initialize Firebase
    console.log('1. Initializing Firebase App...');
    const app = initializeApp(firebaseConfig);
    console.log('   ✅ Firebase App initialized');
    
    // Initialize Storage
    console.log('2. Initializing Firebase Storage...');
    const storage = getStorage(app);
    console.log('   ✅ Firebase Storage initialized');
    console.log('   📁 Storage bucket:', firebaseConfig.storageBucket);
    
    // Test creating a reference
    console.log('3. Testing storage reference creation...');
    const testRef = ref(storage, 'test/connectivity-test.txt');
    console.log('   ✅ Storage reference created');
    
    // Test upload (small text file)
    console.log('4. Testing file upload...');
    const testData = new Uint8Array([72, 101, 108, 108, 111]); // "Hello" in bytes
    
    try {
      const uploadResult = await uploadBytes(testRef, testData);
      console.log('   ✅ Test upload successful');
      
      // Test download URL
      console.log('5. Testing download URL generation...');
      const downloadURL = await getDownloadURL(uploadResult.ref);
      console.log('   ✅ Download URL generated:', downloadURL.substring(0, 50) + '...');
      
    } catch (uploadError) {
      console.log('   ❌ Upload failed:', uploadError.code, uploadError.message);
      
      if (uploadError.code === 'storage/unauthorized') {
        console.log('\n🔧 Fix: Update Firebase Storage Rules');
        console.log('   - Go to Firebase Console > Storage > Rules');
        console.log('   - Deploy the updated storage.rules file');
        console.log('   - Run: firebase deploy --only storage');
      } else if (uploadError.code === 'storage/unknown') {
        console.log('\n🔧 Fix: Check Storage Bucket Configuration');
        console.log('   - Verify storage bucket name in Firebase Console');
        console.log('   - Check if Storage is enabled for your project');
        console.log('   - Ensure CORS is configured properly');
      }
    }
    
    console.log('\n📋 Configuration Summary:');
    console.log('   - Project ID:', firebaseConfig.projectId);
    console.log('   - Storage Bucket:', firebaseConfig.storageBucket);
    console.log('   - Auth Domain:', firebaseConfig.authDomain);
    
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error);
    console.log('\n🔧 Troubleshooting Steps:');
    console.log('   1. Check Firebase project configuration');
    console.log('   2. Verify API keys and project settings');
    console.log('   3. Ensure Firebase Storage is enabled');
    console.log('   4. Check network connectivity');
  }
}

async function generateStorageRulesFix() {
  console.log('\n📝 Generating Storage Rules Fix...\n');
  
  const fixedRules = `rules_version = '2';

// Firebase Storage Rules - Fixed for Survey App
service firebase.storage {
  match /b/{bucket}/o {
    
    // Survey_Existing folder - supports multiple path patterns
    match /Survey_Existing/{userId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null 
        && request.auth.uid == userId;
    }
    
    // Survey_ARM folder
    match /Survey_ARM/{userId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null 
        && request.auth.uid == userId;
    }
    
    // Survey_Tiang_APJ_Propose folder
    match /Survey_Tiang_APJ_Propose/{userId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null 
        && request.auth.uid == userId;
    }
    
    // Test folder for debugging
    match /test/{allPaths=**} {
      allow read, write: if true;
    }
    
    // KMZ files
    match /kmz/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Default deny
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}`;

  console.log('📋 Updated Storage Rules:');
  console.log(fixedRules);
  console.log('\n🔧 To apply these rules:');
  console.log('   1. Copy the rules above to your storage.rules file');
  console.log('   2. Run: firebase deploy --only storage');
  console.log('   3. Or use the deploy-storage-rules.bat script');
}

// Run the tests
console.log('🚀 Firebase Storage Diagnostic Tool\n');
testFirebaseStorage()
  .then(() => generateStorageRulesFix())
  .catch(error => {
    console.error('❌ Test failed:', error);
  });
