// app/api/reports/route.js
import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { adminDb, deleteFileFromStorage } from '../../lib/firebase-admin.js';
import { logAdminDeleteDetailed } from '../../lib/activity-logger';

export const dynamic = 'force-dynamic';

// Helper function to get reports collection safely
const getReportsCollection = () => {
  if (!adminDb) {
    throw new Error('Firebase Admin not initialized - check environment variables');
  }
  // Use reports collection as requested
  return adminDb.collection('reports');
};

/**
 * Helper function to extract file paths from report data
 */
const extractFilePathsFromReport = (reportData) => {
  const filePaths = [];
  
  try {
    // Parse gridData if it's a string
    let gridData = reportData.gridData;
    if (typeof gridData === 'string') {
      gridData = JSON.parse(gridData);
    }
    
    // Extract file paths from gridData
    if (Array.isArray(gridData)) {
      for (let i = 0; i < gridData.length; i++) {
        if (Array.isArray(gridData[i])) {
          for (let j = 0; j < gridData[i].length; j++) {
            const cell = gridData[i][j];
            // Check if cell is an object with image property
            if (cell && typeof cell === 'object' && cell.image && cell.image.includes('firebase')) {
              const match = cell.image.match(/\/o\/([^?]+)/);
              if (match) {
                const decodedPath = decodeURIComponent(match[1]);
                filePaths.push(decodedPath);
              }
            }
            // Also check if cell itself is a string URL (legacy support)
            else if (typeof cell === 'string' && cell.includes('firebase')) {
              const match = cell.match(/\/o\/([^?]+)/);
              if (match) {
                const decodedPath = decodeURIComponent(match[1]);
                filePaths.push(decodedPath);
              }
            }
          }
        }
      }
    }
    
    // Extract file paths from documentation photos
    if (reportData.documentationPhotos && typeof reportData.documentationPhotos === 'object') {
      Object.values(reportData.documentationPhotos).forEach(photoUrl => {
        if (typeof photoUrl === 'string' && photoUrl.includes('firebase')) {
          const match = photoUrl.match(/\/o\/([^?]+)/);
          if (match) {
            const decodedPath = decodeURIComponent(match[1]);
            filePaths.push(decodedPath);
          }
        }
      });
    }
    
    // Extract file paths from other fields that might contain file URLs
    const checkField = (field) => {
      if (typeof field === 'string' && field.includes('firebase')) {
        const match = field.match(/\/o\/([^?]+)/);
        if (match) {
          const decodedPath = decodeURIComponent(match[1]);
          filePaths.push(decodedPath);
        }
      }
    };
    
    // Check common fields that might contain file URLs
    if (reportData.photoUrl) checkField(reportData.photoUrl);
    if (reportData.attachments && Array.isArray(reportData.attachments)) {
      reportData.attachments.forEach(attachment => {
        if (typeof attachment === 'string') {
          checkField(attachment);
        } else if (attachment && attachment.url) {
          checkField(attachment.url);
        }
      });
    }
    
  } catch (error) {
    console.error('Error extracting file paths:', error);
  }
  
  return filePaths;
};

/**
 * Handler untuk GET request: Mengambil daftar laporan atau satu laporan tunggal.
 */
export async function GET(request) {
  try {
    console.log('=== API Reports GET Request Started ===');
    
    // Check if Firebase Admin is initialized
    if (!adminDb) {
      console.error('❌ Firebase Admin not initialized');
      return NextResponse.json({ 
        message: 'Internal Server Error saat mengambil data',
        error: 'Firebase Admin not initialized - check environment variables' 
      }, { status: 500 });
    }
    
    const { searchParams } = new URL(request.url);
    // If debug mode requested, delegate to internal helper
    if (searchParams.get('debug') === '1') {
      return await debugFilePaths(request);
    }
    const surveyorName = searchParams.get('surveyorName');
    const reportId = searchParams.get('id');
    const limit = searchParams.get('limit');
    const lightweight = searchParams.get('lightweight') === 'true';
    const page = parseInt(searchParams.get('page')) || 1;
    const pageSize = parseInt(searchParams.get('pageSize')) || 20;

    console.log('Request parameters:', {
      surveyorName,
      reportId,
      limit,
      lightweight,
      page,
      pageSize
    });

    // Set cache headers for better performance
    const cacheHeaders = {
      'Cache-Control': lightweight ? 'public, max-age=60, stale-while-revalidate=120' : 'public, max-age=10, stale-while-revalidate=30',
      'CDN-Cache-Control': 'public, max-age=120',
      'Vary': 'Accept-Encoding'
    };

    // Khusus untuk dropdown - endpoint super ringan
    const dropdownOnly = searchParams.get('dropdown') === 'true';
    if (dropdownOnly) {
      console.log('Fetching dropdown-only data (super lightweight)');
      
      const reportsCollection = getReportsCollection();
      let query = reportsCollection
        .select('projectTitle', 'lampPower', 'poleHeight', 'surveyorName', 'createdAt', 'modifiedAt')
        .where('gridData', '!=', null)
        .orderBy('gridData')
        .orderBy('createdAt', 'desc')
        .limit(50); // Batasi hanya 50 item untuk dropdown
      
      const snapshot = await query.get();
      
      if (snapshot.empty) {
        const response = NextResponse.json([]);
        Object.entries(cacheHeaders).forEach(([key, value]) => {
          response.headers.set(key, value);
        });
        return response;
      }

      const dropdownData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          lampPower: data.lampPower || 'N/A',
          poleHeight: data.poleHeight || 'N/A', 
          surveyorName: data.surveyorName || 'Unknown',
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : null,
          modifiedAt: data.modifiedAt?.toDate ? data.modifiedAt.toDate().toISOString() : data.modifiedAt,
          hasGridData: true // Sudah difilter di query
        };
      });

      const response = NextResponse.json(dropdownData);
      // Cache lebih lama untuk dropdown
      response.headers.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
      response.headers.set('CDN-Cache-Control', 'public, max-age=600');
      return response;
    }

    // Fungsi helper untuk mem-parsing gridData dengan aman dan cepat
    const parseGridData = (data, docId, isLightweight = false) => {
      if (isLightweight) {
        // Skip parsing gridData completely for list view
        data.gridData = null;
        return data;
      }
      
      if (data.gridData && typeof data.gridData === 'string') {
        try {
          data.gridData = JSON.parse(data.gridData);
        } catch (e) {
          console.error(`Gagal mem-parsing gridData untuk laporan ${docId}`, e);
          data.gridData = [];
        }
      } else if (!data.gridData) {
        data.gridData = [];
      }
      return data;
    };

    // Prioritaskan pengambilan data tunggal jika ID diberikan
    if (reportId) {
        console.log(`Fetching single report with ID: ${reportId}`);
        const reportsCollection = getReportsCollection();
        const reportRef = reportsCollection.doc(reportId);
        const doc = await reportRef.get();
        
        if (!doc.exists) {
          return NextResponse.json({ message: 'Laporan tidak ditemukan' }, { status: 404 });
        }

        const data = parseGridData(doc.data(), doc.id, false);

        const response = NextResponse.json({
            id: doc.id,
            ...data,
            projectDate: data.projectDate?.toDate ? data.projectDate.toDate().toISOString() : data.projectDate,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : null,
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : null,
            modifiedAt: data.modifiedAt?.toDate ? data.modifiedAt.toDate().toISOString() : data.modifiedAt,
            modifiedBy: data.modifiedBy || null,
        });

        // Set cache headers
        Object.entries(cacheHeaders).forEach(([key, value]) => {
          response.headers.set(key, value);
        });

        return response;
    }

    // --- Optimasi untuk mengambil DAFTAR laporan ---
    const reportsCollection = getReportsCollection();
    let query;
    if (surveyorName) {
      console.log(`Filtering report list for surveyor: ${surveyorName}`);
      query = reportsCollection.where('surveyorName_lowercase', '==', surveyorName.toLowerCase());
    } else {
      console.log('Fetching reports for admin list view from survey-reports collection');
      // Perbaikan: Gunakan orderBy untuk mendapatkan data terbaru
      query = reportsCollection.orderBy('createdAt', 'desc');
    }
    
    // Implementasi pagination yang lebih efisien
    let effectiveLimit;
    if (limit && !isNaN(parseInt(limit))) {
      effectiveLimit = Math.min(parseInt(limit), 50); // Increased max to 50 items per request
    } else if (lightweight) {
      effectiveLimit = Math.min(pageSize, 30); // Increased to 30 for faster lightweight loading
    } else {
      effectiveLimit = Math.min(pageSize, 50); // Increased to 50 for full data
    }

    console.log(`Using effective limit: ${effectiveLimit}`);
    query = query.limit(effectiveLimit);
    
    console.log('Executing Firestore query...');
    const snapshot = await query.get();
    console.log(`Query executed. Found ${snapshot.docs.length} documents in reports collection`);
    
    if (snapshot.empty) {
      console.log('No documents found in survey-reports collection');
      const response = NextResponse.json([]);
      Object.entries(cacheHeaders).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    }

    // Optimasi processing dengan batch processing yang lebih kecil
    const batchSize = lightweight ? 15 : 10; // Increased batch size for faster processing
    const reports = [];
    
    console.log(`Processing ${snapshot.docs.length} documents in batches of ${batchSize}...`);
    
    for (let i = 0; i < snapshot.docs.length; i += batchSize) {
      const batch = snapshot.docs.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (doc) => {
        const data = doc.data();
        
        // Minimal processing for lightweight mode
        if (lightweight) {
          return {
            id: doc.id,
            projectTitle: data.projectTitle || '',
            projectLocation: data.projectLocation || '',
            surveyorName: data.surveyorName || '',
            lampPower: data.lampPower || '',
            poleHeight: data.poleHeight || '',
            initialVoltage: data.initialVoltage || '',
            projectDate: data.projectDate?.toDate ? data.projectDate.toDate().toISOString() : data.projectDate,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : null,
            modifiedAt: data.modifiedAt?.toDate ? data.modifiedAt.toDate().toISOString() : data.modifiedAt,
            modifiedBy: data.modifiedBy || null,
            stats: data.stats || null,
            hasGridData: !!(data.gridData),
            hasDocumentationPhotos: !!(data.documentationPhotos && Object.keys(data.documentationPhotos).length > 0)
          };
        }
        
        // Full processing for non-lightweight mode
        const parsedData = parseGridData(data, doc.id, false);
        return {
          id: doc.id,
          ...parsedData,
          projectDate: data.projectDate?.toDate ? data.projectDate.toDate().toISOString() : data.projectDate,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : null,
          updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : null,
          modifiedAt: data.modifiedAt?.toDate ? data.modifiedAt.toDate().toISOString() : data.modifiedAt,
          modifiedBy: data.modifiedBy || null,
        };
      });

      const batchResults = await Promise.all(batchPromises);
      reports.push(...batchResults);
      
      // Micro delay to prevent blocking
      if (i + batchSize < snapshot.docs.length) {
        await new Promise(resolve => setTimeout(resolve, 1));
      }
    }

    console.log(`Successfully processed ${reports.length} reports`);

    // Optimasi sorting hanya jika diperlukan
    if (surveyorName && reports.length > 1) {
      reports.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt) : 0;
        const dateB = b.createdAt ? new Date(b.createdAt) : 0;
        return dateB - dateA;
      });
    }

    console.log('=== API Reports GET Request Completed Successfully ===');
    const response = NextResponse.json(reports);
    
    // Set cache headers
    Object.entries(cacheHeaders).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;

  } catch (error) {
    console.error('=== API Reports GET Request Failed ===');
    console.error('Error fetching reports:', error);
    console.error('Error code:', error.code);
    console.error('Error stack:', error.stack);
    
    // Handle specific authentication errors - return empty data for development
    if (error.code === 16 || error.code === 'UNAUTHENTICATED' || error.message.includes('UNAUTHENTICATED')) {
      console.warn('⚠️ Firebase authentication failed - returning empty data for development');
      console.warn('Please regenerate Firebase service account key in Firebase Console');
      
      // Return empty array instead of error for development continuity
      const response = NextResponse.json([]);
      response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate');
      return response;
    }
    
    return NextResponse.json({ message: 'Internal Server Error saat mengambil data', error: error.message }, { status: 500 });
  }
}


/**
 * Handler untuk POST request: Menyimpan (membuat baru atau memperbarui) laporan.
 */
export async function POST(request) {
  let reportDataFromClient;
  try {
    reportDataFromClient = await request.json();
    console.log('Request body successfully parsed. Processing data...');
  } catch (parseError) {
    console.error('Error parsing request JSON:', parseError);
    return NextResponse.json({ message: 'Bad Request: Format JSON tidak valid.' }, { status: 400 });
  }

  try {
    // Check if Firebase Admin is initialized
    if (!adminDb) {
      console.error('❌ Firebase Admin not initialized');
      return NextResponse.json({ 
        message: 'Internal Server Error saat menyimpan data',
        error: 'Firebase Admin not initialized - check environment variables' 
      }, { status: 500 });
    }
    // Buat salinan data agar bisa diubah tanpa memengaruhi data asli untuk logging error
    const reportData = JSON.parse(JSON.stringify(reportDataFromClient));

    // **FIX UNTUK IOS**: Cari dan kompres gambar di dalam gridData sebelum menyimpan.
    // Ini akan mengurangi ukuran data secara signifikan untuk mengatasi batas 1MB.
    if (reportData.gridData && Array.isArray(reportData.gridData)) {
      console.log('Mencari data gambar di dalam grid untuk dikompres...');
      for (let i = 0; i < reportData.gridData.length; i++) {
        if (Array.isArray(reportData.gridData[i])) {
          for (let j = 0; j < reportData.gridData[i].length; j++) {
            const cell = reportData.gridData[i][j];
            if (typeof cell === 'string' && cell.startsWith('data:image')) {
              console.log(`Menemukan gambar di grid[${i}][${j}]. Memulai kompresi...`);
              try {
                const base64Data = cell.split(';base64,').pop();
                const imageBuffer = Buffer.from(base64Data, 'base64');
                
                const processedImageBuffer = await sharp(imageBuffer)
                  .resize({ width: 1024, fit: 'inside', withoutEnlargement: true }) // Ubah ukuran gambar
                  .webp({ quality: 75 }) // Konversi ke WebP dengan kualitas 75%
                  .toBuffer();
                
                // Ganti gambar asli dengan versi WebP yang sudah dikompres
                reportData.gridData[i][j] = `data:image/webp;base64,${processedImageBuffer.toString('base64')}`;
                console.log(`Gambar di grid[${i}][${j}] berhasil dikompres.`);
              } catch (imageError) {
                console.error(`Gagal mengompres gambar di grid[${i}][${j}]. Melanjutkan dengan gambar asli.`, imageError);
              }
            }
          }
        }
      }
    }

    let finalGridData = reportData.gridData;
    if (finalGridData && typeof finalGridData === 'object') {
        try {
            finalGridData = JSON.stringify(finalGridData);
        } catch(e) {
            console.error('Gagal melakukan stringify pada gridData', e);
            finalGridData = '[]';
        }
    }

    const { id, ...dataFromClient } = reportData;
    const dataToSave = { ...dataFromClient, gridData: finalGridData };


    if (dataToSave.surveyorName) {
      dataToSave.surveyorName_lowercase = dataToSave.surveyorName.toLowerCase();
    }
    
    if (dataToSave.projectDate && typeof dataToSave.projectDate === 'string') {
        const dateObject = new Date(dataToSave.projectDate);
        if (!isNaN(dateObject.getTime())) {
            dataToSave.projectDate = Timestamp.fromDate(dateObject);
        } else {
            console.warn(`Invalid date format received: "${dataToSave.projectDate}". Deleting date field.`);
            delete dataToSave.projectDate;
        }
    }
    
    dataToSave.updatedAt = FieldValue.serverTimestamp();

    Object.keys(dataToSave).forEach(key => {
        if (dataToSave[key] === undefined) {
            console.warn(`Sanitizing data: Found and removed undefined value for key "${key}".`);
            delete dataToSave[key];
        }
    });

    const isUpdateRequest = id && typeof id === 'string' && id.trim() !== '' && !id.startsWith('new-') && !id.startsWith('recovered-');

    if (isUpdateRequest) {
      console.log(`Updating report with ID: ${id}.`);
      const reportsCollection = getReportsCollection();
      const reportRef = reportsCollection.doc(id);
      await reportRef.set(dataToSave, { merge: true });
      return NextResponse.json({ message: 'Laporan berhasil diperbarui!', id: id }, { status: 200 });

    } else {
      // Cek apakah sudah ada laporan dengan detail yang sama
      try {
        const reportsCollection = getReportsCollection();
        const duplicateQuery = await reportsCollection
          .where('projectTitle', '==', dataToSave.projectTitle)
          .where('projectLocation', '==', dataToSave.projectLocation)
          .where('projectDate', '==', dataToSave.projectDate)
          .where('lampPower', '==', dataToSave.lampPower)
          .where('poleHeight', '==', dataToSave.poleHeight)
          .where('initialVoltage', '==', dataToSave.initialVoltage)
          .where('surveyorName_lowercase', '==', (dataToSave.surveyorName || '').toLowerCase())
          .limit(1)
          .get();

        if (!duplicateQuery.empty) {
          // Jika ditemukan, lakukan update
          const dupDoc = duplicateQuery.docs[0];
          console.log(`Duplicate report found (ID: ${dupDoc.id}). Updating instead of creating new.`);
          await dupDoc.ref.set(dataToSave, { merge: true });
          return NextResponse.json({ message: 'Laporan diperbarui (duplikat).', id: dupDoc.id }, { status: 200 });
        }
      } catch (dupErr) {
        console.error('Error checking duplicate reports:', dupErr);
      }

      dataToSave.createdAt = FieldValue.serverTimestamp(); 
      console.log('Creating a new report.');
      // Reuse the same collection reference from above
      const newReportRef = await reportsCollection.add(dataToSave);
      console.log(`New report created with ID: ${newReportRef.id}`);
      return NextResponse.json({ message: 'Laporan berhasil dibuat!', id: newReportRef.id }, { status: 201 });
    }

  } catch (error) {
    console.error('Error saving report to Firestore. Data that caused error:', JSON.stringify(reportDataFromClient, null, 2));
    console.error('Firestore Save Error Details:', error);
    if (error.message && error.message.includes('is longer than 1048487 bytes')) {
      return NextResponse.json({ message: 'Gagal menyimpan: Ukuran total data laporan melebihi 1MB.'}, { status: 413 });
    }
    return NextResponse.json({ message: `Gagal menyimpan: ${error.message}` }, { status: 500 });
  }
}


/**
 * Handler untuk DELETE request: Menghapus laporan berdasarkan ID.
 */
export async function DELETE(request) {
  try {
    // Check if Firebase Admin is initialized
    if (!adminDb) {
      console.error('❌ Firebase Admin not initialized');
      return NextResponse.json({ 
        message: 'Internal Server Error saat menghapus data',
        error: 'Firebase Admin not initialized - check environment variables' 
      }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ message: 'ID laporan tidak diberikan.' }, { status: 400 });
    }

    console.log(`Attempting to delete report with ID: ${id}`);
    
    // First, get the report data to extract file paths
    const reportsCollection = getReportsCollection();
    const reportRef = reportsCollection.doc(id);
    const doc = await reportRef.get();
    
    if (!doc.exists) {
      return NextResponse.json({ message: 'Laporan tidak ditemukan.' }, { status: 404 });
    }
    
    const reportData = doc.data();
    
    // Extract file paths from the report data
    const filePaths = extractFilePathsFromReport(reportData);
    
    console.log(`Found ${filePaths.length} files to delete from storage:`, filePaths);

    // Enhanced logging for each file deletion
    const deletePromises = filePaths.map(async (filePath) => {
      console.log(`Attempting to delete file: ${filePath}`);
      try {
        await deleteFileFromStorage(filePath);
        console.log(`Successfully deleted file: ${filePath}`);
        return { filePath, status: 'fulfilled' };
      } catch (error) {
        console.error(`Failed to delete file: ${filePath}`, error);
        return { filePath, status: 'rejected', error };
      }
    });

    const deleteResults = await Promise.allSettled(deletePromises);

    // Count successful and failed deletions
    const successfulDeletes = deleteResults.filter(r => r.status === 'fulfilled').length;
    const failedDeletes = deleteResults.filter(r => r.status === 'rejected').length;

    // Log the deletion activity with details
    await logAdminDeleteDetailed({
      userName: searchParams.get('userName') || 'Admin',
      details: `Menghapus laporan: ${reportData.projectName || id}`,
      deletedData: {
        reportId: id,
        projectName: reportData.projectName,
        surveyorName: reportData.surveyorName,
        totalFiles: filePaths.length,
        successfulDeletes,
        failedDeletes,
        filePaths,
        deleteResults
      }
    });
    
    // Delete the report document from Firestore
    await reportRef.delete();

    console.log(`Report with ID: ${id} and associated files successfully deleted.`);
    return NextResponse.json({ 
      message: 'Laporan dan file terkait berhasil dihapus.',
      deletedFiles: successfulDeletes,
      failedDeletes
    }, { status: 200 });

  } catch (error) {
    console.error('Error deleting report:', error);
    return NextResponse.json({ message: `Gagal menghapus laporan: ${error.message}` }, { status: 500 });
  }
}

/**
 * Handler untuk PATCH request: Digunakan untuk migrasi data satu kali.
 */
export async function PATCH(request) {
    try {
        // Check if Firebase Admin is initialized
        if (!adminDb) {
          console.error('❌ Firebase Admin not initialized');
          return NextResponse.json({ 
            message: 'Internal Server Error saat migrasi data',
            error: 'Firebase Admin not initialized - check environment variables' 
          }, { status: 500 });
        }

        console.log("Starting data migration for 'surveyorName_lowercase'...");
        const reportsCollection = getReportsCollection();
        const snapshot = await reportsCollection.get();
        
        if (snapshot.empty) {
            console.log("No documents to migrate.");
            return NextResponse.json({ message: "Tidak ada dokumen untuk dimigrasi." });
        }

        const batch = adminDb.batch();
        let updatedCount = 0;

        snapshot.docs.forEach(doc => {
            const data = doc.data();
            if (data.surveyorName && !data.surveyorName_lowercase) {
                // Reuse the same collection reference from above
                const reportRef = reportsCollection.doc(doc.id);
                batch.update(reportRef, { 
                    surveyorName_lowercase: data.surveyorName.toLowerCase() 
                });
                updatedCount++;
                console.log(`Queued update for doc ${doc.id}`);
            }
        });

        if (updatedCount > 0) {
            await batch.commit();
            console.log(`Successfully migrated ${updatedCount} documents.`);
            return NextResponse.json({ message: `Migrasi berhasil! ${updatedCount} dokumen telah diperbarui.` });
        } else {
            console.log("All documents are already up-to-date.");
            return NextResponse.json({ message: "Semua dokumen sudah memiliki format terbaru." });
        }

    } catch (error) {
        console.error('Data Migration Error:', error);
        return NextResponse.json({ message: 'Internal Server Error during migration', error: error.message }, { status: 500 });
    }
}

/**
 * Debug helper to get extracted file paths for a report ID
 * Not exported to conform to Next.js route export constraints
 */
async function debugFilePaths(request) {
    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ message: 'ID laporan tidak diberikan.' }, { status: 400 });
        }

        const reportsCollection = getReportsCollection();
        const reportRef = reportsCollection.doc(id);
        const doc = await reportRef.get();

        if (!doc.exists) {
            return NextResponse.json({ message: 'Laporan tidak ditemukan.' }, { status: 404 });
        }

        const reportData = doc.data();
        const filePaths = extractFilePathsFromReport(reportData);

        console.log(`Extracted file paths for report ${id}:`, filePaths);

        return NextResponse.json({ filePaths });

    } catch (error) {
        console.error('Error in debugFilePaths:', error);
        return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
    }
}
