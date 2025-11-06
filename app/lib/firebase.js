// lib/firebase.js
import { initializeApp, getApps, getApp } from "firebase/app";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getAuth } from "firebase/auth";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import { getFirestore, connectFirestoreEmulator, enableNetwork, disableNetwork } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// Konfigurasi Firebase dari environment variables atau fallback
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBHk6Zg35hLFRbuLW_dwHSpJ3-EQ2kGhQ8",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "aplikasi-survei-lampu-jalan.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "aplikasi-survei-lampu-jalan",
  // storageBucket harus berupa nama bucket (project-id.appspot.com), bukan domain URL
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "aplikasi-survei-lampu-jalan.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "231759165437",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:231759165437:web:8dafd8ffff8294c97f4b94"
};

// Inisialisasi Firebase App
let firebaseApp;
let storage, auth, db, messaging;

// Initialize Firebase App (both client and server side)
try {
  // Check if Firebase config is valid
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    throw new Error('Firebase configuration is incomplete');
  }
  
  firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
  console.log('✅ Firebase App berhasil diinisialisasi');
  console.log('📋 Firebase Config:', {
    projectId: firebaseConfig.projectId,
    authDomain: firebaseConfig.authDomain,
    storageBucket: firebaseConfig.storageBucket
  });
  
  // Inisialisasi services dengan error handling
  try {
    storage = getStorage(firebaseApp);
    console.log('✅ Firebase Storage berhasil diinisialisasi');
    console.log('📁 Storage bucket:', firebaseConfig.storageBucket);
    
    // Enhanced storage connectivity test
    try {
      const testRef = ref(storage, 'test/connectivity-check.txt');
      console.log('✅ Storage reference created successfully');
      
      // Verify storage bucket configuration
      if (!firebaseConfig.storageBucket || firebaseConfig.storageBucket === 'undefined') {
        throw new Error('Storage bucket not properly configured');
      }
      
      console.log('✅ Storage bucket configuration verified');
    } catch (refError) {
      console.error('❌ Error creating storage reference:', refError);
      console.error('❌ This may cause storage/unknown errors during uploads');
    }
  } catch (storageError) {
    console.error('❌ Error inisialisasi Firebase Storage:', storageError);
    console.error('❌ Storage error details:', {
      code: storageError.code,
      message: storageError.message,
      name: storageError.name
    });
    console.error('❌ This will cause storage/unknown errors during uploads');
  }
  
  try {
    auth = getAuth(firebaseApp);
    console.log('✅ Firebase Auth berhasil diinisialisasi');
  } catch (authError) {
    console.error('❌ Error inisialisasi Firebase Auth:', authError);
  }
  
  try {
    db = getFirestore(firebaseApp);
    console.log('✅ Firebase Firestore berhasil diinisialisasi');
  } catch (dbError) {
    console.error('❌ Error inisialisasi Firebase Firestore:', dbError);
  }
  
  // Inisialisasi Messaging hanya di browser dan jika didukung
  if (typeof window !== 'undefined') {
    isSupported().then((supported) => {
      if (supported) {
        try {
          messaging = getMessaging(firebaseApp);
          console.log('✅ Firebase messaging initialized');
        } catch (messagingError) {
          console.warn('⚠️ Firebase messaging initialization failed:', messagingError);
        }
      } else {
        console.log('ℹ️ Firebase messaging not supported in this browser');
      }
    }).catch((error) => {
      console.warn('⚠️ Error checking messaging support:', error);
    });
  }
  
} catch (error) {
  console.error('❌ Error inisialisasi Firebase App:', error);
  console.error('Firebase config used:', firebaseConfig);
  // Don't throw error to prevent SSR issues, but log detailed info
}

// Validate Firebase services after initialization
if (typeof window !== 'undefined') {
  setTimeout(() => {
    console.log('🔍 Firebase Services Status Check:');
    console.log('- Firebase App:', !!firebaseApp);
    console.log('- Storage:', !!storage);
    console.log('- Auth:', !!auth);
    console.log('- Firestore:', !!db);
    console.log('- Messaging:', !!messaging);
    
    if (!storage) {
      console.error('⚠️ Firebase Storage not available - photo uploads will fail');
    }
    if (!db) {
      console.error('⚠️ Firebase Firestore not available - data operations will fail');
    }
  }, 1000);
}

// Konfigurasi untuk development
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  console.log('Running in development mode');
}

// Fungsi untuk mengkonversi gambar ke WebP dengan error handling
export const convertImageToWebP = (file) => {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        try {
          // Set canvas size
          canvas.width = img.width;
          canvas.height = img.height;
          
          // Draw image to canvas
          ctx.drawImage(img, 0, 0);
          
          // Convert to WebP with quality 0.8
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Gagal mengkonversi gambar ke WebP'));
            }
          }, 'image/webp', 0.8);
        } catch (error) {
          reject(error);
        }
      };
      
      img.onerror = () => {
        reject(new Error('Gagal memuat gambar'));
      };
      
      img.src = URL.createObjectURL(file);
    } catch (error) {
      reject(error);
    }
  });
};

// Fungsi untuk upload gambar ke Firebase Storage dengan format WebP dan retry mechanism
export const uploadImageToStorage = async (file, path, fileName, maxRetries = 3) => {
  if (!storage) {
    throw new Error('Firebase Storage tidak tersedia');
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Upload attempt ${attempt}/${maxRetries}`);
      
      // Konversi ke WebP
      const webpBlob = await convertImageToWebP(file);
      
      // Buat nama file dengan ekstensi .webp
      const webpFileName = fileName ? `${fileName}.webp` : `${Date.now()}.webp`;
      const fullPath = `${path}/${webpFileName}`;
      
      // Upload ke Firebase Storage
      const storageRef = ref(storage, fullPath);
      const snapshot = await uploadBytes(storageRef, webpBlob);
      
      // Dapatkan download URL
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      console.log('✅ Gambar berhasil diupload ke:', fullPath);
      return downloadURL;
      
    } catch (error) {
      console.error(`❌ Upload attempt ${attempt} failed:`, error);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
};

// Fungsi untuk upload data URL ke Firebase Storage dengan retry mechanism
export const uploadDataUrlToStorage = async (dataUrl, path, fileName, maxRetries = 3) => {
  if (!storage) {
    throw new Error('Firebase Storage tidak tersedia');
  }

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 Data URL upload attempt ${attempt}/${maxRetries}`);
      
      // Convert data URL to blob
      const response = await fetch(dataUrl);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const blob = await response.blob();
      
      // Buat nama file dengan ekstensi .webp
      const webpFileName = fileName ? `${fileName}.webp` : `${Date.now()}.webp`;
      const fullPath = `${path}/${webpFileName}`;
      
      // Upload ke Firebase Storage
      const storageRef = ref(storage, fullPath);
      const snapshot = await uploadBytes(storageRef, blob);
      
      // Dapatkan download URL
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      console.log('✅ Data URL berhasil diupload ke:', fullPath);
      return downloadURL;
      
    } catch (error) {
      console.error(`❌ Data URL upload attempt ${attempt} failed:`, error);
      
      if (attempt === maxRetries) {
        throw error;
      }
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
};

// Fungsi khusus untuk upload WebP data URL dengan error handling yang lebih baik
export const uploadWebpDataUrlToStorage = async (storageInstance, folder, userId, docId, dataUrl, fileName) => {
  try {
    console.log(`🔄 Uploading WebP data URL: ${fileName}`);
    
    // Langsung gunakan API route untuk menghindari CORS
    const formData = new FormData();
    formData.append('dataUrl', dataUrl);
    formData.append('path', `${folder}/${userId}/${docId}`);
    formData.append('fileName', fileName);
    
    console.log('📤 Mengirim ke API route...');
    
    const apiResponse = await fetch('/api/upload-image', {
      method: 'POST',
      body: formData
    });
    
    if (!apiResponse.ok) {
      const errorData = await apiResponse.json();
      throw new Error(`API upload gagal: ${errorData.error || 'Unknown error'}`);
    }
    
    const result = await apiResponse.json();
    console.log('✅ Upload berhasil melalui API route');
    console.log('🔗 Download URL:', result.downloadURL);
    
    return result.downloadURL;
    
  } catch (error) {
    console.error('❌ Error uploading WebP data URL:', error);
    
    // Jangan gunakan fallback client-side, langsung throw error
    throw new Error(`Upload gagal: ${error.message}`);
  }
};

// Fungsi untuk mengatasi masalah CORS dengan proxy
export const uploadWithCorsProxy = async (file, path, fileName) => {
  try {
    // Coba upload langsung terlebih dahulu
    return await uploadImageToStorage(file, path, fileName);
  } catch (error) {
    if (error.code === 'storage/cors-error' || error.message.includes('CORS')) {
      console.warn('⚠️ CORS error detected, trying alternative method...');
      
      // Alternative: Upload melalui API route
      const formData = new FormData();
      formData.append('file', file);
      formData.append('path', path);
      formData.append('fileName', fileName);
      
      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        throw new Error('Upload melalui API gagal');
      }
      
      const result = await response.json();
      return result.downloadURL;
    }
    
    throw error;
  }
};

// Test Firebase Storage connection with enhanced error handling
export const testStorageConnection = async (storageInstance = storage) => {
  if (!storageInstance) {
    console.error('Storage instance not available for testing');
    return false;
  }
  
  try {
    console.log('Testing Firebase Storage connection...');
    const testRef = ref(storageInstance, `test/connection-test-${Date.now()}.txt`);
    const testData = 'Test connection';
    const testBlob = new Blob([testData], { type: 'text/plain' });
    
    // Test with timeout
    const uploadPromise = uploadBytes(testRef, testBlob);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Storage connection test timeout')), 10000);
    });
    
    await Promise.race([uploadPromise, timeoutPromise]);
    console.log('✅ Firebase Storage connection successful');
    return true;
  } catch (error) {
    console.error('❌ Firebase Storage connection failed:', error);
    console.error('❌ Storage connection error details:', {
      code: error.code,
      message: error.message,
      name: error.name
    });
    return false;
  }
};

// Fungsi helper untuk retry operasi Firestore
export const retryFirestoreOperation = async (operation, maxRetries = 3, delay = 1000) => {
  if (!db) {
    throw new Error('Firestore not available');
  }
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      console.warn(`Percobaan ${i + 1} gagal:`, error.message);
      
      if (i === maxRetries - 1) {
        throw error;
      }
      
      // Tunggu sebelum retry
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }
};

// Fungsi untuk mengecek koneksi Firestore
export const checkFirestoreConnection = async () => {
  if (!db) return false;
  
  try {
    // Test koneksi dengan operasi sederhana
    const { doc, getDoc } = await import('firebase/firestore');
    const testDoc = await getDoc(doc(db, 'test', 'connection'));
    console.log('Koneksi Firestore berhasil');
    return true;
  } catch (error) {
    console.error('Koneksi Firestore gagal:', error);
    return false;
  }
};

// Fungsi untuk menangani error Firestore
export const handleFirestoreError = (error) => {
  console.error('Firestore Error:', error);
  
  if (error.code === 'unavailable') {
    console.log('Firestore tidak tersedia, mencoba reconnect...');
    // Implementasi logic reconnect jika diperlukan
  } else if (error.code === 'deadline-exceeded') {
    console.log('Firestore timeout, mencoba operasi ulang...');
  }
  
  return error;
};

// Fungsi untuk menangani error Storage
export const handleStorageError = (error) => {
  console.error('Storage Error:', error);
  
  switch (error.code) {
    case 'storage/unauthorized':
      console.error('Tidak memiliki izin untuk akses storage');
      break;
    case 'storage/unauthenticated':
      console.error('User tidak terautentikasi');
      break;
    case 'storage/quota-exceeded':
      console.error('Kapasitas storage telah penuh');
      break;
    case 'storage/network-request-failed':
      console.error('Gagal terhubung ke storage server');
      break;
    case 'storage/cors-error':
      console.error('CORS error - pastikan konfigurasi CORS di Firebase Storage sudah benar');
      console.log('💡 Solusi: Jalankan node setup-firebase-cors.js atau gunakan uploadWithCorsProxy');
      break;
    default:
      console.error('Error storage tidak dikenal:', error.code);
  }
  
  return error;
};

export { firebaseApp, storage, auth, db };
export { messaging, getToken, onMessage };
