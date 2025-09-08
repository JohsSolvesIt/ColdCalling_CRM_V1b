// Clean existing rating category testimonials from database
// This script removes "Professionalism & communication" type reviews that are already saved

const { Pool } = require('pg');

// Database connection
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'realtor_crm',
  password: 'your_password',
  port: 5432,
});

// Rating categories to remove
const ratingCategories = [
  'Professionalism & communication',
  'Local knowledge',
  'Process expertise', 
  'Responsiveness',
  'Negotiation skills',
  'Market knowledge',
  'Communication',
  'Professionalism',
  'Expertise',
  'Service',
  'Quality'
];

function isRatingCategoryOnly(text) {
  if (!text || typeof text !== 'string') return false;
  
  const cleanText = text.trim().toLowerCase();
  return ratingCategories.some(category => 
    cleanText === category.toLowerCase() || 
    cleanText.includes(category.toLowerCase())
  );
}

async function cleanRatingCategoriesFromDatabase() {
  console.log('🧹 Starting database cleanup of rating category testimonials...');
  
  try {
    // Get all extraction records that have reviews
    const result = await pool.query(`
      SELECT id, extraction_data 
      FROM extractions 
      WHERE extraction_data->>'reviews' IS NOT NULL
    `);
    
    console.log(`📊 Found ${result.rows.length} records with reviews to check`);
    
    let totalCleaned = 0;
    let recordsUpdated = 0;
    
    for (const row of result.rows) {
      const extractionData = row.extraction_data;
      
      if (extractionData.reviews && extractionData.reviews.recommendations) {
        const originalCount = extractionData.reviews.recommendations.length;
        
        // Filter out rating categories
        extractionData.reviews.recommendations = extractionData.reviews.recommendations.filter(rec => {
          const isRatingCategory = isRatingCategoryOnly(rec.text);
          if (isRatingCategory) {
            console.log(`🚫 Removing: "${rec.text}" by ${rec.author}`);
            totalCleaned++;
            return false;
          }
          return true;
        });
        
        const newCount = extractionData.reviews.recommendations.length;
        
        if (originalCount !== newCount) {
          // Update the record in database
          await pool.query(`
            UPDATE extractions 
            SET extraction_data = $1 
            WHERE id = $2
          `, [JSON.stringify(extractionData), row.id]);
          
          recordsUpdated++;
          console.log(`✅ Record ${row.id}: Removed ${originalCount - newCount} rating categories`);
        }
      }
    }
    
    console.log(`\n📋 CLEANUP SUMMARY:`);
    console.log(`Records checked: ${result.rows.length}`);
    console.log(`Records updated: ${recordsUpdated}`);
    console.log(`Total testimonials removed: ${totalCleaned}`);
    
  } catch (error) {
    console.error('❌ Database cleanup error:', error);
  } finally {
    await pool.end();
  }
}

// Run the cleanup if this script is executed directly
if (require.main === module) {
  cleanRatingCategoriesFromDatabase().then(() => {
    console.log('🎉 Database cleanup completed!');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Cleanup failed:', error);
    process.exit(1);
  });
}

module.exports = { cleanRatingCategoriesFromDatabase };
