// lib/kmz-url-fix.js
// Simple fix for KMZParser URL handling - keeps existing functionality intact

import { storage } from './firebase.js';
import { ref, getDownloadURL } from 'firebase/storage';
import { KMZParser } from './kmzParser.js';

/**
 * Load KMZ file from Firebase Storage path
 * @param {string} storagePath - Path to KMZ file in Firebase Storage
 * @returns {Promise<Object>} Parsed KMZ data
 */
export const loadKmzFile = async (storagePath) => {
  try {
    console.log('🗂️ Loading KMZ from storage path:', storagePath);
    
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
    } else {
      throw new Error(`Gagal memuat file KMZ: ${error.message}`);
    }
  }
};

/**
 * Safe wrapper for KMZParser.parseFromUrl that handles object inputs
 * @param {string|Object} input - URL string or fileData object
 * @returns {Promise<Object>} Parsed KMZ data
 */
export const parseKmzSafely = async (input) => {
  try {
    console.log('🛡️ Safe KMZ parsing for:', typeof input);

    let downloadURL;

    // Handle different input types
    if (typeof input === 'string') {
      // Direct URL string
      downloadURL = input;
    } else if (input && typeof input === 'object') {
      // Object with downloadURL property
      if (input.downloadURL) {
        downloadURL = input.downloadURL;
      } else if (input.folderPath) {
        // If we have folderPath, get URL from storage
        console.log('🔄 Getting download URL from storage path:', input.folderPath);
        return await loadKmzFile(input.folderPath);
      } else {
        throw new Error('Object harus memiliki property downloadURL atau folderPath');
      }
    } else {
      throw new Error('Input harus berupa string URL atau object dengan downloadURL');
    }

    // Validate URL
    if (!downloadURL || typeof downloadURL !== 'string') {
      throw new Error('Download URL tidak valid');
    }

    console.log('🔗 Using download URL:', downloadURL);

    // Parse KMZ using the download URL
    const parsedData = await KMZParser.parseFromUrl(downloadURL);
    
    console.log('✅ KMZ file successfully parsed');
    return parsedData;

  } catch (error) {
    console.error('❌ Error in safe KMZ parsing:', error);
    throw new Error(`Gagal memuat KMZ: ${error.message}`);
  }
};
