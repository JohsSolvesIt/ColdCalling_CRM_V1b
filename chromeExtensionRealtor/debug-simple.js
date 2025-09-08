/**
 * SIMPLIFIED DIAGNOSTIC - Contact Extraction Debug
 * Copy and paste this into the browser console on the realtor page
 */

console.log('🔍 SIMPLE CONTACT EXTRACTION DIAGNOSTIC');
console.log('=======================================');

// Quick method check - Check all possible extractor objects
const extractors = {
    'window.realtorExtractor': window.realtorExtractor,
    'window.extractor': window.extractor,
    'window.ContactExtractor': window.ContactExtractor,
    'window.RealtorDataExtractor': window.RealtorDataExtractor,
    'window.AgentExtractor': window.AgentExtractor
};

let foundExtractor = null;
let extractorName = null;

console.log('🔍 Checking available extractors:');
for (const [name, extractor] of Object.entries(extractors)) {
    if (extractor && typeof extractor === 'object') {
        console.log(`✅ ${name} found`);
        if (!foundExtractor) {
            foundExtractor = extractor;
            extractorName = name;
        }
    } else {
        console.log(`❌ ${name} not found`);
    }
}

if (!foundExtractor) {
    console.error('❌ No extractors found');
    console.log('❌ Diagnostic stopped - no extractors available');
} else {
    console.log(`✅ Using ${extractorName} for testing`);

    // Test extraction methods directly
    console.log('\n🧪 Testing extraction:');
    try {
        const phone = foundExtractor.extractCleanPhone ? foundExtractor.extractCleanPhone() : 'Method not available';
        const email = foundExtractor.extractCleanEmail ? foundExtractor.extractCleanEmail() : 'Method not available';
        const contactData = foundExtractor.extractContactData ? foundExtractor.extractContactData() : 'Method not available';
        
        console.log('📞 Phone:', phone || 'Not found');
        console.log('📧 Email:', email || 'Not found');
        console.log('📋 Contact Data:', contactData || 'Not found');
    } catch (error) {
        console.error('❌ Extraction error:', error.message);
    }

    // Quick page content check
    const pageText = document.body.innerText;
    const hasPhone = /\(\d{3}\)\s*\d{3}-\d{4}|\d{3}-\d{3}-\d{4}|\d{3}\.\d{3}\.\d{4}/.test(pageText);
    const hasEmail = /@[\w.-]+\.\w+/.test(pageText);
    const telLinks = document.querySelectorAll('a[href^="tel:"]').length;

    console.log('\n📊 Page summary:');
    console.log('Phone patterns found:', hasPhone ? '✅' : '❌');
    console.log('Email patterns found:', hasEmail ? '✅' : '❌');
    console.log('Tel links found:', telLinks > 0 ? `✅ (${telLinks})` : '❌');

    console.log('\n✅ Diagnostic complete');
}
