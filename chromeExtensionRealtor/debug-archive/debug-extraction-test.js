// Quick test script to run in browser console to debug extraction
console.log('🔍 DEBUGGING REALTOR.COM TESTIMONIAL EXTRACTION');

// Test the enhanced patterns on current page
const pageText = document.body.textContent;

console.log('=== PAGE ANALYSIS ===');
console.log('Page text length:', pageText.length);

// Look for "Verified review" sections
const verifiedSections = [];
const lines = pageText.split('\n');
console.log('Total lines:', lines.length);

let verifiedCount = 0;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].trim() === 'Verified review') {
    verifiedCount++;
    console.log(`\n--- VERIFIED REVIEW ${verifiedCount} (line ${i}) ---`);
    
    // Show context around verified review
    const context = lines.slice(Math.max(0, i-5), i+10).map((line, idx) => {
      const lineNum = Math.max(0, i-5) + idx;
      const marker = lineNum === i ? '>>> ' : '    ';
      return `${marker}${lineNum}: "${line.trim()}"`;
    }).join('\n');
    
    console.log('Context:\n' + context);
  }
}

console.log(`\nFound ${verifiedCount} "Verified review" sections`);

// Test specific patterns
console.log('\n=== PATTERN TESTING ===');

// Test modern pattern
const modernPattern = /([A-Z][a-z]+(?:\s[A-Z][a-z]*)*)\s+([^|]+\|\s*\d{4})\s+Verified review/g;
let match;
let patternMatches = 0;
while ((match = modernPattern.exec(pageText)) !== null) {
  patternMatches++;
  console.log(`Pattern match ${patternMatches}:`, {
    name: match[1],
    locationYear: match[2],
    position: match.index
  });
}

// Look for specific names we expect
const expectedNames = ['Sharon', 'Belinda Gillis', 'Robert Bruce', 'Felicia', 'Jen', 'Josh', 'James'];
console.log('\n=== EXPECTED NAMES CHECK ===');
expectedNames.forEach(name => {
  const found = pageText.includes(name);
  console.log(`${name}: ${found ? '✅ FOUND' : '❌ NOT FOUND'}`);
  if (found) {
    // Show context around the name
    const index = pageText.indexOf(name);
    const context = pageText.substring(Math.max(0, index-100), index+200);
    console.log(`  Context: "${context.replace(/\n/g, ' ')}"`);
  }
});

// Check for review content
console.log('\n=== REVIEW CONTENT CHECK ===');
const expectedReviewSnippets = [
  'BJ helped me sell my parent\'s Camarillo home',
  'We\'ve worked with BJ on three real estate transactions',
  'BJ & his staff consistently provide exceptional service'
];

expectedReviewSnippets.forEach(snippet => {
  const found = pageText.includes(snippet);
  console.log(`"${snippet.substring(0, 30)}...": ${found ? '✅ FOUND' : '❌ NOT FOUND'}`);
});

console.log('\n=== COMPLETE ===');
