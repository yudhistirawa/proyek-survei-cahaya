import { NextResponse } from 'next/server';
import { adminStorage } from '../../lib/firebase-admin.js';

export const dynamic = 'force-dynamic';
// Pastikan menggunakan runtime Node.js agar Buffer tersedia
export const runtime = 'nodejs';

/**
 * POST - Upload gambar ke Firebase Storage melalui API route
 * Mendukung dua input:
 * - FormData dengan field 'file' (File/Blob)
 * - JSON body dengan field 'dataUrl' (data:image/..;base64,....)
 */
export async function POST(request) {
    try {
        console.log('🔄 API route upload-image dipanggil');

        // Terima baik FormData maupun JSON
        const contentType = request.headers.get('content-type') || '';
        let dataUrl = null;
        let fileFromForm = null;
        let path = null;
        let fileName = null;

        if (contentType.includes('application/json')) {
            // JSON body: { dataUrl, folder, userId, docId, filenameBase, path, fileName }
            const body = await request.json();
            dataUrl = body.dataUrl || null;
            // Build path: prefer explicit path; else compose from folder/userId/docId
            if (body.path) {
                path = body.path;
            } else if (body.folder) {
                const parts = [body.folder, body.userId, body.docId].filter(Boolean);
                path = parts.join('/');
            }
            fileName = body.fileName || body.filenameBase || 'image';
        } else {
            // FormData body
            const formData = await request.formData();
            dataUrl = formData.get('dataUrl');
            fileFromForm = formData.get('file');
            const folder = formData.get('folder');
            const userId = formData.get('userId');
            const docId = formData.get('docId');
            const filenameBase = formData.get('filenameBase');
            path = formData.get('path') || [folder, userId, docId].filter(Boolean).join('/');
            fileName = formData.get('fileName') || filenameBase || 'image';
        }

        console.log('📋 Received data:', { path, fileName, hasDataUrl: !!dataUrl, hasFile: !!fileFromForm });

        if ((!dataUrl && !fileFromForm) || !path || !fileName) {
            console.error('❌ Missing required fields');
            return NextResponse.json(
                { error: 'Missing required fields: file OR dataUrl, path, fileName' },
                { status: 400 }
            );
        }

        if (!adminStorage) {
            console.error('❌ Firebase Admin Storage tidak tersedia');
            return NextResponse.json(
                { error: 'Firebase Admin Storage not available' },
                { status: 500 }
            );
        }

        console.log('🔄 Server-side upload:', { path, fileName });
        try {
            console.log('📦 Bucket (from admin):', adminStorage.bucket().name);
        } catch (e) {
            console.error('❌ Tidak bisa mendapatkan bucket dari adminStorage:', e);
        }

        // Preflight: resolve bucket and validate existence to provide clearer errors
        let resolvedEnvBucket = process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || null;
        // Gunakan nama bucket yang sesuai dengan Firebase Console (tidak perlu normalisasi)
        let preflightBucket;
        try {
            preflightBucket = resolvedEnvBucket ? adminStorage.bucket(resolvedEnvBucket) : adminStorage.bucket();
            const [exists] = await preflightBucket.exists();
            console.log('🧪 Bucket exists check:', { bucketName: preflightBucket.name, exists, envBucketName: resolvedEnvBucket });
            if (!exists) {
                console.warn('⚠️ Preflight: bucket does not exist, will continue to fallback selection', { bucketName: preflightBucket.name, envBucketName: resolvedEnvBucket });
                // Do not return here; continue to bucket selection and fallback logic below
            }
        } catch (preErr) {
            console.warn('⚠️ Bucket existence precheck failed:', preErr?.message);
            // continue; upload will attempt and fall back below
        }

        // Siapkan blob dari file atau dataUrl
        let blob;
        if (fileFromForm && typeof fileFromForm.arrayBuffer === 'function') {
            // fileFromForm sudah berupa Blob/File
            blob = fileFromForm;
            console.log('✅ Menggunakan file dari FormData, size:', blob.size);
        } else if (dataUrl) {
            // Convert data URL to blob with timeout
            console.log('🔄 Converting data URL to blob...');
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
            
            try {
                const response = await fetch(dataUrl, {
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                blob = await response.blob();
                console.log('✅ Data URL berhasil dikonversi ke blob, size:', blob.size);
            } catch (fetchError) {
                clearTimeout(timeoutId);
                if (fetchError.name === 'AbortError') {
                    throw new Error('Timeout saat mengkonversi data URL');
                }
                throw fetchError;
            }
        } else {
            throw new Error('Tidak ada file atau dataUrl yang diterima');
        }

        // Create unique filename
        const timestamp = Date.now();
        const webpFileName = `${fileName}_${timestamp}.webp`;
        const fullPath = `${path}/${webpFileName}`;

        console.log('📁 Upload path:', fullPath);

        // Upload to Firebase Storage using Admin SDK
        console.log('🔄 Uploading ke Firebase Storage...');
        // Prefer ENV bucket as primary; fallback to default
        const ENV_BUCKET = process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
        let selectedBucket;
        let file;
        let triedBuckets = [];
        let envBucketCandidate = null;
        
        // Primary selection: ENV bucket when available
        if (ENV_BUCKET) {
            try {
                selectedBucket = adminStorage.bucket(ENV_BUCKET);
                triedBuckets.push(selectedBucket.name || '(env)');
                console.log('📦 Using bucket (from ENV):', selectedBucket.name);
            } catch (e) {
                console.warn('⚠️ Could not use ENV bucket, will try default:', e?.message);
            }
        }
        // Fallback primary: default bucket
        if (!selectedBucket) {
            try {
                selectedBucket = adminStorage.bucket();
                triedBuckets.push(selectedBucket.name || '(default)');
                console.log('📦 Using bucket (default from Admin SDK):', selectedBucket.name);
            } catch (e) {
                console.warn('⚠️ Could not get default bucket:', e?.message);
            }
        }
        // Prepare alternate candidate for retry
        if (ENV_BUCKET) {
            try {
                envBucketCandidate = adminStorage.bucket(ENV_BUCKET);
                console.log('📝 Alternate ENV bucket candidate available:', envBucketCandidate.name);
            } catch (e) {
                console.warn('⚠️ Could not prepare ENV bucket candidate:', ENV_BUCKET, e?.message);
            }
        }
        if (!selectedBucket) {
            throw new Error('Tidak bisa menentukan bucket Storage dari Admin SDK');
        }

        // Verifikasi keberadaan bucket terpilih sebelum upload dengan fallback format
        try {
            const [selExists] = await selectedBucket.exists();
            if (!selExists) {
                console.warn('⚠️ Selected bucket does not exist, trying alternate candidates...', { bucketName: selectedBucket.name });
                let alt = null;

                // Coba format alternatif bucket (.firebasestorage.app vs .appspot.com)
                const currentBucketName = selectedBucket.name;
                let alternateBucketName = null;
                
                if (currentBucketName.endsWith('.appspot.com')) {
                    alternateBucketName = currentBucketName.replace('.appspot.com', '.firebasestorage.app');
                } else if (currentBucketName.endsWith('.firebasestorage.app')) {
                    alternateBucketName = currentBucketName.replace('.firebasestorage.app', '.appspot.com');
                }

                if (alternateBucketName) {
                    try {
                        const altFormatBucket = adminStorage.bucket(alternateBucketName);
                        const [altExists] = await altFormatBucket.exists();
                        if (altExists) {
                            alt = altFormatBucket;
                            console.log('📦 Switching to alternate format bucket:', alt.name);
                        }
                    } catch (e) {
                        console.warn('⚠️ Failed exists() check for alternate format bucket:', e?.message);
                    }
                }

                // Coba ENV bucket jika berbeda dan ada
                if (!alt && envBucketCandidate && envBucketCandidate.name !== selectedBucket.name) {
                    try {
                        const [envExists] = await envBucketCandidate.exists();
                        if (envExists) {
                            alt = envBucketCandidate;
                            console.log('📦 Switching to ENV bucket after exists() check:', alt.name);
                        }
                    } catch (e) {
                        console.warn('⚠️ Failed exists() check for ENV bucket candidate:', e?.message);
                    }
                }

                // Coba default bucket jika berbeda dan ada
                if (!alt) {
                    try {
                        const defBucket = adminStorage.bucket();
                        if (defBucket && defBucket.name !== selectedBucket.name) {
                            const [defExists] = await defBucket.exists();
                            if (defExists) {
                                alt = defBucket;
                                console.log('📦 Switching to default bucket after exists() check:', alt.name);
                            }
                        }
                    } catch (e) {
                        console.warn('⚠️ Could not prepare default bucket for fallback exists() check:', e?.message);
                    }
                }

                if (alt) {
                    selectedBucket = alt;
                } else {
                    throw new Error('Tidak ada bucket yang tersedia (exists=false) setelah pemeriksaan. Pastikan bucket dibuat dan kredensial memiliki akses.');
                }
            }
        } catch (existErr) {
            console.warn('⚠️ Could not verify bucket existence before upload:', existErr?.message);
            // Lanjutkan, karena verifikasi bukan fatal di semua environment
        }

        file = selectedBucket.file(fullPath);
        
        try {
            // Google Cloud Storage client mengharapkan Buffer/string/stream
            const arrayBuffer = typeof blob.arrayBuffer === 'function' ? await blob.arrayBuffer() : null;
            if (!arrayBuffer) {
                throw new Error('Tidak dapat membaca blob menjadi ArrayBuffer');
            }
            const buffer = Buffer.from(arrayBuffer);
            const contentType = blob.type || 'image/webp';

            await file.save(buffer, {
                metadata: {
                    contentType,
                    metadata: {
                        uploadedVia: 'api-route',
                        originalName: fileName,
                        uploadedAt: new Date().toISOString()
                    }
                }
            });
            console.log('✅ File berhasil disimpan ke Storage');
        } catch (uploadError) {
            console.error('❌ Error saat upload ke Storage (attempt with bucket):', selectedBucket?.name, uploadError);
            // Jika bucket tidak ditemukan, coba kebalikan dari strategi awal: jika awalnya ENV → coba default, jika awalnya default → coba ENV
            const msg = uploadError?.message || '';
            const triedDefault = triedBuckets.includes(selectedBucket?.name);
            let fallbackBucket = null;
            // If default failed and ENV candidate exists, try ENV
            if (envBucketCandidate && (!triedBuckets.includes(envBucketCandidate.name) || triedDefault)) {
                fallbackBucket = envBucketCandidate;
                console.log('🛠️ Retrying with ENV bucket:', fallbackBucket.name);
            } else {
                // Otherwise try default again (in case first attempt used ENV for some reason)
                try {
                    fallbackBucket = adminStorage.bucket();
                    console.log('🛠️ Retrying with default bucket:', fallbackBucket.name);
                } catch (e) {
                    console.warn('⚠️ Tidak bisa menggunakan default bucket saat fallback:', e?.message);
                }
            }
            if (fallbackBucket) {
                try {
                    const fbFile = fallbackBucket.file(fullPath);
                    const arrayBuffer = typeof blob.arrayBuffer === 'function' ? await blob.arrayBuffer() : null;
                    if (!arrayBuffer) throw new Error('Tidak dapat membaca blob menjadi ArrayBuffer (fallback)');
                    const buffer = Buffer.from(arrayBuffer);
                    const contentType = blob.type || 'image/webp';
                    await fbFile.save(buffer, {
                        metadata: {
                            contentType,
                            metadata: {
                                uploadedVia: 'api-route',
                                originalName: fileName,
                                uploadedAt: new Date().toISOString(),
                                triedBuckets: JSON.stringify(triedBuckets)
                            }
                        }
                    });
                    console.log('✅ File berhasil disimpan ke Storage (fallback bucket)');
                    selectedBucket = fallbackBucket;
                    file = fbFile;
                } catch (fallbackErr) {
                    console.error('❌ Fallback upload juga gagal:', fallbackErr);
                    throw new Error(`Gagal upload ke Storage: ${uploadError.message}`);
                }
            } else {
                throw new Error(`Gagal upload ke Storage: ${uploadError.message}`);
            }
        }

        // Get download URL
        console.log('🔄 Generating download URL...');
        let downloadURL;
        try {
            const [url] = await file.getSignedUrl({
                action: 'read',
                expires: '03-01-2500' // Very long expiration
            });
            downloadURL = url;
            console.log('✅ Download URL berhasil dibuat');
        } catch (urlError) {
            console.error('❌ Error saat generate download URL:', urlError);
            throw new Error(`Gagal generate download URL: ${urlError.message}`);
        }

        console.log('✅ Server-side upload successful:', downloadURL);

        return NextResponse.json({
            success: true,
            downloadURL,
            path: fullPath
        });

    } catch (error) {
        console.error('❌ Server-side upload error:', error);
        
        // Log detail error untuk debugging
        if (error.code) {
            console.error('Error code:', error.code);
        }
        if (error.message) {
            console.error('Error message:', error.message);
        }
        if (error.stack) {
            console.error('Stack:', error.stack);
        }
        
        const envBucketName = process.env.FIREBASE_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || null;
        return NextResponse.json(
            { 
                error: 'Upload failed',
                details: error.message,
                code: error.code || 'unknown',
                envBucket: envBucketName,
                hint: 'Verify Firebase Admin service account, projectId, and storageBucket. Ensure the bucket exists in Firebase Console.'
            },
            { status: 500 }
        );
    }
}

/**
 * GET - Test endpoint untuk mengecek koneksi
 */
export async function GET() {
  try {
    console.log('🧪 Testing Firebase Admin connection...');
    
    if (!adminStorage) {
      return NextResponse.json({
        status: 'error',
        message: 'Firebase Admin Storage tidak tersedia',
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }
    
    // Test bucket access
    const bucket = adminStorage.bucket();
    console.log('✅ Bucket name:', bucket.name);
    
    // Test simple operation
    const [files] = await bucket.getFiles({ maxResults: 1 });
    console.log('✅ Bucket accessible, files count:', files.length);
    
    return NextResponse.json({
      status: 'success',
      message: 'Firebase Admin connection OK',
      bucketName: bucket.name,
      filesCount: files.length,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Firebase Admin test failed:', error);
    return NextResponse.json({
      status: 'error',
      message: 'Firebase Admin test failed',
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
