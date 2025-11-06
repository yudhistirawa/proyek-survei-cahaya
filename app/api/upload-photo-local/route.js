import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { getFirestore, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { firebaseApp } from '../../lib/firebase';

export async function POST(request) {
    const requestId = Math.random().toString(36).substring(2, 8);
    console.log(`🚀 [${requestId}] API Upload Photo Local - Request received`);
    
    try {
        // Parse form data
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
        const userId = formData.get('userId');
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

        // Validate required parameters
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

        // Validate file type
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

        // Validate file size (10MB limit)
        const maxSize = 10 * 1024 * 1024;
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

        // Create local storage path
        const timestamp = Date.now();
        const fileExtension = photo.name ? photo.name.split('.').pop() : 'jpg';
        const fileName = `${fieldName}_${timestamp}.${fileExtension}`;
        const relativePath = `foto-survey/${fileName}`;
        const uploadDir = path.join(process.cwd(), 'public', 'foto-survey');
        const filePath = path.join(uploadDir, fileName);

        console.log(`📁 [${requestId}] Local storage path:`, {
            uploadDir,
            fileName,
            relativePath,
            filePath
        });

        // Create directory if it doesn't exist
        try {
            if (!existsSync(uploadDir)) {
                await mkdir(uploadDir, { recursive: true });
                console.log(`✅ [${requestId}] Created upload directory:`, uploadDir);
            }
        } catch (dirError) {
            console.error(`❌ [${requestId}] Failed to create directory:`, dirError);
            return NextResponse.json({
                success: false,
                error: 'Gagal membuat direktori upload',
                technicalError: dirError.message,
                requestId,
                timestamp: new Date().toISOString()
            }, { status: 500 });
        }

        // Convert file to buffer
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

        // Save file to local storage
        try {
            console.log(`💾 [${requestId}] Saving file to local storage...`);
            await writeFile(filePath, buffer);
            console.log(`✅ [${requestId}] File saved successfully:`, filePath);
        } catch (saveError) {
            console.error(`❌ [${requestId}] Failed to save file:`, saveError);
            return NextResponse.json({
                success: false,
                error: 'Gagal menyimpan file foto',
                technicalError: saveError.message,
                requestId,
                timestamp: new Date().toISOString()
            }, { status: 500 });
        }

        // Create public URL for the file
        const publicURL = `/${relativePath}`;
        console.log(`🔗 [${requestId}] Public URL created:`, publicURL);

        // Update Firestore document if Firebase is available
        if (firebaseApp) {
            try {
                console.log(`📝 [${requestId}] Updating Firestore document...`);
                const db = getFirestore(firebaseApp);
                const docRef = doc(db, collection, docId);
                
                const updateData = {
                    [fieldName]: publicURL,
                    updatedAt: serverTimestamp(),
                    [`${fieldName}_uploadedAt`]: serverTimestamp(),
                    [`${fieldName}_requestId`]: requestId,
                    [`${fieldName}_storage`]: 'local'
                };

                await updateDoc(docRef, updateData);
                console.log(`✅ [${requestId}] Firestore document updated with photo URL`);
            } catch (firestoreError) {
                console.warn(`⚠️ [${requestId}] Failed to update Firestore document:`, firestoreError);
                // Don't fail the entire request if Firestore update fails
                // The photo is already uploaded successfully
            }
        }

        console.log(`🎉 [${requestId}] Local upload process completed successfully`);
        return NextResponse.json({
            success: true,
            downloadURL: publicURL,
            localPath: relativePath,
            message: 'Foto berhasil diupload ke storage lokal',
            requestId,
            timestamp: new Date().toISOString(),
            fileSize: photo.size,
            fileName: fileName,
            storageType: 'local'
        });

    } catch (error) {
        console.error(`❌ [${requestId}] API Upload Photo Local Unexpected Error:`, error);
        console.error(`❌ [${requestId}] Error stack:`, error.stack);
        
        return NextResponse.json({
            success: false,
            error: 'Terjadi kesalahan tidak terduga saat upload foto',
            technicalError: error.message,
            requestId,
            timestamp: new Date().toISOString(),
            errorName: error.name,
            errorStack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
}
