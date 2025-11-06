import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('Fetching KMZ files from Firebase Storage...');
    
    // Dynamic import dengan error handling yang lebih baik
    let storage;
    try {
              const { adminStorage } = await import('../../lib/firebase-admin.js');
              storage = adminStorage;
      console.log('Firebase Admin imported successfully');
    } catch (importError) {
      console.error('Error importing firebase-admin:', importError);
      return NextResponse.json({ 
        error: 'Gagal menginisialisasi Firebase Admin SDK' 
      }, { status: 500 });
    }
    
    if (!storage) {
      console.error('Firebase Storage Admin tidak tersedia');
      return NextResponse.json({ 
        error: 'Konfigurasi Firebase Storage tidak tersedia' 
      }, { status: 500 });
    }

    const bucket = storage.bucket();
    
    // List semua file di folder kmz
    const [files] = await bucket.getFiles({
      prefix: 'kmz/',
      delimiter: '/'
    });

    console.log(`Found ${files.length} KMZ files`);

    // Format data file untuk response
    const kmzFiles = files.map(file => {
      const metadata = file.metadata;
      return {
        name: file.name,
        size: parseInt(metadata.size || 0),
        contentType: metadata.contentType,
        uploadedAt: metadata.timeCreated,
        originalName: metadata.metadata?.originalName || file.name.split('/').pop(),
        url: `https://storage.googleapis.com/${bucket.name}/${file.name}`,
        path: file.name
      };
    });

    // Sort berdasarkan tanggal upload (terbaru dulu)
    kmzFiles.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

    return NextResponse.json({
      success: true,
      files: kmzFiles,
      totalFiles: kmzFiles.length,
      message: 'Daftar file KMZ berhasil diambil'
    });

  } catch (error) {
    console.error('Error fetching KMZ files:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      message: 'Gagal mengambil daftar file KMZ'
    }, { status: 500 });
  }
} 