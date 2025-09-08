const ModularWebsiteGenerator = require('./engines/ModularWebsiteGenerator');
const fs = require('fs');

// Create test agent data with reviews
const testAgentWithReviews = {
  id: 'test-123',
  name: 'Cassandra Skelley',
  email: 'cassandra@example.com',
  phone: '(555) 123-4567',
  company: 'Premium Real Estate',
  reviews: {
    individual: [
      {
        text: "Cassandra was amazing to work with! She helped us find the perfect home and guided us through every step of the process. Her expertise and dedication made all the difference.",
        author: "Sarah and Mike Johnson",
        rating: 5
      },
      {
        text: "Professional, knowledgeable, and always available when we had questions. We couldn't have asked for a better realtor.",
        author: "Jennifer Martinez",
        rating: 5
      }
    ],
    recommendations: [
      {
        text: "Cassandra is an exceptional real estate professional. Her market knowledge is unparalleled.",
        author: "Robert Chen",
        rating: 5
      }
    ]
  }
};

console.log('🧪 Testing testimonials with agent data that has reviews...');
console.log('📊 Agent reviews structure:', JSON.stringify(testAgentWithReviews.reviews, null, 2));

// Test the generator
const generator = new ModularWebsiteGenerator();
const result = generator.generateWebsite(testAgentWithReviews, 'professional', 'modern-professional');

if (result.success) {
  console.log('✅ Website generated successfully');
  
  // Check if testimonials placeholder is still there
  const hasPlaceholder = result.html.includes('{{TESTIMONIALS_CONTENT}}');
  console.log('🔍 Still has testimonials placeholder:', hasPlaceholder);
  
  if (hasPlaceholder) {
    console.log('❌ PROBLEM: Testimonials placeholder not replaced!');
    
    // Find the testimonials section in the HTML
    const testimonialsMatch = result.html.match(/HAPPY CLIENTS[\s\S]*?{{TESTIMONIALS_CONTENT}}/);
    if (testimonialsMatch) {
      console.log('🔍 Found testimonials section:');
      console.log(testimonialsMatch[0]);
    }
  } else {
    console.log('✅ Testimonials placeholder was replaced');
    
    // Find testimonial content
    const testimonialMatch = result.html.match(/testimonial-content[\s\S]*?<\/div>/);
    if (testimonialMatch) {
      console.log('✅ Found testimonial content:');
      console.log(testimonialMatch[0]);
    }
  }
  
  // Save to file for inspection
  const path = require('path');
  const outPath = path.resolve(__dirname, '..', 'debug-website.html');
  fs.writeFileSync(outPath, result.html);
  console.log('💾 Saved to debug-website.html for inspection');
} else {
  console.log('❌ Website generation failed:', result.error);
}
