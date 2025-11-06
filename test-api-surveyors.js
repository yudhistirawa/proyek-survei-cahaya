// Script untuk test API surveyors
// Jalankan dengan: node test-api-surveyors.js

const fetch = require('node-fetch');

async function testSurveyorsAPI() {
  try {
    console.log('🔍 Testing API surveyors...');
    
    const response = await fetch('http://localhost:3000/api/surveyors');
    console.log('📡 Response status:', response.status);
    
    if (response.ok) {
      const result = await response.json();
      console.log('📦 API Response:', JSON.stringify(result, null, 2));
      
      if (result.success) {
        console.log(`✅ Surveyors loaded: ${result.data.length} surveyors`);
        
        if (result.data.length > 0) {
          console.log('\n👥 Surveyor Details:');
          result.data.forEach((surveyor, index) => {
            console.log(`${index + 1}. ${surveyor.name || surveyor.username} (@${surveyor.username})`);
          });
        }
      } else {
        console.log('❌ API returned error:', result.error);
      }
    } else {
      console.log('❌ HTTP Error:', response.status);
      const errorText = await response.text();
      console.log('Error details:', errorText);
    }
    
  } catch (error) {
    console.error('❌ Error testing API:', error.message);
  }
}

// Jalankan test
testSurveyorsAPI()
  .then(() => {
    console.log('\n✨ API test selesai!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
