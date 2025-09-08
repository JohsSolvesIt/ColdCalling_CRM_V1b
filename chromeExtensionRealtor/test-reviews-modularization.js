// Simple test to verify ReviewsExtractor modularization works
// This simulates the browser environment for basic testing

// Mock DOM and browser APIs
global.document = {
  body: { textContent: 'Test page content with excellent service and recommend' },
  querySelectorAll: () => [],
  querySelector: () => null
};

global.window = {};
global.console = console;

// Mock log object
global.log = {
  debug: console.log,
  info: console.log,
  recommendation: console.log
};

// Load the content.js file (just the classes, not the DOM-dependent parts)
const fs = require('fs');
const content = fs.readFileSync('./content.js', 'utf8');

// Extract just the ReviewsExtractor class
const reviewsExtractorStart = content.indexOf('class ReviewsExtractor {');
const reviewsExtractorEnd = content.indexOf('\n// Prevent duplicate class declaration');
const reviewsExtractorCode = content.substring(reviewsExtractorStart, reviewsExtractorEnd);

// Execute the class definition
try {
  eval(reviewsExtractorCode);
  console.log('✅ ReviewsExtractor class loaded successfully');
} catch (error) {
  console.error('❌ Error loading ReviewsExtractor:', error.message);
  process.exit(1);
}

// Test the ReviewsExtractor
console.log('🧪 Testing ReviewsExtractor...');
const reviewsExtractor = new ReviewsExtractor();

console.log('✅ ReviewsExtractor instantiated successfully');

// Test basic method
const testReviews = { overall: {}, individual: [], recommendations: [] };
reviewsExtractor.extractOverallRating(testReviews);

console.log('✅ extractOverallRating method works');
console.log('📊 Test reviews object:', JSON.stringify(testReviews, null, 2));

console.log('🎉 Basic modularization test completed successfully!');
