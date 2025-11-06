// Helper untuk upload data URL WebP ke Firebase Storage dengan penamaan konsisten
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

/**
 * Upload gambar WebP (data URL) ke Firebase Storage.
 * Path: {surveyFolder}/{userId}/{docId}/{filenameBase}.webp
 */
export async function uploadWebpDataUrlToStorage(storage, surveyFolder, userId, docId, dataUrl, filenameBase) {
  // Check if we're on client side and storage is available
  if (typeof window === 'undefined' || !storage || !surveyFolder || !userId || !docId || !dataUrl || !filenameBase) {
    console.warn('Upload skipped: not on client side or missing required parameters');
    return null;
  }
  
  try {
    const safeFolder = surveyFolder.replace(/\/+$/g, '');
    const imageRef = ref(storage, `${safeFolder}/${userId}/${docId}/${filenameBase}.webp`);

    // Upload dari data URL agar metadata content-type terset ke image/webp
    await uploadString(imageRef, dataUrl, 'data_url', {
      contentType: 'image/webp',
      cacheControl: 'public, max-age=31536000, immutable',
    });

    const url = await getDownloadURL(imageRef);
    return url;
  } catch (error) {
    console.error('Error uploading image:', error);
    return null;
  }
}


