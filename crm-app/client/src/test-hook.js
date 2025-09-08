// Simple test to verify the useDatabase hook works
const axios = require('axios');

// Simulate the hook logic
async function testDatabaseHook() {
  console.log('Testing database hook logic...');
  
  try {
    console.log('1. Testing raw API call...');
    const rawResponse = await axios.get('http://localhost:3000/api/databases');
    console.log('Raw response:', rawResponse.data);
    
    console.log('2. Testing API service...');
    // Simulate api.getDatabases
    const response = await axios.get('http://localhost:5000/api/databases');
    const data = response.data;
    
    const allDatabases = [];
    if (data.sqlite) {
      allDatabases.push(...data.sqlite.map(name => ({ name, type: 'sqlite' })));
    }
    if (data.chrome_extension) {
      allDatabases.push(...data.chrome_extension.map(name => ({ name, type: 'chrome_extension' })));
    }
    
    let current = null;
    try {
      const contactsResponse = await axios.get('http://localhost:5000/api/contacts');
      if (contactsResponse.data && contactsResponse.data.length > 0) {
        const firstContact = contactsResponse.data[0];
        if (firstContact._dbName) {
          current = {
            name: firstContact._dbName,
            type: firstContact._dbType || 'sqlite'
          };
        }
      }
    } catch (error) {
      console.warn('Could not determine current database:', error.message);
    }
    
    const result = {
      databases: allDatabases,
      current: current
    };
    
    console.log('3. Final hook result:');
    console.log('   databases:', result.databases.length, 'items');
    console.log('   current:', result.current);
    console.log('   rawDatabases:', data);
    
    return result;
    
  } catch (error) {
    console.error('Hook test failed:', error.message);
  }
}

testDatabaseHook();
