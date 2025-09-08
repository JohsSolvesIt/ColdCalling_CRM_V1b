// Test script to verify the review prompt blocking
// Run this in browser console after loading the updated content.js

console.log('🧪 Testing review prompt blocking...');

// Test the specific text that was incorrectly picked up
const testTexts = [
  "Ratings and reviewsDid Annie Allen help you with your property?",
  "Ratings and reviews Did Annie Allen help you with your property?",
  "Did Annie Allen help you with your property?",
  "Ratings and reviewsDid John Smith help you with your home purchase?",
  "Did this agent help you with your property search?",
  "This is a valid review about the agent's excellent service", // Should pass
  "Another legitimate testimonial about their expertise" // Should pass
];

// Simulate the isValidReviewContent function check
function testReviewValidation() {
  if (typeof RealtorDataExtractor === 'undefined') {
    console.error('❌ RealtorDataExtractor not found. Make sure content.js is loaded.');
    return;
  }

  const extractor = new RealtorDataExtractor();
  
  console.log('\n📋 Testing review validation:');
  console.log('=' .repeat(50));
  
  testTexts.forEach((text, index) => {
    const isValid = extractor.isValidReviewContent(text);
    const status = isValid ? '✅ PASS' : '❌ BLOCK';
    const expected = text.toLowerCase().includes('did') && text.toLowerCase().includes('help you') ? '❌ BLOCK' : '✅ PASS';
    const correct = (isValid && expected === '✅ PASS') || (!isValid && expected === '❌ BLOCK') ? '✓' : '✗';
    
    console.log(`${correct} Test ${index + 1}: ${status} (Expected: ${expected})`);
    console.log(`   Text: "${text}"`);
    console.log('');
  });
}

// Check if the extractor is available and run test
if (typeof RealtorDataExtractor !== 'undefined') {
  testReviewValidation();
} else {
  console.error('❌ RealtorDataExtractor not found. Make sure content.js is loaded.');
  console.log('💡 To test: Inject content.js first, then run this test.');
}
