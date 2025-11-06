// Test script untuk API endpoint reports
const fetch = require('node-fetch');

async function testAPI() {
  try {
    console.log('Testing API endpoint /api/reports...');
    
    const response = await fetch('http://localhost:3000/api/reports');
    
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Response data:', JSON.stringify(data, null, 2));
      console.log('Number of reports:', Array.isArray(data) ? data.length : 'Not an array');
    } else {
      const errorText = await response.text();
      console.error('Error response:', errorText);
    }
  } catch (error) {
    console.error('Error testing API:', error);
  }
}

testAPI();
