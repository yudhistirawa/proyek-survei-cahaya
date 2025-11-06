// Test script untuk API dashboard-stats
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

async function testDashboardAPI() {
  try {
    console.log('🧪 Testing dashboard-stats API endpoint...');
    
    // Test 1: Admin stats
    console.log('\n📝 Test 1: Admin stats');
    try {
      const adminResponse = await fetch('http://localhost:3000/api/dashboard-stats?admin=true');
      console.log('📥 Admin response status:', adminResponse.status);
      
      if (adminResponse.ok) {
        const adminData = await adminResponse.json();
        console.log('✅ Admin stats successful:', adminData);
      } else {
        const errorText = await adminResponse.text();
        console.error('❌ Admin stats failed:', errorText);
      }
    } catch (error) {
      console.error('❌ Admin stats error:', error.message);
    }
    
    // Test 2: User stats
    console.log('\n📝 Test 2: User stats');
    try {
      const userResponse = await fetch('http://localhost:3000/api/dashboard-stats?userId=test-user-123');
      console.log('📥 User response status:', userResponse.status);
      
      if (userResponse.ok) {
        const userData = await userResponse.json();
        console.log('✅ User stats successful:', userData);
      } else {
        const errorText = await userResponse.text();
        console.error('❌ User stats failed:', errorText);
      }
    } catch (error) {
      console.error('❌ User stats error:', error.message);
    }
    
    // Test 3: No parameters
    console.log('\n📝 Test 3: No parameters');
    try {
      const noParamResponse = await fetch('http://localhost:3000/api/dashboard-stats');
      console.log('📥 No param response status:', noParamResponse.status);
      
      if (noParamResponse.ok) {
        const noParamData = await noParamResponse.json();
        console.log('✅ No param stats successful:', noParamData);
      } else {
        const errorText = await noParamResponse.text();
        console.error('❌ No param stats failed:', errorText);
      }
    } catch (error) {
      console.error('❌ No param stats error:', error.message);
    }
    
    console.log('\n✅ Dashboard API tests completed');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run test
testDashboardAPI();
