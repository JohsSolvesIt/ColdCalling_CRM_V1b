const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.POSTGRES_USER || 'postgres',
  host: process.env.POSTGRES_HOST || 'localhost',
  database: process.env.POSTGRES_DB || 'realtor_data',
  password: process.env.POSTGRES_PASSWORD || 'password',
  port: process.env.POSTGRES_PORT || 5432,
});

function isValidTestimonial(text, author) {
  if (!text || text.length < 30) return false;

  const lowerText = text.toLowerCase();
  const lowerAuthor = author ? author.toLowerCase() : '';

  // These are clearly NOT testimonials
  const badPatterns = [
    // Price and real estate data
    'price range', 'last 24 months', '$', 'sqft', 'bed', 'bath',
    // Agent information  
    'experience', 'years', 'office', 'mobile', 'phone', 'email', 'website',
    'agent hasn\'t provided', 'hasn\'t provided a bio', 'write', 'review',
    'not rated yet', 'share profile', 'recommendations',
    // Company/agency names
    'better homes and gardens', 'berkshire hathaway', 'nexthome', 'era',
    'quinn agency', 'exp realty', 'sotheby\'s international',
    // Real estate terms
    'buyer\'s agent', 'seller\'s agent', 'commercial', 'residential', 'land',
    'multi-family', 'new construction', 'foreclosures', 'relocation',
    'first time', 'vacation homes', 'waterfront', 'luxury', 'investment',
    'property management', 'areas served', 'specializations',
    // Contact/website elements
    'contact us', 'subscribe', 'newsletter', 'privacy policy', 'terms',
    'copyright', 'all rights reserved', 'menu', 'navigation'
  ];

  // Check if text contains any bad patterns
  if (badPatterns.some(pattern => lowerText.includes(pattern))) {
    return false;
  }

  // Check if author looks like bad data
  const badAuthors = [
    'price', 'experience', 'bangor', 'write', 'anonymous', 'the time o',
    'autodialer and p', 'condo', 'residential', 'first time homebuyer',
    'buyer representation', 'condos', 'apartment buildings'
  ];

  if (badAuthors.some(bad => lowerAuthor.includes(bad))) {
    return false;
  }

  // Must contain positive testimonial language
  const positiveWords = [
    'recommend', 'excellent', 'outstanding', 'professional', 'helpful',
    'great', 'amazing', 'fantastic', 'wonderful', 'best', 'perfect',
    'exceeded', 'impressed', 'satisfied', 'grateful', 'thank you',
    'worked with', 'helped us', 'helped me'
  ];

  const hasPositiveWords = positiveWords.some(word => lowerText.includes(word));
  
  // Must have sentence structure  
  const sentenceCount = (text.match(/[.!?]+/g) || []).length;
  const hasProperSentences = sentenceCount > 0 && text.length / sentenceCount > 15;

  return hasPositiveWords && hasProperSentences;
}

async function cleanBadTestimonials() {
  try {
    console.log('🧹 Starting cleanup of bad testimonials...');
    
    // Get all testimonials
    const testimonials = await pool.query(`
      SELECT id, text, author 
      FROM recommendations 
      ORDER BY id
    `);
    
    console.log(`📊 Found ${testimonials.rows.length} total testimonials to review`);
    
    let deletedCount = 0;
    let keptCount = 0;
    
    for (const testimonial of testimonials.rows) {
      const isValid = isValidTestimonial(testimonial.text, testimonial.author);
      
      if (!isValid) {
        // Delete invalid testimonials
        await pool.query(`
          DELETE FROM recommendations 
          WHERE id = $1
        `, [testimonial.id]);
        
        deletedCount++;
        console.log(`🗑️ Deleted: "${testimonial.author}" - "${testimonial.text.substring(0, 60)}..."`);
      } else {
        keptCount++;
        console.log(`✅ Kept: "${testimonial.author}" - "${testimonial.text.substring(0, 60)}..."`);
      }
    }
    
    console.log(`\n🎉 Cleanup complete!`);
    console.log(`   ✅ Kept: ${keptCount} valid testimonials`);
    console.log(`   🗑️ Deleted: ${deletedCount} invalid entries`);
    
    // Show remaining BJ Ward testimonials
    const bjWardTestimonials = await pool.query(`
      SELECT author, text 
      FROM recommendations 
      WHERE agent_id = '13aa1f7e-6947-46c6-8d11-53a7b67fddd3'
      LIMIT 5
    `);
    
    console.log(`\n📝 Remaining BJ Ward testimonials (${bjWardTestimonials.rows.length}):`);
    bjWardTestimonials.rows.forEach((rec, i) => {
      console.log(`${i+1}. ${rec.author}: ${rec.text.substring(0, 100)}...`);
    });
    
    await pool.end();
    
  } catch (error) {
    console.error('❌ Error cleaning testimonials:', error);
    await pool.end();
  }
}

cleanBadTestimonials();
