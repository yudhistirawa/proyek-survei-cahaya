import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('Testing simple import...');
    
    // Test dynamic import
            const { adminStorage, adminDb, testStorageConnection } = await import('../../lib/firebase-admin.js');
          console.log('Import successful, available exports:', { adminStorage, adminDb, testStorageConnection });
    
    return NextResponse.json({
      success: true,
      message: 'Import firebase-admin berhasil',
              availableExports: ['adminStorage', 'adminDb', 'testStorageConnection'],
              storage: adminStorage ? 'Tersedia' : 'Tidak tersedia',
        db: adminDb ? 'Tersedia' : 'Tidak tersedia',
        testStorageConnection: typeof testStorageConnection,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error importing firebase-admin:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 