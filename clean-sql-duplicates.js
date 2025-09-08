// Quick script to clean duplicates using direct SQL
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'chrome_extension_db',
  password: 'password',
  port: 5432,
});

async function cleanDuplicates() {
  try {
    console.log('🧹 Cleaning duplicate "Paseo Ricoso, Camarillo" properties...');
    
    // Keep only the oldest entry (earliest created_at) for BJ Ward
    const query = `
      DELETE FROM properties 
      WHERE agent_id = '13aa1f7e-6947-46c6-8d11-53a7b67fddd3' 
      AND address = 'Paseo Ricoso, Camarillo'
      AND id != (
        SELECT id FROM properties 
        WHERE agent_id = '13aa1f7e-6947-46c6-8d11-53a7b67fddd3' 
        AND address = 'Paseo Ricoso, Camarillo'
        ORDER BY created_at ASC 
        LIMIT 1
      )
      RETURNING id, created_at;
    `;
    
    const result = await pool.query(query);
    console.log(`✅ Deleted ${result.rowCount} duplicate properties`);
    
    if (result.rows.length > 0) {
      console.log('Deleted entries:');
      result.rows.forEach(row => {
        console.log(`  - ${row.id} (${row.created_at})`);
      });
    }
    
    // Verify remaining properties
    const countQuery = `
      SELECT COUNT(*) as total_count,
             COUNT(CASE WHEN address = 'Paseo Ricoso, Camarillo' THEN 1 END) as paseo_count
      FROM properties 
      WHERE agent_id = '13aa1f7e-6947-46c6-8d11-53a7b67fddd3'
    `;
    
    const countResult = await pool.query(countQuery);
    const counts = countResult.rows[0];
    
    console.log(`📊 BJ Ward now has:`);
    console.log(`  - Total properties: ${counts.total_count}`);
    console.log(`  - Paseo Ricoso properties: ${counts.paseo_count}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

cleanDuplicates();
