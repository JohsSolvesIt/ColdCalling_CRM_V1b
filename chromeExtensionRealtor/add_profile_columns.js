const db = require('./backend/database/connection');

async function addProfileImageColumns() {
  
  try {
    console.log('Adding profile image override columns to agents table...');
    
    // Add the missing columns
    await db.query(`
      ALTER TABLE agents 
      ADD COLUMN IF NOT EXISTS override_profile_image BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS custom_profile_image_url TEXT;
    `);
    
    console.log('Successfully added columns!');
    
    // Verify columns were added
    const result = await db.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'agents' 
      AND column_name IN ('override_profile_image', 'custom_profile_image_url')
      ORDER BY column_name;
    `);
    
    console.log('Column verification:');
    result.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable}, default: ${row.column_default})`);
    });
    
  } catch (error) {
    console.error('Error adding columns:', error);
  } finally {
    await db.pool.end();
  }
}

addProfileImageColumns();
