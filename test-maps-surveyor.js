// test-maps-surveyor.js
// Test file untuk fungsi saveSurveyorRoute

import { saveSurveyorRoute, testSaveSurveyorRoute } from './app/lib/maps-surveyor.js';

async function runTests() {
  console.log('🧪 Memulai test Maps Surveyor...\n');

  try {
    // Test 1: Basic functionality test
    console.log('📍 Test 1: Basic Save Surveyor Route');
    
    const trackingData = [
      { lat: -6.2088, lng: 106.8456, timestamp: new Date('2024-01-15T08:00:00') },
      { lat: -6.2089, lng: 106.8457, timestamp: new Date('2024-01-15T08:05:00') },
      { lat: -6.2090, lng: 106.8458, timestamp: new Date('2024-01-15T08:10:00') },
      { lat: -6.2091, lng: 106.8459, timestamp: new Date('2024-01-15T08:15:00') },
      { lat: -6.2092, lng: 106.8460, timestamp: new Date('2024-01-15T08:20:00') }
    ];

    const summaryInfo = {
      duration: "20 menit",
      distance: 0.8,
      surveysCount: 4
    };

    const taskId = `test-${Date.now()}`;
    const result = await saveSurveyorRoute(
      taskId,
      'Test Surveyor',
      trackingData,
      summaryInfo
    );

    console.log('✅ Test 1 berhasil! Document ID:', result);
    console.log('');

    // Test 2: Auto calculation test
    console.log('📍 Test 2: Auto Calculation');
    
    const trackingData2 = [
      { lat: -6.2088, lng: 106.8456, timestamp: Date.now() - 1800000 }, // 30 menit lalu
      { lat: -6.2100, lng: 106.8470, timestamp: Date.now() - 1200000 }, // 20 menit lalu
      { lat: -6.2110, lng: 106.8480, timestamp: Date.now() - 600000 },  // 10 menit lalu
      { lat: -6.2120, lng: 106.8490, timestamp: Date.now() }             // sekarang
    ];

    const taskId2 = `test-auto-${Date.now()}`;
    const result2 = await saveSurveyorRoute(
      taskId2,
      'Auto Calc Surveyor',
      trackingData2
      // Tidak ada summaryInfo, akan dihitung otomatis
    );

    console.log('✅ Test 2 berhasil! Document ID:', result2);
    console.log('');

    // Test 3: Built-in test function
    console.log('📍 Test 3: Built-in Test Function');
    const result3 = await testSaveSurveyorRoute();
    console.log('✅ Test 3 berhasil! Document ID:', result3);

    console.log('\n🎉 Semua test berhasil!');
    console.log('📋 Data telah disimpan ke koleksi Maps_Surveyor di Firestore');
    console.log('🗺️ Panel admin Maps Surveyor sekarang dapat menampilkan data tracking ini');

  } catch (error) {
    console.error('❌ Test gagal:', error);
    console.error('\n🔧 Troubleshooting:');
    console.error('1. Pastikan Firebase sudah dikonfigurasi dengan benar');
    console.error('2. Pastikan Firestore rules mengizinkan write ke koleksi Maps_Surveyor');
    console.error('3. Pastikan koneksi internet stabil');
  }
}

// Jalankan test
runTests();
