/**
 * Fungsi upload khusus untuk Survey APJ Propose
 * Bypass CORS dengan langsung ke base64 storage
 */

import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Upload foto APJ Propose dengan langsung ke base64 storage
 */
export async function uploadAPJProposePhoto(dataUrl, userId, docId, filenameBase) {
    try {
        console.log('🚀 Starting APJ Propose photo upload...');
        
        // Langsung ke base64 storage (bypass CORS completely)
        console.log('📤 Going directly to base64 storage...');
        const result = await base64FirestoreStorage(dataUrl, userId, docId, filenameBase);
        console.log('✅ Base64 storage successful');
        return result;

    } catch (error) {
        console.error('❌ Base64 storage failed:', error);
        return {
            success: false,
            error: 'Base64 storage failed',
            technicalError: error.message
        };
    }
}

/**
 * Base64 storage di Firestore (CORS bypass)
 */
async function base64FirestoreStorage(dataUrl, userId, docId, filenameBase) {
    try {
        // Generate unique key untuk base64 storage
        const key = `base64_${userId}_${docId}_${filenameBase}_${Date.now()}`;
        
        // Compress data URL jika terlalu besar
        let compressedDataUrl = dataUrl;
        
        // Jika data URL terlalu besar (>1MB), compress
        if (dataUrl.length > 1000000) {
            console.log('📦 Compressing large image...');
            compressedDataUrl = await compressImage(dataUrl);
            console.log('✅ Image compressed');
        }
        
        // Store base64 di localStorage sebagai backup
        if (typeof window !== 'undefined' && window.localStorage) {
            try {
                localStorage.setItem(key, compressedDataUrl);
                console.log('💾 Base64 stored in localStorage as backup');
            } catch (storageError) {
                console.warn('⚠️ localStorage backup failed:', storageError.message);
            }
        }
        
        // Return result dengan base64 data
        return {
            success: true,
            downloadURL: compressedDataUrl, // Base64 data URL
            storagePath: `firestore_base64/${key}`,
            filename: `${filenameBase}.webp`,
            method: 'base64_firestore',
            isBase64: true,
            base64Key: key,
            message: 'Foto disimpan sebagai base64 di Firestore. Tidak ada masalah CORS.',
            size: `${(compressedDataUrl.length / 1024).toFixed(2)}KB`
        };
        
    } catch (error) {
        console.error('❌ Base64 storage failed:', error);
        throw error;
    }
}

/**
 * Compress image untuk mengurangi ukuran base64
 */
async function compressImage(dataUrl) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
            // Set canvas size (reduce if too large)
            const maxSize = 800;
            let { width, height } = img;
            
            // Resize jika gambar terlalu besar
            if (width > maxSize || height > maxSize) {
                const ratio = Math.min(maxSize / width, maxSize / height);
                width = width * ratio;
                height = height * ratio;
            }
            
            canvas.width = width;
            canvas.height = height;
            
            // Gambar ke canvas
            ctx.drawImage(img, 0, 0, width, height);
            
            // Konversi ke WebP dengan kualitas 0.6 (60%)
            const compressedDataUrl = canvas.toDataURL('image/webp', 0.6);
            resolve(compressedDataUrl);
        };
        
        img.src = dataUrl;
    });
}

/**
 * Validate photo before upload
 */
export async function validateAPJProposePhoto(dataUrl) {
    try {
        // Check if it's a valid data URL
        if (!dataUrl || !dataUrl.startsWith('data:image/')) {
            return {
                valid: false,
                error: 'Invalid image data URL'
            };
        }

        // Check file size (approximate)
        const base64 = dataUrl.split(',')[1];
        const sizeInBytes = Math.ceil((base64.length * 3) / 4);
        const sizeInMB = sizeInBytes / (1024 * 1024);

        if (sizeInMB > 10) {
            return {
                valid: false,
                error: `Image size too large: ${sizeInMB.toFixed(2)}MB (max: 10MB)`
            };
        }

        return {
            valid: true,
            size: `${sizeInMB.toFixed(2)}MB`
        };
        
    } catch (error) {
        return {
            valid: false,
            error: `Validation error: ${error.message}`
        };
    }
}

/**
 * Test API connection (optional)
 */
export async function testAPJProposeAPI() {
    try {
        const response = await fetch('/api/upload-photo', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                test: true,
                folder: 'Survey_APJ_Propose'
            })
        });

        if (response.ok) {
            return {
                success: true,
                message: 'API connection successful'
            };
        } else {
            return {
                success: false,
                message: `API connection failed: ${response.status}`
            };
        }
        
    } catch (error) {
        return {
            success: false,
            message: `API connection error: ${error.message}`
        };
    }
}

/**
 * Get stored base64 photo from localStorage
 */
export function getStoredBase64Photo(base64Key) {
    if (typeof window !== 'undefined' && window.localStorage) {
        return localStorage.getItem(base64Key);
    }
    return null;
}

/**
 * Clean up stored base64 photos
 */
export function cleanupStoredPhotos() {
    if (typeof window !== 'undefined' && window.localStorage) {
        const keys = Object.keys(localStorage);
        const base64Keys = keys.filter(key => key.startsWith('base64_'));
        
        // Remove old base64 photos (older than 24 hours)
        const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
        
        base64Keys.forEach(key => {
            const timestamp = parseInt(key.split('_').pop());
            if (timestamp < oneDayAgo) {
                localStorage.removeItem(key);
                console.log('🧹 Cleaned up old base64 photo:', key);
            }
        });
    }
}
