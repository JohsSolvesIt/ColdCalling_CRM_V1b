/**
 * DIAGNOSTIC SCRIPT - Contact Extraction Debug
 * Copy and paste this into the browser console on the realtor page
 */

console.log('🔍 DIAGNOSTIC: Contact Extraction Debug Starting...');

// Test 1: Check if methods exist
console.log('📋 Step 1: Checking method availability...');
if (window.realtorExtractor) {
  console.log('✅ realtorExtractor found');
  console.log('  - extractContactData:', typeof window.realtorExtractor.extractContactData);
  console.log('  - extractCleanPhone:', typeof window.realtorExtractor.extractCleanPhone);
  console.log('  - extractCleanEmail:', typeof window.realtorExtractor.extractCleanEmail);
  console.log('  - cleanPhoneNumber:', typeof window.realtorExtractor.cleanPhoneNumber);
  console.log('  - isValidPhoneNumber:', typeof window.realtorExtractor.isValidPhoneNumber);
} else {
  console.log('❌ realtorExtractor NOT found');
}

// Test 2: Look for phone numbers in page manually
console.log('📋 Step 2: Manual phone search in page text...');
const pageText = document.body.textContent;
console.log('Page text length:', pageText.length);

const phonePatterns = [
  /\(\d{3}\)\s*\d{3}[-\s]?\d{4}/g,  // (323) 610-0231
  /\d{3}[-\s]\d{3}[-\s]\d{4}/g,     // 323-610-0231
  /\d{3}\.\d{3}\.\d{4}/g            // 323.610.0231
];

phonePatterns.forEach((pattern, index) => {
  const matches = pageText.match(pattern);
  console.log(`Pattern ${index + 1} matches:`, matches);
});

// Test 3: Look for email addresses manually
console.log('📋 Step 3: Manual email search...');
const emailPattern = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g;
const emailMatches = pageText.match(emailPattern);
console.log('Email matches:', emailMatches);

// Test 4: Check specific selectors
console.log('📋 Step 4: Testing specific selectors...');
const phoneSelectors = [
  '[data-testid="phone"]',
  '[data-testid="agent-phone"]',
  '.phone',
  '.agent-phone',
  '.contact-phone',
  '.phone-number',
  'a[href^="tel:"]',
  '[href*="tel:"]'
];

phoneSelectors.forEach(selector => {
  const elements = document.querySelectorAll(selector);
  console.log(`Selector "${selector}": found ${elements.length} elements`);
  elements.forEach((el, i) => {
    console.log(`  Element ${i}:`, el.textContent?.trim() || el.href);
  });
});

// Test 5: Look for tel: links
console.log('📋 Step 5: Looking for tel: links...');
const telLinks = document.querySelectorAll('a[href^="tel:"]');
console.log('Tel links found:', telLinks.length);
telLinks.forEach((link, i) => {
  console.log(`  Tel link ${i}:`, link.href, '|', link.textContent?.trim());
});

// Test 6: Try extracting with realtorExtractor if available
if (window.realtorExtractor) {
  console.log('📋 Step 6: Testing actual extraction...');
  try {
    console.log('Calling extractCleanPhone()...');
    const phone = window.realtorExtractor.extractCleanPhone();
    console.log('Phone result:', phone);
    
    console.log('Calling extractCleanEmail()...');
    const email = window.realtorExtractor.extractCleanEmail();
    console.log('Email result:', email);
    
    console.log('Calling extractContactData()...');
    const contactData = window.realtorExtractor.extractContactData();
    console.log('Full contact data:', contactData);
  } catch (error) {
    console.error('❌ Extraction error:', error);
    console.error('Error stack:', error.stack);
  }
}

console.log('🏁 DIAGNOSTIC COMPLETE');
