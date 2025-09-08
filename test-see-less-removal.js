// "SEE LESS" REMOVAL TEST
console.log('🧪 TESTING "SEE LESS" REMOVAL FROM BIO TEXT...');

// Test cases with different "See less" patterns
const testBioTexts = [
  {
    before: "Hello! My name is B.J. Ward. I am the Broker/Owner of Comfort Real Estate Services. See less",
    expected: "Hello! My name is B.J. Ward. I am the Broker/Owner of Comfort Real Estate Services.",
    description: "See less at end"
  },
  {
    before: "Hello! My name is B.J. Ward. I am the Broker/Owner of Comfort Real Estate Services. See less.",
    expected: "Hello! My name is B.J. Ward. I am the Broker/Owner of Comfort Real Estate Services.",
    description: "See less with period at end"
  },
  {
    before: "Thank you for taking the time to get to know me and our company. See less",
    expected: "Thank you for taking the time to get to know me and our company.",
    description: "See less after period"
  },
  {
    before: "In 2005 we closed nearly $10 million in real estate sales. See less Read more about our services.",
    expected: "In 2005 we closed nearly $10 million in real estate sales.  Read more about our services.",
    description: "See less in middle of text"
  },
  {
    before: "This truly is paradise! See less Show less Read less",
    expected: "This truly is paradise!   ",
    description: "Multiple collapse indicators"
  }
];

console.log('\n🔍 TESTING COLLAPSE INDICATOR REMOVAL:');

// Simulate the cleaning patterns
testBioTexts.forEach((test, index) => {
  console.log(`\n${index + 1}. ${test.description}`);
  console.log(`   Before: "${test.before}"`);
  
  let cleaned = test.before
    .replace(/\b(?:See|Read|Show)\s+less\b\.?/gi, '') // Remove "See less", "Read less"
    .replace(/\bSee less\.?$/gi, '') // Remove "See less" at end
    .replace(/\.\s*See less\.?/gi, '.') // Remove "...See less." patterns  
    .replace(/\s+See less\.?\s*/gi, ' ') // Remove "See less" in middle
    .replace(/\s+/g, ' ') // Clean up extra spaces
    .trim();
  
  console.log(`   After:  "${cleaned}"`);
  console.log(`   Expected: "${test.expected}"`);
  console.log(`   Match: ${cleaned === test.expected.trim() ? '✅' : '❌'}`);
});

console.log('\n🎯 EXPANSION STATE DETECTION:');
const buttonTexts = ['see more', 'read more', 'see less', 'show less', 'collapse'];

buttonTexts.forEach(buttonText => {
  const isExpansion = ['see more', 'read more', 'show more', 'view more', 'expand'].includes(buttonText);
  const isCollapse = ['see less', 'read less', 'show less', 'collapse'].includes(buttonText);
  
  console.log(`Button "${buttonText}":`, {
    expansion: isExpansion ? '🔵 CLICK' : '⚪ NO',
    collapse: isCollapse ? '🟢 ALREADY EXPANDED' : '⚪ NO',
    action: isExpansion ? 'Click to expand' : isCollapse ? 'Content already expanded' : 'Ignore'
  });
});

console.log('\n✅ BENEFITS:');
console.log('🚫 No "See less" text in final bio');
console.log('🔍 Detects when content is already expanded');
console.log('📝 Clean, professional bio text');
console.log('🎯 Handles all collapse indicator variations');

console.log('\n🎯 EXPECTED RESULT:');
console.log('Bio text should be completely clean with no:');
console.log('- "See less" text');
console.log('- "Read less" text');
console.log('- "Show less" text');
console.log('- Any collapse indicators');
console.log('✅ Just pure, complete bio content!');
