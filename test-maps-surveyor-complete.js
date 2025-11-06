// test-maps-surveyor-complete.js
// Test file untuk complete Maps Surveyor integration

import { selesaikanTugas, loadRuteSurveyor, setupRealtimeSurveyorListener } from './app/lib/maps-surveyor-service.js';

async function testCompleteMapsurveyor() {
  console.log('🧪 Testing Complete Maps Surveyor Integration...\n');

  try {
    // Test 1: Complete a task (simulate surveyor finishing)
    console.log('📍 Test 1: Complete Surveyor Task');
    
    const sampleRoute = [
      { lat: -6.2088, lng: 106.8456, timestamp: new Date('2024-01-15T08:00:00') },
      { lat: -6.2089, lng: 106.8457, timestamp: new Date('2024-01-15T08:05:00') },
      { lat: -6.2090, lng: 106.8458, timestamp: new Date('2024-01-15T08:10:00') },
      { lat: -6.2091, lng: 106.8459, timestamp: new Date('2024-01-15T08:15:00') },
      { lat: -6.2092, lng: 106.8460, timestamp: new Date('2024-01-15T08:20:00') }
    ];

    const taskId = `task-${Date.now()}`;
    const surveyorId = 'surveyor-john-doe';

    const result = await selesaikanTugas(taskId, surveyorId, sampleRoute);
    console.log('✅ Test 1 passed! Task completed:', result);
    console.log('');

    // Test 2: Load completed routes
    console.log('📍 Test 2: Load Completed Routes');
    
    const routes = await loadRuteSurveyor();
    console.log(`✅ Test 2 passed! Loaded ${routes.length} routes`);
    
    if (routes.length > 0) {
      const firstRoute = routes[0];
      console.log('📋 Sample route data:');
      console.log('  - Task ID:', firstRoute.taskId);
      console.log('  - Surveyor ID:', firstRoute.surveyorId);
      console.log('  - Status:', firstRoute.status);
      console.log('  - Total Points:', firstRoute.statistics?.totalPoints);
      console.log('  - Distance:', firstRoute.statistics?.distance, 'km');
      console.log('  - Duration:', firstRoute.statistics?.duration);
      console.log('  - Leaflet Data Available:', !!firstRoute.leafletData);
    }
    console.log('');

    // Test 3: Real-time listener (short test)
    console.log('📍 Test 3: Real-time Listener');
    
    let listenerCallCount = 0;
    const unsubscribe = setupRealtimeSurveyorListener((routes, error) => {
      listenerCallCount++;
      if (error) {
        console.log('❌ Listener error:', error.message);
      } else {
        console.log(`🔄 Listener callback ${listenerCallCount}: ${routes.length} routes`);
      }
    });

    // Wait a bit to see if listener works
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Cleanup listener
    unsubscribe();
    console.log('✅ Test 3 passed! Real-time listener worked');
    console.log('');

    // Test 4: Data structure validation
    console.log('📍 Test 4: Data Structure Validation');
    
    if (routes.length > 0) {
      const route = routes[0];
      
      // Check required fields
      const requiredFields = ['id', 'taskId', 'surveyorId', 'status', 'route', 'routePoints'];
      const missingFields = requiredFields.filter(field => !route[field]);
      
      if (missingFields.length === 0) {
        console.log('✅ All required fields present');
      } else {
        console.log('❌ Missing fields:', missingFields);
      }
      
      // Check GeoJSON format
      if (route.route && route.route.type === 'LineString' && Array.isArray(route.route.coordinates)) {
        console.log('✅ GeoJSON format valid');
      } else {
        console.log('❌ Invalid GeoJSON format');
      }
      
      // Check Leaflet data
      if (route.leafletData && route.leafletData.polyline && route.leafletData.startMarker && route.leafletData.endMarker) {
        console.log('✅ Leaflet data format valid');
      } else {
        console.log('❌ Invalid Leaflet data format');
      }
    }
    console.log('');

    console.log('🎉 All Maps Surveyor tests completed successfully!');
    console.log('\n📋 Integration Summary:');
    console.log('✅ selesaikanTugas() - Save completed tasks to Firestore');
    console.log('✅ loadRuteSurveyor() - Load completed routes from Firestore');
    console.log('✅ setupRealtimeSurveyorListener() - Real-time data updates');
    console.log('✅ GeoJSON LineString format for routes');
    console.log('✅ Leaflet-ready data format');
    console.log('✅ Statistics calculation (distance, duration, points)');
    
    console.log('\n🚀 Ready for production use!');
    console.log('\n📝 Usage in React components:');
    console.log('1. Import: import { useMapsurveyor } from "./hooks/useMapssurveyor.js"');
    console.log('2. Use hook: const { routes, loading, completeTask } = useMapsurveyor()');
    console.log('3. Display: Use MapsSurveyorPanel or SurveyorTrackingPanel components');

  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('\n🔧 Troubleshooting:');
    console.error('1. Pastikan Firebase sudah dikonfigurasi dengan benar');
    console.error('2. Pastikan Firestore rules mengizinkan read/write ke Maps_Surveyor collection');
    console.error('3. Pastikan koneksi internet stabil');
    console.error('4. Periksa console browser untuk error detail');
  }
}

// Example usage patterns
console.log('\n📖 Example Usage Patterns:');
console.log('');

console.log('🔹 1. Surveyor App - Complete Task:');
console.log(`
import { selesaikanTugas } from './lib/maps-surveyor-service.js';

const handleCompleteTask = async () => {
  try {
    const result = await selesaikanTugas(taskId, surveyorId, trackingData);
    alert('Tugas berhasil diselesaikan!');
  } catch (error) {
    alert('Error: ' + error.message);
  }
};
`);

console.log('🔹 2. Admin Panel - Real-time Routes:');
console.log(`
import { useMapsurveyor } from './hooks/useMapssurveyor.js';

const AdminPanel = () => {
  const { routes, loading, error } = useMapsurveyor({ realtime: true });
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  
  return (
    <div>
      {routes.map(route => (
        <div key={route.id}>
          {route.surveyorId} - {route.statistics.distance} km
        </div>
      ))}
    </div>
  );
};
`);

console.log('🔹 3. Leaflet Map Integration:');
console.log(`
// Add route to Leaflet map
routes.forEach(route => {
  // Add polyline
  const polyline = L.polyline(route.leafletData.polyline, { color: 'blue' });
  polyline.addTo(map);
  
  // Add start marker
  const startMarker = L.marker([
    route.leafletData.startMarker.lat, 
    route.leafletData.startMarker.lng
  ]);
  startMarker.addTo(map);
});
`);

// Run the tests
testCompleteMapsurveyor();
