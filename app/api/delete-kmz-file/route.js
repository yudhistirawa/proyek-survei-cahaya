import { NextResponse } from 'next/server';

export async function DELETE(request) {
  try {
    console.log('Deleting KMZ file from Firebase Storage...');
    
    // Dynamic import dengan error handling yang lebih baik
    let deleteFileFromStorage;
    try {
              const { adminStorage } = await import('../../lib/firebase-admin.js');
              deleteFileFromStorage = (filePath) => {
          const bucket = adminStorage.bucket();
          return bucket.file(filePath).delete();
        };
      console.log('Firebase Admin imported successfully');
    } catch (importError) {
      console.error('Error importing firebase-admin:', importError);
      return NextResponse.json({ 
        error: 'Gagal menginisialisasi Firebase Admin SDK' 
      }, { status: 500 });
    }
    
    const { filePath } = await request.json();
    
    if (!filePath) {
      return NextResponse.json({ 
        error: 'File path diperlukan' 
      }, { status: 400 });
    }

    console.log('Deleting file:', filePath);

    const success = await deleteFileFromStorage(filePath);
    
    if (success) {
      return NextResponse.json({
        success: true,
        message: 'File KMZ berhasil dihapus',
        filePath: filePath
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'File tidak ditemukan atau sudah dihapus',
        filePath: filePath
      }, { status: 404 });
    }

  } catch (error) {
    console.error('Error deleting KMZ file:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      message: 'Gagal menghapus file KMZ'
    }, { status: 500 });
  }
} 