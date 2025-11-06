import { NextResponse } from 'next/server';

export async function POST(request) {
  try {
    console.log('Starting file upload process...');
    
    // Dynamic import dengan error handling yang lebih baik
    let storage;
    try {
              const { adminStorage } = await import('../../../lib/firebase-admin.js');
              storage = adminStorage;
      console.log('Firebase Admin imported successfully');
      
      if (!storage) {
        throw new Error('Firebase Storage tidak tersedia');
      }
    } catch (importError) {
      console.error('Error importing firebase-admin:', importError);
      return NextResponse.json({ 
        error: 'Firebase Storage tidak dapat diakses. Silakan coba lagi nanti.' 
      }, { status: 500 });
    }
    
    // Validate request method
    if (request.method !== 'POST') {
      return NextResponse.json({ 
        error: 'Method tidak diizinkan' 
      }, { status: 405 });
    }

    // Check if request has form data
    const contentType = request.headers.get('content-type');
    if (!contentType || !contentType.includes('multipart/form-data')) {
      return NextResponse.json({ 
        error: 'Content-Type harus multipart/form-data' 
      }, { status: 400 });
    }
    
    const formData = await request.formData();
    const kmzFile = formData.get('kmzFile');
    const excelFile = formData.get('excelFile');
    const folder = formData.get('folder') || 'kmz';

    // Determine which file to process
    let file, fileType, fileContentType, maxSize, allowedExtensions;
    
    if (kmzFile) {
      file = kmzFile;
      fileType = 'KMZ';
      fileContentType = 'application/vnd.google-earth.kmz';
      maxSize = 50 * 1024 * 1024; // 50MB
      allowedExtensions = ['.kmz', '.kml'];
    } else if (excelFile) {
      file = excelFile;
      fileType = 'Excel';
      fileContentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      maxSize = 10 * 1024 * 1024; // 10MB
      allowedExtensions = ['.xlsx', '.xls', '.csv'];
    } else {
      console.log('No file found in request');
      return NextResponse.json({ 
        error: 'File diperlukan (KMZ atau Excel)' 
      }, { status: 400 });
    }

    console.log('File received:', {
      name: file.name,
      size: file.size,
      type: file.type,
      fileType: fileType
    });

    // Validate file type
    const fileExtension = file.name.toLowerCase();
    const isValidExtension = allowedExtensions.some(ext => fileExtension.endsWith(ext));
    if (!isValidExtension) {
      console.log('Invalid file type:', file.name);
      return NextResponse.json({ 
        error: `Hanya file ${fileType} yang diperbolehkan (${allowedExtensions.join(', ')})` 
      }, { status: 400 });
    }

    // Validate file size
    if (file.size > maxSize) {
      console.log('File too large:', file.size);
      return NextResponse.json({ 
        error: `Ukuran file terlalu besar. Maksimal ${Math.round(maxSize / (1024 * 1024))}MB` 
      }, { status: 400 });
    }

    // Convert file to buffer
    console.log('Converting file to buffer...');
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    console.log('Buffer created, size:', buffer.length);

    // Create a unique filename with timestamp
    const timestamp = Date.now();
    const originalName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    
    // Buat struktur folder yang lebih terorganisir dengan tanggal realtime
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
    const day = String(currentDate.getDate()).padStart(2, '0');
    const hours = String(currentDate.getHours()).padStart(2, '0');
    const minutes = String(currentDate.getMinutes()).padStart(2, '0');
    const seconds = String(currentDate.getSeconds()).padStart(2, '0');
    
    // Struktur: folder/YYYY/MM/DD/HH-MM-SS_timestamp_filename.ext
    const fileName = `${folder}/${year}/${month}/${day}/${hours}-${minutes}-${seconds}_${timestamp}_${originalName}`;
    
    console.log('Uploading to Firebase Storage:', fileName);
    console.log('File path structure:', {
      year,
      month,
      day,
      hours,
      minutes,
      seconds,
      timestamp,
      originalName,
      fullPath: fileName,
      folder: folder
    });
    
    // Upload using Firebase Admin SDK
    const bucket = storage.bucket();
    const fileUpload = bucket.file(fileName);
    
    console.log('Storage bucket created, uploading bytes...');
    
    // Upload file dengan metadata yang sesuai
    await fileUpload.save(buffer, {
      metadata: {
        contentType: fileContentType,
        metadata: {
          originalName: originalName,
          uploadedAt: new Date().toISOString(),
          fileType: fileType,
          folder: folder
        }
      }
    });
    
    console.log('File uploaded successfully');
    
    // Get download URL dengan signed URL untuk akses publik
    const [url] = await fileUpload.getSignedUrl({
      action: 'read',
      expires: Date.now() + 1000 * 60 * 60 * 24 * 365, // 1 tahun
    });
    
    console.log('Download URL obtained:', url);
    
    return NextResponse.json({
      success: true,
      message: `File ${fileType} berhasil diupload`,
      fileName: originalName,
      size: file.size,
      url: url,
      path: fileName,
      fileType: fileType,
      folder: folder
    });
    
  } catch (error) {
    console.error('Error uploading file:', error);
    
    // Handle specific Firebase errors
    if (error.code === 'storage/unauthorized') {
      return NextResponse.json({ 
        error: 'Tidak memiliki izin untuk mengupload ke Firebase Storage. Silakan hubungi administrator.' 
      }, { status: 403 });
    } else if (error.code === 'storage/bucket-not-found') {
      return NextResponse.json({ 
        error: 'Firebase Storage bucket tidak ditemukan. Silakan cek konfigurasi.' 
      }, { status: 500 });
    } else if (error.code === 'storage/quota-exceeded') {
      return NextResponse.json({ 
        error: 'Kapasitas penyimpanan Firebase Storage penuh. Silakan coba lagi nanti.' 
      }, { status: 507 });
    } else {
      return NextResponse.json({ 
        error: 'Gagal mengupload file. Silakan coba lagi nanti.' 
      }, { status: 500 });
    }
  }
} 