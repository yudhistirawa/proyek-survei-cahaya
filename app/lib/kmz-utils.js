// lib/kmz-utils.js
// Utility functions to fix KMZParser URL handling issues

import { loadKmzFile, loadKmzFromFileData } from './kmz-loader.js';

/**
 * Safe wrapper for KMZParser.parseFromUrl that handles object inputs
 * @param {string|Object} urlOrFileData - URL string or fileData object
 * @returns {Promise<Object>} Parsed KMZ data
 */
export const safeParseKmzFromUrl = async (urlOrFileData) => {
  try {
    console.log('🛡️ Safe KMZ parsing for:', typeof urlOrFileData, urlOrFileData);

    // Use the new loadKmzFromFileData function which handles both cases
    return await loadKmzFromFileData(urlOrFileData);

  } catch (error) {
    console.error('❌ Safe KMZ parsing failed:', error);
    throw new Error(`Gagal memuat KMZ: ${error.message}`);
  }
};

/**
 * Extract download URL from various input formats
 * @param {string|Object} input - URL string, fileData object, or task object
 * @returns {string} Valid download URL
 */
export const extractDownloadUrl = (input) => {
  if (!input) {
    throw new Error('Input tidak boleh kosong');
  }

  // Direct string URL
  if (typeof input === 'string') {
    return input;
  }

  // Object with downloadURL property
  if (input.downloadURL) {
    return input.downloadURL;
  }

  // Task object with fileData
  if (input.fileData && input.fileData.downloadURL) {
    return input.fileData.downloadURL;
  }

  // Object with folderPath (need to get URL from storage)
  if (input.folderPath) {
    throw new Error('folderPath detected - use loadKmzFile() instead');
  }

  throw new Error('Tidak dapat menemukan download URL dari input');
};

/**
 * Validate and normalize KMZ URL
 * @param {string} url - URL to validate
 * @returns {string} Normalized URL
 */
export const validateKmzUrl = (url) => {
  if (!url || typeof url !== 'string') {
    throw new Error('URL harus berupa string yang valid');
  }

  // Remove any extra whitespace
  const cleanUrl = url.trim();

  // Check if it's a valid URL format
  try {
    new URL(cleanUrl);
  } catch (error) {
    throw new Error(`Format URL tidak valid: ${cleanUrl}`);
  }

  return cleanUrl;
};

/**
 * Fix existing KMZParser calls in components
 * Replace: KMZParser.parseFromUrl(fileData)
 * With: safeParseKmzFromUrl(fileData)
 */

// Example usage patterns:

/**
 * Pattern 1: Direct URL string
 */
export const loadKmzFromDirectUrl = async (url) => {
  const downloadURL = validateKmzUrl(url);
  return await safeParseKmzFromUrl(downloadURL);
};

/**
 * Pattern 2: FileData object with downloadURL
 */
export const loadKmzFromFileDataObject = async (fileData) => {
  return await safeParseKmzFromUrl(fileData);
};

/**
 * Pattern 3: Storage path (requires Firebase Storage call)
 */
export const loadKmzFromStoragePath = async (storagePath) => {
  return await loadKmzFile(storagePath);
};

/**
 * Pattern 4: Task object with fileData
 */
export const loadKmzFromTask = async (task) => {
  if (!task || !task.fileData) {
    throw new Error('Task harus memiliki property fileData');
  }
  
  return await safeParseKmzFromUrl(task.fileData);
};
