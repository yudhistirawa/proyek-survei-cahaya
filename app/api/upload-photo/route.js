import { NextResponse } from 'next/server';
import { storage, firebaseApp } from '../../lib/firebase';
import { ref, uploadBytes, getDownloadURL, getStorage } from 'firebase/storage';
import { getFirestore, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { initializeApp, getApps } from 'firebase/app';
import { verifyIdTokenOptional, adminStorage, adminDb } from '../../lib/firebase-admin.js';

// Force dynamic and Node runtime to ensure Buffer and Firebase SDK compatibility
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request) {
    const requestId = Math.random().toString(36).substring(2, 8);
    console.log(`🚀 [${requestId}] API Upload Photo - Request received`);
    
    try {
        // Enhanced Firebase initialization check and recovery
        let activeStorage = storage;
        let activeApp = firebaseApp;

        // If storage is not initialized, try to reinitialize
        if (!activeStorage || !activeApp) {
            console.warn(`⚠️ [${requestId}] Firebase services not properly initialized, attempting recovery...`);
            
            try {
                // Get or initialize Firebase app
                if (!activeApp) {
                    const firebaseConfig = {
                        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBHk6Zg35hLFRbuLW_dwHSpJ3-EQ2kGhQ8",
                        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "aplikasi-survei-lampu-jalan.firebaseapp.com",
                        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "aplikasi-survei-lampu-jalan",
                        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "aplikasi-survei-lampu-jalan.appspot.com",
                        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "231759165437",
                        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:231759165437:web:8dafd8ffff8294c97f4b94"
                    };
                    
                    activeApp = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
                    console.log(`✅ [${requestId}] Firebase App recovered`);
                }

                // Initialize storage if not available
                if (!activeStorage && activeApp) {
                    activeStorage = getStorage(activeApp);
                    console.log(`✅ [${requestId}] Firebase Storage recovered`);
                }
            } catch (recoveryError) {
                console.error(`❌ [${requestId}] Firebase recovery failed:`, recoveryError);
                return NextResponse.json({
                    success: false,
                    error: 'Firebase tidak dapat diinisialisasi - silakan coba lagi',
                    technicalError: recoveryError.message,
                    requestId,
                    timestamp: new Date().toISOString()
                }, { status: 500 });
            }
        }

        // Final check after recovery attempt
        if (!activeStorage) {
            console.error(`❌ [${requestId}] Firebase Storage still not available after recovery`);
            return NextResponse.json({
                success: false,
                error: 'Firebase Storage tidak tersedia - silakan coba lagi atau hubungi support',
                requestId,
                timestamp: new Date().toISOString()
            }, { status: 500 });
        }

        if (!activeApp) {
            console.error(`❌ [${requestId}] Firebase App still not available after recovery`);
            return NextResponse.json({
                success: false,
                error: 'Firebase App tidak tersedia - silakan coba lagi atau hubungi support',
                requestId,
                timestamp: new Date().toISOString()
            }, { status: 500 });
        }

        console.log(`✅ [${requestId}] Firebase services check passed`);

        // Optional auth: verify ID token if provided (non-blocking)
        let authInfo = null;
        try {
            const authHeader = request.headers.get('authorization');
            authInfo = await verifyIdTokenOptional(authHeader);
            if (authInfo?.uid) {
                console.log(`🔐 [${requestId}] Authenticated request from uid=${authInfo.uid}`);
            } else {
                console.log(`ℹ️ [${requestId}] No valid auth token provided (proceeding)`);
            }
        } catch (_e) {
            // non-blocking
        }

        // Parse form data with enhanced error handling
        let formData;
        try {
            formData = await request.formData();
            console.log(`📋 [${requestId}] Form data parsed successfully`);
        } catch (parseError) {
            console.error(`❌ [${requestId}] Failed to parse form data:`, parseError);
            return NextResponse.json({
                success: false,
                error: 'Gagal memproses data form',
                technicalError: parseError.message,
                requestId,
                timestamp: new Date().toISOString()
            }, { status: 400 });
        }

        const photo = formData.get('photo');
        let userId = formData.get('userId');
        const docId = formData.get('docId');
        const fieldName = formData.get('fieldName');
        const collection = formData.get('collection');

        console.log(`📋 [${requestId}] Form data received:`, {
            hasPhoto: !!photo,
            photoSize: photo?.size || 0,
            photoType: photo?.type || 'unknown',
            userId: userId || 'missing',
            docId: docId || 'missing',
            fieldName: fieldName || 'missing',
            collection: collection || 'missing'
        });

        // Fallback userId from auth token if not provided
        if (!userId && authInfo?.uid) {
            userId = authInfo.uid;
            console.log(`ℹ️ [${requestId}] userId inferred from token: ${userId}`);
        }

        // Enhanced parameter validation
        if (!photo || !userId || !docId || !fieldName || !collection) {
            const missingParams = [];
            if (!photo) missingParams.push('photo');
            if (!userId) missingParams.push('userId');
            if (!docId) missingParams.push('docId');
            if (!fieldName) missingParams.push('fieldName');
            if (!collection) missingParams.push('collection');
            
            console.error(`❌ [${requestId}] Missing required parameters:`, missingParams);
            return NextResponse.json({
                success: false,
                error: `Parameter yang diperlukan tidak lengkap: ${missingParams.join(', ')}`,
                missingParams,
                requestId,
                timestamp: new Date().toISOString()
            }, { status: 400 });
        }

        console.log(`📤 [${requestId}] API Upload Photo - Processing:`, {
            userId,
            docId,
            fieldName,
            collection,
            photoSize: photo.size,
            photoType: photo.type,
            photoName: photo.name
        });

        // Enhanced file type validation
        if (!photo.type || !photo.type.startsWith('image/')) {
            console.error(`❌ [${requestId}] Invalid file type:`, photo.type);
            return NextResponse.json({
                success: false,
                error: 'File harus berupa gambar',
                receivedType: photo.type,
                requestId,
                timestamp: new Date().toISOString()
            }, { status: 400 });
        }

        // Enhanced file size validation
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (photo.size > maxSize) {
            console.error(`❌ [${requestId}] File too large:`, photo.size);
            return NextResponse.json({
                success: false,
                error: 'Ukuran file terlalu besar (maksimal 10MB)',
                fileSize: photo.size,
                maxSize,
                requestId,
                timestamp: new Date().toISOString()
            }, { status: 400 });
        }

        // Create storage path with better naming to match Firebase Storage rules
        const timestamp = Date.now();
        const fileExtension = photo.name ? photo.name.split('.').pop() : 'jpg';
        const fileName = `${fieldName}_${timestamp}.${fileExtension}`;
        const storagePath = `${collection}/${userId}/${docId}/${fileName}`;

        console.log(`📁 [${requestId}] Storage path:`, storagePath);

        // Convert to buffer
        let buffer;
        try {
            console.log(`🔄 [${requestId}] Converting file to buffer...`);
            const arrayBuffer = await photo.arrayBuffer();
            buffer = Buffer.from(arrayBuffer);
            console.log(`✅ [${requestId}] File converted to buffer, size:`, buffer.length);
        } catch (bufferError) {
            console.error(`❌ [${requestId}] Failed to convert file to buffer:`, bufferError);
            return NextResponse.json({
                success: false,
                error: 'Gagal memproses file foto',
                technicalError: bufferError.message,
                requestId,
                timestamp: new Date().toISOString()
            }, { status: 400 });
        }

        // Upload using Firebase Admin Storage (server-side, more reliable)
        console.log(`📤 [${requestId}] Uploading via Admin Storage to: ${storagePath}`);
        let fileHandle;
        try {
            const bucket = adminStorage.bucket();
            fileHandle = bucket.file(storagePath);
            await fileHandle.save(buffer, {
                metadata: {
                    contentType: photo.type,
                    metadata: {
                        userId,
                        docId,
                        fieldName,
                        collection,
                        uploadedAt: new Date().toISOString(),
                        requestId,
                        originalFileName: photo.name || 'unknown',
                        ...(authInfo?.uid ? { uploaderUid: authInfo.uid } : {})
                    }
                }
            });
            console.log(`✅ [${requestId}] File saved to Admin Storage`);
        } catch (adminErr) {
            console.error(`❌ [${requestId}] Admin Storage upload failed:`, adminErr);
            return NextResponse.json({
                success: false,
                error: 'Gagal mengupload ke Storage (Admin SDK)',
                technicalError: adminErr.message,
                errorCode: 'admin_upload_failed',
                requestId,
                timestamp: new Date().toISOString(),
                storagePath
            }, { status: 500 });
        }

        // Generate signed URL
        console.log(`🔗 [${requestId}] Generating signed URL...`);
        let downloadURL;
        try {
            const [url] = await fileHandle.getSignedUrl({ action: 'read', expires: '03-01-2500' });
            downloadURL = url;
            console.log(`✅ [${requestId}] Signed URL generated`);
        } catch (urlError) {
            console.error(`❌ [${requestId}] Signed URL generation failed:`, urlError);
            return NextResponse.json({
                success: false,
                error: 'Gagal mendapatkan URL foto - foto mungkin sudah terupload tapi tidak dapat diakses',
                technicalError: urlError.message,
                requestId,
                timestamp: new Date().toISOString(),
                storagePath
            }, { status: 500 });
        }

        // Enhanced Firestore document update
        try {
            console.log(`📝 [${requestId}] Updating Firestore document...`);
            const db = adminDb || getFirestore(activeApp);
            const docRef = doc(db, collection, docId);
            
            const updateData = {
                [fieldName]: downloadURL,
                updatedAt: serverTimestamp(),
                [`${fieldName}_uploadedAt`]: serverTimestamp(),
                [`${fieldName}_requestId`]: requestId
            };

            await updateDoc(docRef, updateData);
            console.log(`✅ [${requestId}] Firestore document updated with photo URL`);
        } catch (firestoreError) {
            console.warn(`⚠️ [${requestId}] Failed to update Firestore document:`, firestoreError);
            // Don't fail the entire request if Firestore update fails
            // The photo is already uploaded successfully
        }

        console.log(`🎉 [${requestId}] Upload process completed successfully`);
        return NextResponse.json({
            success: true,
            downloadURL: downloadURL,
            storagePath: storagePath,
            message: 'Foto berhasil diupload',
            requestId,
            timestamp: new Date().toISOString(),
            fileSize: photo.size,
            fileName: fileName
        });

    } catch (error) {
        console.error(`❌ [${requestId}] API Upload Photo Unexpected Error:`, error);
        console.error(`❌ [${requestId}] Error stack:`, error.stack);
        console.error(`❌ [${requestId}] Error details:`, {
            name: error.name,
            message: error.message,
            code: error.code,
            cause: error.cause
        });
        
        let errorMessage = 'Terjadi kesalahan tidak terduga saat upload foto';
        let errorCode = 'unexpected_error';
        
        // Enhanced error type handling
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            errorMessage = 'Gagal terhubung ke server - periksa koneksi internet';
            errorCode = 'network_error';
        } else if (error.message.includes('CORS')) {
            errorMessage = 'Error CORS saat upload foto - konfigurasi server bermasalah';
            errorCode = 'cors_error';
        } else if (error.code === 'storage/unauthorized') {
            errorMessage = 'Tidak memiliki izin untuk upload foto - silakan login ulang';
            errorCode = 'unauthorized';
        } else if (error.code === 'storage/quota-exceeded') {
            errorMessage = 'Kapasitas storage penuh - hubungi administrator';
            errorCode = 'quota_exceeded';
        } else if (error.code === 'storage/network-request-failed') {
            errorMessage = 'Gagal terhubung ke server storage - periksa koneksi internet';
            errorCode = 'network_failed';
        } else if (error.code === 'storage/unknown') {
            errorMessage = 'Error Firebase Storage tidak dikenal - silakan coba lagi';
            errorCode = 'unknown_storage_error';
        } else if (error.message.includes('timeout')) {
            errorMessage = 'Operasi timeout - silakan coba lagi dengan koneksi yang lebih stabil';
            errorCode = 'timeout';
        }

        return NextResponse.json({
            success: false,
            error: errorMessage,
            technicalError: error.message,
            errorCode: errorCode,
            firebaseErrorCode: error.code || 'unknown',
            requestId,
            timestamp: new Date().toISOString(),
            errorName: error.name,
            errorStack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
}
