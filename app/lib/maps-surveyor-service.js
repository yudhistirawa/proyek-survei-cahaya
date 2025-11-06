// lib/maps-surveyor-service.js
import { db } from './firebase.js';
import { 
  collection, 
  doc, 
  setDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';

/**
 * Menyimpan data surveyor yang telah selesai ke Firestore
 * @param {string} taskId - ID tugas surveyor
 * @param {string} surveyorId - ID surveyor
 * @param {Array} route - Array koordinat tracking [{lat, lng, timestamp}, ...]
 * @returns {Promise<string>} Document ID yang disimpan
 */
export const selesaikanTugas = async (taskId, surveyorId, route) => {
  try {
    console.log('🏁 Menyelesaikan tugas surveyor...', { taskId, surveyorId, routePoints: route.length });
    
    if (!db) {
      throw new Error('Firestore tidak tersedia');
    }

    // Validasi input
    if (!taskId || !surveyorId || !Array.isArray(route)) {
      throw new Error('Parameter tidak valid: taskId, surveyorId, dan route diperlukan');
    }

    if (route.length === 0) {
      throw new Error('Route tidak boleh kosong');
    }

    // Validasi format route
    const isValidRoute = route.every(point => 
      point && 
      typeof point.lat === 'number' && 
      typeof point.lng === 'number'
    );

    if (!isValidRoute) {
      throw new Error('Format route tidak valid. Setiap titik harus memiliki {lat, lng}');
    }

    // Convert route ke GeoJSON LineString format
    const geoJsonRoute = {
      type: "LineString",
      coordinates: route.map(point => [point.lng, point.lat]) // GeoJSON format: [lng, lat]
    };

    // Hitung statistik route
    const startTime = route[0].timestamp || new Date();
    const endTime = route[route.length - 1].timestamp || new Date();
    const duration = calculateDuration(startTime, endTime);
    const distance = calculateRouteDistance(route);

    // Data yang akan disimpan
    const surveyorData = {
      surveyorId: surveyorId,
      taskId: taskId,
      status: "selesai",
      route: geoJsonRoute,
      routePoints: route, // Simpan juga format array untuk kemudahan akses
      statistics: {
        totalPoints: route.length,
        distance: Number(distance.toFixed(2)), // dalam km
        duration: duration,
        startTime: startTime,
        endTime: endTime
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    // Simpan ke Firestore dengan taskId sebagai document ID
    const docRef = doc(db, 'Maps_Surveyor', taskId);
    await setDoc(docRef, surveyorData);

    console.log('✅ Tugas surveyor berhasil diselesaikan dan disimpan');
    console.log('📊 Statistik:', {
      taskId,
      surveyorId,
      totalPoints: route.length,
      distance: `${distance.toFixed(2)} km`,
      duration
    });

    return taskId;

  } catch (error) {
    console.error('❌ Error menyelesaikan tugas surveyor:', error);
    throw new Error(`Gagal menyelesaikan tugas: ${error.message}`);
  }
};

/**
 * Mengambil semua rute surveyor yang telah selesai dari Firestore
 * @param {Object} options - Opsi filter dan sorting
 * @returns {Promise<Array>} Array data rute surveyor
 */
export const loadRuteSurveyor = async (options = {}) => {
  try {
    console.log('📍 Memuat rute surveyor dari Firestore...');
    
    if (!db) {
      throw new Error('Firestore tidak tersedia');
    }

    // Buat query dengan filter
    const surveyorCollection = collection(db, 'Maps_Surveyor');
    let q = query(
      surveyorCollection,
      where('status', '==', 'selesai'),
      orderBy('createdAt', 'desc')
    );

    // Tambahan filter jika ada
    if (options.surveyorId) {
      q = query(q, where('surveyorId', '==', options.surveyorId));
    }

    const querySnapshot = await getDocs(q);
    const routes = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      
      // Format data untuk Leaflet
      const routeData = {
        id: doc.id,
        taskId: data.taskId,
        surveyorId: data.surveyorId,
        status: data.status,
        route: data.route, // GeoJSON format
        routePoints: data.routePoints, // Array format
        statistics: data.statistics,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        // Format untuk Leaflet
        leafletData: {
          polyline: data.routePoints.map(point => [point.lat, point.lng]),
          startMarker: {
            lat: data.routePoints[0].lat,
            lng: data.routePoints[0].lng,
            popup: `Start - Surveyor: ${data.surveyorId}`
          },
          endMarker: {
            lat: data.routePoints[data.routePoints.length - 1].lat,
            lng: data.routePoints[data.routePoints.length - 1].lng,
            popup: `End - Task: ${data.taskId}`
          }
        }
      };

      routes.push(routeData);
    });

    console.log(`✅ Berhasil memuat ${routes.length} rute surveyor`);
    return routes;

  } catch (error) {
    console.error('❌ Error memuat rute surveyor:', error);
    throw new Error(`Gagal memuat rute surveyor: ${error.message}`);
  }
};

/**
 * Setup listener real-time untuk data Maps Surveyor
 * @param {Function} callback - Callback function yang dipanggil saat data berubah
 * @param {Object} options - Opsi filter
 * @returns {Function} Unsubscribe function
 */
export const setupRealtimeSurveyorListener = (callback, options = {}) => {
  try {
    console.log('🔄 Setting up real-time listener untuk Maps Surveyor...');
    
    if (!db) {
      throw new Error('Firestore tidak tersedia');
    }

    if (typeof callback !== 'function') {
      throw new Error('Callback harus berupa function');
    }

    // Buat query
    const surveyorCollection = collection(db, 'Maps_Surveyor');
    let q = query(
      surveyorCollection,
      where('status', '==', 'selesai'),
      orderBy('createdAt', 'desc')
    );

    // Setup listener
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const routes = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        
        const routeData = {
          id: doc.id,
          taskId: data.taskId,
          surveyorId: data.surveyorId,
          status: data.status,
          route: data.route,
          routePoints: data.routePoints,
          statistics: data.statistics,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
          leafletData: {
            polyline: data.routePoints.map(point => [point.lat, point.lng]),
            startMarker: {
              lat: data.routePoints[0].lat,
              lng: data.routePoints[0].lng,
              popup: `Start - Surveyor: ${data.surveyorId}`
            },
            endMarker: {
              lat: data.routePoints[data.routePoints.length - 1].lat,
              lng: data.routePoints[data.routePoints.length - 1].lng,
              popup: `End - Task: ${data.taskId}`
            }
          }
        };

        routes.push(routeData);
      });

      console.log(`🔄 Real-time update: ${routes.length} rute surveyor`);
      callback(routes);
    }, (error) => {
      console.error('❌ Real-time listener error:', error);
      callback([], error);
    });

    console.log('✅ Real-time listener berhasil disetup');
    return unsubscribe;

  } catch (error) {
    console.error('❌ Error setup real-time listener:', error);
    throw new Error(`Gagal setup listener: ${error.message}`);
  }
};

/**
 * Menghitung jarak total dari array koordinat
 * @param {Array} route - Array koordinat
 * @returns {number} Jarak dalam kilometer
 */
const calculateRouteDistance = (route) => {
  if (route.length < 2) return 0;

  let totalDistance = 0;
  
  for (let i = 1; i < route.length; i++) {
    const distance = calculateDistanceBetweenPoints(
      route[i - 1],
      route[i]
    );
    totalDistance += distance;
  }

  return totalDistance;
};

/**
 * Menghitung jarak antara dua titik menggunakan formula Haversine
 * @param {Object} point1 - {lat, lng}
 * @param {Object} point2 - {lat, lng}
 * @returns {number} Jarak dalam kilometer
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
 * Menghitung durasi berdasarkan waktu mulai dan selesai
 * @param {Date|number} startTime 
 * @param {Date|number} endTime 
 * @returns {string} Durasi dalam format readable
 */
const calculateDuration = (startTime, endTime) => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  const durationMs = end.getTime() - start.getTime();
  const durationMinutes = Math.floor(durationMs / (1000 * 60));

  if (durationMinutes < 60) {
    return `${durationMinutes} menit`;
  } else {
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    return minutes > 0 ? `${hours} jam ${minutes} menit` : `${hours} jam`;
  }
};
