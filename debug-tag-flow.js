// Debug script to test the complete data flow
const UnifiedDatabaseManager = require('./crm-app/server/UnifiedDatabaseManager');
const axios = require('axios');

async function debugTagFlow() {
  console.log('=== TAG FLOW DEBUG ===\n');
  
  try {
    // Test 1: Chrome Extension API directly
    console.log('1. Testing Chrome Extension API directly...');
    const chromeResponse = await axios.get('http://localhost:5001/api/agents/detailed?limit=2');
    const chromeAgent = chromeResponse.data.agents[0];
    console.log('Chrome Extension tags:', chromeAgent.tags);
    console.log('Chrome Extension tags type:', typeof chromeAgent.tags);
    console.log('Chrome Extension tags array?:', Array.isArray(chromeAgent.tags));
    
    // Test 2: UnifiedDatabaseManager transformation
    console.log('\n2. Testing UnifiedDatabaseManager transformation...');
    const manager = new UnifiedDatabaseManager();
    const transformedAgent = manager.transformAgentData(chromeAgent);
    console.log('Transformed tags:', transformedAgent.tags);
    console.log('Transformed tags type:', typeof transformedAgent.tags);
    
    // Test 3: ConvertTagsToString method directly
    console.log('\n3. Testing convertTagsToString method...');
    console.log('Input:', chromeAgent.tags);
    console.log('Output:', manager.convertTagsToString(chromeAgent.tags));
    
    // Test 4: CRM API through UnifiedDatabaseManager
    console.log('\n4. Testing full CRM API flow...');
    const crmResponse = await axios.get('http://localhost:3000/api/contacts?limit=2');
    const crmAgent = crmResponse.data[0];
    console.log('CRM agent keys:', Object.keys(crmAgent));
    console.log('CRM agent has tags?:', 'tags' in crmAgent);
    console.log('CRM agent tags value:', crmAgent.tags);
    
  } catch (error) {
    console.error('Error in debug:', error.response?.data || error.message);
  }
}

debugTagFlow();
