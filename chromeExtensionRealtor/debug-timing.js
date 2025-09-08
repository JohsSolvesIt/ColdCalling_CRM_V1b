/**
 * TIMING DIAGNOSTIC - Check ContactExtractor availability over time
 * Copy and paste this into the browser console on the realtor page
 */

console.log('🕐 TIMING DIAGNOSTIC - ContactExtractor Availability');
console.log('================================================');

// Function to check ContactExtractor status
function checkContactExtractor(label) {
    const available = typeof window.ContactExtractor !== 'undefined';
    const hasMethod = available && typeof window.ContactExtractor.extractCleanPhone === 'function';
    
    console.log(`${label}:`);
    console.log(`  ContactExtractor available: ${available ? '✅' : '❌'}`);
    console.log(`  extractCleanPhone method: ${hasMethod ? '✅' : '❌'}`);
    
    if (available) {
        try {
            const phone = window.ContactExtractor.extractCleanPhone();
            const email = window.ContactExtractor.extractCleanEmail();
            console.log(`  Phone extraction result: ${phone || 'Not found'}`);
            console.log(`  Email extraction result: ${email || 'Not found'}`);
        } catch (error) {
            console.log(`  Extraction error: ${error.message}`);
        }
    }
    console.log('');
}

// Check immediately
checkContactExtractor('🔍 Immediate check');

// Check after delays to see if something overwrites it
setTimeout(() => checkContactExtractor('⏰ After 1 second'), 1000);
setTimeout(() => checkContactExtractor('⏰ After 3 seconds'), 3000);
setTimeout(() => checkContactExtractor('⏰ After 5 seconds'), 5000);

// Also check what other extractors are available
console.log('🔍 Other available extractors:');
const allExtractors = [
    'AgentExtractor', 'BioExtractor', 'ContactExtractor', 
    'ReviewsExtractor', 'PhotoExtractor', 'ListingsExtractor',
    'RealtorDataExtractor', 'extractor', 'realtorExtractor'
];

allExtractors.forEach(name => {
    const available = typeof window[name] !== 'undefined';
    console.log(`  ${name}: ${available ? '✅' : '❌'}`);
});

console.log('\n✅ Timing diagnostic started - watch for updates above');
