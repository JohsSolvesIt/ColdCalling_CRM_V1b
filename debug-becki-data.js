/**
 * DEBUG: Test for Real Becki Cassidy Data
 * This script will help debug the actual data pipeline
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

async function debugBeckiCassidyData() {
  console.log('🔍 Debugging Becki Cassidy data pipeline...');
  
  try {
    // First, let's see if we can find Becki Cassidy in the CRM
    const response = await axios.get('http://localhost:5000/api/agents');
    
    if (!response.data.success) {
      console.log('❌ Could not fetch agents from CRM');
      return;
    }
    
    const agents = response.data.agents || response.data.data || [];
    console.log(`📊 Total agents found: ${agents.length}`);
    
    // Look for Becki Cassidy
    const beckiCassidy = agents.find(agent => 
      (agent.name || agent.NAME || '').toLowerCase().includes('becki') &&
      (agent.name || agent.NAME || '').toLowerCase().includes('cassidy')
    );
    
    if (!beckiCassidy) {
      console.log('❌ Becki Cassidy not found in CRM data');
      console.log('Available agents (first 10):');
      agents.slice(0, 10).forEach((agent, i) => {
        console.log(`  ${i+1}. ${agent.name || agent.NAME || 'No name'} (ID: ${agent.id})`);
      });
      return;
    }
    
    console.log('✅ Found Becki Cassidy:', {
      name: beckiCassidy.name || beckiCassidy.NAME,
      id: beckiCassidy.id,
      phone: beckiCassidy.phone,
      email: beckiCassidy.email
    });
    
    // Now fetch her properties directly from the Chrome Extension API
    if (beckiCassidy.id) {
      console.log('\n🏠 Fetching properties for Becki Cassidy...');
      
      try {
        const propertiesResponse = await axios.get('http://localhost:8081/api/properties', {
          params: { agent_id: beckiCassidy.id, limit: 50 },
          timeout: 15000
        });
        
        if (propertiesResponse.data.success) {
          const properties = propertiesResponse.data.properties || [];
          console.log(`📦 Properties found: ${properties.length}`);
          
          if (properties.length > 0) {
            console.log('\nProperty details:');
            properties.forEach((prop, i) => {
              console.log(`  ${i+1}. ${prop.address || 'No address'} - ${prop.price || 'No price'}`);
              console.log(`      City: ${prop.city || 'No city'}, State: ${prop.state || 'No state'}`);
              console.log(`      Status: ${prop.status || 'No status'}`);
            });
            
            // Check for duplicates
            const addressCounts = {};
            properties.forEach(prop => {
              const address = prop.address || 'Unknown';
              addressCounts[address] = (addressCounts[address] || 0) + 1;
            });
            
            console.log('\n🔍 Checking for duplicate addresses:');
            Object.entries(addressCounts).forEach(([address, count]) => {
              if (count > 1) {
                console.log(`🚨 DUPLICATE: "${address}" appears ${count} times`);
              } else {
                console.log(`✅ UNIQUE: "${address}"`);
              }
            });
          } else {
            console.log('📭 No properties found for Becki Cassidy');
          }
        } else {
          console.log('❌ Failed to fetch properties:', propertiesResponse.data.error || 'Unknown error');
        }
        
      } catch (propertiesError) {
        console.log('❌ Error fetching properties:', propertiesError.message);
        
        if (propertiesError.code === 'ECONNREFUSED') {
          console.log('💡 Chrome Extension API might not be running on port 8081');
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 CRM server might not be running on port 5000');
      console.log('💡 Try starting the CRM with: npm start or node server/index.js');
    }
  }
}

// Run the debug
debugBeckiCassidyData();
