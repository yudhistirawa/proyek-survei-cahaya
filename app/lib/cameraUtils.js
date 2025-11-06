// Utility functions untuk pengambilan foto dari kamera dengan watermark

/**
 * Check if running in browser environment
 */
const isBrowser = typeof window !== 'undefined' && typeof navigator !== 'undefined';

/**
 * Mendapatkan akses ke kamera belakang
 * @returns {Promise<MediaStream>}
 */
export const getBackCamera = async () => {
  if (!isBrowser) {
    throw new Error('Kamera hanya tersedia di browser');
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error('MediaDevices API tidak didukung oleh browser ini');
  }

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    const videoDevices = devices.filter(device => device.kind === 'videoinput');
    
    // Cari kamera belakang (biasanya memiliki kata 'back', 'rear', atau 'environment')
    const backCamera = videoDevices.find(device => 
      device.label.toLowerCase().includes('back') ||
      device.label.toLowerCase().includes('rear') ||
      device.label.toLowerCase().includes('environment') ||
      device.label.toLowerCase().includes('belakang')
    );
    
    const constraints = {
      video: {
        facingMode: 'environment', // Prioritaskan kamera belakang
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      }
    };
    
    // Jika ada kamera belakang spesifik, gunakan deviceId
    if (backCamera) {
      constraints.video.deviceId = { exact: backCamera.deviceId };
    }
    
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    return stream;
  } catch (error) {
    console.error('Error accessing back camera:', error);
    throw new Error('Tidak dapat mengakses kamera belakang. Pastikan aplikasi memiliki izin kamera.');
  }
};

/**
 * Mendapatkan lokasi saat ini
 * @returns {Promise<{latitude: number, longitude: number}>}
 */
export const getCurrentLocation = () => {
  return new Promise((resolve, reject) => {
    if (!isBrowser) {
      reject(new Error('Geolocation hanya tersedia di browser'));
      return;
    }

    if (!navigator.geolocation) {
      reject(new Error('Geolocation tidak didukung oleh browser ini'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
      },
      (error) => {
        reject(new Error(`Gagal mendapatkan lokasi: ${error.message}`));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      }
    );
  });
};

/**
 * Menambahkan watermark ke gambar
 * @param {HTMLCanvasElement} canvas - Canvas untuk menggambar
 * @param {string} coordinates - Koordinat dalam format "lat, lng"
 * @param {string} timestamp - Timestamp dalam format yang diinginkan
 */
export const addWatermark = (canvas, coordinates, timestamp) => {
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;
  
  // Set font style untuk watermark
  ctx.font = 'bold 16px Arial';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.lineWidth = 3;
  
  // Background semi-transparan untuk watermark
  const watermarkHeight = 60;
  const watermarkY = height - watermarkHeight - 20;
  
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(0, watermarkY, width, watermarkHeight);
  
  // Text watermark
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.lineWidth = 2;
  
  // Koordinat
  const coordText = `📍 ${coordinates}`;
  ctx.strokeText(coordText, 20, watermarkY + 25);
  ctx.fillText(coordText, 20, watermarkY + 25);
  
  // Timestamp
  const timeText = `📅 ${timestamp}`;
  ctx.strokeText(timeText, 20, watermarkY + 50);
  ctx.fillText(timeText, 20, watermarkY + 50);
};

/**
 * Mengambil foto dari kamera dengan watermark
 * @param {HTMLVideoElement} videoElement - Element video yang menampilkan stream kamera
 * @param {string} coordinates - Koordinat dalam format "lat, lng"
 * @returns {Promise<string>} - Data URL gambar dengan watermark
 */
export const capturePhotoWithWatermark = async (videoElement, coordinates) => {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Set ukuran canvas sesuai video
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;
      
      // Gambar frame video ke canvas
      ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
      
      // Format timestamp
      const now = new Date();
      const timestamp = now.toLocaleString('id-ID', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
      
      // Tambahkan watermark
      addWatermark(canvas, coordinates, timestamp);
      
      // Konversi ke WebP dengan kualitas tinggi
      const dataUrl = canvas.toDataURL('image/webp', 0.9);
      resolve(dataUrl);
      
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Memformat koordinat untuk ditampilkan
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @returns {string} - Koordinat yang diformat
 */
export const formatCoordinates = (latitude, longitude) => {
  const lat = latitude.toFixed(6);
  const lng = longitude.toFixed(6);
  return `${lat}, ${lng}`;
};

/**
 * Mengambil foto dari kamera belakang dengan lokasi otomatis
 * @returns {Promise<{imageData: string, coordinates: string, timestamp: string}>}
 */
export const takePhotoFromBackCamera = async () => {
  if (!isBrowser) {
    throw new Error('Fitur kamera hanya tersedia di browser');
  }

  try {
    // Dapatkan lokasi terlebih dahulu
    const location = await getCurrentLocation();
    const coordinates = formatCoordinates(location.latitude, location.longitude);
    
    // Dapatkan stream kamera
    const stream = await getBackCamera();
    
    // Buat video element
    const video = document.createElement('video');
    video.srcObject = stream;
    video.autoplay = true;
    video.muted = true;
    
    // Tunggu video siap
    await new Promise((resolve) => {
      video.onloadedmetadata = () => {
        video.play();
        resolve();
      };
    });
    
    // Tunggu sebentar agar kamera stabil
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Ambil foto dengan watermark
    const imageData = await capturePhotoWithWatermark(video, coordinates);
    
    // Stop stream
    stream.getTracks().forEach(track => track.stop());
    
    // Format timestamp
    const now = new Date();
    const timestamp = now.toLocaleString('id-ID', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
    
    return {
      imageData,
      coordinates,
      timestamp,
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy
      }
    };
    
  } catch (error) {
    console.error('Error taking photo:', error);
    throw error;
  }
};
