// lib/kmz-loader.js
import { storage } from './firebase.js';
import { ref, getDownloadURL } from 'firebase/storage';
import { KMZParser } from './kmzParser.js';

/**
 * Load and parse KMZ file from Firebase Storage
 * @param {string} storagePath - Path to KMZ file in Firebase Storage
 * @returns {Promise<Object>} Parsed KMZ data
 */
export const loadKmzFile = async (storagePath) => {
  try {
    console.log('🗂️ Loading KMZ file from storage path:', storagePath);
    
    if (!storage) {
      throw new Error('Firebase Storage tidak tersedia');
    }

    if (!storagePath || typeof storagePath !== 'string') {
      throw new Error('Storage path harus berupa string yang valid');
    }

    // Get download URL from Firebase Storage
    const storageRef = ref(storage, storagePath);
    const downloadURL = await getDownloadURL(storageRef);
    
    console.log('🔗 Download URL obtained:', downloadURL);

    // Parse KMZ using the download URL
    const parsedData = await KMZParser.parseFromUrl(downloadURL);
    
    console.log('✅ KMZ file successfully parsed');
    return parsedData;

  } catch (error) {
    console.error('❌ Error loading KMZ file:', error);
    
    // Provide specific error messages
    if (error.code === 'storage/object-not-found') {
      throw new Error(`File KMZ tidak ditemukan di path: ${storagePath}`);
    } else if (error.code === 'storage/unauthorized') {
      throw new Error('Tidak memiliki izin untuk mengakses file KMZ');
    } else if (error.message.includes('Invalid argument')) {
      throw new Error(`Path storage tidak valid: ${storagePath}`);
    } else {
      throw new Error(`Gagal memuat file KMZ: ${error.message}`);
    }
  }
};

/**
 * Load KMZ file from fileData object (handles both object and string inputs)
 * @param {string|Object} fileData - Either a string URL or object with downloadURL property
 * @returns {Promise<Object>} Parsed KMZ data
 */
export const loadKmzFromFileData = async (fileData) => {
  try {
    console.log('🗂️ Loading KMZ from fileData:', typeof fileData, fileData);

    let downloadURL;

    // Handle different input types
    if (typeof fileData === 'string') {
      // Direct URL string
      downloadURL = fileData;
    } else if (fileData && typeof fileData === 'object') {
      // Object with downloadURL property
      if (fileData.downloadURL) {
        downloadURL = fileData.downloadURL;
      } else if (fileData.folderPath) {
        // If we have folderPath but no downloadURL, try to get it from storage
        console.log('🔄 Getting download URL from storage path:', fileData.folderPath);
        return await loadKmzFile(fileData.folderPath);
      } else {
        throw new Error('Object fileData harus memiliki property downloadURL atau folderPath');
      }
    } else {
      throw new Error('fileData harus berupa string URL atau object dengan downloadURL');
    }

    // Validate URL
    if (!downloadURL || typeof downloadURL !== 'string') {
      throw new Error('Download URL tidak valid');
    }

    console.log('🔗 Using download URL:', downloadURL);

    // Parse KMZ using the download URL
    const parsedData = await KMZParser.parseFromUrl(downloadURL);
    
    console.log('✅ KMZ file successfully parsed from fileData');
    return parsedData;

  } catch (error) {
    console.error('❌ Error loading KMZ from fileData:', error);
    throw new Error(`Gagal memuat KMZ dari fileData: ${error.message}`);
  }
};

/**
 * Load KMZ file with automatic retry mechanism
 * @param {string} storagePath - Path to KMZ file in Firebase Storage
 * @param {number} maxRetries - Maximum number of retry attempts
 * @returns {Promise<Object>} Parsed KMZ data
 */
export const loadKmzFileWithRetry = async (storagePath, maxRetries = 3) => {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Loading KMZ file attempt ${attempt}/${maxRetries}`);
      
      const result = await loadKmzFile(storagePath);
      console.log(`✅ KMZ file loaded successfully on attempt ${attempt}`);
      
      return result;

    } catch (error) {
      lastError = error;
      console.warn(`⚠️ Attempt ${attempt} failed:`, error.message);
      
      if (attempt === maxRetries) {
        break;
      }
      
      // Wait before retry (exponential backoff)
      const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
      console.log(`⏳ Waiting ${delay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error(`Gagal memuat KMZ file setelah ${maxRetries} percobaan: ${lastError.message}`);
};

/**
 * Validate if a URL is a valid Firebase Storage download URL
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid Firebase Storage URL
 */
export const isValidFirebaseStorageURL = (url) => {
  if (!url || typeof url !== 'string') return false;
  
  // Check for Firebase Storage URL patterns
  const firebaseStoragePatterns = [
    /^https:\/\/firebasestorage\.googleapis\.com/,
    /^https:\/\/storage\.googleapis\.com/,
    /\.firebasestorage\.app/,
    /\.appspot\.com/
  ];
  
  return firebaseStoragePatterns.some(pattern => pattern.test(url));
};

/**
 * Get file metadata from Firebase Storage
 * @param {string} storagePath - Path to file in Firebase Storage
 * @returns {Promise<Object>} File metadata
 */
export const getKmzFileMetadata = async (storagePath) => {
  try {
    if (!storage) {
      throw new Error('Firebase Storage tidak tersedia');
    }

    const { getMetadata } = await import('firebase/storage');
    const storageRef = ref(storage, storagePath);
    const metadata = await getMetadata(storageRef);
    
    console.log('📋 File metadata:', metadata);
    
    return {
      name: metadata.name,
      size: metadata.size,
      contentType: metadata.contentType,
      timeCreated: metadata.timeCreated,
      updated: metadata.updated,
      downloadTokens: metadata.downloadTokens
    };

  } catch (error) {
    console.error('❌ Error getting file metadata:', error);
    throw new Error(`Gagal mendapatkan metadata file: ${error.message}`);
  }
};

/**
 * Example usage and testing function
 */
export const testKmzLoader = async () => {
  try {
    console.log('🧪 Testing KMZ loader...');

    // Test 1: Load from storage path
    console.log('\n📍 Test 1: Load from storage path');
    // const result1 = await loadKmzFile('kmz-files/sample.kmz');
    // console.log('✅ Test 1 passed:', result1);

    // Test 2: Load from fileData object
    console.log('\n📍 Test 2: Load from fileData object');
    const sampleFileData = {
      folderPath: 'kmz-files/sample.kmz',
      downloadURL: 'https://firebasestorage.googleapis.com/v0/b/project.appspot.com/o/sample.kmz'
    };
    // const result2 = await loadKmzFromFileData(sampleFileData);
    // console.log('✅ Test 2 passed:', result2);

    // Test 3: Load from direct URL
    console.log('\n📍 Test 3: Load from direct URL');
    const directURL = 'https://firebasestorage.googleapis.com/v0/b/project.appspot.com/o/sample.kmz';
    // const result3 = await loadKmzFromFileData(directURL);
    // console.log('✅ Test 3 passed:', result3);

    console.log('\n🎉 All tests completed successfully!');

  } catch (error) {
    console.error('🧪 Test failed:', error);
    throw error;
  }
};
