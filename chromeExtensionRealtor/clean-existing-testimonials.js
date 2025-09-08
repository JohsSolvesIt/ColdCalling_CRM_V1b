const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.POSTGRES_USER || 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB || 'realtor_data',
  password: process.env.POSTGRES_PASSWORD || 'password',
  port: process.env.POSTGRES_PORT || 5432,
});

function cleanTestimonialText(text) {
  if (!text || typeof text !== 'string') return text;
  
  // Enhanced cleaning for review text and descriptions - comprehensive rating metadata removal
  let cleaned = text
    .replace(/\{[^}]*\}/g, '') // Remove CSS blocks
    .replace(/jsx-\d+/g, '') // Remove JSX class names
    
    // Remove overall rating patterns
    .replace(/Overall rating:\s*\d+\.\d+/gi, '') // "Overall rating:4.9"
    .replace(/Overall rating \(\d+\)/gi, '') // "Overall rating (5)" artifacts
    .replace(/Add rating and review\.?/gi, '') // "Add rating and review"
    
    // Remove "Name | Year" prefixes like "Belinda GillisAgoura | 2025"
    .replace(/^[A-Za-z\s]+\s*\|\s*\d{4}\s*/i, '')
    
    // Remove verified review sections
    .replace(/Verified review\s*\d+\.\d+\s*/gi, '')
    
    // Remove rating scores - this needs to be more comprehensive
    .replace(/\d+\.\d+\s+\d+\.\d+\s*[A-Za-z\s&]*\d+\.\d+\s*[A-Za-z\s&]*\d+\.\d+\s*[A-Za-z\s&]*/gi, '') // "5.0 5.0 Responsiveness 5.0 Market expertise..."
    .replace(/^\d+\.\d+\s+\d+\.\d+.*?communication\s*/i, '') // Start of text rating patterns
    .replace(/\b\d+\.\d+\s+\d+\.\d+.*?(Responsiveness|Market expertise|Negotiation skills|Professionalism)/gi, '')
    
    // Remove rating category labels
    .replace(/ResponsivenessNegotiation skillsProfessionalism and communicationMarket expertise/gi, '') 
    .replace(/Responsiveness\s*Negotiation skills\s*Professionalism and communication\s*Market expertise/gi, '') 
    .replace(/\b(Responsiveness|Negotiation skills|Professionalism and communication|Market expertise)\b/gi, '') 
    .replace(/\b(Responsiveness|Market expertise|Negotiation skills|Professionalism)\s*&?\s*communication\b/gi, '') // "Professionalism & communication"
    
    // Remove truncation indicators
    .replace(/\.\.\.\s*$/, '') // Remove trailing "..."
    .replace(/\s*\.\.\.\s*Read more.*$/i, '') // Remove "... Read more" patterns
    .replace(/Read more.*$/i, '') // Remove "Read more" endings
    
    // Remove location patterns
    .replace(/\b\d{4}\b/g, '') // Remove standalone years
    .replace(/\b[A-Z][a-z]+,\s*CA\s*/g, '') // Remove "City, CA" location prefixes
    
    // Clean up text formatting
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .replace(/["\n\r]/g, ' ') // Replace quotes and newlines with spaces
    .replace(/^\s*,\s*/, '') // Remove leading commas
    .replace(/\s*,\s*$/, '') // Remove trailing commas
    .replace(/^[\s\d\.\&]+/, '') // Remove leading spaces, numbers, dots, and ampersands
    .trim();
  
  // If text starts with a quote, make sure it's properly formatted
  if (cleaned.startsWith('"') && !cleaned.endsWith('"') && cleaned.length > 10) {
    // Find the end of the actual quote content
    const quoteEnd = cleaned.lastIndexOf('"');
    if (quoteEnd > 0) {
      cleaned = cleaned.substring(0, quoteEnd + 1);
    }
  }
  
  // Return truncated but longer text for reviews
  return cleaned.substring(0, 800); // Increased from 500 to allow for full testimonials
}

async function cleanExistingTestimonials() {
  try {
    console.log('🧹 Starting cleanup of existing testimonials...');
    
    // Get all testimonials that need cleaning
    const testimonials = await pool.query(`
      SELECT id, text, author 
      FROM recommendations 
      WHERE text LIKE '%Overall rating%' 
         OR text LIKE '%Verified review%' 
         OR text LIKE '%Responsiveness%'
         OR text LIKE '%Market expertise%'
         OR text LIKE '%| 2025%'
         OR text LIKE '%Add rating and review%'
    `);
    
    console.log(`📊 Found ${testimonials.rows.length} testimonials that need cleaning`);
    
    let cleanedCount = 0;
    let filteredCount = 0;
    
    for (const testimonial of testimonials.rows) {
      const originalText = testimonial.text;
      const cleanedText = cleanTestimonialText(originalText);
      
      console.log(`\n🔍 Processing testimonial ${testimonial.id}:`);
      console.log(`   Author: ${testimonial.author}`);
      console.log(`   Before: ${originalText.substring(0, 100)}...`);
      console.log(`   After:  ${cleanedText.substring(0, 100)}...`);
      
      // Check if the cleaned text is valid (not just empty or rating metadata)
      if (cleanedText.length > 20 && 
          !cleanedText.toLowerCase().includes('overall rating') &&
          !cleanedText.toLowerCase().includes('add rating and review') &&
          cleanedText.trim() !== '') {
        
        // Update the testimonial with cleaned text
        await pool.query(`
          UPDATE recommendations 
          SET text = $1, updated_at = NOW() 
          WHERE id = $2
        `, [cleanedText, testimonial.id]);
        
        cleanedCount++;
        console.log(`   ✅ Updated with cleaned text`);
      } else {
        // Delete testimonials that are just rating metadata
        await pool.query(`
          DELETE FROM recommendations 
          WHERE id = $1
        `, [testimonial.id]);
        
        filteredCount++;
        console.log(`   🗑️ Deleted (was just rating metadata)`);
      }
    }
    
    console.log(`\n🎉 Cleanup complete!`);
    console.log(`   ✅ Cleaned: ${cleanedCount} testimonials`);
    console.log(`   🗑️ Removed: ${filteredCount} rating-only entries`);
    
    // Show some sample cleaned testimonials
    const sampleCleaned = await pool.query(`
      SELECT author, text 
      FROM recommendations 
      WHERE agent_id = '13aa1f7e-6947-46c6-8d11-53a7b67fddd3'
      LIMIT 3
    `);
    
    console.log(`\n📝 Sample cleaned testimonials for BJ Ward:`);
    sampleCleaned.rows.forEach((rec, i) => {
      console.log(`${i+1}. ${rec.author}: ${rec.text.substring(0, 120)}...`);
    });
    
    await pool.end();
    
  } catch (error) {
    console.error('❌ Error cleaning testimonials:', error);
    await pool.end();
  }
}

cleanExistingTestimonials();
