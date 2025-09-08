#!/usr/bin/env node

/**
 * EMERGENCY TESTIMONIAL CLEANUP SCRIPT
 * 
 * Removes contaminated navigation/UI testimonials from database
 * Based on real extraction data analysis showing navigation elements being stored as testimonials
 * 
 * CONTAMINATION PATTERNS FOUND:
 * - "reviews Buyer reviews Seller reviews" (author: "All")
 * - "first Rating (high to low) Rating (low to high)" (author: "Newest") 
 * - "Testimonials (1)Add a testimonial" (author: "Comfort Real E")
 * - "Overall rating:4.9Add rating and review" (author: "Sharon Camarillo")
 * - Rating metadata mixed with testimonials
 */

const db = require('./backend/database/connection');

async function cleanContaminatedTestimonials() {
  console.log('🧹 EMERGENCY CLEANUP: Removing contaminated testimonials from database...');
  
  try {
    await db.query('BEGIN');
    
    // Count existing testimonials before cleanup
    const beforeCount = await db.query('SELECT COUNT(*) as count FROM recommendations');
    console.log(`📊 Total testimonials before cleanup: ${beforeCount.rows[0].count}`);
    
    // 1. Remove obvious navigation text testimonials
    const navigationCleanup = await db.query(`
      DELETE FROM recommendations 
      WHERE text ~* 'rating.*(high|low)' 
         OR text ~* 'buyer.*reviews.*seller' 
         OR text ~* 'add.*testimonial'
         OR text ~* 'overall.*rating.*add'
         OR text ~* 'newest.*first.*rating'
         OR text LIKE '%responsiveness%market%expertise%'
         OR text LIKE '%Testimonials (%Add a testimonial%'
         OR text = 'reviews Buyer reviews Seller reviews'
         OR text = 'first Rating (high to low) Rating (low to high)'
         OR text LIKE 'Overall rating:%Add rating and review'
         OR author = 'All'
         OR author = 'Newest'
         OR author = 'Comfort Real E'
    `);
    
    console.log(`🗑️  Removed ${navigationCleanup.rowCount} navigation text testimonials`);
    
    // 2. Remove testimonials with rating metadata contamination AND rating-only content
    const ratingCleanup = await db.query(`
      DELETE FROM recommendations 
      WHERE text ~* '\\d+\\.\\d+.*responsiveness.*\\d+\\.\\d+.*market.*expertise'
         OR text ~* '\\d+\\.\\d+.*\\d+\\.\\d+.*responsiveness'
         OR text LIKE '%5.0 4.0Responsiveness%'
         OR text LIKE '%Market expertise%Negotiation skills%Professionalism%'
         OR text ~* '^(professionalism|responsiveness|market expertise|negotiation skills)\\s*&?\\s*communication\\.?\\s*$'
         OR text ~* '^\\s*(professionalism|responsiveness|market|negotiation)\\s*&?\\s*communication\\.?\\s*$'
         OR text ~* '^(professionalism|responsiveness|market expertise|negotiation skills)\\.?\\s*$'
    `);
    
    console.log(`🗑️  Removed ${ratingCleanup.rowCount} rating metadata testimonials`);
    
    // 3. Remove testimonials that are obviously truncated mid-word
    const truncatedCleanup = await db.query(`
      DELETE FROM recommendations 
      WHERE text ~* '\\s(co|in|an|th|wi|ha|ma|re|pr|ex|su|de|im|un|ac|el|st|tr|gr|bl|sp|cr|fl|sl)$'
         OR text LIKE '%confident having BJ in our co'
         OR text LIKE '% in our co'
         OR text LIKE '% we co'
         OR (length(text) > 200 AND text !~ '[.!?]$')
    `);
    
    console.log(`🗑️  Removed ${truncatedCleanup.rowCount} truncated testimonials`);
    
    // 4. Remove testimonials that are too short to be meaningful
    const shortCleanup = await db.query(`
      DELETE FROM recommendations 
      WHERE length(text) < 30
         OR text = ''
         OR text IS NULL
    `);
    
    console.log(`🗑️  Removed ${shortCleanup.rowCount} too-short testimonials`);
    
    // 5. Identify authors with suspicious names (likely extracted from wrong elements)
    const suspiciousAuthors = await db.query(`
      SELECT author, COUNT(*) as count, string_agg(DISTINCT substring(text, 1, 50), ' | ') as sample_texts
      FROM recommendations 
      WHERE author ~* '(comfort|real|estate|services|rating|newest|first|all|reviews?|buyer|seller|testimonial)'
         OR author LIKE '%Real E%'
         OR author LIKE '%Comfort%'
      GROUP BY author
      ORDER BY count DESC
    `);
    
    if (suspiciousAuthors.rows.length > 0) {
      console.log('⚠️  Found suspicious authors (likely navigation elements):');
      suspiciousAuthors.rows.forEach(row => {
        console.log(`   - "${row.author}" (${row.count} testimonials): ${row.sample_texts}`);
      });
      
      // Remove testimonials with suspicious authors
      const suspiciousCleanup = await db.query(`
        DELETE FROM recommendations 
        WHERE author ~* '(comfort|real|estate|services|rating|newest|first|all|reviews?|buyer|seller|testimonial)'
           OR author LIKE '%Real E%'
           OR author LIKE '%Comfort%'
      `);
      
      console.log(`🗑️  Removed ${suspiciousCleanup.rowCount} testimonials with suspicious authors`);
    }
    
    // Count after cleanup
    const afterCount = await db.query('SELECT COUNT(*) as count FROM recommendations');
    const removedTotal = beforeCount.rows[0].count - afterCount.rows[0].count;
    
    console.log(`📊 Total testimonials after cleanup: ${afterCount.rows[0].count}`);
    console.log(`🎯 Removed ${removedTotal} contaminated testimonials total`);
    
    // Show sample of remaining testimonials to verify quality
    const sampleTestimonials = await db.query(`
      SELECT author, substring(text, 1, 100) as sample_text, agent_id
      FROM recommendations 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    if (sampleTestimonials.rows.length > 0) {
      console.log('\n✅ Sample of remaining clean testimonials:');
      sampleTestimonials.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.author}: "${row.sample_text}..."`);
      });
    }
    
    await db.query('COMMIT');
    console.log('\n🎉 Cleanup completed successfully!');
    
    // Recommendations for next steps
    console.log('\n📋 NEXT STEPS:');
    console.log('1. Re-run Chrome Extension on BJ Ward with fixed validation');
    console.log('2. Verify only real testimonials are extracted');
    console.log('3. Check website generation uses clean testimonials');
    console.log('4. Run bulk re-extraction on other agents if needed');
    
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('❌ Cleanup failed:', error);
    console.error('Database rollback completed - no changes made');
  } finally {
    await db.close();
  }
}

// Run cleanup if script is executed directly
if (require.main === module) {
  cleanContaminatedTestimonials().catch(console.error);
}

module.exports = { cleanContaminatedTestimonials };
