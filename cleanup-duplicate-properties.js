const fetch = require('node-fetch');

/**
 * Clean up duplicate "Paseo Ricoso, Camarillo" properties for BJ Ward
 * Keep only the oldest entry (2025-08-30T14:54:20.525Z)
 */
async function cleanupDuplicateProperties() {
  const agentId = '13aa1f7e-6947-46c6-8d11-53a7b67fddd3'; // BJ Ward
  const baseUrl = 'http://localhost:5001/api';
  
  try {
    console.log('🧹 Starting cleanup of duplicate properties...');
    
    // Fetch agent's properties
    const response = await fetch(`${baseUrl}/agents/${agentId}`);
    const data = await response.json();
    
    if (!data.success) {
      throw new Error('Failed to fetch agent data');
    }
    
    const properties = data.agent.properties;
    console.log(`📊 Total properties found: ${properties.length}`);
    
    // Find all "Paseo Ricoso, Camarillo" entries
    const paseoDuplicates = properties.filter(p => 
      p.address === 'Paseo Ricoso, Camarillo'
    );
    
    console.log(`🔍 Found ${paseoDuplicates.length} "Paseo Ricoso, Camarillo" entries`);
    
    if (paseoDuplicates.length <= 1) {
      console.log('✅ No duplicates to clean up');
      return;
    }
    
    // Sort by creation date to find the original (oldest)
    paseoDuplicates.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    
    const original = paseoDuplicates[0];
    const duplicatesToDelete = paseoDuplicates.slice(1);
    
    console.log(`📅 Original entry: ${original.id} (${original.created_at})`);
    console.log(`🗑️  Duplicates to delete: ${duplicatesToDelete.length}`);
    
    // Delete duplicates one by one
    let deletedCount = 0;
    for (const duplicate of duplicatesToDelete) {
      try {
        const deleteResponse = await fetch(`${baseUrl}/properties/${duplicate.id}`, {
          method: 'DELETE'
        });
        
        if (deleteResponse.ok) {
          console.log(`✅ Deleted duplicate: ${duplicate.id} (${duplicate.created_at})`);
          deletedCount++;
        } else {
          console.log(`❌ Failed to delete: ${duplicate.id}`);
        }
        
        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`❌ Error deleting ${duplicate.id}:`, error.message);
      }
    }
    
    console.log(`🎯 Cleanup complete! Deleted ${deletedCount} duplicate entries`);
    console.log(`📊 Agent should now have ${properties.length - deletedCount} unique properties`);
    
    // Verify cleanup
    console.log('🔍 Verifying cleanup...');
    const verifyResponse = await fetch(`${baseUrl}/agents/${agentId}`);
    const verifyData = await verifyResponse.json();
    
    if (verifyData.success) {
      const remainingPaseos = verifyData.agent.properties.filter(p => 
        p.address === 'Paseo Ricoso, Camarillo'
      );
      console.log(`✅ Verification: ${remainingPaseos.length} "Paseo Ricoso, Camarillo" entries remaining`);
      console.log(`📊 Total properties after cleanup: ${verifyData.agent.properties.length}`);
    }
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

// Run the cleanup
if (require.main === module) {
  cleanupDuplicateProperties();
}

module.exports = { cleanupDuplicateProperties };
