const axios = require('axios');

async function testContactUpdate() {
  try {
    console.log('Testing contact update with tags...');
    
    const response = await axios.put('http://localhost:3000/api/contacts/43b61a09-0aa1-4524-8d45-c1487b7c7808', {
      tags: 'test123'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ Success:', response.data);
  } catch (error) {
    console.error('❌ Error:', error.response?.data || error.message);
    if (error.response?.status === 500) {
      console.error('💥 500 Internal Server Error details:', error.response.data);
    }
  }
}

testContactUpdate();
