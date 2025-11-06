/**
 * Helper functions untuk upload foto melalui API route
 * Ini menghindari masalah CORS karena upload dilakukan dari server
 */

/**
 * Convert file ke WebP format menggunakan canvas
 * @param {File} file - File yang akan dikonversi
 * @param {number} quality - Kualitas WebP (0-1, default: 0.8)
 * @param {number} maxWidth - Lebar maksimal (default: 1920)
 * @param {number} maxHeight - Tinggi maksimal (default: 1080)
 * @returns {Promise<Blob>} - Blob WebP
 */
export async function convertFileToWebP(file, quality = 0.8, maxWidth = 1920, maxHeight = 1080) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      try {
        // Set ukuran canvas sesuai dengan gambar, dengan resize jika terlalu besar
        let { width, height } = img;
        
        // Resize jika gambar terlalu besar
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = width * ratio;
          height = height * ratio;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Gambar ke canvas
        ctx.drawImage(img, 0, 0, width, height);
        
        // Konversi ke WebP dengan kualitas yang ditentukan
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to convert image to WebP'));
          }
        }, 'image/webp', quality);
        
      } catch (error) {
        reject(new Error(`Error converting to WebP: ${error.message}`));
      }
    };
    
    img.onerror = () => reject(new Error('Error loading image'));
    
    // Load image dari file
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error('Error reading file'));
    reader.readAsDataURL(file);
  });
}

/**
 * Upload file WebP ke Firebase Storage dengan retry mechanism yang lebih kuat
 * @param {Blob} webpBlob - Blob WebP yang akan diupload
 * @param {string} folder - Nama folder di Firebase Storage (default: 'Survey_Existing_Photos')
 * @returns {Promise<{success: boolean, downloadURL?: string, error?: string}>}
 */
export async function uploadWebPToStorage(webpBlob, folder = 'Survey_Existing', filenameBase) {
  const maxRetries = 5;
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`📤 Uploading WebP via API route (attempt ${attempt}/${maxRetries}) -> folder: ${folder}`);

      // Siapkan nama file dasar; server akan menambahkan timestamp dan .webp
      const baseName = (filenameBase
        ? String(filenameBase)
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9\-_\s]/g, '')
            .replace(/\s+/g, '_')
            .slice(0, 60)
        : Math.random().toString(36).substring(2, 10)
      );
      const form = new FormData();
      form.append('file', webpBlob, `${baseName}.webp`);
      // Kirim keduanya: 'path' (untuk rute saat ini) dan 'folder' untuk kompatibilitas
      form.append('path', folder);
      form.append('folder', folder);
      form.append('fileName', baseName);
      form.append('filenameBase', baseName);

      // Tambahkan timeout agar tidak menggantung terlalu lama
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // 30s
      const res = await fetch('/api/upload-image', {
        method: 'POST',
        headers: {
          'Accept': 'application/json'
        },
        body: form,
        signal: controller.signal
      }).finally(() => clearTimeout(timeout));

      if (!res.ok) {
        // Coba parse JSON, jika gagal atau kosong fallback ke text mentah
        let detail = {};
        let rawText = '';
        try {
          const r1 = res.clone();
          detail = await r1.json();
        } catch (_) {}
        try {
          const r2 = res.clone();
          rawText = await r2.text();
        } catch (_) {}
        if (!detail || (typeof detail === 'object' && Object.keys(detail).length === 0)) {
          if (rawText) detail = { raw: rawText };
        } else if (rawText && !detail.raw) {
          // Simpan juga rawText untuk debugging tambahan
          detail.raw = rawText;
        }
        const safeDetail = (() => {
          try { return JSON.stringify(detail); } catch { return String(detail); }
        })();
        const statusInfo = `${res.status} ${res.statusText}`;
        console.error(`API upload error response -> ${statusInfo} | body: ${safeDetail}`);
        const serverMsg = detail?.details || detail?.error || detail?.raw;
        throw new Error(`API upload failed (${statusInfo}) [folder=${folder}]: ${serverMsg || 'No details'}`);
      }

      const result = await res.json();
      console.log('✅ WebP uploaded via API:', result.path);

      return {
        success: true,
        downloadURL: result.downloadURL,
        path: result.path,
        filename: result.path?.split('/').pop()
      };

    } catch (error) {
      lastError = error;
      console.error(`❌ API upload attempt ${attempt} failed:`, error);
      if (attempt < maxRetries) {
        const delay = attempt * 2000;
        console.log(`⏳ Waiting ${delay}ms before retry...`);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }

  console.error('❌ All API upload attempts failed');
  return {
    success: false,
    error: 'Gagal upload foto melalui API setelah beberapa percobaan. Coba lagi nanti.',
    technicalError: lastError?.message || 'unknown'
  };
}

/**
 * Upload file foto dengan konversi otomatis ke WebP
 * @param {File} file - File foto yang akan diupload
 * @param {string} folder - Nama folder di Firebase Storage (default: 'Survey_Existing_Photos')
 * @param {number} quality - Kualitas WebP (0-1, default: 0.8)
 * @returns {Promise<{success: boolean, downloadURL?: string, error?: string}>}
 */
export async function uploadPhotoWithWebPConversion(file, folder = 'Survey_Existing', quality = 0.8, filenameBase) {
  try {
    console.log(`📤 Starting photo upload with WebP conversion: ${file.name}`);
    
    // Validasi input
    if (!file) {
      throw new Error('File is required');
    }

    // Validasi tipe file
    if (!file.type.startsWith('image/')) {
      throw new Error('File harus berupa gambar');
    }

    // Validasi ukuran file (maksimal 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error(`Ukuran file terlalu besar. Maksimal ${Math.round(maxSize / (1024 * 1024))}MB`);
    }

    console.log('🔄 Converting file to WebP...');
    
    // Convert file ke WebP
    const webpBlob = await convertFileToWebP(file, quality);
    console.log('✅ File converted to WebP successfully');
    
    // Upload WebP ke Firebase Storage
    const uploadResult = await uploadWebPToStorage(webpBlob, folder, filenameBase);
    
    if (uploadResult.success) {
      console.log('✅ Photo upload completed successfully');
      return uploadResult;
    } else {
      throw new Error(uploadResult.error);
    }

  } catch (error) {
    console.error('❌ Photo upload with WebP conversion failed:', error);
    
    // User-friendly error messages
    let userMessage = 'Gagal upload foto. Silakan coba lagi.';
    
    if (error.message.includes('File harus berupa gambar')) {
      userMessage = 'File harus berupa gambar (JPG, PNG, dll).';
    } else if (error.message.includes('Ukuran file terlalu besar')) {
      userMessage = 'Ukuran foto terlalu besar. Silakan pilih foto yang lebih kecil.';
    } else if (error.message.includes('Failed to convert image to WebP')) {
      userMessage = 'Gagal mengkonversi foto ke format WebP. Silakan pilih foto yang berbeda.';
    } else if (error.message.includes('Error loading image')) {
      userMessage = 'Gagal memuat foto. Silakan pilih foto yang berbeda.';
    }
    
    return {
      success: false,
      error: userMessage,
      technicalError: error.message
    };
  }
}

/**
 * Upload multiple photos dengan konversi WebP
 * @param {File[]} files - Array of files yang akan diupload
 * @param {string} folder - Nama folder di Firebase Storage (default: 'Survey_Existing_Photos')
 * @param {number} quality - Kualitas WebP (0-1, default: 0.8)
 * @returns {Promise<{success: boolean, results: Array, error?: string}>}
 */
export async function uploadMultiplePhotosWithWebP(files, folder = 'Survey_Existing', quality = 0.8) {
  try {
    console.log(`📤 Uploading ${files.length} photos with WebP conversion...`);
    
    if (!Array.isArray(files) || files.length === 0) {
      throw new Error('Files array is required and cannot be empty');
    }
    
    const results = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      console.log(`📤 Uploading photo ${i + 1}/${files.length}: ${file.name}`);
      
      try {
        const result = await uploadPhotoWithWebPConversion(file, folder, quality);
        results.push({
          index: i,
          filename: file.name,
          success: result.success,
          downloadURL: result.downloadURL,
          error: result.error,
          path: result.path
        });
      } catch (error) {
        console.error(`❌ Failed to upload photo ${file.name}:`, error);
        results.push({
          index: i,
          filename: file.name,
          success: false,
          error: error.message
        });
      }
    }
    
    // Analisis hasil
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    console.log(`✅ Multiple photos upload completed: ${successful.length} successful, ${failed.length} failed`);
    
    return {
      success: failed.length === 0,
      results: results,
      summary: {
        total: files.length,
        successful: successful.length,
        failed: failed.length
      }
    };
    
  } catch (error) {
    console.error('❌ Multiple photos upload failed:', error);
    return {
      success: false,
      error: 'Failed to upload multiple photos',
      technicalError: error.message
    };
  }
}

// Enhanced function for backward compatibility with better error handling
export async function uploadPhotoViaAPI(dataUrl, folder, userId, docId, filenameBase) {
  const uploadId = Math.random().toString(36).substring(2, 8);
  
  try {
    console.log(`📤 [${uploadId}] Uploading photo via API: ${folder}/${userId}/${docId}/${filenameBase}`);
    
    // Enhanced input validation
    if (!dataUrl || !folder || !userId || !docId || !filenameBase) {
      const missingParams = [];
      if (!dataUrl) missingParams.push('dataUrl');
      if (!folder) missingParams.push('folder');
      if (!userId) missingParams.push('userId');
      if (!docId) missingParams.push('docId');
      if (!filenameBase) missingParams.push('filenameBase');
      
      throw new Error(`Missing required parameters: ${missingParams.join(', ')}`);
    }

    // Check if already a public URL
    if (typeof dataUrl === 'string' && (/^https?:\/\//i.test(dataUrl) || dataUrl.startsWith('gs://'))) {
      console.log(`🔗 [${uploadId}] Detected public URL, skipping upload`);
      return {
        success: true,
        downloadURL: dataUrl,
        path: null,
        skipped: true,
        uploadId
      };
    }

    // Enhanced data URL validation
    if (!dataUrl.startsWith('data:image/')) {
      throw new Error('Invalid image data URL format - must start with "data:image/"');
    }

    // Calculate and validate data URL size
    const dataUrlSize = Math.ceil((dataUrl.length * 3) / 4);
    const maxSize = 15 * 1024 * 1024; // 15MB for mobile compatibility
    
    console.log(`📏 [${uploadId}] Data URL size: ${Math.round(dataUrlSize / 1024)}KB`);
    
    if (dataUrlSize > maxSize) {
      console.warn(`⚠️ [${uploadId}] Large image detected: ${Math.round(dataUrlSize / (1024 * 1024))}MB`);
      // Don't throw error, let server handle compression
    }

    // Convert data URL to blob for FormData
    let photoBlob;
    try {
      console.log(`🔄 [${uploadId}] Converting data URL to blob...`);
      const response = await fetch(dataUrl);
      if (!response.ok) {
        throw new Error(`Failed to convert data URL: ${response.status}`);
      }
      photoBlob = await response.blob();
      console.log(`✅ [${uploadId}] Converted to blob, size: ${photoBlob.size} bytes`);
    } catch (conversionError) {
      console.error(`❌ [${uploadId}] Data URL conversion failed:`, conversionError);
      throw new Error(`Failed to process image data: ${conversionError.message}`);
    }

    // Validate blob
    if (!photoBlob || photoBlob.size === 0) {
      throw new Error('Converted image data is empty or invalid');
    }

    if (photoBlob.size > 10 * 1024 * 1024) { // 10MB limit for API
      throw new Error('Image size too large after conversion (max 10MB)');
    }

    // First, try Admin route to avoid CORS and bucket/runtime issues
    try {
      console.log(`🌐 [${uploadId}] Sending request to /api/upload-image (primary)...`);
      const formAdmin = new FormData();
      formAdmin.append('file', photoBlob, `${filenameBase}_${Date.now()}.webp`);
      formAdmin.append('path', `${folder}/${userId}/${docId}`);
      formAdmin.append('fileName', filenameBase);

      let adminHeaders = { 'Accept': 'application/json' };
      try {
        const { getAuth } = await import('firebase/auth');
        const auth = getAuth();
        if (auth.currentUser) {
          const token = await auth.currentUser.getIdToken();
          adminHeaders['Authorization'] = `Bearer ${token}`;
        }
      } catch (_) {}

      const adminRes = await fetch('/api/upload-image', {
        method: 'POST',
        headers: adminHeaders,
        body: formAdmin
      });
      if (adminRes.ok) {
        const data = await adminRes.json();
        if (data?.success && data.downloadURL) {
          console.log(`✅ [${uploadId}] Upload via /api/upload-image succeeded`);
          return {
            success: true,
            downloadURL: data.downloadURL,
            path: data.path,
            uploadId,
            serverRequestId: data.requestId,
            fileSize: data.fileSize
          };
        }
      } else {
        const t = await adminRes.text();
        console.warn(`⚠️ [${uploadId}] /api/upload-image failed ${adminRes.status} ${adminRes.statusText} ${t?.slice(0,200) || ''}`);
      }
    } catch (e) {
      console.warn(`⚠️ [${uploadId}] Primary admin upload failed, will try /api/upload-photo:`, e?.message);
    }

    // If primary admin route failed, fall back to existing /api/upload-photo with retries
    let response;
    let lastError;
    const maxRetries = 3;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 [${uploadId}] Upload attempt ${attempt}/${maxRetries} via /api/upload-photo...`);

        const formData = new FormData();
        formData.append('photo', photoBlob, `${filenameBase}_${Date.now()}.jpg`);
        formData.append('userId', userId);
        formData.append('docId', docId);
        formData.append('fieldName', filenameBase);
        formData.append('collection', folder);

        const controller = new AbortController();
        const timeoutMs = 60000;
        const timeoutId = setTimeout(() => {
          console.warn(`⏰ [${uploadId}] Upload timeout after ${timeoutMs}ms`);
          controller.abort();
        }, timeoutMs);

        let authHeaders = {};
        try {
          const { getAuth } = await import('firebase/auth');
          const auth = getAuth();
          if (auth.currentUser) {
            const token = await auth.currentUser.getIdToken();
            authHeaders['Authorization'] = `Bearer ${token}`;
            console.log(`🔐 [${uploadId}] Auth token added`);
          }
        } catch (authError) {
          console.warn(`⚠️ [${uploadId}] Could not get auth token:`, authError.message);
        }

        console.log(`🌐 [${uploadId}] Sending request to /api/upload-photo...`);
        response = await fetch('/api/upload-photo', {
          method: 'POST',
          headers: { 'Accept': 'application/json', ...authHeaders },
          body: formData,
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        console.log(`📡 [${uploadId}] Response received: ${response.status} ${response.statusText}`);
        break;
      } catch (fetchError) {
        lastError = fetchError;
        console.warn(`❌ [${uploadId}] Attempt ${attempt} failed:`, fetchError.message);
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          console.log(`⏳ [${uploadId}] Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    if (!response) {
      throw new Error(`All ${maxRetries} upload attempts failed. Last error: ${lastError?.message || 'Unknown error'}`);
    }

    // Enhanced response handling
    console.log(`📥 [${uploadId}] Processing response...`);

    if (!response.ok) {
      let errorData = {};
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      let rawBody = '';
      
      try {
        errorData = await response.json();
        console.warn(`📋 [${uploadId}] Error response (will try fallback):`, errorData);
        if (errorData.error) {
          errorMessage = errorData.error;
        }
        if (errorData.requestId) {
          console.warn(`🔍 [${uploadId}] Server request ID: ${errorData.requestId}`);
        }
        if (errorData.technicalError) {
          console.warn(`🔧 [${uploadId}] Technical error: ${errorData.technicalError}`);
        }
      } catch (parseError) {
        console.warn(`⚠️ [${uploadId}] Could not parse error JSON (will try fallback):`, parseError);
        try {
          rawBody = await response.text();
          if (rawBody) console.warn(`📋 [${uploadId}] Raw response (non-JSON):`, rawBody.substring(0, 500));
        } catch (textError) {
          console.warn(`❌ [${uploadId}] Could not get response text:`, textError);
        }
      }

      // Try fallback to /api/upload-image when upload-photo fails or returns empty body
      try {
        console.log(`🛠️ [${uploadId}] Falling back to /api/upload-image ...`);
        const form2 = new FormData();
        // Reuse the prepared blob
        form2.append('file', photoBlob, `${filenameBase}_${Date.now()}.webp`);
        form2.append('path', `${folder}/${userId}/${docId}`);
        form2.append('fileName', filenameBase);

        // forward auth if any
        let authHeaders2 = {};
        try {
          const { getAuth } = await import('firebase/auth');
          const auth = getAuth();
          if (auth.currentUser) {
            const token = await auth.currentUser.getIdToken();
            authHeaders2['Authorization'] = `Bearer ${token}`;
          }
        } catch (_) {}

        const fbRes = await fetch('/api/upload-image', {
          method: 'POST',
          headers: { 'Accept': 'application/json', ...authHeaders2 },
          body: form2
        });

        if (!fbRes.ok) {
          let fbErrText = '';
          try { fbErrText = await fbRes.text(); } catch (_) {}
          throw new Error(`Fallback /api/upload-image failed: HTTP ${fbRes.status} ${fbRes.statusText} ${fbErrText ? '| ' + fbErrText.substring(0,200) : ''}`);
        }

        const fbJson = await fbRes.json();
        if (fbJson?.success && fbJson.downloadURL) {
          console.log(`✅ [${uploadId}] Fallback upload-image succeeded`);
          return {
            success: true,
            downloadURL: fbJson.downloadURL,
            path: fbJson.path,
            uploadId,
            serverRequestId: fbJson.requestId,
            fileSize: fbJson.fileSize
          };
        }
        throw new Error(`Fallback /api/upload-image returned invalid payload: ${JSON.stringify(fbJson || {})}`);
      } catch (fallbackErr) {
        console.error(`❌ [${uploadId}] Fallback to /api/upload-image failed:`, fallbackErr);

        // Map and throw the original error enriched with raw body and fallback info
        const detailedError = new Error(errorMessage);
        detailedError.status = response.status;
        detailedError.code = (errorData && (errorData.errorCode || errorData.code)) || 'http_error';
        detailedError.serverRequestId = errorData?.requestId;
        detailedError.uploadId = uploadId;
        detailedError.rawBody = rawBody;
        detailedError.fallbackError = fallbackErr?.message;
        throw detailedError;
      }
    }

    // Parse successful response
    const result = await response.json();
    console.log(`📋 [${uploadId}] Success response:`, {
      success: result.success,
      hasDownloadURL: !!result.downloadURL,
      requestId: result.requestId,
      fileSize: result.fileSize
    });
    
    if (result.success && result.downloadURL) {
      console.log(`✅ [${uploadId}] Photo uploaded successfully`);
      return {
        success: true,
        downloadURL: result.downloadURL,
        path: result.storagePath,
        uploadId,
        serverRequestId: result.requestId,
        fileSize: result.fileSize
      };
    } else {
      throw new Error(result.error || 'Upload succeeded but no download URL received');
    }

  } catch (error) {
    console.error(`❌ [${uploadId}] Upload failed:`, error);
    
    // Enhanced user-friendly error messages
    let userMessage = 'Gagal mengupload foto. Silakan coba lagi.';
    let errorCategory = 'unknown';
    
    if (error.message.includes('Missing required parameters')) {
      userMessage = 'Data upload tidak lengkap. Silakan coba lagi.';
      errorCategory = 'validation';
    } else if (error.message.includes('Invalid image data URL format')) {
      userMessage = 'Format foto tidak valid. Silakan ambil foto ulang.';
      errorCategory = 'validation';
    } else if (error.message.includes('Failed to process image data')) {
      userMessage = 'Gagal memproses data foto. Silakan ambil foto ulang.';
      errorCategory = 'processing';
    } else if (error.message.includes('Image size too large')) {
      userMessage = 'Ukuran foto terlalu besar (maksimal 10MB). Silakan kompres foto atau ambil foto baru.';
      errorCategory = 'size';
    } else if (error.message.includes('timeout') || error.name === 'AbortError') {
      userMessage = 'Upload timeout. Silakan coba lagi dengan koneksi yang lebih stabil.';
      errorCategory = 'timeout';
    } else if (error.message.includes('Network error') || error.message.includes('Failed to fetch')) {
      userMessage = 'Koneksi internet bermasalah. Periksa koneksi dan coba lagi.';
      errorCategory = 'network';
    } else if (error.code === 'unauthorized' || error.status === 401) {
      userMessage = 'Sesi login telah berakhir. Silakan login ulang.';
      errorCategory = 'auth';
    } else if (error.code === 'quota_exceeded' || error.status === 413) {
      userMessage = 'Kapasitas storage penuh. Hubungi administrator.';
      errorCategory = 'quota';
    } else if (error.code === 'unknown_storage_error') {
      userMessage = 'Error Firebase Storage. Silakan coba lagi atau hubungi support.';
      errorCategory = 'storage';
    } else if (error.status >= 500) {
      userMessage = 'Server sedang bermasalah. Silakan coba lagi dalam beberapa saat.';
      errorCategory = 'server';
    }
    
    return {
      success: false,
      error: userMessage,
      technicalError: error.message,
      errorCategory,
      errorCode: error.code,
      uploadId,
      serverRequestId: error.serverRequestId
    };
  }
}

/**
 * Upload multiple photos sekaligus
 * @param {Array} photos - Array of photo objects dengan format {dataUrl, folder, userId, docId, filenameBase}
 * @returns {Promise<Array>} - Array of results
 */
export async function uploadMultiplePhotosViaAPI(photos) {
  console.log(`📤 Uploading ${photos.length} photos via API...`);
  
  const uploadPromises = photos.map(photo => 
    uploadPhotoViaAPI(
      photo.dataUrl, 
      photo.folder, 
      photo.userId, 
      photo.docId, 
      photo.filenameBase
    )
  );

  try {
    const results = await Promise.all(uploadPromises);
    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;
    
    console.log(`✅ Upload completed: ${successCount} success, ${errorCount} failed`);
    
    return results;
  } catch (error) {
    console.error('❌ Error in batch upload:', error);
    return photos.map(() => ({ success: false, error: error.message }));
  }
}

/**
 * Validasi file foto sebelum upload
 * @param {File} file - File foto yang akan diupload
 * @returns {Promise<{valid: boolean, error?: string, dataUrl?: string}>}
 */
export async function validatePhotoFile(file) {
  try {
    // Validasi tipe file
    if (!file.type.startsWith('image/')) {
      return { valid: false, error: 'File harus berupa gambar' };
    }

    // Validasi ukuran file (maksimal 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return { valid: false, error: `Ukuran file terlalu besar. Maksimal ${Math.round(maxSize / (1024 * 1024))}MB` };
    }

    // Convert ke data URL untuk preview dan upload
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    return { valid: true, dataUrl };

  } catch (error) {
    return { valid: false, error: `Error validasi file: ${error.message}` };
  }
}

/**
 * Convert foto ke WebP format dengan resize
 * @param {string} dataUrl - Data URL dari foto
 * @param {number} maxWidth - Lebar maksimal (default: 1920)
 * @param {number} maxHeight - Tinggi maksimal (default: 1080)
 * @param {number} quality - Kualitas WebP (0-1, default: 0.8)
 * @returns {Promise<string>} - Data URL WebP
 */
export async function convertToWebP(dataUrl, maxWidth = 1920, maxHeight = 1080, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      try {
        // Set ukuran canvas sesuai dengan gambar, dengan resize jika terlalu besar
        let { width, height } = img;
        
        // Resize jika gambar terlalu besar
        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = width * ratio;
          height = height * ratio;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Gambar ke canvas
        ctx.drawImage(img, 0, 0, width, height);
        
        // Konversi ke WebP dengan kualitas yang ditentukan
        const webpDataUrl = canvas.toDataURL('image/webp', quality);
        resolve(webpDataUrl);
        
      } catch (error) {
        reject(new Error(`Error converting to WebP: ${error.message}`));
      }
    };
    
    img.onerror = () => reject(new Error('Error loading image'));
    img.src = dataUrl;
  });
}

/**
 * Fallback upload function jika API route gagal
 * Menyimpan foto sebagai data URL di localStorage sementara
 * @param {string} dataUrl - Data URL dari foto
 * @param {string} folder - Nama folder
 * @param {string} userId - ID user
 * @param {string} docId - ID dokumen
 * @param {string} filenameBase - Nama dasar file
 * @returns {Promise<{success: boolean, downloadURL?: string, error?: string}>}
 */
export async function fallbackPhotoUpload(dataUrl, folder, userId, docId, filenameBase) {
  try {
    console.log('🔄 Using fallback photo upload method...');
    
    // Generate temporary URL untuk storage lokal
    const tempKey = `temp_${folder}_${userId}_${docId}_${filenameBase}`;
    // Jangan double-encode. dataUrl sudah berupa "data:image/webp;base64,..."
    // Menggunakan btoa lagi membuat konten tidak valid sebagai gambar.
    // Simpan dan kembalikan dataUrl asli agar <img src> dapat merendernya.
    const tempUrl = dataUrl;
    
    // Simpan di localStorage sebagai fallback
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(tempKey, tempUrl);
      console.log('💾 Photo saved to localStorage as fallback');
    }
    
    // Return temporary URL (akan diupdate nanti ketika upload berhasil)
    return {
      success: true,
      downloadURL: tempUrl,
      isFallback: true,
      tempKey: tempKey,
      message: 'Foto disimpan sementara. Akan diupload otomatis nanti.'
    };

  } catch (error) {
    console.error('❌ Fallback upload failed:', error);
    return {
      success: false,
      error: 'Fallback upload failed',
      technicalError: error.message
    };
  }
}

/**
 * Smart photo upload dengan fallback
 * Mencoba upload via API terlebih dahulu, jika gagal gunakan fallback
 * @param {string} dataUrl - Data URL dari foto
 * @param {string} folder - Nama folder
 * @param {string} userId - ID user
 * @param {string} docId - ID dokumen
 * @param {string} filenameBase - Nama dasar file
 * @returns {Promise<{success: boolean, downloadURL?: string, error?: string}>}
 */
export async function smartPhotoUpload(dataUrl, folder, userId, docId, filenameBase) {
  try {
    console.log('🧠 Starting smart photo upload for mobile compatibility...', { folder, userId, docId, filenameBase });
    
    // Detect mobile devices
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isMobile = isAndroid || isIOS;
    // Force usage of server API to avoid CORS: never attempt direct browser-to-Storage uploads
    const allowDirect = false;
    console.log('📱 Device detection:', { isAndroid, isIOS, isMobile, userAgent: navigator.userAgent });
    
    // Validasi input
    if (!dataUrl || !folder || !userId || !docId || !filenameBase) {
      throw new Error('Missing required parameters for photo upload');
    }

    // Validasi format data URL
    if (!dataUrl.startsWith('data:image/')) {
      throw new Error('Invalid image data URL format');
    }

    // Mobile-specific: Check data URL size and format
    const dataUrlSize = Math.ceil((dataUrl.length * 3) / 4);
    console.log('📏 Data URL info:', {
      size: Math.round(dataUrlSize / 1024) + 'KB',
      format: dataUrl.substring(0, 50) + '...',
      isMobile,
      isAndroid,
      isIOS
    });

    // Mobile-specific: Validate data URL is not corrupted
    try {
      const base64Data = dataUrl.split(',')[1];
      if (!base64Data || base64Data.length < 100) {
        throw new Error('Data URL appears to be corrupted or too small');
      }
      // Test base64 decode
      atob(base64Data.substring(0, 100));
    } catch (base64Error) {
      console.error('❌ Data URL validation failed:', base64Error);
      throw new Error('Invalid or corrupted image data');
    }

    // Mobile-specific: Try different upload strategies based on device
    if (isMobile) {
      console.log(`📱 Using ${isAndroid ? 'Android' : 'iOS'}-optimized upload strategy...`);
      
      // Strategy 1: Direct upload is disabled to avoid browser CORS. Always use API route.
      if (allowDirect) {
        console.log('ℹ️ allowDirect=true, but default is false to avoid CORS.');
      }
      
      // Strategy 2: Try API upload with Android-specific settings
      console.log('📤 Android: Attempting API upload with optimizations...');
      let apiResult;
      let apiAttempts = 0;
      const maxApiAttempts = 3; // More attempts for Android
      
      while (apiAttempts < maxApiAttempts) {
        try {
          apiAttempts++;
          console.log(`📤 Android: API upload attempt ${apiAttempts}/${maxApiAttempts}...`);
          
          // Android-specific: Add longer timeout and retry delay
          apiResult = await uploadPhotoViaAPI(dataUrl, folder, userId, docId, filenameBase);
          
          if (apiResult.success) {
            console.log('✅ Android: API upload successful on attempt', apiAttempts);
            return apiResult;
          }
          
          console.warn(`⚠️ Android: API upload attempt ${apiAttempts} failed:`, apiResult.error);
          
          // Android-specific: Longer delay between retries
          if (apiAttempts < maxApiAttempts) {
            const delay = apiAttempts * 2000; // 2s, 4s, 6s
            console.log(`⏳ Android: Waiting ${delay}ms before retry...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        } catch (apiError) {
          console.error(`❌ Android: API upload attempt ${apiAttempts} exception:`, apiError.message);
          apiResult = { success: false, error: apiError.message, technicalError: apiError.message };
          
          // Android-specific: Wait longer on exceptions
          if (apiAttempts < maxApiAttempts) {
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
        }
      }
      
      console.log('⚠️ Android: All upload attempts failed, trying fallback...');
      
    } else {
      // Non-Android devices: Use original strategy
      console.log('📤 Non-Android: Attempting API upload...');
      let apiResult;
      let apiAttempts = 0;
      const maxApiAttempts = 2;
      
      while (apiAttempts < maxApiAttempts) {
        try {
          apiAttempts++;
          console.log(`📤 API upload attempt ${apiAttempts}/${maxApiAttempts}...`);
          apiResult = await uploadPhotoViaAPI(dataUrl, folder, userId, docId, filenameBase);
          
          if (apiResult.success) {
            console.log('✅ API upload successful on attempt', apiAttempts);
            return apiResult;
          }
          
          console.warn(`⚠️ API upload attempt ${apiAttempts} failed:`, apiResult.error);
          
          if (apiAttempts < maxApiAttempts) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }
        } catch (apiError) {
          console.error(`❌ API upload attempt ${apiAttempts} exception:`, apiError.message);
          apiResult = { success: false, error: apiError.message, technicalError: apiError.message };
        }
      }
      
      // Direct upload path is disabled to enforce server-side upload and avoid CORS.
    }
    
    // Final fallback for both Android and non-Android
    console.log('⚠️ Trying localStorage fallback...');
    try {
      const fallbackResult = await fallbackPhotoUpload(dataUrl, folder, userId, docId, filenameBase);
      
      if (fallbackResult.success) {
        console.log('✅ Fallback upload successful');
        return fallbackResult;
      }
    } catch (fallbackError) {
      console.error('❌ Fallback upload exception:', fallbackError);
    }
    
    // Jika semua metode gagal
    const deviceInfo = isAndroid ? 'Android' : 'Non-Android';
    const lastError = `${deviceInfo}: All upload methods failed`;
    throw new Error(lastError);
    
  } catch (error) {
    console.error('❌ Smart upload failed:', error);
    const isAndroid = /Android/i.test(navigator.userAgent);
    return {
      success: false,
      error: isAndroid 
        ? 'Upload foto gagal pada perangkat Android. Silakan coba lagi atau periksa koneksi internet.' 
        : 'Upload foto gagal. Silakan coba lagi atau periksa koneksi internet.',
      technicalError: error.message
    };
  }
}

/**
 * Upload multiple photos secara bersamaan
 * @param {Array} photos - Array of photo objects dengan format { dataUrl, folder, userId, docId, filenameBase }
 * @returns {Promise<Array>} - Array of upload results
 */
export async function uploadMultiplePhotos(photos) {
  try {
    console.log(`📤 Uploading ${photos.length} photos...`);
    
    if (!Array.isArray(photos) || photos.length === 0) {
      throw new Error('Photos array is required and cannot be empty');
    }
    
    // Upload semua foto secara parallel
    const uploadPromises = photos.map(async (photo, index) => {
      try {
        console.log(`📤 Uploading photo ${index + 1}/${photos.length}: ${photo.filenameBase}`);
        
        const result = await smartPhotoUpload(
          photo.dataUrl,
          photo.folder,
          photo.userId,
          photo.docId,
          photo.filenameBase
        );
        
        return {
          index,
          filenameBase: photo.filenameBase,
          success: result.success,
          downloadURL: result.downloadURL,
          error: result.error,
          isFallback: result.isFallback || false
        };
        
      } catch (error) {
        console.error(`❌ Failed to upload photo ${photo.filenameBase}:`, error);
        return {
          index,
          filenameBase: photo.filenameBase,
          success: false,
          error: error.message,
          isFallback: false
        };
      }
    });
    
    // Tunggu semua upload selesai
    const results = await Promise.all(uploadPromises);
    
    // Analisis hasil
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    const fallbacks = results.filter(r => r.isFallback);
    
    console.log(`✅ Upload completed: ${successful.length} successful, ${failed.length} failed, ${fallbacks.length} fallbacks`);
    
    return {
      success: failed.length === 0,
      results: results,
      summary: {
        total: photos.length,
        successful: successful.length,
        failed: failed.length,
        fallbacks: fallbacks.length
      }
    };
    
  } catch (error) {
    console.error('❌ Multiple photos upload failed:', error);
    return {
      success: false,
      error: 'Failed to upload multiple photos',
      technicalError: error.message
    };
  }
}

/**
 * Upload multiple photos dengan progress tracking
 * @param {Array} photos - Array of photo objects
 * @param {Function} onProgress - Callback function untuk progress (progress, current, total)
 * @returns {Promise<Array>} - Array of upload results
 */
export async function uploadMultiplePhotosWithProgress(photos, onProgress) {
  try {
    console.log(`📤 Uploading ${photos.length} photos with progress tracking...`);
    
    if (!Array.isArray(photos) || photos.length === 0) {
      throw new Error('Photos array is required and cannot be empty');
    }
    
    const results = [];
    
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      
      try {
        console.log(`📤 Uploading photo ${i + 1}/${photos.length}: ${photo.filenameBase}`);
        
        // Update progress
        if (onProgress && typeof onProgress === 'function') {
          onProgress((i / photos.length) * 100, i + 1, photos.length);
        }
        
        const result = await smartPhotoUpload(
          photo.dataUrl,
          photo.folder,
          photo.userId,
          photo.docId,
          photo.filenameBase
        );
        
        results.push({
          index: i,
          filenameBase: photo.filenameBase,
          success: result.success,
          downloadURL: result.downloadURL,
          error: result.error,
          isFallback: result.isFallback || false
        });
        
      } catch (error) {
        console.error(`❌ Failed to upload photo ${photo.filenameBase}:`, error);
        results.push({
          index: i,
          filenameBase: photo.filenameBase,
          success: false,
          error: error.message,
          isFallback: false
        });
      }
    }
    
    // Final progress update
    if (onProgress && typeof onProgress === 'function') {
      onProgress(100, photos.length, photos.length);
    }
    
    // Analisis hasil
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    const fallbacks = results.filter(r => r.isFallback);
    
    console.log(`✅ Progress upload completed: ${successful.length} successful, ${failed.length} failed, ${fallbacks.length} fallbacks`);
    
    return {
      success: failed.length === 0,
      results: results,
      summary: {
        total: photos.length,
        successful: successful.length,
        failed: failed.length,
        fallbacks: fallbacks.length
      }
    };
    
  } catch (error) {
    console.error('❌ Multiple photos upload with progress failed:', error);
    return {
      success: false,
      error: 'Failed to upload multiple photos with progress',
      technicalError: error.message
    };
  }
}

/**
 * Upload foto ke Firebase Storage menggunakan Firebase SDK langsung (bypass CORS)
 * @param {File} file - File foto yang akan diupload
 * @param {string} userId - ID user yang mengupload
 * @param {string} docId - ID dokumen survey
 * @param {string} fieldName - Nama field foto
 * @param {string} filename - Nama file lengkap dengan ekstensi
 * @param {string} folder - Nama folder di Firebase Storage (opsional, default: 'Survey_Existing')
 * @returns {Promise<{success: boolean, downloadURL?: string, error?: string}>}
 */
export async function uploadPhotoToStorageDirect(file, userId, docId, fieldName, filename, folder = 'Survey_Existing') {
  try {
    console.log(`📤 Uploading photo directly to Firebase Storage: ${folder}/${userId}/${docId}/${filename}`);
    
    // Import Firebase Storage dynamically
    const { getStorage, ref, uploadBytes, getDownloadURL } = await import('firebase/storage');
    const storage = getStorage();
    
    // Validasi input
    if (!file || !userId || !docId || !fieldName || !filename) {
      throw new Error('Missing required parameters for photo upload');
    }

    // Validasi tipe file
    if (!file.type.startsWith('image/')) {
      throw new Error('File harus berupa gambar');
    }

    // Validasi ukuran file (maksimal 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error(`Ukuran file terlalu besar. Maksimal ${Math.round(maxSize / (1024 * 1024))}MB`);
    }

    // Buat reference ke Firebase Storage
    const storageRef = ref(storage, `${folder}/${userId}/${docId}/${filename}`);
    
    // Upload file langsung
    console.log('📤 Starting direct upload to Firebase Storage...');
    const snapshot = await uploadBytes(storageRef, file);
    console.log('✅ File uploaded successfully, getting download URL...');
    
    // Dapatkan download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    console.log(`✅ Photo uploaded successfully to ${folder}/${userId}/${docId}/${filename}`);
    console.log(`🔗 Download URL: ${downloadURL}`);
    
    return {
      success: true,
      downloadURL: downloadURL
    };

  } catch (error) {
    console.error('❌ Direct photo upload to storage failed:', error);
    
    // User-friendly error messages
    let userMessage = 'Gagal upload foto. Silakan coba lagi.';
    
    if (error.message.includes('storage/unauthorized')) {
      userMessage = 'Tidak memiliki izin untuk upload foto. Silakan login ulang.';
    } else if (error.message.includes('storage/quota-exceeded')) {
      userMessage = 'Kapasitas storage penuh. Silakan hubungi admin.';
    } else if (error.message.includes('storage/network-request-failed')) {
      userMessage = 'Gagal terhubung ke server. Silakan cek koneksi internet.';
    } else if (error.message.includes('storage/invalid-format')) {
      userMessage = 'Format foto tidak valid. Silakan pilih foto yang berbeda.';
    }
    
    return {
      success: false,
      error: userMessage,
      technicalError: error.message
    };
  }
}

/**
 * Upload foto ke Firebase Storage dengan folder yang dapat dikustomisasi
 * @param {File} file - File foto yang akan diupload
 * @param {string} userId - ID user yang mengupload
 * @param {string} docId - ID dokumen survey
 * @param {string} fieldName - Nama field foto
 * @param {string} filename - Nama file lengkap dengan ekstensi
 * @param {string} folder - Nama folder di Firebase Storage (opsional, default: 'Survey_Existing')
 * @returns {Promise<{success: boolean, downloadURL?: string, error?: string}>}
 */
export async function uploadPhotoToStorage(file, userId, docId, fieldName, filename, folder = 'Survey_Existing') {
  try {
    console.log(`📤 Uploading photo to Firebase Storage: ${folder}/${userId}/${docId}/${filename}`);
    
    // Force using API route to avoid browser CORS. Skipping direct browser upload entirely.
    console.log('🔄 Skipping direct browser upload. Using API route to avoid CORS...');
    
    // Validasi input
    if (!file || !userId || !docId || !fieldName || !filename) {
      throw new Error('Missing required parameters for photo upload');
    }

    // Validasi tipe file
    if (!file.type.startsWith('image/')) {
      throw new Error('File harus berupa gambar');
    }

    // Validasi ukuran file (maksimal 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new Error(`Ukuran file terlalu besar. Maksimal ${Math.round(maxSize / (1024 * 1024))}MB`);
    }

    // Convert file ke data URL
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    // Extract filename base tanpa ekstensi
    const filenameBase = filename.replace(/\.[^/.]+$/, "");

    // Upload menggunakan API route
    const result = await uploadPhotoViaAPI(dataUrl, folder, userId, docId, filenameBase);
    
    if (result.success) {
      console.log(`✅ Photo uploaded successfully via API to ${folder}/${userId}/${docId}/${filename}`);
      return {
        success: true,
        downloadURL: result.downloadURL
      };
    } else {
      throw new Error(result.error || 'Upload failed');
    }

  } catch (error) {
    console.error('❌ Photo upload to storage failed:', error);
    
    // User-friendly error messages
    let userMessage = 'Gagal upload foto. Silakan coba lagi.';
    
    if (error.message.includes('Storage access denied')) {
      userMessage = 'Tidak memiliki izin untuk upload foto. Silakan login ulang.';
    } else if (error.message.includes('Storage quota exceeded')) {
      userMessage = 'Kapasitas storage penuh. Silakan hubungi admin.';
    } else if (error.message.includes('Network error')) {
      userMessage = 'Gagal terhubung ke server. Silakan cek koneksi internet.';
    } else if (error.message.includes('Image size too large')) {
      userMessage = 'Ukuran foto terlalu besar. Silakan pilih foto yang lebih kecil.';
    } else if (error.message.includes('Invalid image data URL')) {
      userMessage = 'Format foto tidak valid. Silakan pilih foto yang berbeda.';
    }
    
    return {
      success: false,
      error: userMessage,
      technicalError: error.message
    };
  }
}
