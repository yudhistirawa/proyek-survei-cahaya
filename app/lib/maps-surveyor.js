// lib/maps-surveyor.js
import { db } from './firebase.js';
import { doc, setDoc, serverTimestamp, Timestamp } from 'firebase/firestore';

/**
 * Menyimpan data tracking GPS surveyor ke koleksi Maps_Surveyor
 * @param {string} taskId - ID tugas surveyor
 * @param {string} surveyorName - Nama surveyor
 * @param {Array} trackingData - Array koordinat GPS [{lat, lng, timestamp}, ...]
 * @param {Object} summaryInfo - Info ringkasan {duration, distance, surveysCount}
 * @returns {Promise<string>} - Document ID yang disimpan
 */
export const saveSurveyorRoute = async (taskId, surveyorName, trackingData, summaryInfo = {}) => {
  try {
    console.log('🗺️ Menyimpan data tracking surveyor...');
    
    if (!db) {
      throw new Error('Firestore tidak tersedia');
    }

    // Validasi input
    if (!taskId || !surveyorName || !Array.isArray(trackingData)) {
      throw new Error('Parameter tidak valid: taskId, surveyorName, dan trackingData diperlukan');
    }

    if (trackingData.length === 0) {
      throw new Error('Data tracking kosong');
    }

    // Validasi format trackingData
    const isValidTrackingData = trackingData.every(point => 
      point && 
      typeof point.lat === 'number' && 
      typeof point.lng === 'number' && 
      point.timestamp
    );

    if (!isValidTrackingData) {
      throw new Error('Format trackingData tidak valid. Setiap titik harus memiliki {lat, lng, timestamp}');
    }

    // Konversi timestamp ke Firestore Timestamp jika diperlukan
    const processedTrackingData = trackingData.map(point => ({
      lat: point.lat,
      lng: point.lng,
      timestamp: point.timestamp instanceof Date 
        ? Timestamp.fromDate(point.timestamp)
        : typeof point.timestamp === 'number'
        ? Timestamp.fromMillis(point.timestamp)
        : point.timestamp
    }));

    // Hitung statistik otomatis jika tidak disediakan
    const pointsCount = trackingData.length;
    const distance = summaryInfo.distance || calculateTotalDistance(trackingData);
    const duration = summaryInfo.duration || calculateDuration(trackingData);
    const surveysCount = summaryInfo.surveysCount || 0;

    // Struktur data untuk disimpan
    const surveyorRouteData = {
      surveyorName: surveyorName,
      date: serverTimestamp(),
      duration: duration,
      distance: Number(distance.toFixed(2)), // Dalam km
      pointsCount: pointsCount,
      surveysCount: surveysCount,
      status: "Selesai",
      tracking: processedTrackingData,
      // Metadata tambahan
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      taskId: taskId
    };

    // Simpan ke Firestore dengan taskId sebagai document ID
    const docRef = doc(db, 'Maps_Surveyor', taskId);
    await setDoc(docRef, surveyorRouteData);

    console.log('✅ Data tracking surveyor berhasil disimpan');
    console.log('📊 Statistik:', {
      taskId,
      surveyorName,
      pointsCount,
      distance: `${distance.toFixed(2)} km`,
      duration,
      surveysCount
    });

    return taskId;

  } catch (error) {
    console.error('❌ Error menyimpan data tracking surveyor:', error);
    throw new Error(`Gagal menyimpan data tracking: ${error.message}`);
  }
};

/**
 * Menghitung total jarak dari array koordinat GPS
 * @param {Array} trackingData - Array koordinat GPS
 * @returns {number} - Jarak total dalam kilometer
 */
const calculateTotalDistance = (trackingData) => {
  if (trackingData.length < 2) return 0;

  let totalDistance = 0;
  
  for (let i = 1; i < trackingData.length; i++) {
    const distance = calculateDistanceBetweenPoints(
      trackingData[i - 1],
      trackingData[i]
    );
    totalDistance += distance;
  }

  return totalDistance;
};

/**
 * Menghitung jarak antara dua titik koordinat menggunakan formula Haversine
 * @param {Object} point1 - {lat, lng}
 * @param {Object} point2 - {lat, lng}
 * @returns {number} - Jarak dalam kilometer
 */
const calculateDistanceBetweenPoints = (point1, point2) => {
  const R = 6371; // Radius bumi dalam km
  const dLat = toRadians(point2.lat - point1.lat);
  const dLng = toRadians(point2.lng - point1.lng);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(point1.lat)) * Math.cos(toRadians(point2.lat)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Konversi derajat ke radian
 * @param {number} degrees 
 * @returns {number}
 */
const toRadians = (degrees) => {
  return degrees * (Math.PI / 180);
};

/**
 * Menghitung durasi tracking dari timestamp pertama dan terakhir
 * @param {Array} trackingData - Array koordinat GPS dengan timestamp
 * @returns {string} - Durasi dalam format "X menit" atau "X jam Y menit"
 */
const calculateDuration = (trackingData) => {
  if (trackingData.length < 2) return "0 menit";

  const firstPoint = trackingData[0];
  const lastPoint = trackingData[trackingData.length - 1];

  // Konversi timestamp ke milliseconds
  const startTime = getTimestampInMs(firstPoint.timestamp);
  const endTime = getTimestampInMs(lastPoint.timestamp);

  const durationMs = endTime - startTime;
  const durationMinutes = Math.floor(durationMs / (1000 * 60));

  if (durationMinutes < 60) {
    return `${durationMinutes} menit`;
  } else {
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    return minutes > 0 ? `${hours} jam ${minutes} menit` : `${hours} jam`;
  }
};

/**
 * Helper untuk mendapatkan timestamp dalam milliseconds
 * @param {*} timestamp - Bisa berupa Date, number, atau Firestore Timestamp
 * @returns {number} - Timestamp dalam milliseconds
 */
const getTimestampInMs = (timestamp) => {
  if (timestamp instanceof Date) {
    return timestamp.getTime();
  } else if (typeof timestamp === 'number') {
    return timestamp;
  } else if (timestamp && typeof timestamp.toMillis === 'function') {
    return timestamp.toMillis();
  } else if (timestamp && typeof timestamp.seconds === 'number') {
    return timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000;
  }
  return Date.now();
};

/**
 * Update data tracking yang sudah ada (opsional)
 * @param {string} taskId - ID tugas
 * @param {Object} updateData - Data yang akan diupdate
 * @returns {Promise<void>}
 */
export const updateSurveyorRoute = async (taskId, updateData) => {
  try {
    if (!db) {
      throw new Error('Firestore tidak tersedia');
    }

    const docRef = doc(db, 'Maps_Surveyor', taskId);
    const dataToUpdate = {
      ...updateData,
      updatedAt: serverTimestamp()
    };

    await setDoc(docRef, dataToUpdate, { merge: true });
    console.log('✅ Data tracking surveyor berhasil diupdate');

  } catch (error) {
    console.error('❌ Error update data tracking surveyor:', error);
    throw new Error(`Gagal update data tracking: ${error.message}`);
  }
};

/**
 * Contoh penggunaan untuk testing
 */
export const testSaveSurveyorRoute = async () => {
  try {
    // Data tracking contoh
    const sampleTrackingData = [
      { lat: -6.2088, lng: 106.8456, timestamp: new Date('2024-01-15T08:00:00') },
      { lat: -6.2089, lng: 106.8457, timestamp: new Date('2024-01-15T08:05:00') },
      { lat: -6.2090, lng: 106.8458, timestamp: new Date('2024-01-15T08:10:00') },
      { lat: -6.2091, lng: 106.8459, timestamp: new Date('2024-01-15T08:15:00') }
    ];

    const summaryInfo = {
      duration: "15 menit",
      distance: 0.5,
      surveysCount: 3
    };

    const result = await saveSurveyorRoute(
      'test-task-123',
      'John Doe',
      sampleTrackingData,
      summaryInfo
    );

    console.log('🧪 Test berhasil, document ID:', result);
    return result;

  } catch (error) {
    console.error('🧪 Test gagal:', error);
    throw error;
  }
};
