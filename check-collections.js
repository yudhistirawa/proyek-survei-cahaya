// Test script to check both collections
const admin = require('firebase-admin');
const path = require('path');

// Initialize Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    storageBucket: 'aplikasi-survei-lampu-jalan.appspot.com'
  });
}

const db = admin.firestore();

async function checkCollections() {
  console.log('=== Checking Firestore Collections ===');
  
  try {
    // Check 'reports' collection
    console.log('\n--- Checking "reports" collection ---');
    const reportsSnapshot = await db.collection('reports').limit(10).get();
    console.log(`Found ${reportsSnapshot.docs.length} documents in "reports" collection`);
    
    if (!reportsSnapshot.empty) {
      reportsSnapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`Report ${index + 1}:`, {
          id: doc.id,
          projectTitle: data.projectTitle,
          surveyorName: data.surveyorName,
          createdAt: data.createdAt ? data.createdAt.toDate() : 'No date'
        });
      });
    }
    
    // Check 'survey-reports' collection
    console.log('\n--- Checking "survey-reports" collection ---');
    const surveyReportsSnapshot = await db.collection('survey-reports').limit(10).get();
    console.log(`Found ${surveyReportsSnapshot.docs.length} documents in "survey-reports" collection`);
    
    if (!surveyReportsSnapshot.empty) {
      surveyReportsSnapshot.docs.forEach((doc, index) => {
        const data = doc.data();
        console.log(`Survey Report ${index + 1}:`, {
          id: doc.id,
          projectTitle: data.projectTitle,
          surveyorName: data.surveyorName,
          createdAt: data.createdAt ? data.createdAt.toDate() : 'No date'
        });
      });
    }
    
    // Check all available collections
    console.log('\n--- Listing all collections ---');
    const collections = await db.listCollections();
    console.log('Available collections:', collections.map(col => col.id));
    
  } catch (error) {
    console.error('Error checking collections:', error);
  }
}

checkCollections();