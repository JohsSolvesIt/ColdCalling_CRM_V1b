#!/usr/bin/env node

// Migration script to transfer existing reviews from extraction_logs to recommendations table
const Database = require('./backend/database/connection');

async function migrateExistingReviews() {
  try {
    console.log('🔄 Starting migration of existing reviews...');
    
    // Get extraction logs with reviews data
    const query = `
      SELECT 
        el.agent_id,
        el.extraction_data
      FROM extraction_logs el
      WHERE el.agent_id IS NOT NULL 
        AND el.extraction_data::text LIKE '%recommendations%'
        AND el.extraction_data->>'reviews' IS NOT NULL
      ORDER BY el.created_at DESC
    `;
    
    const result = await Database.query(query);
    console.log(`📊 Found ${result.rows.length} extraction logs with reviews data`);
    
    let totalMigrated = 0;
    
    for (const row of result.rows) {
      const agentId = row.agent_id;
      const extractionData = row.extraction_data;
      
      if (extractionData.reviews && extractionData.reviews.recommendations) {
        const recommendations = extractionData.reviews.recommendations;
        console.log(`\n🔍 Processing agent ${agentId} with ${recommendations.length} recommendations`);
        
        const inserted = await Database.insertRecommendations(agentId, recommendations);
        totalMigrated += inserted;
        
        console.log(`✅ Migrated ${inserted} recommendations for agent ${agentId}`);
      }
    }
    
    console.log(`\n🎉 Migration complete! Total recommendations migrated: ${totalMigrated}`);
    
    // Verify migration
    const countQuery = 'SELECT COUNT(*) as total FROM recommendations';
    const countResult = await Database.query(countQuery);
    console.log(`📊 Total recommendations now in database: ${countResult.rows[0].total}`);
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    await Database.close();
  }
}

// Run migration
migrateExistingReviews();
