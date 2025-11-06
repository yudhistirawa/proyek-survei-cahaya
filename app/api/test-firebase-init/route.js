import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('Testing Firebase Admin initialization...');
    
    // Test import dan inisialisasi
            const { adminApp, adminStorage, adminDb } = await import('../../lib/firebase-admin.js');
    console.log('Firebase Admin imported successfully');
    
    // Test storage
            const storage = adminStorage;
    if (storage) {
      const bucket = storage.bucket();
      console.log('Storage bucket available:', bucket.name);
    }
    
    // Test db
            const db = adminDb;
    if (db) {
      console.log('Firestore database available');
    }
    
    // Test functions
            const { testStorageConnection, deleteFileFromStorage } = await import('../../lib/firebase-admin.js');
    
    return NextResponse.json({
      success: true,
      message: 'Firebase Admin berhasil diinisialisasi',
      storage: storage ? 'Tersedia' : 'Tidak tersedia',
      db: db ? 'Tersedia' : 'Tidak tersedia',
      testStorageConnection: typeof testStorageConnection,
      deleteFileFromStorage: typeof deleteFileFromStorage,
      bucketName: storage ? storage.bucket().name : 'N/A',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error testing Firebase Admin initialization:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 