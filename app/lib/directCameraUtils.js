/**
 * Direct Camera Utils
 * Fungsi untuk pengambilan foto langsung dengan watermark otomatis.
 * Aturan:
 * - Mobile: buka kamera native (Capacitor jika ada, fallback input capture)
 * - Desktop/PC: buka file picker (pilih file gambar)
 * Catatan: file ini hanya berjalan di client. Tidak ada akses `window` di top-level.
 */

// Fungsi untuk mendapatkan koordinat GPS
const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation tidak didukung oleh browser ini'));
      return;
    }

    const options = { 
      enableHighAccuracy: true, 
      timeout: 10000, 
      maximumAge: 0 
    };

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        resolve(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
      },
      (error) => {
        let msg = '';
        switch (error.code) {
          case 1:
            msg = 'Akses lokasi ditolak oleh pengguna';
            break;
          case 2:
            msg = 'Informasi lokasi tidak tersedia';
            break;
          case 3:
            msg = 'Permintaan lokasi timeout';
            break;
          default:
            msg = 'Terjadi kesalahan yang tidak diketahui';
        }
        reject(new Error(msg));
      },
      options
    );
  });
};

// Fungsi untuk menambahkan watermark ke gambar (menggambar pada canvas)
const addWatermark = (canvas, coordinates, timestamp) => {
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;

  // Responsive font size berdasarkan ukuran gambar
  const baseFontSize = Math.max(width * 0.02, 12);
  const fontSize = Math.min(baseFontSize, 24);

  // Set font style
  ctx.font = `bold ${fontSize}px Arial, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  // Watermark text
  const watermarkText = [
    `Koordinat: ${coordinates}`,
    `Tanggal: ${timestamp.date}`,
    `Waktu: ${timestamp.time}`
  ];

  // Calculate text dimensions
  const lineHeight = fontSize * 1.2;
  const padding = fontSize * 0.5;
  const textWidth = Math.max(...watermarkText.map(text => ctx.measureText(text).width));
  const textHeight = watermarkText.length * lineHeight;
  const boxWidth = textWidth + padding * 2;
  const boxHeight = textHeight + padding * 2;

  // Position watermark di pojok kiri bawah
  const margin = fontSize;
  const x = margin;
  const y = height - boxHeight - margin;

  // Draw background dengan gradient
  const gradient = ctx.createLinearGradient(x, y, x + boxWidth, y + boxHeight);
  gradient.addColorStop(0, 'rgba(0, 0, 0, 0.8)');
  gradient.addColorStop(1, 'rgba(0, 0, 0, 0.6)');

  // Draw rounded rectangle background
  ctx.fillStyle = gradient;
  ctx.beginPath();
  // roundRect polyfill jika belum tersedia
  if (typeof ctx.roundRect === 'function') {
    ctx.roundRect(x, y, boxWidth, boxHeight, fontSize * 0.3);
  } else {
    const r = fontSize * 0.3;
    const r2d = Math.PI / 180;
    const pi = Math.PI;
    const arc = (cx, cy, rad, start, end) => ctx.arc(cx, cy, rad, start, end);
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + boxWidth - r, y);
    arc(x + boxWidth - r, y + r, r, -90 * r2d, 0);
    ctx.lineTo(x + boxWidth, y + boxHeight - r);
    arc(x + boxWidth - r, y + boxHeight - r, r, 0, 90 * r2d);
    ctx.lineTo(x + r, y + boxHeight);
    arc(x + r, y + boxHeight - r, r, 90 * r2d, pi);
    ctx.lineTo(x, y + r);
    arc(x + r, y + r, r, pi, 270 * r2d);
    ctx.closePath();
  }
  ctx.fill();

  // Draw border
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Draw text dengan outline untuk readability
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;

  watermarkText.forEach((text, index) => {
    const textY = y + padding + index * lineHeight;
    
    // Draw text outline
    ctx.strokeText(text, x + padding, textY);
    // Draw text
    ctx.fillText(text, x + padding, textY);
  });
};

// Helper: timestamp sekarang dalam format lokal ID
const getNowTimestamp = () => {
  const now = new Date();
  return {
    date: now.toLocaleDateString('id-ID', { year: 'numeric', month: '2-digit', day: '2-digit' }),
    time: now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  };
};

// Helper: cek environment mobile sederhana
const isMobile = () => {
  if (typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);
};

// Helper: proses image data URL -> watermark -> hasilkan blob & dataURL dengan Android optimization
const processImageWithWatermark = async (imageDataUrl, coordinates, timestamp, isAndroidOptimized = false) => {
  console.log('🔄 DirectCameraUtils: Processing image with watermark...', { isAndroidOptimized });
  
  // Detect Android device
  const isAndroid = /Android/i.test(navigator.userAgent);
  const shouldOptimizeForAndroid = isAndroidOptimized || isAndroid;
  
  const img = await new Promise((resolve, reject) => {
    const _img = new Image();
    _img.crossOrigin = 'anonymous'; // Add for Android compatibility
    _img.onload = () => {
      console.log('✅ DirectCameraUtils: Image loaded successfully');
      resolve(_img);
    };
    _img.onerror = (error) => {
      console.error('❌ DirectCameraUtils: Image load failed:', error);
      reject(error);
    };
    _img.src = imageDataUrl;
  });

  // Android-specific: Use smaller max size for better performance
  const MAX_W = shouldOptimizeForAndroid ? 1280 : 1920;
  const MAX_H = shouldOptimizeForAndroid ? 720 : 1080;
  let { width, height } = img;
  
  console.log(`📏 DirectCameraUtils: Original image size: ${width}x${height}`);
  
  if (width > height && width > MAX_W) {
    height = Math.round((height * MAX_W) / width);
    width = MAX_W;
  } else if (height > MAX_H) {
    width = Math.round((width * MAX_H) / height);
    height = MAX_H;
  }
  
  console.log(`📏 DirectCameraUtils: Resized image size: ${width}x${height}`);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  // Android-specific: Ensure canvas context is available
  if (!ctx) {
    console.error('❌ DirectCameraUtils: Canvas context not available');
    throw new Error('Canvas tidak didukung di perangkat ini');
  }
  
  // Android-specific: Clear canvas first
  if (shouldOptimizeForAndroid) {
    ctx.clearRect(0, 0, width, height);
  }
  
  try {
    ctx.drawImage(img, 0, 0, width, height);
    console.log('✅ DirectCameraUtils: Image drawn to canvas');
  } catch (drawError) {
    console.error('❌ DirectCameraUtils: Error drawing image to canvas:', drawError);
    throw new Error('Gagal menggambar gambar ke canvas');
  }
  
  // Add watermark with Android-specific optimizations
  try {
    addWatermark(canvas, coordinates, timestamp, shouldOptimizeForAndroid);
    console.log('✅ DirectCameraUtils: Watermark added');
  } catch (watermarkError) {
    console.error('❌ DirectCameraUtils: Error adding watermark:', watermarkError);
    // Continue without watermark rather than failing completely
    console.warn('⚠️ DirectCameraUtils: Continuing without watermark');
  }

  // Android-specific: Try different formats and qualities
  let blob, dataUrl;
  
  if (shouldOptimizeForAndroid) {
    console.log('🤖 DirectCameraUtils: Using Android-optimized image conversion...');
    
    // Try WebP first, fallback to JPEG
    try {
      blob = await new Promise((resolve, reject) => {
        canvas.toBlob((result) => {
          if (result) {
            resolve(result);
          } else {
            reject(new Error('WebP conversion failed'));
          }
        }, 'image/webp', 0.8); // Lower quality for Android
      });
      console.log('✅ DirectCameraUtils: WebP blob created for Android');
    } catch (webpError) {
      console.warn('⚠️ DirectCameraUtils: WebP failed on Android, using JPEG');
      blob = await new Promise((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', 0.85); // Lower quality JPEG for Android
      });
      console.log('✅ DirectCameraUtils: JPEG blob created for Android');
    }
    
    // Convert blob to data URL with error handling
    try {
      dataUrl = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => {
          console.log('✅ DirectCameraUtils: Data URL created for Android');
          resolve(r.result);
        };
        r.onerror = (error) => {
          console.error('❌ DirectCameraUtils: FileReader error on Android:', error);
          reject(error);
        };
        r.readAsDataURL(blob);
      });
    } catch (readerError) {
      console.error('❌ DirectCameraUtils: Failed to create data URL on Android:', readerError);
      throw new Error('Gagal mengkonversi gambar pada perangkat Android');
    }
    
  } else {
    // Non-Android: Use original logic
    console.log('💻 DirectCameraUtils: Using standard image conversion...');
    blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.9));
    dataUrl = await new Promise((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.readAsDataURL(blob);
    });
    console.log('✅ DirectCameraUtils: Standard image conversion completed');
  }
  
  console.log('✅ DirectCameraUtils: Image processing completed successfully');
  console.log('📏 DirectCameraUtils: Final data URL size:', Math.round(dataUrl.length / 1024), 'KB');
  
  return { blob, imageData: dataUrl };
};

// Helper: pilih file via input (captureOps: undefined untuk desktop, 'environment' untuk mobile kamera)
const pickImageViaInput = (captureOps) => {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    if (captureOps) {
      // Hint ke browser mobile untuk buka kamera
      input.capture = captureOps;
    }
    input.onchange = () => {
      const file = input.files && input.files[0];
      if (!file) {
        reject(new Error('Tidak ada file dipilih'));
        return;
      }
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Gagal membaca file'));
      reader.readAsDataURL(file);
    };
    input.click();
  });
};

// Fungsi utama untuk ambil foto atau pilih file sesuai platform
export const openDirectCameraAndTakePhoto = async () => {
  if (typeof window === 'undefined') {
    throw new Error('Fitur kamera hanya tersedia di browser');
  }

  console.log('📸 DirectCameraUtils: Starting photo capture process...');

  // Ambil koordinat & timestamp lebih awal
  let coordinates = 'Tidak tersedia';
  try {
    console.log('📍 DirectCameraUtils: Getting current location...');
    coordinates = await getCurrentLocation();
    console.log('✅ DirectCameraUtils: Location obtained:', coordinates);
  } catch (locationError) {
    console.warn('⚠️ DirectCameraUtils: Location failed:', locationError.message);
    // biarkan default
  }
  const timestamp = getNowTimestamp();
  console.log('⏰ DirectCameraUtils: Timestamp generated:', timestamp);
  
  // MOBILE: gunakan Capacitor jika tersedia; jika tidak, gunakan input capture
  try {
    // Cek native via Capacitor.isNativePlatform()
    let isNative = false;
    let CapacitorCore = null;
    try {
      // Dynamic import agar aman di SSR
      CapacitorCore = await import('@capacitor/core');
      isNative = !!(CapacitorCore?.Capacitor?.isNativePlatform?.());
      console.log('📱 DirectCameraUtils: Native platform check:', isNative);
    } catch (capacitorError) {
      // Abaikan jika paket tidak tersedia di web biasa
      console.log('📱 DirectCameraUtils: Capacitor not available, using web fallback');
      isNative = false;
    }

    if (isNative) {
      try {
        console.log('📸 DirectCameraUtils: Using Capacitor Camera...');
        const CameraMod = await import('@capacitor/camera');
        const Camera = CameraMod?.Camera;
        if (Camera) {
          const photo = await Camera.getPhoto({ 
            quality: 90, 
            allowEditing: false, 
            resultType: 'DataUrl', 
            source: CameraMod.CameraSource.Camera 
          });
          const dataUrl = photo?.dataUrl || photo?.dataURL || photo?.dataurl;
          if (!dataUrl) throw new Error('Tidak ada data foto dari kamera');
          console.log('✅ DirectCameraUtils: Capacitor photo captured, processing...');
          const { imageData, blob } = await processImageWithWatermark(dataUrl, coordinates, timestamp);
          console.log('✅ DirectCameraUtils: Capacitor photo processed successfully');
          return { imageData, coordinates, timestamp, blob };
        }
      } catch (capacitorCameraError) {
        console.warn('⚠️ DirectCameraUtils: Capacitor camera failed:', capacitorCameraError.message);
        // Jika gagal menggunakan plugin kamera, fallback ke input capture
      }
    }

    const isMobileDevice = isMobile();
    console.log('📱 DirectCameraUtils: Mobile device check:', isMobileDevice);

    if (isMobileDevice) {
      // Fallback: input capture untuk membuka kamera native di mobile web
      console.log('📸 DirectCameraUtils: Using mobile web camera input...');
      const dataUrl = await pickImageViaInput('environment');
      console.log('✅ DirectCameraUtils: Mobile photo captured, processing...');
      const { imageData, blob } = await processImageWithWatermark(dataUrl, coordinates, timestamp);
      console.log('✅ DirectCameraUtils: Mobile photo processed successfully');
      return { imageData, coordinates, timestamp, blob };
    }

    // DESKTOP/PC: buka file picker biasa (tanpa capture)
    console.log('💻 DirectCameraUtils: Using desktop file picker...');
    const dataUrl = await pickImageViaInput(undefined);
    console.log('✅ DirectCameraUtils: Desktop file selected, processing...');
    const { imageData, blob } = await processImageWithWatermark(dataUrl, coordinates, timestamp);
    console.log('✅ DirectCameraUtils: Desktop file processed successfully');
    return { imageData, coordinates, timestamp, blob };
  } catch (error) {
    console.error('❌ DirectCameraUtils: Photo capture failed:', error);
    throw new Error(error.message || 'Gagal mengambil/menentukan foto');
  }
};

// (Legacy) Fungsi berbasis getUserMedia — dipertahankan jika masih dipanggil internal
const capturePhoto = async (video, coordinates, timestamp, cameraContainer) => {
  try {
    // Create canvas
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Set canvas size to video size
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Add watermark
    addWatermark(canvas, coordinates, timestamp);

    // Convert to blob
    const blob = await new Promise(resolve => {
      canvas.toBlob(resolve, 'image/jpeg', 0.9);
    });

    // Convert to data URL
    const reader = new FileReader();
    reader.onload = () => {
      const imageData = reader.result;

      // Clean up camera
      closeCamera(cameraContainer);

      // Return photo data
      if (cameraContainer && typeof cameraContainer._resolve === 'function') {
        cameraContainer._resolve({ imageData, coordinates, timestamp, blob });
      }
    };
    reader.readAsDataURL(blob);

  } catch (error) {
    console.error('Error capturing photo:', error);
    if (cameraContainer && typeof cameraContainer._reject === 'function') {
      cameraContainer._reject(new Error(`Gagal mengambil foto: ${error.message}`));
    }
  }
};

// (Legacy) Fungsi untuk menutup kamera overlay lama
const closeCamera = (cameraContainer) => {
  // Stop all video tracks
  const video = cameraContainer.querySelector('video');
  if (video && video.srcObject) {
    video.srcObject.getTracks().forEach(track => track.stop());
  }

  // Remove camera container
  if (cameraContainer.parentNode) {
    cameraContainer.parentNode.removeChild(cameraContainer);
  }

  // Reject promise jika user menutup kamera
  if (typeof cameraContainer._reject === 'function') {
    cameraContainer._reject(new Error('Pengambilan foto dibatalkan'));
  }
};

