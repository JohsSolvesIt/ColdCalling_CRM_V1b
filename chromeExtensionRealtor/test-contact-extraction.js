/**
 * Quick test script to verify contact extraction is working
 * Run this in the browser console on a realtor page
 */

console.log('🧪 Testing Contact Extraction...');

// Test if the extractor is loaded
if (window.realtorExtractor) {
  console.log('✅ RealtorExtractor found');
  
  // Try extracting contact data directly
  try {
    const contactData = window.realtorExtractor.extractContactData();
    console.log('📞 Contact extraction result:', contactData);
    
    if (contactData.phone) {
      console.log('✅ Phone extraction WORKING:', contactData.phone);
    } else {
      console.log('❌ Phone extraction failed');
    }
    
    if (contactData.email) {
      console.log('✅ Email extraction WORKING:', contactData.email);
    } else {
      console.log('❌ Email extraction failed');
    }
    
    // Test individual methods
    console.log('🔍 Testing individual extraction methods...');
    const phone = window.realtorExtractor.extractCleanPhone();
    const email = window.realtorExtractor.extractCleanEmail();
    
    console.log('Direct phone extraction:', phone);
    console.log('Direct email extraction:', email);
    
  } catch (error) {
    console.error('❌ Contact extraction error:', error);
  }
} else {
  console.log('❌ RealtorExtractor not found on window');
}

// Test ContactExtractor module directly
if (window.ContactExtractor) {
  console.log('✅ ContactExtractor module found');
  
  try {
    const officeData = window.ContactExtractor.extractOfficeData();
    console.log('🏢 Office extraction result:', officeData);
  } catch (error) {
    console.error('❌ Office extraction error:', error);
  }
} else {
  console.log('❌ ContactExtractor module not found');
}
