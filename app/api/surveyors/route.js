import { NextResponse } from 'next/server';
import { adminDb } from '../../lib/firebase-admin.js';

export async function GET() {
  try {
    console.log('API surveyors dipanggil');
    
    // Validasi koneksi database
    if (!adminDb) {
      console.error('Firestore Admin tidak tersedia');
      return NextResponse.json({
        success: false,
        error: 'Database tidak tersedia'
      }, { status: 500 });
    }

    // Menggunakan Firebase Admin SDK syntax
    const surveyorsRef = adminDb.collection('users');
    const snapshot = await surveyorsRef.where('role', '==', 'petugas_surveyor').get();
    
    const surveyors = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || data.username || 'Surveyor',
        username: data.username || '',
        email: data.email || '',
        role: data.role || 'petugas_surveyor',
        ...data
      };
    });

    console.log(`Berhasil mengambil ${surveyors.length} surveyor:`, surveyors.map(s => s.name));

    return NextResponse.json({
      success: true,
      data: surveyors
    });
  } catch (error) {
    console.error('Error fetching surveyors:', error);
    
    // Return empty array instead of error for better UX
    return NextResponse.json({
      success: true,
      data: [],
      message: 'Tidak ada surveyor yang tersedia'
    });
  }
}
