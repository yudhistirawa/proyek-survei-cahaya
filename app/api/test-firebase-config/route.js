import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('Testing Firebase configuration...');
    
    // Test environment variables
    const envVars = {
      FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID ? 'Set' : 'Not set',
      FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL ? 'Set' : 'Not set',
      FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY ? 'Set' : 'Not set',
      FIREBASE_STORAGE_BUCKET: process.env.FIREBASE_STORAGE_BUCKET ? 'Set' : 'Not set'
    };
    
    console.log('Environment variables status:', envVars);
    
    // Test Firebase Admin import
            const { adminApp, adminStorage, adminDb } = await import('../../lib/firebase-admin.js');
    console.log('Firebase Admin imported successfully');
    
    // Test storage
            const storage = adminStorage;
    if (storage) {
      const bucket = storage.bucket();
      console.log('Storage bucket available:', bucket.name);
      
      // Test storage connection
      try {
        const [files] = await bucket.getFiles({ maxResults: 1 });
        console.log('Storage connection successful, files count:', files.length);
      } catch (storageError) {
        console.error('Storage connection failed:', storageError);
      }
    }
    
    // Test db
            const db = adminDb;
    if (db) {
      console.log('Firestore database available');
    }
    
    return NextResponse.json({
      success: true,
      message: 'Firebase configuration test completed',
      environment: envVars,
      storage: storage ? 'Available' : 'Not available',
      db: db ? 'Available' : 'Not available',
      bucketName: storage ? storage.bucket().name : 'N/A',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error testing Firebase configuration:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 