// Test Firebase Admin initialization
const fs = require('fs');
const path = require('path');

// Load environment variables manually
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const equalIndex = line.indexOf('=');
    if (equalIndex !== -1) {
      const key = line.substring(0, equalIndex).trim();
      const value = line.substring(equalIndex + 1).trim();
      if (key && value) {
        process.env[key] = value;
      }
    }
  });
}

const admin = require('firebase-admin');

console.log('Testing Firebase Admin initialization...');

// Check environment variables
console.log('Environment variables:');
console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID);
console.log('FIREBASE_CLIENT_EMAIL:', process.env.FIREBASE_CLIENT_EMAIL ? 'SET' : 'NOT SET');
console.log('FIREBASE_PRIVATE_KEY:', process.env.FIREBASE_PRIVATE_KEY ? 'SET (length: ' + process.env.FIREBASE_PRIVATE_KEY.length + ')' : 'NOT SET');

try {
  if (!admin.apps.length) {
    // Clean and format private key properly
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    if (privateKey) {
      // Remove quotes if present
      privateKey = privateKey.replace(/^["']|["']$/g, '');
      // Replace escaped newlines with actual newlines
      privateKey = privateKey.replace(/\\n/g, '\n');
    }
    
    const serviceAccount = {
      project_id: process.env.FIREBASE_PROJECT_ID,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: privateKey,
    };
    
    console.log('Private key starts with:', privateKey.substring(0, 50));
    console.log('Private key ends with:', privateKey.substring(privateKey.length - 50));
    
    console.log('Initializing Firebase Admin...');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    });
    console.log('✅ Firebase Admin initialized successfully');
  }
  
  // Test Firestore connection
  console.log('Testing Firestore connection...');
  const db = admin.firestore();
  
  // Try to get a small sample of data
  db.collection('reports').limit(1).get()
    .then((snapshot) => {
      console.log('✅ Firestore connection successful');
      console.log('Documents found:', snapshot.size);
      if (snapshot.size > 0) {
        const doc = snapshot.docs[0];
        console.log('Sample document ID:', doc.id);
        console.log('Sample document keys:', Object.keys(doc.data()));
      }
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Firestore connection failed:', error.message);
      console.error('Error code:', error.code);
      console.error('Error details:', error.details);
      process.exit(1);
    });
    
} catch (error) {
  console.error('❌ Firebase Admin initialization failed:', error.message);
  process.exit(1);
}