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
 * Handler untuk POST request: Menghapus multiple files dari Firebase Storage
 */
export async function POST(request) {
  try {
    const { imageUrls } = await request.json();

    if (!imageUrls || !Array.isArray(imageUrls)) {
      return NextResponse.json({ message: 'Array URL gambar tidak diberikan.' }, { status: 400 });
    }

    console.log(`Attempting to delete ${imageUrls.length} images from storage`);

    const deleteResults = [];

    for (const imageUrl of imageUrls) {
      if (!imageUrl || !imageUrl.includes('firebase')) {
        continue;
      }

      const filePath = extractFilePathFromUrl(imageUrl);
      
      if (!filePath) {
        deleteResults.push({ url: imageUrl, status: 'failed', error: 'Invalid URL' });
        continue;
      }

      try {
        await deleteFileFromStorage(filePath);
        deleteResults.push({ url: imageUrl, filePath, status: 'success' });
        console.log(`Successfully deleted: ${filePath}`);
      } catch (error) {
        deleteResults.push({ url: imageUrl, filePath, status: 'failed', error: error.message });
        console.error(`Failed to delete: ${filePath}`, error);
      }
    }

    const successCount = deleteResults.filter(r => r.status === 'success').length;
    const failCount = deleteResults.filter(r => r.status === 'failed').length;

    console.log(`Cleanup completed: ${successCount} successful, ${failCount} failed`);
    
    return NextResponse.json({ 
      message: `Cleanup selesai: ${successCount} berhasil, ${failCount} gagal`,
      results: deleteResults,
      summary: { success: successCount, failed: failCount }
    }, { status: 200 });

  } catch (error) {
    console.error('Error in bulk image cleanup:', error);
    return NextResponse.json({ 
      message: `Gagal membersihkan gambar: ${error.message}` 
    }, { status: 500 });
  }
}
