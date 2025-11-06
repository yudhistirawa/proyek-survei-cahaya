// lib/firestore-config.js
// Konfigurasi khusus untuk Firestore dengan error handling dan retry mechanism

import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  getDocs, 
  addDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot
} from 'firebase/firestore';

import { db, retryFirestoreOperation, handleFirestoreError } from './firebase';

// Konfigurasi timeout dan retry
const FIRESTORE_CONFIG = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  timeoutMs: 30000
};

// Wrapper untuk operasi Firestore dengan error handling
export class FirestoreService {
  
  // Get document dengan retry
  static async getDocument(collectionName, docId) {
    return retryFirestoreOperation(async () => {
      try {
        const docRef = doc(db, collectionName, docId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          return { id: docSnap.id, ...docSnap.data() };
        } else {
          console.log(`Dokumen ${docId} tidak ditemukan di koleksi ${collectionName}`);
          return null;
        }
      } catch (error) {
        handleFirestoreError(error);
        throw error;
      }
    }, FIRESTORE_CONFIG.maxRetries, FIRESTORE_CONFIG.baseDelay);
  }

  // Set document dengan retry
  static async setDocument(collectionName, docId, data) {
    return retryFirestoreOperation(async () => {
      try {
        const docRef = doc(db, collectionName, docId);
        await setDoc(docRef, {
          ...data,
          updatedAt: new Date(),
          createdAt: data.createdAt || new Date()
        });
        
        console.log(`Dokumen ${docId} berhasil disimpan di ${collectionName}`);
        return true;
      } catch (error) {
        handleFirestoreError(error);
        throw error;
      }
    }, FIRESTORE_CONFIG.maxRetries, FIRESTORE_CONFIG.baseDelay);
  }

  // Update document dengan retry
  static async updateDocument(collectionName, docId, data) {
    return retryFirestoreOperation(async () => {
      try {
        const docRef = doc(db, collectionName, docId);
        await updateDoc(docRef, {
          ...data,
          updatedAt: new Date()
        });
        
        console.log(`Dokumen ${docId} berhasil diupdate di ${collectionName}`);
        return true;
      } catch (error) {
        handleFirestoreError(error);
        throw error;
      }
    }, FIRESTORE_CONFIG.maxRetries, FIRESTORE_CONFIG.baseDelay);
  }

  // Delete document dengan retry
  static async deleteDocument(collectionName, docId) {
    return retryFirestoreOperation(async () => {
      try {
        const docRef = doc(db, collectionName, docId);
        await deleteDoc(docRef);
        
        console.log(`Dokumen ${docId} berhasil dihapus dari ${collectionName}`);
        return true;
      } catch (error) {
        handleFirestoreError(error);
        throw error;
      }
    }, FIRESTORE_CONFIG.maxRetries, FIRESTORE_CONFIG.baseDelay);
  }

  // Get collection dengan retry
  static async getCollection(collectionName, queryOptions = {}) {
    return retryFirestoreOperation(async () => {
      try {
        let collectionRef = collection(db, collectionName);
        
        // Apply query options
        if (queryOptions.where) {
          queryOptions.where.forEach(whereClause => {
            collectionRef = query(collectionRef, where(...whereClause));
          });
        }
        
        if (queryOptions.orderBy) {
          queryOptions.orderBy.forEach(orderClause => {
            collectionRef = query(collectionRef, orderBy(...orderClause));
          });
        }
        
        if (queryOptions.limit) {
          collectionRef = query(collectionRef, limit(queryOptions.limit));
        }
        
        const querySnapshot = await getDocs(collectionRef);
        const documents = [];
        
        querySnapshot.forEach((doc) => {
          documents.push({ id: doc.id, ...doc.data() });
        });
        
        console.log(`Berhasil mengambil ${documents.length} dokumen dari ${collectionName}`);
        return documents;
      } catch (error) {
        handleFirestoreError(error);
        throw error;
      }
    }, FIRESTORE_CONFIG.maxRetries, FIRESTORE_CONFIG.baseDelay);
  }

  // Add document dengan retry
  static async addDocument(collectionName, data) {
    return retryFirestoreOperation(async () => {
      try {
        const collectionRef = collection(db, collectionName);
        const docRef = await addDoc(collectionRef, {
          ...data,
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        console.log(`Dokumen berhasil ditambahkan dengan ID: ${docRef.id}`);
        return docRef.id;
      } catch (error) {
        handleFirestoreError(error);
        throw error;
      }
    }, FIRESTORE_CONFIG.maxRetries, FIRESTORE_CONFIG.baseDelay);
  }

  // Real-time listener dengan error handling
  static subscribeToDocument(collectionName, docId, callback, errorCallback) {
    try {
      const docRef = doc(db, collectionName, docId);
      
      const unsubscribe = onSnapshot(docRef, 
        (docSnap) => {
          if (docSnap.exists()) {
            callback({ id: docSnap.id, ...docSnap.data() });
          } else {
            callback(null);
          }
        },
        (error) => {
          console.error(`Error listening to document ${docId}:`, error);
          handleFirestoreError(error);
          if (errorCallback) errorCallback(error);
        }
      );
      
      return unsubscribe;
    } catch (error) {
      console.error(`Error setting up listener for ${docId}:`, error);
      handleFirestoreError(error);
      if (errorCallback) errorCallback(error);
      return () => {}; // Return empty unsubscribe function
    }
  }

  // Real-time listener untuk collection
  static subscribeToCollection(collectionName, queryOptions = {}, callback, errorCallback) {
    try {
      let collectionRef = collection(db, collectionName);
      
      // Apply query options
      if (queryOptions.where) {
        queryOptions.where.forEach(whereClause => {
          collectionRef = query(collectionRef, where(...whereClause));
        });
      }
      
      if (queryOptions.orderBy) {
        queryOptions.orderBy.forEach(orderClause => {
          collectionRef = query(collectionRef, orderBy(...orderClause));
        });
      }
      
      if (queryOptions.limit) {
        collectionRef = query(collectionRef, limit(queryOptions.limit));
      }
      
      const unsubscribe = onSnapshot(collectionRef,
        (querySnapshot) => {
          const documents = [];
          querySnapshot.forEach((doc) => {
            documents.push({ id: doc.id, ...doc.data() });
          });
          callback(documents);
        },
        (error) => {
          console.error(`Error listening to collection ${collectionName}:`, error);
          handleFirestoreError(error);
          if (errorCallback) errorCallback(error);
        }
      );
      
      return unsubscribe;
    } catch (error) {
      console.error(`Error setting up collection listener for ${collectionName}:`, error);
      handleFirestoreError(error);
      if (errorCallback) errorCallback(error);
      return () => {}; // Return empty unsubscribe function
    }
  }
}

// Export untuk backward compatibility
export const firestoreService = FirestoreService;

// Helper functions
export const withRetry = retryFirestoreOperation;
export const handleError = handleFirestoreError;

export default FirestoreService;
