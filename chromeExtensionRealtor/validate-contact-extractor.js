/**
 * Validation script for ContactExtractor module
 * Run this in browser console to check for loading issues
 */

console.log('🔍 CONTACT EXTRACTOR VALIDATION');
console.log('================================');

// Check if ContactExtractor is loaded
console.log('1. ContactExtractor availability:', typeof window.ContactExtractor !== 'undefined' ? '✅ Available' : '❌ Not Available');

if (typeof window.ContactExtractor !== 'undefined') {
  console.log('2. ContactExtractor methods:');
  console.log('   - extractContactData:', typeof window.ContactExtractor.extractContactData === 'function' ? '✅' : '❌');
  console.log('   - extractOfficeData:', typeof window.ContactExtractor.extractOfficeData === 'function' ? '✅' : '❌');
  console.log('   - extractCleanPhone:', typeof window.ContactExtractor.extractCleanPhone === 'function' ? '✅' : '❌');
  console.log('   - extractCleanEmail:', typeof window.ContactExtractor.extractCleanEmail === 'function' ? '✅' : '❌');
  
  console.log('3. Testing basic functionality...');
  
  try {
    const contactData = window.ContactExtractor.extractContactData();
    console.log('   Contact extraction result:', contactData);
  } catch (error) {
    console.error('   Contact extraction error:', error);
  }
  
  try {
    const officeData = window.ContactExtractor.extractOfficeData();
    console.log('   Office extraction result:', officeData);
  } catch (error) {
    console.error('   Office extraction error:', error);
  }
  
} else {
  console.log('2. Checking for ContactExtractor class definition...');
  console.log('   window.ContactExtractor:', window.ContactExtractor);
  console.log('   Available window properties with "Contact":', Object.keys(window).filter(key => key.includes('Contact')));
}

console.log('4. Checking for dependency issues...');
console.log('   window.log:', typeof window.log !== 'undefined' ? '✅ Available' : '❌ Not Available');

console.log('5. Page readiness...');
console.log('   Document ready state:', document.readyState);
console.log('   Body content length:', document.body ? document.body.textContent.length : 'No body');

console.log('================================');
console.log('Validation complete!');
