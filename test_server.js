const axios = require('axios');

async function testServer() {
  try {
    const response = await axios.get('http://localhost:3000/datasets');
    console.log('✅ Server is running');
    console.log(`Response status: ${response.status}`);
    console.log(`Datasets count: ${Array.isArray(response.data) ? response.data.length : '?'}`);
  } catch (error) {
    if (error.code === 'ECONNREFUSED') {
      console.log('❌ Server is NOT running. Please start: node backend/server.js');
    } else {
      console.log('❌ Server error:', error.message);
    }
  }
}

testServer();
