import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Test import firebase-admin
    const firebaseAdmin = await import('../../lib/firebase-admin.js');
    const storage = firebaseAdmin.adminStorage;
    const db = firebaseAdmin.adminDb;
    
    return NextResponse.json({
      success: true,
      message: 'Import firebase-admin berhasil',
      storage: storage ? 'Tersedia' : 'Tidak tersedia',
      db: db ? 'Tersedia' : 'Tidak tersedia',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error importing firebase-admin:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 