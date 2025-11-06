import { NextResponse } from 'next/server';
import { deleteFileFromStorage } from '../../lib/firebase-admin.js';

export const dynamic = 'force-dynamic';

/**
 * Helper function to extract file path from Firebase Storage URL
 */
const extractFilePathFromUrl = (url) => {
  try {
    // Format: https://firebasestorage.googleapis.com/v0/b/bucket/o/path%2Fto%2Ffile?alt=media&token=...
    const match = url.match(/\/o\/([^?]+)/);
    if (match) {
      return decodeURIComponent(match[1]);
    }
    return null;
  } catch (error) {
    console.error('Error extracting file path from URL:', error);
    return null;
  }
};

/**
 * Handler untuk POST request: Menghapus file dari Firebase Storage
 */
export async function POST(request) {
  try {
    const { imageUrl } = await request.json();

    if (!imageUrl) {
      return NextResponse.json({ message: 'URL gambar tidak diberikan.' }, { status: 400 });
    }

    // Extract file path from URL
    const filePath = extractFilePathFromUrl(imageUrl);
    
    if (!filePath) {
      return NextResponse.json({ message: 'URL gambar tidak valid.' }, { status: 400 });
    }

    console.log(`Attempting to delete image: ${filePath}`);

    // Delete file from Firebase Storage
    await deleteFileFromStorage(filePath);

    console.log(`Successfully deleted image: ${filePath}`);
    
    return NextResponse.json({ 
      message: 'Gambar berhasil dihapus dari storage.',
      filePath 
    }, { status: 200 });

  } catch (error) {
    console.error('Error deleting image:', error);
    return NextResponse.json({ 
      message: `Gagal menghapus gambar: ${error.message}` 
    }, { status: 500 });
  }
}
