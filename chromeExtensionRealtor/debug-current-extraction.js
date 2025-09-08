// DEBUG SCRIPT: Test current extraction on modern realtor.com pages
// This script will help identify what selectors work on current page structure

console.log('🔍 EXTRACTION DIAGNOSTIC: Testing current page structure');

// Test 1: Check if basic elements exist
console.log('\n=== BASIC ELEMENT CHECK ===');
const basicSelectors = [
  'h1', 'h2', 'h3',
  '[data-testid]',
  '.agent-name',
  '.contact-info',
  '.bio',
  '.description',
  '.office',
  '.phone',
  '.email'
];

basicSelectors.forEach(selector => {
  const elements = document.querySelectorAll(selector);
  console.log(`${selector}: ${elements.length} elements found`);
  if (elements.length > 0 && elements[0].textContent) {
    console.log(`  Sample: "${elements[0].textContent.substring(0, 100)}..."`);
  }
});

// Test 2: Look for data-testid attributes specifically
console.log('\n=== DATA-TESTID ATTRIBUTES ===');
const dataTestIds = document.querySelectorAll('[data-testid]');
const testIds = Array.from(dataTestIds).map(el => el.getAttribute('data-testid')).filter(Boolean);
const uniqueTestIds = [...new Set(testIds)];
console.log('Found data-testid attributes:', uniqueTestIds.slice(0, 20));

// Test 3: Check page text for key information
console.log('\n=== PAGE TEXT ANALYSIS ===');
const pageText = document.body.textContent || '';

// Look for bio patterns
const bioPatterns = [
  /Hello[!,]/i,
  /my name is/i,
  /I am a/i,
  /real estate/i,
  /years of experience/i,
  /passion/i,
  /serving/i
];

bioPatterns.forEach(pattern => {
  const matches = pageText.match(pattern);
  if (matches) {
    console.log(`Bio pattern "${pattern}" found: ${matches[0]}`);
  }
});

// Look for contact patterns
const phonePattern = /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
const emailPattern = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

const phones = pageText.match(phonePattern) || [];
const emails = pageText.match(emailPattern) || [];

console.log(`Phone numbers found in text: ${phones.slice(0, 3)}`);
console.log(`Email addresses found in text: ${emails.slice(0, 3)}`);

// Test 4: Check for modern React-style attributes
console.log('\n=== MODERN ATTRIBUTES ===');
const modernAttributes = [
  'data-rf-test-id',
  'data-test-id', 
  'data-cy',
  'aria-label',
  'role'
];

modernAttributes.forEach(attr => {
  const elements = document.querySelectorAll(`[${attr}]`);
  if (elements.length > 0) {
    console.log(`${attr}: ${elements.length} elements`);
    const values = Array.from(elements).map(el => el.getAttribute(attr)).filter(Boolean);
    console.log(`  Values: ${[...new Set(values)].slice(0, 5)}`);
  }
});

// Test 5: Check current extraction functions
console.log('\n=== CURRENT EXTRACTION TEST ===');
if (window.realtorExtractor) {
  try {
    const bioResult = window.realtorExtractor.extractCleanBio();
    console.log('Bio extraction result:', bioResult);
  } catch (e) {
    console.log('Bio extraction error:', e.message);
  }
  
  try {
    const contactResult = window.realtorExtractor.extractContactData();
    console.log('Contact extraction result:', contactResult);
  } catch (e) {
    console.log('Contact extraction error:', e.message);
  }
}

console.log('🔍 DIAGNOSTIC COMPLETE');
